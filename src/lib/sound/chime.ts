// Utilitário de Alerta Sonoro Sintetizado via Web Audio API
// Não depende de arquivos externos, não causa requisições de rede e funciona em navegadores modernos desktop e mobile

class SoundAlertManager {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }

    return this.audioCtx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // Chime suave e elegante para aviso de aproximação (2 min restantes)
  public playGentleChime() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Primeiro tom: D5 (587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.12, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.9);

      // Segundo tom: A5 (880.00 Hz) após 180ms - Acorde suave
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880.0, now + 0.18);

      gain2.gain.setValueAtTime(0, now + 0.18);
      gain2.gain.linearRampToValueAtTime(0.1, now + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.18);
      osc2.stop(now + 1.2);
    } catch (e) {
      console.warn("Falha ao reproduzir áudio Web Audio API:", e);
    }
  }

  // Alerta de tempo esgotado / Lavatório (campainha dupla sutil)
  public playTimeUpAlert() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Tom 1: C6 (1046.5 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(1046.5, now);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.15, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.5);

      // Tom 2: E6 (1318.5 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(1318.5, now + 0.15);

      gain2.gain.setValueAtTime(0, now + 0.15);
      gain2.gain.linearRampToValueAtTime(0.18, now + 0.19);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.15);
      osc2.stop(now + 0.8);
    } catch (e) {
      console.warn("Falha ao reproduzir áudio Web Audio API:", e);
    }
  }

  // Acorde triunfante para comemoração de meta batida
  public playSuccessTone() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Arpejo ascendente alegre e elegante: C5, E5, G5, C6
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + index * 0.1;
        const dur = 0.55;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.12, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + dur);
      });
    } catch (e) {
      console.warn("Falha ao reproduzir áudio Web Audio API:", e);
    }
  }
}

export const soundManager = new SoundAlertManager();

export function playSuccessTone() {
  soundManager.playSuccessTone();
}
