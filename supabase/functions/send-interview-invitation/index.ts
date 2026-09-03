import { handleOptions } from "../_shared/cors.ts";
import { failFromError, HttpError, ok } from "../_shared/response.ts";
import { getProfile, requireUser } from "../_shared/auth.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { logAudit } from "../_shared/audit.ts";
import {
  optionalNumberInRange,
  readJsonBody,
  requireEmail,
  requireUuid,
} from "../_shared/validate.ts";

const RESEND_URL = "https://api.resend.com/emails";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape LIKE/ILIKE wildcards so the email is matched literally. */
function escapeLikePattern(value: string): string {
  return value.replace(/([%_\\])/g, "\\$1");
}

function invitationEmailHtml(
  interviewTitle: string,
  scheduledAt: string | null,
  inviteUrl: string,
): string {
  const title = escapeHtml(interviewTitle);
  const when = scheduledAt
    ? `<p style="margin:0 0 16px;color:#475569;">Scheduled for: <strong>${
      escapeHtml(new Date(scheduledAt).toUTCString())
    }</strong></p>`
    : "";
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:32px 16px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">You're invited to an interview</h1>
      <p style="margin:0 0 16px;color:#475569;">You have been invited to take part in:</p>
      <p style="margin:0 0 16px;font-size:16px;color:#0f172a;"><strong>${title}</strong></p>
      ${when}
      <a href="${inviteUrl}"
         style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;">
        Accept invitation
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">
        If the button does not work, open this link:<br/>${inviteUrl}
      </p>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">Sent via Testify.</p>
    </div>
  </body>
</html>`;
}

/**
 * POST send-interview-invitation
 * Creator/admin invites a candidate by email: creates a tokenized invitation,
 * links an existing candidate profile when one matches, and (when
 * RESEND_API_KEY is set) emails the invite link.
 */
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    if (req.method !== "POST") {
      throw new HttpError("METHOD_NOT_ALLOWED", "Use POST", 405);
    }

    const { user, userClient } = await requireUser(req);
    const profile = await getProfile(userClient, user.id);

    if (!checkRateLimit(`send-interview-invitation:${user.id}`, 30)) {
      throw new HttpError("RATE_LIMITED", "Too many requests - try again in a minute", 429);
    }

    const body = await readJsonBody(req);
    const interviewId = requireUuid(body.interview_id, "interview_id");
    const candidateEmail = requireEmail(body.candidate_email, "candidate_email").toLowerCase();
    const expiresInHours =
      optionalNumberInRange(body.expires_in_hours, "expires_in_hours", 1, 2160) ?? 168;

    const { data: interview, error: interviewError } = await userClient
      .from("interviews")
      .select("id, title, created_by, candidate_id, scheduled_at, status")
      .eq("id", interviewId)
      .maybeSingle();
    if (interviewError) throw new HttpError("DB_ERROR", interviewError.message, 500);
    if (!interview) {
      throw new HttpError("NOT_FOUND", "Interview not found or you are not a participant", 404);
    }
    if (interview.created_by !== user.id && profile.role !== "admin") {
      throw new HttpError("FORBIDDEN", "Only the interview creator or an admin can send invitations", 403);
    }

    // Service role: profile lookup by email crosses RLS visibility on purpose
    // (the creator cannot otherwise see unrelated candidate profiles).
    const serviceClient = createServiceClient();
    const { data: existingProfile, error: lookupError } = await serviceClient
      .from("profiles")
      .select("id, role")
      .ilike("email", escapeLikePattern(candidateEmail))
      .limit(1)
      .maybeSingle();
    if (lookupError) throw new HttpError("DB_ERROR", lookupError.message, 500);

    let candidateId: string | null = null;
    if (existingProfile && existingProfile.role === "candidate") {
      candidateId = existingProfile.id as string;
      if (!interview.candidate_id) {
        const { error: linkError } = await serviceClient
          .from("interviews")
          .update({ candidate_id: candidateId })
          .eq("id", interviewId)
          .is("candidate_id", null);
        if (linkError) {
          console.error("[send-interview-invitation] candidate link failed:", linkError.message);
        }
      }
    }

    const expiresAt = new Date(Date.now() + expiresInHours * 3_600_000).toISOString();
    const { data: invitation, error: insertError } = await userClient
      .from("interview_invitations")
      .insert({
        interview_id: interviewId,
        candidate_email: candidateEmail,
        candidate_id: candidateId,
        expires_at: expiresAt,
      })
      .select("*")
      .single();
    if (insertError || !invitation) {
      if (insertError?.code === "42501") {
        throw new HttpError("FORBIDDEN", "You are not allowed to invite for this interview", 403);
      }
      throw new HttpError(
        "DB_ERROR",
        `Failed to create invitation: ${insertError?.message ?? "no row returned"}`,
        500,
      );
    }

    const appUrl = (Deno.env.get("APP_URL") ?? "http://localhost:5173").replace(/\/+$/, "");
    const inviteUrl = `${appUrl}/invite/${invitation.token}`;

    let emailSent = false;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      try {
        const emailResponse = await fetch(RESEND_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: Deno.env.get("EMAIL_FROM") ?? "Testify <onboarding@resend.dev>",
            to: [candidateEmail],
            subject: `Interview invitation: ${interview.title}`,
            html: invitationEmailHtml(
              interview.title as string,
              interview.scheduled_at as string | null,
              inviteUrl,
            ),
          }),
          signal: AbortSignal.timeout(15_000),
        });
        emailSent = emailResponse.ok;
        if (!emailResponse.ok) {
          console.error(
            `[send-interview-invitation] Resend error ${emailResponse.status}:`,
            (await emailResponse.text()).slice(0, 300),
          );
        }
      } catch (emailError) {
        console.error("[send-interview-invitation] email send failed:", emailError);
      }
    }

    await logAudit(userClient, user.id, "invitation_sent", "interview_invitation", invitation.id as string, {
      interview_id: interviewId,
    });

    return ok({ invitation, invite_url: inviteUrl, email_sent: emailSent });
  } catch (err) {
    return failFromError(err, "send-interview-invitation");
  }
});
