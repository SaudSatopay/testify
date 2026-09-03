import type { VideoAnalysisService } from "./VideoAnalysisService";

export type {
  FrameAnalysis,
  SignalLevel,
  VideoAnalysisService,
  VideoSessionSummary,
} from "./VideoAnalysisService";

/**
 * Factory with lazy loading — the analysis implementation is only
 * downloaded when the candidate has explicitly enabled video analysis.
 * Replace the dynamic import to plug in a different provider.
 */
export async function createVideoAnalysisService(): Promise<VideoAnalysisService> {
  const { BrowserVideoAnalysisService } = await import("./BrowserVideoAnalysisService");
  return new BrowserVideoAnalysisService();
}
