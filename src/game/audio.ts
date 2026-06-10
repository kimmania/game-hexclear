import type { GameSettings } from './settings';

type SoundName = 'slide' | 'blocked' | 'win' | 'tap';

let context: AudioContext | null = null;
let enabled = true;

function getContext(): AudioContext | null {
  if (!enabled) return null;
  if (!context) {
    context = new AudioContext();
  }
  if (context.state === 'suspended') {
    void context.resume();
  }
  return context;
}

export function configureAudio(settings: GameSettings): void {
  enabled = settings.sound;
}

function tone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.08,
): void {
  const ctx = getContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const amp = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  amp.gain.value = gain;
  amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  oscillator.connect(amp);
  amp.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);
}

export function playSound(name: SoundName): void {
  switch (name) {
    case 'slide':
      tone(420, 0.05, 'triangle');
      tone(620, 0.06, 'sine', 0.05);
      break;
    case 'blocked':
      tone(160, 0.12, 'sawtooth', 0.04);
      break;
    case 'win':
      tone(523, 0.1);
      window.setTimeout(() => tone(659, 0.1), 90);
      window.setTimeout(() => tone(784, 0.16), 180);
      break;
    case 'tap':
      tone(380, 0.03, 'sine', 0.03);
      break;
  }
}

export function primeAudio(): void {
  void getContext()?.resume();
}
