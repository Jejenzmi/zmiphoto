/**
 * Audio service for kiosk sound effects and background music.
 * Uses Web Audio API for synthesized sounds (no external dependencies).
 */

let audioCtx: AudioContext | null = null;
let bgMusicGain: GainNode | null = null;
let bgMusicOsc: OscillatorNode | null = null;
let bgMusicRunning = false;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

/** Resume AudioContext (must be called from user gesture) */
export function initAudio() {
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();
}

/** Short beep for countdown */
export function playCountdownBeep(pitch: "high" | "normal" = "normal") {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = pitch === "high" ? 880 : 660;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

/** Camera shutter click sound */
export function playShutterClick() {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // White noise burst with fast decay = click
    for (let i = 0; i < bufferSize; i++) {
      const envelope = Math.exp(-i / (ctx.sampleRate * 0.01));
      data[i] = (Math.random() * 2 - 1) * envelope * 0.5;
    }

    // Add a thump
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.05);
    oscGain.gain.setValueAtTime(0.4, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(ctx.currentTime);
  } catch {}
}

/** Success chime (session complete) */
export function playSuccessChime() {
  try {
    const ctx = getCtx();
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  } catch {}
}

/** Payment success cash register sound */
export function playPaymentSuccess() {
  try {
    const ctx = getCtx();
    // Ascending arpeggio: ka-ching!
    const notes = [659, 880, 1175, 1568]; // E5, A5, D6, G6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i < 2 ? "triangle" : "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + (i === 3 ? 0.6 : 0.2));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + (i === 3 ? 0.6 : 0.2));
    });
    // Add a shimmer noise burst
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03)) * 0.1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(ctx.currentTime + 0.24);
  } catch {}
}

/** Points earned jingle */
export function playPointsEarned() {
  try {
    const ctx = getCtx();
    const notes = [784, 988, 1175]; // G5, B5, D6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  } catch {}
}

/** QR Code ready notification sound - gentle ding */
export function playQrReady() {
  try {
    const ctx = getCtx();
    // Two-tone gentle notification
    const notes = [784, 1047]; // G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch {}
}

export function playError() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

/** Ambient background music loop (subtle synth pad) */
export function startBackgroundMusic() {
  if (bgMusicRunning) return;
  try {
    const ctx = getCtx();
    bgMusicGain = ctx.createGain();
    bgMusicGain.gain.value = 0.03; // Very quiet

    // Create a warm ambient pad with multiple oscillators
    const freqs = [130.81, 164.81, 196.0, 261.63]; // C3, E3, G3, C4
    const oscillators: OscillatorNode[] = [];

    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      // Slight detune for warmth
      osc.detune.value = Math.random() * 10 - 5;
      osc.connect(bgMusicGain!);
      osc.start();
      oscillators.push(osc);
    });

    // Add subtle LFO for movement
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 0.2;
    lfoGain.gain.value = 0.01;
    lfo.connect(lfoGain);
    lfoGain.connect(bgMusicGain!.gain);
    lfo.start();

    bgMusicGain.connect(ctx.destination);
    bgMusicRunning = true;

    // Store for cleanup
    (bgMusicGain as any)._oscillators = oscillators;
    (bgMusicGain as any)._lfo = lfo;
  } catch {}
}

export function stopBackgroundMusic() {
  if (!bgMusicRunning || !bgMusicGain) return;
  try {
    const oscs = (bgMusicGain as any)._oscillators as OscillatorNode[];
    const lfo = (bgMusicGain as any)._lfo as OscillatorNode;
    oscs?.forEach((o) => { try { o.stop(); } catch {} });
    try { lfo?.stop(); } catch {}
    bgMusicGain.disconnect();
    bgMusicRunning = false;
  } catch {}
}

export function setBackgroundMusicVolume(vol: number) {
  if (bgMusicGain) bgMusicGain.gain.value = Math.max(0, Math.min(0.1, vol));
}

export function isBackgroundMusicPlaying() {
  return bgMusicRunning;
}
