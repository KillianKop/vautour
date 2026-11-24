/**
 * Sound: voice guidance (speech synthesis), chimes and vario beeps (Web Audio).
 * Mobile browsers (Safari iOS in particular) only allow audio after a user gesture:
 * call `unlock()` from a tap handler before the first sound.
 */

type AudioCtor = typeof AudioContext;

export class Sound {
  enabled = true;
  private ctx: AudioContext | null = null;
  private nextBeep = 0;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    const synth = this.synth();
    if (synth) {
      const load = () => (this.voices = synth.getVoices());
      load();
      synth.addEventListener?.("voiceschanged", load);
    }
  }

  private synth(): SpeechSynthesis | null {
    return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
  }

  /** Create / resume the audio context and warm up speech; must run inside a tap handler. */
  unlock(): void {
    try {
      const Ctor = (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext) as
        | AudioCtor
        | undefined;
      if (!this.ctx && Ctor) this.ctx = new Ctor();
      void this.ctx?.resume();
      const synth = this.synth();
      if (synth) {
        const warmUp = new SpeechSynthesisUtterance(" ");
        warmUp.volume = 0;
        synth.speak(warmUp);
      }
    } catch {
      this.ctx = null;
    }
  }

  tone(freq: number, duration: number, volume = 0.06, delay = 0): void {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t0 = this.ctx.currentTime + delay;
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    } catch {
      // audio is a nice-to-have: never break the app for it
    }
  }

  chime(): void {
    this.tone(880, 0.18, 0.08);
    this.tone(1320, 0.3, 0.08, 0.16);
  }

  /** Vario beeps while climbing: pitch and cadence grow with the climb rate (m/s). */
  vario(nowMs: number, rate: number, active: boolean): void {
    if (!active || rate < 0.3 || nowMs < this.nextBeep) return;
    this.tone(600 + 120 * rate, 0.09, 0.035);
    this.nextBeep = nowMs + Math.min(Math.max(520 - 90 * rate, 140), 520);
  }

  say(text: string, lang: string): void {
    const synth = this.synth();
    if (!this.enabled || !synth || !text) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 1.05;
      const voice = this.voices.find((v) => v.lang.replace("_", "-").startsWith(lang.slice(0, 2)));
      if (voice) u.voice = voice;
      synth.cancel();
      synth.speak(u);
    } catch {
      // ignore: some browsers expose the API without voices
    }
  }

  stopSpeaking(): void {
    try {
      this.synth()?.cancel();
    } catch {
      // ignore
    }
  }
}
