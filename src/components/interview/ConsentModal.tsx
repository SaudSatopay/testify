import { useState } from "react";
import { Camera, Mic, ScanFace, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { VIDEO_ANALYSIS_DISCLAIMER } from "@/lib/constants";

interface ConsentModalProps {
  open: boolean;
  /** Whether the optional video-analysis choice should be offered. */
  offerVideoAnalysis?: boolean;
  onCancel: () => void;
  onContinue: (options: { videoAnalysisEnabled: boolean }) => void;
}

/**
 * Explicit consent gate shown BEFORE any camera/microphone access.
 * Video analysis has its own separate, optional consent.
 */
export function ConsentModal({ open, offerVideoAnalysis = true, onCancel, onContinue }: ConsentModalProps) {
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [videoAnalysis, setVideoAnalysis] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-w-xl" hideClose>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            Before we begin
          </DialogTitle>
          <DialogDescription>
            Testify needs access to your camera and microphone for this interview.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Camera className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">Camera</p>
                <p className="text-xs text-muted-foreground">Shows your video during the interview and in recordings.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Mic className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">Microphone</p>
                <p className="text-xs text-muted-foreground">Captures your answers for transcription and AI analysis.</p>
              </div>
            </div>
          </div>

          {offerVideoAnalysis && (
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ScanFace className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <div>
                    <Label htmlFor="video-analysis-toggle" className="text-sm font-medium">
                      Optional: video signal analysis
                    </Label>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{VIDEO_ANALYSIS_DISCLAIMER}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Frames are processed in your browser and discarded — only aggregate signals are stored.
                    </p>
                  </div>
                </div>
                <Switch
                  id="video-analysis-toggle"
                  checked={videoAnalysis}
                  onCheckedChange={setVideoAnalysis}
                  aria-label="Enable optional video signal analysis"
                />
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-lg bg-muted/60 p-4">
            <Checkbox
              id="recording-consent"
              checked={recordingConsent}
              onCheckedChange={(v) => setRecordingConsent(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="recording-consent" className="cursor-pointer text-sm font-normal leading-relaxed">
              I understand and consent to video/audio recording and AI analysis for this interview. See the{" "}
              <Link to="/ai-disclosure" target="_blank" className="font-medium text-primary underline-offset-2 hover:underline">
                AI analysis disclosure
              </Link>{" "}
              and{" "}
              <Link to="/privacy" target="_blank" className="font-medium text-primary underline-offset-2 hover:underline">
                privacy policy
              </Link>
              .
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={!recordingConsent}
            onClick={() => onContinue({ videoAnalysisEnabled: offerVideoAnalysis && videoAnalysis })}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
