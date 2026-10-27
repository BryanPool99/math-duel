import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SoundService {
  private ctx: AudioContext | null = null;
  private enabled = true;

  constructor() {
    try {
      const stored = localStorage.getItem('math-duel:sound');
      if (stored === 'off') this.enabled = false;
    } catch {
      // Ignora si localStorage no está disponible.
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem('math-duel:sound', this.enabled ? 'on' : 'off');
    } catch {
      // Ignora.
    }
    return this.enabled;
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    try {
      localStorage.setItem('math-duel:sound', this.enabled ? 'on' : 'off');
    } catch {
      // Ignora.
    }
  }

  /** Debe llamarse desde un gesto del usuario para desbloquear el contexto de audio. */
  unlock(): void {
    if (!this.enabled) return;
    this.ensure().resume().catch(() => undefined);
  }

  click(): void {
    this.tone(660, 0.06, 'triangle', 0.08);
  }

  countdown(value: number): void {
    this.tone(value === 0 ? 880 : 520, 0.08, 'sine', 0.09);
  }

  correct(): void {
    if (!this.enabled) return;
    const ctx = this.ensure();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, now);
    osc.frequency.exponentialRampToValueAtTime(784, now + 0.12);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  wrong(): void {
    this.tone(196, 0.14, 'sawtooth', 0.09);
  }

  aiScore(): void {
    this.tone(330, 0.08, 'triangle', 0.07);
  }

  tickUrgent(): void {
    this.tone(440, 0.05, 'square', 0.05);
  }

  win(): void {
    if (!this.enabled) return;
    const ctx = this.ensure();
    const notes = [523, 659, 784];
    notes.forEach((freq, i) => {
      const now = ctx.currentTime + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.1, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    });
  }

  lose(): void {
    this.tone(220, 0.16, 'sawtooth', 0.07);
  }

  private tone(freq: number, duration: number, type: OscillatorType, volume: number): void {
    if (!this.enabled) return;
    const ctx = this.ensure();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx;
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    this.ctx = new Ctx();
    return this.ctx as AudioContext;
  }
}
