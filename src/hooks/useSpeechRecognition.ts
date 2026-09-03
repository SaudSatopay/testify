import { useCallback, useEffect, useRef, useState } from "react";

/* Structural typings for the (webkit-prefixed) Web Speech API. */
interface SpeechAlternativeLike {
  transcript: string;
}
interface SpeechResultLike {
  isFinal: boolean;
  0: SpeechAlternativeLike;
}
interface SpeechResultListLike {
  length: number;
  [index: number]: SpeechResultLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechResultListLike;
}
interface SpeechRecognitionErrorEventLike {
  error: string;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechRecognitionState {
  supported: boolean;
  listening: boolean;
  /** Accumulated finalized transcript. */
  transcript: string;
  /** Words currently being recognized (not yet final). */
  interimTranscript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Live in-browser speech-to-text via the Web Speech API (no keys needed).
 * Server-side Whisper transcription (transcribe-response) is the durable
 * fallback for browsers without support.
 */
export function useSpeechRecognition(lang = "en-US"): SpeechRecognitionState {
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const keepAliveRef = useRef(false);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("Live transcription is not supported in this browser.");
      return;
    }
    if (recognitionRef.current) return;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      let interim = "";
      let finalChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) finalChunk += `${text} `;
        else interim += text;
      }
      if (finalChunk) setTranscript((prev) => `${prev}${finalChunk}`);
      setInterimTranscript(interim);
    };
    recognition.onerror = (event) => {
      // "no-speech"/"aborted" are routine; surface only meaningful failures.
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access for transcription was blocked.");
        keepAliveRef.current = false;
      } else if (event.error === "network") {
        setError("Transcription service is unreachable (network).");
      }
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      // Chrome stops after silence — restart while the session is live.
      if (keepAliveRef.current) {
        window.setTimeout(() => {
          if (keepAliveRef.current) start();
        }, 250);
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;
    keepAliveRef.current = true;
    setError(null);
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
    }
  }, [lang]);

  const stop = useCallback(() => {
    keepAliveRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    setInterimTranscript("");
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  useEffect(
    () => () => {
      keepAliveRef.current = false;
      recognitionRef.current?.abort();
    },
    [],
  );

  return { supported, listening, transcript, interimTranscript, error, start, stop, reset };
}
