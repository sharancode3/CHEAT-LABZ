const DEFAULT_VOLUME = 0.18;

let audioContext = null;
let masterGain = null;
let muted = true;

function getContext() {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = muted ? 0 : DEFAULT_VOLUME;
    masterGain.connect(audioContext.destination);
  }

  return audioContext;
}

function ensureRunning() {
  const context = getContext();
  if (!context) {
    return null;
  }

  if (context.state === 'suspended') {
    context.resume();
  }

  return context;
}

function playTone({ frequency = 440, type = 'sine', duration = 0.12, volume = DEFAULT_VOLUME, bendTo = null } = {}) {
  const context = ensureRunning();
  if (!context || !masterGain) {
    return null;
  }

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gainNode.gain.value = volume;

  oscillator.connect(gainNode);
  gainNode.connect(masterGain);
  oscillator.start();

  if (bendTo != null) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, bendTo), context.currentTime + duration);
  }

  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  oscillator.stop(context.currentTime + duration + 0.01);
  return oscillator;
}

function playBeepUp() {
  return playTone({ frequency: 440, bendTo: 660, type: 'triangle', duration: 0.12, volume: 0.16 });
}

function playBeepDown() {
  return playTone({ frequency: 520, bendTo: 260, type: 'sawtooth', duration: 0.14, volume: 0.14 });
}

function playSuccess() {
  const context = ensureRunning();
  if (!context || !masterGain) {
    return null;
  }

  const frequencies = [523.25, 659.25, 783.99];
  frequencies.forEach((frequency, index) => {
    window.setTimeout(() => playTone({ frequency, type: 'triangle', duration: 0.1, volume: 0.12 }), index * 50);
  });
  return true;
}

function playError() {
  return playTone({ frequency: 160, bendTo: 90, type: 'sawtooth', duration: 0.18, volume: 0.2 });
}

function setMuted(nextMuted) {
  muted = Boolean(nextMuted);
  const context = getContext();
  if (context && masterGain) {
    masterGain.gain.value = muted ? 0 : DEFAULT_VOLUME;
  }
}

function isMuted() {
  return muted;
}

export const Sound = {
  getContext,
  playTone,
  playBeepUp,
  playBeepDown,
  playSuccess,
  playError,
  setMuted,
  isMuted,
};

export {
  DEFAULT_VOLUME,
  getContext,
  playTone,
  playBeepUp,
  playBeepDown,
  playSuccess,
  playError,
  setMuted,
  isMuted,
};

export default Sound;