// Tiny procedural sound engine — no audio assets, just oscillators. Kept warm
// and soft to match the cozy tone of the game. Honours a global mute flag.

type Voice = { freq: number; dur: number; type?: OscillatorType; delay?: number; gain?: number };

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  // browsers start the context suspended until a user gesture
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function play(voices: Voice[]) {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  for (const v of voices) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = v.type ?? 'sine';
    osc.frequency.value = v.freq;
    const start = now + (v.delay ?? 0);
    const peak = v.gain ?? 0.12;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + v.dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + v.dur + 0.02);
  }
}

const C = 261.63;
const E = 329.63;
const G = 392.0;
const Chi = 523.25;

export const sfx = {
  setMuted(m: boolean) {
    muted = m;
  },
  /** call from a user gesture to unlock audio on mobile */
  unlock() {
    getCtx();
  },
  tap() {
    play([{ freq: 540, dur: 0.06, type: 'triangle', gain: 0.06 }]);
  },
  select(step: number) {
    // rising notes as you connect more letters
    play([{ freq: 360 + step * 45, dur: 0.09, type: 'sine', gain: 0.08 }]);
  },
  found() {
    play([
      { freq: C, dur: 0.14, type: 'triangle' },
      { freq: G, dur: 0.16, type: 'triangle', delay: 0.06 },
    ]);
  },
  bonus() {
    play([
      { freq: E, dur: 0.12, type: 'triangle' },
      { freq: Chi, dur: 0.18, type: 'triangle', delay: 0.07 },
    ]);
  },
  reject() {
    play([{ freq: 180, dur: 0.16, type: 'sawtooth', gain: 0.07 }]);
  },
  coin() {
    play([
      { freq: Chi, dur: 0.08, type: 'square', gain: 0.05 },
      { freq: Chi * 1.5, dur: 0.1, type: 'square', gain: 0.04, delay: 0.05 },
    ]);
  },
  levelComplete() {
    play([
      { freq: C, dur: 0.2, type: 'triangle', delay: 0.0 },
      { freq: E, dur: 0.2, type: 'triangle', delay: 0.12 },
      { freq: G, dur: 0.2, type: 'triangle', delay: 0.24 },
      { freq: Chi, dur: 0.4, type: 'triangle', delay: 0.36 },
    ]);
  },
};
