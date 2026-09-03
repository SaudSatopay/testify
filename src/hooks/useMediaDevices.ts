import { useCallback, useEffect, useRef, useState } from "react";

export type MediaPermissionError =
  | "denied"
  | "not-found"
  | "in-use"
  | "insecure-context"
  | "unsupported"
  | "unknown";

export interface MediaDevicesState {
  stream: MediaStream | null;
  requesting: boolean;
  error: MediaPermissionError | null;
  micEnabled: boolean;
  camEnabled: boolean;
  hasAudioTrack: boolean;
  hasVideoTrack: boolean;
  /** Requests camera/mic — call ONLY after explicit user action + consent. */
  request: (constraints?: { video?: boolean; audio?: boolean }) => Promise<MediaStream | null>;
  toggleMic: () => void;
  toggleCam: () => void;
  stopAll: () => void;
}

export function describeMediaError(error: MediaPermissionError | null): string {
  switch (error) {
    case "denied":
      return "Permission was denied. Click the camera icon in your browser's address bar to allow access, then try again.";
    case "not-found":
      return "No camera or microphone was found. Connect a device and try again.";
    case "in-use":
      return "Your camera or microphone is being used by another application. Close it and try again.";
    case "insecure-context":
      return "Camera and microphone need a secure (HTTPS) connection.";
    case "unsupported":
      return "This browser does not support camera/microphone capture.";
    default:
      return "Could not access your camera or microphone. Check your device settings and try again.";
  }
}

/**
 * Manages a getUserMedia stream. Never requests permissions on mount —
 * `request()` must be triggered by an explicit user action after consent.
 */
export function useMediaDevices(): MediaDevicesState {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<MediaPermissionError | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  const stopAll = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const request = useCallback(
    async (constraints?: { video?: boolean; audio?: boolean }): Promise<MediaStream | null> => {
      const wantVideo = constraints?.video ?? true;
      const wantAudio = constraints?.audio ?? true;

      if (!navigator.mediaDevices?.getUserMedia) {
        setError(window.isSecureContext === false ? "insecure-context" : "unsupported");
        return null;
      }
      setRequesting(true);
      setError(null);
      try {
        stopAll();
        const media = await navigator.mediaDevices.getUserMedia({
          video: wantVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
          audio: wantAudio ? { echoCancellation: true, noiseSuppression: true } : false,
        });
        streamRef.current = media;
        setStream(media);
        setMicEnabled(true);
        setCamEnabled(true);
        return media;
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") setError("denied");
        else if (name === "NotFoundError" || name === "DevicesNotFoundError") setError("not-found");
        else if (name === "NotReadableError" || name === "TrackStartError") setError("in-use");
        else setError("unknown");
        return null;
      } finally {
        setRequesting(false);
      }
    },
    [stopAll],
  );

  const toggleMic = useCallback(() => {
    const tracks = streamRef.current?.getAudioTracks() ?? [];
    const next = !(tracks[0]?.enabled ?? true);
    tracks.forEach((t) => {
      t.enabled = next;
    });
    setMicEnabled(next);
  }, []);

  const toggleCam = useCallback(() => {
    const tracks = streamRef.current?.getVideoTracks() ?? [];
    const next = !(tracks[0]?.enabled ?? true);
    tracks.forEach((t) => {
      t.enabled = next;
    });
    setCamEnabled(next);
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  return {
    stream,
    requesting,
    error,
    micEnabled,
    camEnabled,
    hasAudioTrack: (stream?.getAudioTracks().length ?? 0) > 0,
    hasVideoTrack: (stream?.getVideoTracks().length ?? 0) > 0,
    request,
    toggleMic,
    toggleCam,
    stopAll,
  };
}
