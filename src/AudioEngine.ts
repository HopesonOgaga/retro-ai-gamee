export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private masterGain: GainNode | null = null;
  private intensity = 0; // 0 to 1
  
  private nextKickTime = 0;
  private nextBassTime = 0;
  private nextArpTime = 0;
  
  private tempo = 120; // BPM
  private arpStep = 0;
  
  // A minor pentatonic scale for cyberpunk feel
  private scale = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33];
  
  private intervalId: number | null = null;

  async init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);
  }

  play() {
    if (!this.ctx) this.init();
    if (this.isPlaying) return;
    this.isPlaying = true;
    
    this.ctx?.resume();
    this.nextKickTime = this.ctx!.currentTime + 0.1;
    this.nextBassTime = this.ctx!.currentTime + 0.1;
    this.nextArpTime = this.ctx!.currentTime + 0.1;
    
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }
  
  setVolume(vol: number) {
    if (this.masterGain) {
      this.masterGain.gain.rampToValueAtTime(vol, this.ctx!.currentTime + 0.1);
    }
  }

  updateIntensity(intensity: number) {
    // Clamp intensity between 0 and 1
    this.intensity = Math.max(0, Math.min(1, intensity));
    // Tempo scales with intensity: 100 to 160 BPM
    this.tempo = 100 + (this.intensity * 60); 
  }

  private scheduler = () => {
    if (!this.isPlaying || !this.ctx) return;

    // Schedule ahead 0.1 seconds
    const scheduleAheadTime = 0.1; 
    
    while (this.nextKickTime < this.ctx.currentTime + scheduleAheadTime) {
      this.scheduleKick(this.nextKickTime);
      this.nextKickTime += (60.0 / this.tempo); 
    }
    
    while (this.nextBassTime < this.ctx.currentTime + scheduleAheadTime) {
      this.scheduleBass(this.nextBassTime);
      // Bass plays on 8th notes, maybe skips based on intensity
      this.nextBassTime += (60.0 / this.tempo) / 2;
    }
    
    while (this.nextArpTime < this.ctx.currentTime + scheduleAheadTime) {
      this.scheduleArp(this.nextArpTime);
      // Arp speed increases with intensity!
      const arpDiv = this.intensity > 0.6 ? 4 : (this.intensity > 0.3 ? 2 : 1);
      this.nextArpTime += (60.0 / this.tempo) / arpDiv;
    }

    this.intervalId = window.setTimeout(this.scheduler, 25);
  };

  private scheduleKick(time: number) {
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    // Pitch envelope for kick drum
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    
    // Volume envelope
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    
    osc.start(time);
    osc.stop(time + 0.5);
  }

  private scheduleBass(time: number) {
    if (!this.ctx || !this.masterGain) return;
    // Skip some bass notes randomly if intensity is low
    if (this.intensity < 0.8 && Math.random() > 0.5 + (this.intensity * 0.5)) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.frequency.value = 55.00; // Low A
    
    // Acid filter sweep
    filter.type = 'lowpass';
    filter.Q.value = 5 + (this.intensity * 10);
    filter.frequency.setValueAtTime(100, time);
    filter.frequency.exponentialRampToValueAtTime(1000 + (this.intensity * 2000), time + 0.1);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);
    
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    
    osc.start(time);
    osc.stop(time + 0.2);
  }

  private scheduleArp(time: number) {
    if (!this.ctx || !this.masterGain || this.intensity < 0.2) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = Math.random() > 0.5 ? 'square' : 'triangle';
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    // Note selection algorithm changes based on intensity
    const maxIndex = Math.min(this.scale.length - 1, 3 + Math.floor(this.intensity * 5));
    const noteIndex = Math.floor(Math.random() * maxIndex);
    
    // Random octave jumps at high intensity
    const octave = (this.intensity > 0.7 && Math.random() > 0.7) ? 2 : 1;
    osc.frequency.value = this.scale[noteIndex] * octave;
    
    gain.gain.setValueAtTime(0.1 + (this.intensity * 0.1), time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    
    osc.start(time);
    osc.stop(time + 0.15);
  }
}

export const audioEngine = new AudioEngine();
