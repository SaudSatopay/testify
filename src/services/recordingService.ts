/** Thin MediaRecorder wrapper for interview answer recordings. */

function pickMimeType(kind: "audio" | "video"): string | undefined {
  const candidates =
    kind === "audio"
      ? ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
      : ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  return candidates.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
}

export class RecorderSession {
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private mimeType: string | undefined;
  private startedAt = 0;

  readonly kind: "audio" | "video";

  constructor(kind: "audio" | "video") {
    this.kind = kind;
  }

  get isRecording(): boolean {
    return this.recorder?.state === "recording";
  }

  get elapsedSeconds(): number {
    return this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : 0;
  }

  start(stream: MediaStream): void {
    if (typeof MediaRecorder === "undefined") {
      throw new Error("Recording is not supported in this browser.");
    }
    const source =
      this.kind === "audio" ? new MediaStream(stream.getAudioTracks()) : stream;
    this.mimeType = pickMimeType(this.kind);
    this.chunks = [];
    this.recorder = new MediaRecorder(source, this.mimeType ? { mimeType: this.mimeType } : undefined);
    this.recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(1000);
    this.startedAt = Date.now();
  }

  /** Stops and resolves with the final blob (null if nothing recorded). */
  stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const recorder = this.recorder;
      if (!recorder || recorder.state === "inactive") {
        resolve(this.chunks.length ? new Blob(this.chunks, { type: this.mimeType }) : null);
        return;
      }
      recorder.onstop = () => {
        resolve(this.chunks.length ? new Blob(this.chunks, { type: this.mimeType }) : null);
        this.recorder = null;
      };
      recorder.stop();
    });
  }
}
