/**
 * Modular video-analysis contract.
 *
 * Implementations analyze ONLY observable interview signals — camera
 * presence, approximate eye-contact indicator, head movement, expression
 * variation. They must never infer race, ethnicity, religion, health,
 * disability, sexuality, personality, mental health, honesty, or
 * criminality. Swap `BrowserVideoAnalysisService` for a computer-vision
 * provider by implementing this interface and updating the factory in
 * `services/video/index.ts`.
 */

export interface FrameAnalysis {
  timestamp: number;
  faceDetected: boolean | null;
  /** 0–1: how centered/facing-camera the detected face is (eye-contact proxy). */
  faceCenteredness: number | null;
  /** 0–1 frame-to-frame luminance difference (motion proxy). */
  motionLevel: number;
  /** 0–1 average luminance (camera/lighting presence). */
  brightness: number;
}

export type SignalLevel = "low" | "moderate" | "high";

export interface VideoSessionSummary {
  framesAnalyzed: number;
  /** 0–1 share of frames where a face was detected (null face data excluded). */
  facePresenceRatio: number;
  /** 0–100 approximate eye-contact indicator. */
  eyeContactIndicator: number;
  headMovementLevel: SignalLevel;
  expressionVariation: SignalLevel;
  /** Number of sustained face-lost intervals. */
  attentionDrops: number;
  /** Whether the implementation could actually detect faces in this browser. */
  faceDetectionSupported: boolean;
  observations: string[];
}

export interface VideoAnalysisService {
  readonly name: string;
  /** Begin periodic sampling of the given video element. */
  start(video: HTMLVideoElement, options?: { intervalMs?: number }): void;
  stop(): void;
  reset(): void;
  analyzeFrame(video: HTMLVideoElement): Promise<FrameAnalysis | null>;
  analyzeSession(): VideoSessionSummary;
  getEyeContactIndicator(): number;
  getObservableExpressionSummary(): string;
}
