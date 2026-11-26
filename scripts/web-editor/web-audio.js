// Self-contained cue synthesis for the browser workshop.
function createReplayAudio() {
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const master = context.createGain();
  master.gain.value = 0.45;
  master.connect(context.destination);
  let muted = false;
  const ambience = new Map();
  const cues = {
    step: [122, 54, 0.08], probe: [740, 310, 0.34], lure: [490, 680, 0.14],
    landing: [300, 90, 0.11], pickup: [460, 820, 0.13], reflection: [510, 360, 0.23],
    unlock: [392, 784, 0.28], exitUnlock: [494, 988, 0.4], exitPresence: [392, 494, 0.2],
    lockPresence: [294, 262, 0.2], beacon: [620, 784, 0.22], bat: [1300, 650, 0.10],
    spike: [240, 80, 0.12], mineBlast: [150, 38, 0.38], alarm: [680, 430, 0.3],
    laser: [1040, 380, 0.22], sequenceCue: [523, 659, 0.15], sequenceDone: [523, 1046, 0.3],
    sequenceReset: [330, 165, 0.24], mimic: [155, 68, 0.15],
  };
  function play(name, volume, spatial = {}) {
    if (muted) return;
    const distance = spatial.global ? 0 : (spatial.distance || 0);
    const gain = volume / (1 + 0.15 * distance);
    if (gain < 0.002) return;
    const fingerprint = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const [start, end, seconds] = cues[name] || [185 + fingerprint % 370, 100 + fingerprint % 230, 0.16];
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    oscillator.type = name === 'step' || name === 'mimic' ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(end, now + seconds);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), now + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(now);
    oscillator.stop(now + seconds + 0.015);
  }

  function hum(name, frequency, distance) {
    const audible = !muted && Number.isFinite(distance) && distance < 14;
    let voice = ambience.get(name);
    if (!audible) {
      if (voice) {
        voice.oscillator.stop();
        voice.oscillator.disconnect();
        voice.gain.disconnect();
        ambience.delete(name);
      }
      return;
    }
    if (!voice) {
      voice = { oscillator: context.createOscillator(), gain: context.createGain() };
      voice.gain.gain.value = 0;
      voice.oscillator.connect(voice.gain);
      voice.gain.connect(master);
      voice.oscillator.start();
      ambience.set(name, voice);
    }
    voice.oscillator.frequency.setTargetAtTime(frequency, context.currentTime, 0.08);
    voice.gain.gain.setTargetAtTime(0.055 * (1 - distance / 14), context.currentTime, 0.06);
  }

  const nearest = sources => sources.reduce((min, source) => Math.min(min, source.distance), Infinity);
  const audio = {
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      master.gain.value = muted ? 0 : 0.45;
      if (muted) for (const name of ambience.keys()) hum(name, 0, null);
    },
    play,
    setEnemy(distance, visible, type, mode) { hum('enemy', mode === 'chase' ? 108 : 72, distance); },
    setDecoys(sources) { hum('decoy', 178, nearest(sources)); },
    setPits(sources) { hum('pit', 49, nearest(sources)); },
    playMimic(event, spatial) { play('mimic', 0.44, spatial); },
    updateMimics() { /* Each step is played on its simulation event. */ },
  };
  return { context, audio, resume: () => context.resume() };
}

module.exports = { createReplayAudio };
