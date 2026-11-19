const SOUND_STORAGE_KEY = 'denetflix:sound-enabled';

let audioCtx: AudioContext | null = null;
const listeners = new Set<() => void>();

function readStoredPreference(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return true;
    const raw = window.localStorage.getItem(SOUND_STORAGE_KEY);
    if (raw === 'false') return false;
    return true;
  } catch {
    return true;
  }
}

let soundEnabled = readStoredPreference();

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(next: boolean): void {
  soundEnabled = next;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SOUND_STORAGE_KEY, String(next));
    }
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
  for (const listener of listeners) {
    listener();
  }
}

export function toggleSoundEnabled(): boolean {
  const next = !soundEnabled;
  setSoundEnabled(next);
  if (next) {
    playPopSelect(true);
  }
  return next;
}

export function subscribeSoundPreference(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getAudioContext(): AudioContext | null {
  if (!soundEnabled || typeof window === 'undefined') return null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtx) {
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function scheduleTone(
  ctx: AudioContext,
  options: {
    freqStart: number;
    freqEnd?: number;
    durationSec: number;
    delaySec?: number;
    gainPeak: number;
    type?: OscillatorType;
  },
): void {
  const startTime = ctx.currentTime + (options.delaySec ?? 0);
  const stopTime = startTime + options.durationSec;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = options.type ?? 'triangle';
  osc.frequency.setValueAtTime(options.freqStart, startTime);
  if (options.freqEnd && options.freqEnd !== options.freqStart) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, options.freqEnd), stopTime);
  }

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(options.gainPeak, startTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(stopTime + 0.02);
}

/** Playful retro synth blip when toggling a quiz answer option */
export function playPopSelect(selecting: boolean): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    scheduleTone(ctx, {
      freqStart: selecting ? 440 : 340,
      freqEnd: selecting ? 660 : 230,
      durationSec: 0.085,
      gainPeak: 0.055,
      type: 'triangle',
    });
  } catch {
    // Non-critical audio feedback
  }
}

/** Tactile VHS cassette deck click when stepping between quiz questions */
export function playStepTransition(direction: 'next' | 'back'): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    scheduleTone(ctx, {
      freqStart: direction === 'next' ? 320 : 280,
      freqEnd: direction === 'next' ? 480 : 210,
      durationSec: 0.07,
      gainPeak: 0.045,
      type: 'sine',
    });
  } catch {
    // Non-critical
  }
}

/** Subtle ascending chime when launching the movie archive search */
export function playReelSpin(): void {
  preloadToastyAudio();
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    scheduleTone(ctx, {freqStart: 330, freqEnd: 440, durationSec: 0.09, gainPeak: 0.045, type: 'triangle'});
    scheduleTone(ctx, {freqStart: 440, freqEnd: 587, durationSec: 0.11, delaySec: 0.075, gainPeak: 0.045, type: 'triangle'});
  } catch {
    // Non-critical
  }
}

/** Short 80s synth chord when the movie lineup lands */
export function playResultsReady(hasMatches: boolean): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (hasMatches) {
      scheduleTone(ctx, {freqStart: 392, durationSec: 0.11, delaySec: 0, gainPeak: 0.035, type: 'triangle'});
      scheduleTone(ctx, {freqStart: 494, durationSec: 0.11, delaySec: 0.07, gainPeak: 0.035, type: 'triangle'});
      scheduleTone(ctx, {freqStart: 587, durationSec: 0.16, delaySec: 0.14, gainPeak: 0.04, type: 'triangle'});
    } else {
      scheduleTone(ctx, {freqStart: 294, freqEnd: 220, durationSec: 0.16, gainPeak: 0.04, type: 'sine'});
    }
  } catch {
    // Non-critical
  }
}

/** Soft film-frame click when paging results or opening a trailer */
export function playPageFlip(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    scheduleTone(ctx, {
      freqStart: 520,
      freqEnd: 380,
      durationSec: 0.065,
      gainPeak: 0.04,
      type: 'sine',
    });
  } catch {
    // Non-critical
  }
}

const TOASTY_AUDIO_URL = './assets/toasty-trimmed.mp3';
let toastyBuffer: AudioBuffer | null = null;
let toastyBufferPromise: Promise<AudioBuffer | null> | null = null;

/**
 * Pre-fetches and decodes the trimmed "Toasty!" audio clip (zero leading silence)
 * while AudioContext is unlocked during quiz submission, guaranteeing instant playback.
 */
export function preloadToastyAudio(): void {
  if (typeof window === 'undefined' || toastyBuffer || toastyBufferPromise) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  toastyBufferPromise = fetch(TOASTY_AUDIO_URL)
    .then((res) => (res.ok ? res.arrayBuffer() : null))
    .then((buf) => (buf ? ctx.decodeAudioData(buf.slice(0)) : null))
    .then((decoded) => {
      toastyBuffer = decoded;
      return decoded;
    })
    .catch(() => null);
}

/** Plays the trimmed "Toasty!" shout immediately with zero leading silence */
export function playToastyShout(): void {
  if (!soundEnabled || typeof window === 'undefined') return;

  const playViaHtmlAudio = () => {
    try {
      const el = new Audio(TOASTY_AUDIO_URL);
      el.volume = 0.88;
      el.currentTime = 0;
      void el.play().catch(() => {
        // Autoplay may be restricted if no prior gesture occurred
      });
    } catch {
      // Non-critical
    }
  };

  try {
    const ctx = getAudioContext();
    if (!ctx) {
      playViaHtmlAudio();
      return;
    }

    const triggerBuffer = (buffer: AudioBuffer) => {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      gain.gain.setValueAtTime(0.92, ctx.currentTime);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
    };

    if (toastyBuffer) {
      triggerBuffer(toastyBuffer);
      return;
    }

    if (!toastyBufferPromise) {
      preloadToastyAudio();
    }

    if (toastyBufferPromise) {
      void toastyBufferPromise.then((decoded) => {
        if (!soundEnabled) return;
        if (decoded) {
          triggerBuffer(decoded);
        } else {
          playViaHtmlAudio();
        }
      });
    } else {
      playViaHtmlAudio();
    }
  } catch {
    playViaHtmlAudio();
  }
}
