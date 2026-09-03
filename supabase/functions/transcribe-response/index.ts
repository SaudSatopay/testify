import { handleOptions } from "../_shared/cors.ts";
import { failFromError, HttpError, ok } from "../_shared/response.ts";
import { getProfile, requireUser } from "../_shared/auth.ts";
import { AI_RATE_LIMIT, checkRateLimit } from "../_shared/rateLimit.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import {
  isUuid,
  optionalString,
  optionalUuid,
  readJsonBody,
  requireString,
} from "../_shared/validate.ts";

import { openAIBaseUrl } from "../_shared/ai/openai.ts";

/**
 * Whisper endpoint follows OPENAI_BASE_URL, so free OpenAI-compatible
 * providers work too (e.g. Groq: base https://api.groq.com/openai/v1 with
 * WHISPER_MODEL=whisper-large-v3). Defaults to OpenAI's whisper-1.
 */
const WHISPER_URL = `${openAIBaseUrl()}/audio/transcriptions`;
const WHISPER_MODEL = Deno.env.get("WHISPER_MODEL") ?? "whisper-1";

/**
 * POST transcribe-response
 * Transcribes an audio file from the private 'recordings' bucket via OpenAI
 * Whisper. Path convention: {candidate_id}/{interview_id}/{file}. The caller
 * must be the recording's owner (first folder) or the creator of the
 * interview referenced by the second folder.
 */
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    if (req.method !== "POST") {
      throw new HttpError("METHOD_NOT_ALLOWED", "Use POST", 405);
    }

    const { user, userClient } = await requireUser(req);
    await getProfile(userClient, user.id);

    if (!checkRateLimit(`transcribe-response:${user.id}`, AI_RATE_LIMIT)) {
      throw new HttpError("RATE_LIMITED", "Too many requests - try again in a minute", 429);
    }

    const body = await readJsonBody(req);
    const audioPath = requireString(body.audio_path, "audio_path", { min: 3, max: 512 });
    const responseId = optionalUuid(body.response_id, "response_id");
    const language = optionalString(body.language, "language", { max: 8 });

    if (audioPath.includes("..") || audioPath.startsWith("/")) {
      throw new HttpError("VALIDATION_ERROR", "audio_path must be a plain object path inside the recordings bucket", 400);
    }
    const segments = audioPath.split("/").filter(Boolean);
    if (segments.length < 2) {
      throw new HttpError(
        "VALIDATION_ERROR",
        "audio_path must follow '{candidate_id}/{interview_id}/{file}' inside the recordings bucket",
        400,
      );
    }

    // Authorization: owner folder, or creator of the interview in folder 2.
    let authorized = segments[0] === user.id;
    if (!authorized && isUuid(segments[1])) {
      const { data: interview, error } = await userClient
        .from("interviews")
        .select("id, created_by")
        .eq("id", segments[1])
        .maybeSingle();
      if (error) throw new HttpError("DB_ERROR", error.message, 500);
      authorized = !!interview && interview.created_by === user.id;
    }
    if (!authorized) {
      throw new HttpError("FORBIDDEN", "You do not have access to this recording", 403);
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new HttpError(
        "TRANSCRIPTION_NOT_CONFIGURED",
        "Server-side transcription requires OPENAI_API_KEY (Whisper). Live in-browser transcription via the Web Speech API still works without it.",
        503,
      );
    }

    // Access was verified above, so the service client may fetch the file.
    const serviceClient = createServiceClient();
    const { data: blob, error: downloadError } = await serviceClient.storage
      .from("recordings")
      .download(audioPath);
    if (downloadError || !blob) {
      throw new HttpError("NOT_FOUND", `Audio file not found in recordings bucket: ${audioPath}`, 404);
    }

    const form = new FormData();
    const filename = segments[segments.length - 1] || "audio.webm";
    form.append("file", blob, filename);
    form.append("model", WHISPER_MODEL);
    if (language) form.append("language", language);

    const whisperResponse = await fetch(WHISPER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
    if (!whisperResponse.ok) {
      const detail = (await whisperResponse.text()).slice(0, 500);
      console.error(`[transcribe-response] Whisper error ${whisperResponse.status}: ${detail}`);
      throw new HttpError("TRANSCRIPTION_FAILED", `Whisper API error (${whisperResponse.status})`, 502);
    }

    const payload = (await whisperResponse.json()) as { text?: string };
    const transcript = (payload.text ?? "").trim();

    // Best-effort persist: RLS allows the candidate (or admin) to update.
    if (responseId && transcript) {
      const { error: updateError } = await userClient
        .from("responses")
        .update({ transcript })
        .eq("id", responseId);
      if (updateError) {
        console.error(`[transcribe-response] transcript persist skipped: ${updateError.message}`);
      }
    }

    return ok({ transcript });
  } catch (err) {
    return failFromError(err, "transcribe-response");
  }
});
