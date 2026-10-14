import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import {
  toggleAudio,
  isAudioEnabled,
  playV2XChime,
  playPedestrianWarning,
} from '../src/utils/audio';

describe('Audio Utility Tests', () => {
  beforeEach(() => {
    toggleAudio(false);
  });

  test('toggleAudio toggles sound enabled state correctly', () => {
    expect(isAudioEnabled()).toBe(false);

    toggleAudio(true);
    expect(isAudioEnabled()).toBe(true);

    toggleAudio();
    expect(isAudioEnabled()).toBe(false);

    toggleAudio();
    expect(isAudioEnabled()).toBe(true);
  });

  test('playV2XChime does not throw when audio is disabled', () => {
    toggleAudio(false);
    expect(() => playV2XChime('CRITICAL')).not.toThrow();
    expect(() => playV2XChime('MODULAR')).not.toThrow();
    expect(() => playV2XChime('INFO')).not.toThrow();
  });

  test('playPedestrianWarning does not throw when audio is disabled', () => {
    toggleAudio(false);
    expect(() => playPedestrianWarning()).not.toThrow();
  });

  test('handles webkitAudioContext fallback and already-running context', () => {
    const mockGain = {
      connect: jest.fn(),
      gain: {
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
      },
    };
    const mockOscillator = {
      connect: jest.fn(),
      frequency: {
        setValueAtTime: jest.fn(),
      },
      type: '',
      start: jest.fn(),
      stop: jest.fn(),
    };

    const mockRunningContext = {
      currentTime: 10,
      state: 'running',
      resume: jest.fn(),
      createOscillator: jest.fn(() => mockOscillator),
      createGain: jest.fn(() => mockGain),
      destination: {},
    };

    (global as any).window = {
      webkitAudioContext: jest.fn(() => mockRunningContext),
    };

    toggleAudio(true);
    expect(() => playV2XChime('CRITICAL')).not.toThrow();
    expect(() => playV2XChime('MODULAR')).not.toThrow();
    expect(() => playV2XChime('INFO')).not.toThrow();
    expect(() => playPedestrianWarning()).not.toThrow();

    // Since state is 'running', resume should not be called
    expect(mockRunningContext.resume).not.toHaveBeenCalled();
  });

  test('safely handles missing window or AudioContext without crashing', () => {
    (global as any).window = {};
    toggleAudio(true);
    expect(() => playV2XChime('CRITICAL')).not.toThrow();
    expect(() => playPedestrianWarning()).not.toThrow();
  });

  test('handles audio exceptions gracefully via try-catch', () => {
    (global as any).window = {
      AudioContext: jest.fn(() => {
        throw new Error('AudioContext initialization failed');
      }),
    };

    toggleAudio(true);
    expect(() => playV2XChime('CRITICAL')).not.toThrow();
    expect(() => playPedestrianWarning()).not.toThrow();
  });
});
