import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Peer-to-peer video for live interviews, signaled over Supabase Realtime
 * broadcast. Uses public STUN; symmetric-NAT networks additionally need a
 * TURN server (see SETUP.md) — the UI surfaces a "connecting" state and
 * keeps transcript/question sync working even if media can't traverse.
 */

export interface SignalPayload {
  kind: "offer" | "answer" | "ice";
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  /** Sender role so peers ignore their own broadcasts. */
  from: "interviewer" | "candidate";
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
};

export type ConnectionState = "idle" | "connecting" | "connected" | "failed" | "closed";

export class WebRTCConnection {
  private pc: RTCPeerConnection | null = null;
  private channel: RealtimeChannel;
  private role: "interviewer" | "candidate";
  private localStream: MediaStream;
  private onRemoteStream: (stream: MediaStream) => void;
  private onState: (state: ConnectionState) => void;
  private pendingIce: RTCIceCandidateInit[] = [];
  private videoSender: RTCRtpSender | null = null;

  constructor(options: {
    channel: RealtimeChannel;
    role: "interviewer" | "candidate";
    localStream: MediaStream;
    onRemoteStream: (stream: MediaStream) => void;
    onState: (state: ConnectionState) => void;
  }) {
    this.channel = options.channel;
    this.role = options.role;
    this.localStream = options.localStream;
    this.onRemoteStream = options.onRemoteStream;
    this.onState = options.onState;
  }

  private createPeer(): RTCPeerConnection {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    for (const track of this.localStream.getTracks()) {
      const sender = pc.addTrack(track, this.localStream);
      if (track.kind === "video") this.videoSender = sender;
    }
    pc.ontrack = (event) => {
      if (event.streams[0]) this.onRemoteStream(event.streams[0]);
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.send({ kind: "ice", candidate: event.candidate.toJSON(), from: this.role });
      }
    };
    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case "connected":
          this.onState("connected");
          break;
        case "connecting":
          this.onState("connecting");
          break;
        case "failed":
          this.onState("failed");
          break;
        case "closed":
        case "disconnected":
          this.onState("closed");
          break;
        default:
          break;
      }
    };
    return pc;
  }

  private send(payload: SignalPayload): void {
    void this.channel.send({ type: "broadcast", event: "signal", payload });
  }

  /** The interviewer initiates the offer once both peers are present. */
  async startAsInitiator(): Promise<void> {
    this.onState("connecting");
    this.pc = this.createPeer();
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.send({ kind: "offer", sdp: offer.sdp, from: this.role });
  }

  async handleSignal(payload: SignalPayload): Promise<void> {
    if (payload.from === this.role) return;
    try {
      if (payload.kind === "offer" && payload.sdp) {
        this.onState("connecting");
        this.pc ??= this.createPeer();
        await this.pc.setRemoteDescription({ type: "offer", sdp: payload.sdp });
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.send({ kind: "answer", sdp: answer.sdp, from: this.role });
        await this.flushIce();
      } else if (payload.kind === "answer" && payload.sdp && this.pc) {
        await this.pc.setRemoteDescription({ type: "answer", sdp: payload.sdp });
        await this.flushIce();
      } else if (payload.kind === "ice" && payload.candidate) {
        if (this.pc?.remoteDescription) {
          await this.pc.addIceCandidate(payload.candidate);
        } else {
          this.pendingIce.push(payload.candidate);
        }
      }
    } catch (err) {
      console.warn("webrtc signal error:", err);
    }
  }

  private async flushIce(): Promise<void> {
    if (!this.pc) return;
    const queued = this.pendingIce.splice(0);
    for (const candidate of queued) {
      try {
        await this.pc.addIceCandidate(candidate);
      } catch (err) {
        console.warn("webrtc ice error:", err);
      }
    }
  }

  /** Swap the outgoing camera track for a screen-share track (and back). */
  async replaceVideoTrack(track: MediaStreamTrack): Promise<void> {
    if (this.videoSender) await this.videoSender.replaceTrack(track);
  }

  close(): void {
    this.pc?.close();
    this.pc = null;
    this.onState("closed");
  }
}
