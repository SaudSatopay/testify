import { Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AudioControlsProps {
  micEnabled: boolean;
  camEnabled: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  screenSharing?: boolean;
  onToggleScreenShare?: () => void;
  speakerMuted?: boolean;
  onToggleSpeaker?: () => void;
  onEnd: () => void;
  endLabel?: string;
  disabled?: boolean;
  className?: string;
}

function ControlButton({
  active,
  onClick,
  label,
  disabled,
  children,
  danger = false,
}: {
  active: boolean;
  onClick?: () => void;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={onClick}
          aria-label={label}
          aria-pressed={active}
          className={cn(
            "h-11 w-11 rounded-full border",
            active
              ? "border-room-line bg-room-raised text-cream hover:bg-room-line hover:text-cream"
              : danger
                ? "border-ember/50 bg-ember/15 text-ember hover:bg-ember/25 hover:text-ember"
                : "border-room-line bg-room-panel text-cream-dim hover:bg-room-raised hover:text-cream",
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Interview control bar (dark surface, used inside interview rooms). */
export function AudioControls({
  micEnabled,
  camEnabled,
  onToggleMic,
  onToggleCam,
  screenSharing = false,
  onToggleScreenShare,
  speakerMuted = false,
  onToggleSpeaker,
  onEnd,
  endLabel = "End interview",
  disabled = false,
  className,
}: AudioControlsProps) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      <ControlButton
        active={micEnabled}
        danger={!micEnabled}
        onClick={onToggleMic}
        disabled={disabled}
        label={micEnabled ? "Mute microphone" : "Unmute microphone"}
      >
        {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </ControlButton>

      <ControlButton
        active={camEnabled}
        danger={!camEnabled}
        onClick={onToggleCam}
        disabled={disabled}
        label={camEnabled ? "Turn camera off" : "Turn camera on"}
      >
        {camEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </ControlButton>

      {onToggleScreenShare && (
        <ControlButton
          active={screenSharing}
          onClick={onToggleScreenShare}
          disabled={disabled}
          label={screenSharing ? "Stop sharing screen" : "Share screen"}
        >
          <MonitorUp className="h-5 w-5" />
        </ControlButton>
      )}

      {onToggleSpeaker && (
        <ControlButton
          active={!speakerMuted}
          onClick={onToggleSpeaker}
          disabled={disabled}
          label={speakerMuted ? "Unmute speaker" : "Mute speaker"}
        >
          {speakerMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </ControlButton>
      )}

      <Button
        type="button"
        variant="destructive"
        onClick={onEnd}
        className="h-11 rounded-full px-5"
        aria-label={endLabel}
      >
        <PhoneOff className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">{endLabel}</span>
      </Button>
    </div>
  );
}
