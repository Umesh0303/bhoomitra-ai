import { getAudioContext, releaseStream } from "@/utils/audio";

export type SilenceDetectorOptions = {
  /** Silence duration (ms) that ends the utterance. */
  silenceMs?: number;
  /** Hard cap (ms) on a single recording. */
  maxMs?: number;
  onLevel?: (level: number) => void;
  onSilence: () => void;
  onMaxDuration: () => void;
};

/**
 * RMS-based end-of-speech detection. Analyses the mic stream in the browser —
 * no audio is buffered, uploaded, or stored.
 */
export class SilenceDetector {
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private raf = 0;
  private timeout = 0;
  private lastLoud = 0;
  private stopped = true;

  async start(options: SilenceDetectorOptions): Promise<void> {
    const silenceMs = options.silenceMs ?? 1600;
    const maxMs = options.maxMs ?? 30000;
    const ctx = getAudioContext();
    if (!ctx || typeof navigator === "undefined" || !navigator.mediaDevices) return;

    this.stop();
    this.stopped = false;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (this.stopped) {
      releaseStream(this.stream);
      this.stream = null;
      return;
    }

    this.source = ctx.createMediaStreamSource(this.stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.source.connect(this.analyser);

    const buffer = new Float32Array(this.analyser.fftSize);
    this.lastLoud = performance.now();

    this.timeout = window.setTimeout(() => {
      if (!this.stopped) options.onMaxDuration();
    }, maxMs);

    const tick = () => {
      if (this.stopped || !this.analyser) return;
      this.analyser.getFloatTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
      const rms = Math.sqrt(sum / buffer.length);
      options.onLevel?.(Math.min(1, rms * 8));
      const now = performance.now();
      if (rms > 0.015) this.lastLoud = now;
      else if (now - this.lastLoud > silenceMs) {
        options.onSilence();
        return;
      }
      this.raf = window.requestAnimationFrame(tick);
    };
    this.raf = window.requestAnimationFrame(tick);
  }

  stop(): void {
    this.stopped = true;
    if (this.raf) window.cancelAnimationFrame(this.raf);
    if (this.timeout) window.clearTimeout(this.timeout);
    this.raf = 0;
    this.timeout = 0;
    try {
      this.source?.disconnect();
      this.analyser?.disconnect();
    } catch {
      /* noop */
    }
    this.source = null;
    this.analyser = null;
    releaseStream(this.stream);
    this.stream = null;
  }
}
