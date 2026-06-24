/**
 * Web Audio API Sound Engine
 * Generates simple tones/beeps for game events without downloading external files.
 */

class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.muted = true; // Muted by default as per spec
  }

  /**
   * Initializes the AudioContext. Must be called after a user gesture.
   */
  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  /**
   * Plays a simple procedural tone
   * @param {number} freq - Frequency in Hz
   * @param {string} type - Oscillator type ('sine', 'square', 'sawtooth', 'triangle')
   * @param {number} duration - Duration in seconds
   * @param {number} vol - Volume level 0 to 1
   */
  playTone(freq, type = 'sine', duration = 0.1, vol = 0.1) {
    if (this.muted) return;
    this.init(); // ensure context exists

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

    gainNode.gain.setValueAtTime(vol, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + duration);
  }

  // Pre-defined sound effects

  playBlip() {
    this.playTone(600, 'square', 0.05, 0.05);
  }

  playCoin() {
    if (this.muted) return;
    this.init();
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(988, this.audioCtx.currentTime); // B5
    osc.frequency.setValueAtTime(1319, this.audioCtx.currentTime + 0.08); // E6
    
    gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);
    
    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.3);
  }

  playDamage() {
    this.playTone(150, 'sawtooth', 0.2, 0.1);
  }

  playGameOver() {
    if (this.muted) return;
    this.init();
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, this.audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, this.audioCtx.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.5);
  }
}

export const Sound = new SoundEngine();
window.Sound = Sound;
