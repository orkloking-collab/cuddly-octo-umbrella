// Simple Web Audio API Synthesizer for Romantic Ambiance
class AmbientSoundManager {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.currentSound = null; // 'rain', 'cozy', 'warm'
    this.gainNode = null;
    this.nodes = [];
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  stop() {
    this.nodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch {
        // ignore
      }
    });
    this.nodes = [];
    this.isPlaying = false;
    this.currentSound = null;
  }

  playRain() {
    this.init();
    this.stop();

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 850;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.25;

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start();
    this.nodes.push(whiteNoise, filter, gain);
    this.gainNode = gain;
    this.isPlaying = true;
    this.currentSound = 'rain';
  }

  playWarmPad() {
    this.init();
    this.stop();

    const freqs = [130.81, 164.81, 196.00, 246.94]; // C-E-G-B warm ambient romantic chord
    const gain = this.ctx.createGain();
    gain.gain.value = 0.08;

    freqs.forEach(f => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;

      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.15 + Math.random() * 0.1;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 4;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      osc.connect(filter);
      filter.connect(gain);

      osc.start();
      lfo.start();
      this.nodes.push(osc, lfo, lfoGain, filter);
    });

    gain.connect(this.ctx.destination);
    this.nodes.push(gain);
    this.gainNode = gain;
    this.isPlaying = true;
    this.currentSound = 'warm';
  }

  setVolume(val) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }
}

export const ambientSound = new AmbientSoundManager();
