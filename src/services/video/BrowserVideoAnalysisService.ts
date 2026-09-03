import { clamp } from "@/lib/utils";
import type {
  FrameAnalysis,
  SignalLevel,
  VideoAnalysisService,
  VideoSessionSummary,
} from "./VideoAnalysisService";

/* Shape-only typings for the experimental FaceDetector API. */
interface DetectedFaceLike {
  boundingBox: { x: number; y: number; width: number; height: number };
}
interface FaceDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedFaceLike[]>;
}
type FaceDetectorConstructor = new (options?: {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}) => FaceDetectorLike;

function getFaceDetectorCtor(): FaceDetectorConstructor | null {
  const ctor = (window as unknown as { FaceDetector?: FaceDetectorConstructor }).FaceDetector;
  return typeof ctor === "function" ? ctor : null;
}

const SAMPLE_W = 96;
const SAMPLE_H = 72;

/**
 * Privacy-preserving, fully in-browser implementation: frames are sampled
 * to a tiny offscreen canvas, reduced to aggregate numbers, and immediately
 * discarded — no frame ever leaves the device. Uses the platform
 * FaceDetector API where available; otherwise degrades to presence/motion
 * signals and says so honestly.
 */
export class BrowserVideoAnalysisService implements VideoAnalysisService {
  readonly name = "browser-heuristic";

  private canvas = document.createElement("canvas");
  private ctx = this.canvas.getContext("2d", { willReadFrequently: true });
  private detector: FaceDetectorLike | null = null;
  private detectionSupported = false;

  private frames: FrameAnalysis[] = [];
  private previousLuma: Float32Array | null = null;
  private faceSizes: number[] = [];
  private faceCenters: Array<{ x: number; y: number }> = [];
  private timer: number | null = null;
  private faceLostStreak = 0;
  private attentionDrops = 0;

  constructor() {
    this.canvas.width = SAMPLE_W;
    this.canvas.height = SAMPLE_H;
    const Ctor = getFaceDetectorCtor();
    if (Ctor) {
      try {
        this.detector = new Ctor({ fastMode: true, maxDetectedFaces: 1 });
        this.detectionSupported = true;
      } catch {
        this.detector = null;
      }
    }
  }

  start(video: HTMLVideoElement, options?: { intervalMs?: number }): void {
    this.stop();
    const interval = options?.intervalMs ?? 1500;
    this.timer = window.setInterval(() => {
      void this.analyzeFrame(video);
    }, interval);
  }

  stop(): void {
    if (this.timer != null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  reset(): void {
    this.stop();
    this.frames = [];
    this.previousLuma = null;
    this.faceSizes = [];
    this.faceCenters = [];
    this.faceLostStreak = 0;
    this.attentionDrops = 0;
  }

  async analyzeFrame(video: HTMLVideoElement): Promise<FrameAnalysis | null> {
    if (!this.ctx || video.readyState < 2 || video.videoWidth === 0) return null;

    this.ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
    const image = this.ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
    const { data } = image;

    const luma = new Float32Array(SAMPLE_W * SAMPLE_H);
    let brightnessSum = 0;
    for (let i = 0; i < luma.length; i++) {
      const o = i * 4;
      const y = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
      luma[i] = y;
      brightnessSum += y;
    }
    const brightness = brightnessSum / luma.length / 255;

    let motionLevel = 0;
    if (this.previousLuma) {
      let diff = 0;
      for (let i = 0; i < luma.length; i++) diff += Math.abs(luma[i] - this.previousLuma[i]);
      motionLevel = clamp(diff / luma.length / 64, 0, 1);
    }
    this.previousLuma = luma;

    let faceDetected: boolean | null = null;
    let faceCenteredness: number | null = null;

    if (this.detector) {
      try {
        const faces = await this.detector.detect(video);
        faceDetected = faces.length > 0;
        if (faces.length > 0) {
          const box = faces[0].boundingBox;
          const cx = (box.x + box.width / 2) / video.videoWidth;
          const cy = (box.y + box.height / 2) / video.videoHeight;
          // Distance of the face center from the frame center → gaze/orientation proxy.
          const dist = Math.hypot(cx - 0.5, cy - 0.42);
          faceCenteredness = clamp(1 - dist * 2.4, 0, 1);
          this.faceSizes.push((box.width * box.height) / (video.videoWidth * video.videoHeight));
          this.faceCenters.push({ x: cx, y: cy });
          this.faceLostStreak = 0;
        } else {
          this.faceLostStreak += 1;
          if (this.faceLostStreak === 2) this.attentionDrops += 1;
        }
      } catch {
        faceDetected = null;
      }
    }

    const frame: FrameAnalysis = {
      timestamp: Date.now(),
      faceDetected,
      faceCenteredness,
      motionLevel,
      brightness,
    };
    this.frames.push(frame);
    if (this.frames.length > 2400) this.frames.shift();
    return frame;
  }

  getEyeContactIndicator(): number {
    const samples = this.frames
      .map((f) => f.faceCenteredness)
      .filter((v): v is number => v != null);
    if (samples.length === 0) return 0;
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    return Math.round(clamp(mean, 0, 1) * 100);
  }

  private headMovementLevel(): SignalLevel {
    if (this.faceCenters.length < 4) return "low";
    let travel = 0;
    for (let i = 1; i < this.faceCenters.length; i++) {
      travel += Math.hypot(
        this.faceCenters[i].x - this.faceCenters[i - 1].x,
        this.faceCenters[i].y - this.faceCenters[i - 1].y,
      );
    }
    const avg = travel / (this.faceCenters.length - 1);
    if (avg > 0.06) return "high";
    if (avg > 0.025) return "moderate";
    return "low";
  }

  private expressionVariation(): SignalLevel {
    // Without landmark tracking we use in-face motion + size variance as a
    // coarse, observable "variation" proxy — never an emotion claim.
    const motions = this.frames.filter((f) => f.faceDetected).map((f) => f.motionLevel);
    if (motions.length < 4) return "low";
    const mean = motions.reduce((a, b) => a + b, 0) / motions.length;
    if (mean > 0.28) return "high";
    if (mean > 0.12) return "moderate";
    return "low";
  }

  getObservableExpressionSummary(): string {
    return this.analyzeSession().observations.join(" ");
  }

  analyzeSession(): VideoSessionSummary {
    const detectable = this.frames.filter((f) => f.faceDetected != null);
    const facePresenceRatio =
      detectable.length > 0
        ? detectable.filter((f) => f.faceDetected).length / detectable.length
        : 0;
    const eyeContactIndicator = this.getEyeContactIndicator();
    const headMovementLevel = this.headMovementLevel();
    const expressionVariation = this.expressionVariation();

    const observations: string[] = [];
    if (!this.detectionSupported) {
      observations.push(
        "Face detection is not supported by this browser, so only camera presence and motion signals were recorded.",
      );
    } else if (detectable.length > 0) {
      if (facePresenceRatio >= 0.9) observations.push("The candidate remained in frame for almost the entire session.");
      else if (facePresenceRatio >= 0.7) observations.push("The candidate was in frame for most of the session.");
      else observations.push("The candidate's face was out of frame for a notable portion of the session.");

      if (eyeContactIndicator >= 70) observations.push("Gaze orientation was mostly toward the camera.");
      else if (eyeContactIndicator >= 40) observations.push("Eye gaze moved away from the camera at times.");
      else observations.push("Eye gaze was frequently oriented away from the camera.");

      observations.push(`Head movement was ${headMovementLevel} during the session.`);
      observations.push(`Visible facial movement variation was ${expressionVariation}.`);
      if (this.attentionDrops > 0)
        observations.push(`The face left the frame ${this.attentionDrops} time${this.attentionDrops === 1 ? "" : "s"}.`);
    }
    const avgBrightness =
      this.frames.length > 0 ? this.frames.reduce((a, f) => a + f.brightness, 0) / this.frames.length : 0;
    if (this.frames.length > 0 && avgBrightness < 0.18) {
      observations.push("Lighting was low, which may reduce signal reliability.");
    }

    return {
      framesAnalyzed: this.frames.length,
      facePresenceRatio: Math.round(facePresenceRatio * 100) / 100,
      eyeContactIndicator,
      headMovementLevel,
      expressionVariation,
      attentionDrops: this.attentionDrops,
      faceDetectionSupported: this.detectionSupported,
      observations,
    };
  }
}
