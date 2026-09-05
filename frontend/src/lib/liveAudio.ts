'use client';

/**
 * Web Audio plumbing for streaming voice.
 *
 * Two independent halves, because the Live API uses two different rates:
 *   * capture  — microphone at whatever the device gives us, downsampled to
 *                16 kHz PCM16, which is what Gemini Live accepts
 *   * playback — 24 kHz PCM16 coming back, scheduled gaplessly
 *
 * The playback side exists rather than using `new Audio()` per chunk for one
 * reason: **barge-in**. Audio arrives in ~20 ms slices and is scheduled ahead
 * of the clock, so when the user interrupts there is already buffered speech
 * queued. `flush()` has to be able to kill it instantly, and you cannot
 * un-play an <audio> element that has already started.
 */

export const MIC_SAMPLE_RATE = 16000;
export const PLAYBACK_SAMPLE_RATE = 24000;

/**
 * The capture worklet, inlined and loaded from a Blob URL.
 *
 * Inlined because `addModule` needs a URL and this app is a static export —
 * shipping a separate /public file would be one more thing to keep in sync
 * with the hook that depends on it.
 *
 * Downsampling is nearest-neighbour on purpose. Proper resampling of speech
 * for a VAD to chew on is not worth the CPU in an always-on capture path, and
 * the transcription quality is measurably fine.
 */
const CAPTURE_WORKLET = `
class CaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.targetRate = options.processorOptions.targetRate;
    this.ratio = sampleRate / this.targetRate;
    this.buffer = [];
    this.cursor = 0;
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];
    for (let i = 0; i < channel.length; i += 1) {
      this.cursor += 1;
      if (this.cursor >= this.ratio) {
        this.cursor -= this.ratio;
        let s = channel[i];
        s = s < -1 ? -1 : s > 1 ? 1 : s;
        this.buffer.push(s < 0 ? s * 0x8000 : s * 0x7fff);
      }
    }
    // ~20ms at 16kHz. Small enough for responsive VAD, large enough that we
    // are not posting a message per sample.
    if (this.buffer.length >= 320) {
      const out = new Int16Array(this.buffer);
      this.buffer = [];
      this.port.postMessage(out.buffer, [out.buffer]);
    }
    return true;
  }
}
registerProcessor('capture-processor', CaptureProcessor);
`;

export interface MicStream {
  stop: () => void;
  /** Silence the uplink without tearing down the mic (push-to-mute). */
  setMuted: (muted: boolean) => void;
}

export async function startMicCapture(options: {
  onChunk: (pcm: ArrayBuffer) => void;
  onLevel?: (level: number) => void;
}): Promise<MicStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const context = new AudioContextClass();
  if (context.state === 'suspended') await context.resume();

  const workletUrl = URL.createObjectURL(
    new Blob([CAPTURE_WORKLET], { type: 'application/javascript' }),
  );

  let muted = false;
  let node: AudioWorkletNode | ScriptProcessorNode | null = null;
  const source = context.createMediaStreamSource(stream);

  const emit = (pcm: Int16Array) => {
    if (muted) return;
    options.onChunk(pcm.buffer as ArrayBuffer);
    if (options.onLevel) {
      let peak = 0;
      for (let i = 0; i < pcm.length; i += 8) {
        const v = Math.abs(pcm[i]);
        if (v > peak) peak = v;
      }
      options.onLevel(peak / 0x7fff);
    }
  };

  try {
    await context.audioWorklet.addModule(workletUrl);
    const worklet = new AudioWorkletNode(context, 'capture-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      processorOptions: { targetRate: MIC_SAMPLE_RATE },
    });
    worklet.port.onmessage = (event) => emit(new Int16Array(event.data as ArrayBuffer));
    source.connect(worklet);
    node = worklet;
  } catch {
    // ScriptProcessorNode is deprecated but still the only fallback where
    // AudioWorklet is unavailable. Better a deprecation than no microphone.
    const ratio = context.sampleRate / MIC_SAMPLE_RATE;
    const processor = context.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (event) => {
      const channel = event.inputBuffer.getChannelData(0);
      const outLength = Math.floor(channel.length / ratio);
      const out = new Int16Array(outLength);
      for (let i = 0; i < outLength; i += 1) {
        let s = channel[Math.floor(i * ratio)];
        s = s < -1 ? -1 : s > 1 ? 1 : s;
        out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      emit(out);
    };
    source.connect(processor);
    // Required for the processor to run in some browsers; a zero-gain sink
    // keeps it alive without the mic being audible back to the user.
    const sink = context.createGain();
    sink.gain.value = 0;
    processor.connect(sink);
    sink.connect(context.destination);
    node = processor;
  }

  return {
    setMuted: (value: boolean) => { muted = value; },
    stop: () => {
      try { source.disconnect(); } catch { /* already gone */ }
      try { node?.disconnect(); } catch { /* already gone */ }
      stream.getTracks().forEach((track) => track.stop());
      URL.revokeObjectURL(workletUrl);
      void context.close().catch(() => {});
    },
  };
}

export interface AudioPlayer {
  enqueue: (pcm: ArrayBuffer) => void;
  /** Drop everything queued and stop immediately — this is barge-in. */
  flush: () => void;
  close: () => void;
  isSpeaking: () => boolean;
}

export function createAudioPlayer(
  options: { onSpeakingChange?: (speaking: boolean) => void } = {},
): AudioPlayer {
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  // Ask for 24 kHz directly so nothing has to be resampled on the way out.
  const context = new AudioContextClass({ sampleRate: PLAYBACK_SAMPLE_RATE });

  let playHead = 0;
  let live: AudioBufferSourceNode[] = [];
  let speaking = false;

  const setSpeaking = (value: boolean) => {
    if (speaking === value) return;
    speaking = value;
    options.onSpeakingChange?.(value);
  };

  return {
    enqueue(pcm: ArrayBuffer) {
      if (!pcm.byteLength) return;
      if (context.state === 'suspended') void context.resume();

      const samples = new Int16Array(pcm);
      const buffer = context.createBuffer(1, samples.length, PLAYBACK_SAMPLE_RATE);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i += 1) channel[i] = samples[i] / 0x8000;

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);

      // Schedule against a running play head rather than "now", so
      // consecutive 20ms slices join without clicks. If we have fallen behind
      // (a network stall), restart from now instead of playing into the past.
      const now = context.currentTime;
      const startAt = playHead > now ? playHead : now + 0.02;
      source.start(startAt);
      playHead = startAt + buffer.duration;

      live.push(source);
      setSpeaking(true);
      source.onended = () => {
        live = live.filter((s) => s !== source);
        if (live.length === 0) setSpeaking(false);
      };
    },

    flush() {
      live.forEach((source) => {
        try { source.onended = null; source.stop(); } catch { /* already ended */ }
      });
      live = [];
      playHead = 0;
      setSpeaking(false);
    },

    close() {
      this.flush();
      void context.close().catch(() => {});
    },

    isSpeaking: () => speaking,
  };
}
