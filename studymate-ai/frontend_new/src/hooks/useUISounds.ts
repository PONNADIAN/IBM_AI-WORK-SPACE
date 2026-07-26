// hooks/useUISounds.ts — Procedural Web Audio API sounds for UI feedback

import { useEffect, useCallback, useRef } from 'react';

// Shared AudioContext to prevent creating multiple instances
let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export function useUISounds() {
  const enabled = useRef(true); // Can be toggled if user wants mute

  const playTone = useCallback((freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
    if (!enabled.current) return;
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Envelope
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, []);

  const playHover = useCallback(() => {
    // Subtle tick
    playTone(800, 'sine', 0.05, 0.02);
  }, [playTone]);

  const playClick = useCallback(() => {
    // Tech blip
    playTone(1200, 'square', 0.1, 0.03);
    setTimeout(() => playTone(1800, 'sine', 0.1, 0.02), 50);
  }, [playTone]);

  const playSuccess = useCallback(() => {
    // Ascending chime
    playTone(440, 'sine', 0.2, 0.05);
    setTimeout(() => playTone(554.37, 'sine', 0.2, 0.05), 100);
    setTimeout(() => playTone(659.25, 'sine', 0.4, 0.05), 200);
  }, [playTone]);

  const playError = useCallback(() => {
    // Low buzz
    playTone(150, 'sawtooth', 0.3, 0.05);
    setTimeout(() => playTone(100, 'sawtooth', 0.4, 0.05), 100);
  }, [playTone]);

  // Global listeners for buttons and links
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('a') || target.closest('.sidebar-item')) {
        playHover();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('a') || target.closest('.sidebar-item')) {
        playClick();
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [playHover, playClick]);

  return { playHover, playClick, playSuccess, playError };
}
