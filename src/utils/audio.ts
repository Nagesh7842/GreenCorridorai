// Web Audio API Synthesizer for V2X Alerts and Emergency Chimes
let audioCtx: AudioContext | null = null;
let soundEnabled = false;

export function toggleAudio(enable?: boolean): boolean {
  if (typeof enable === 'boolean') {
    soundEnabled = enable;
  } else {
    soundEnabled = !soundEnabled;
  }

  if (soundEnabled && !audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return soundEnabled;
}

export function isAudioEnabled(): boolean {
  return soundEnabled;
}

export function playV2XChime(priority: 'CRITICAL' | 'MODULAR' | 'INFO' = 'CRITICAL') {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (priority === 'CRITICAL') {
      // Two-tone urgent V2X chime
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.setValueAtTime(1174.66, now + 0.12); // D6
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.start(now);
      osc.stop(now + 0.36);
    } else if (priority === 'MODULAR') {
      // Soft informative double beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.start(now);
      osc.stop(now + 0.22);
    } else {
      // Subtle low notification
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.start(now);
      osc.stop(now + 0.16);
    }
  } catch (e) {
    console.debug('Audio play prevented', e);
  }
}

export function playPedestrianWarning() {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.setValueAtTime(420, now + 0.1);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.start(now);
    osc.stop(now + 0.26);
  } catch (e) {
    console.debug('Pedestrian audio warning', e);
  }
}
