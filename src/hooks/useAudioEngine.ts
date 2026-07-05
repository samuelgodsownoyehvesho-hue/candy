import { useCallback, useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

export interface UseAudioEngineResult {
  containerRef: React.RefObject<HTMLDivElement>;
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  error: string | null;
  /** full decoded buffer, used by the spectrogram worker; null until decoded */
  decodedBuffer: AudioBuffer | null;
  isDecoding: boolean;
  analyserNode: AnalyserNode | null;
  togglePlay: () => void;
  seekBy: (deltaSeconds: number) => void;
  seekToFraction: (fraction: number) => void;
  setVolume: (v: number) => void;
}

/**
 * Wires a WaveSurfer instance to a container ref for waveform + playback,
 * and independently decodes the full track into an AudioBuffer for the
 * spectrogram worker. A separate Web Audio AnalyserNode is tapped off the
 * WaveSurfer media element for the live frequency analyzer.
 */
export function useAudioEngine(audioUrl: string | null): UseAudioEngineResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [error, setError] = useState<string | null>(null);
  const [decodedBuffer, setDecodedBuffer] = useState<AudioBuffer | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  // Re-render when the analyser becomes available (it's created inside a
  // WaveSurfer event callback, after the initial effect run).
  const [, forceRerender] = useState(0);

  useEffect(() => {
    if (!audioUrl || !containerRef.current) {
      setIsReady(false);
      setDuration(0);
      setCurrentTime(0);
      setDecodedBuffer(null);
      return;
    }

    setIsReady(false);
    setError(null);
    setDecodedBuffer(null);
    setIsPlaying(false);
    setCurrentTime(0);

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(63, 232, 201, 0.35)',
      progressColor: '#E8A33D',
      cursorColor: '#F2EFE9',
      cursorWidth: 1,
      height: 88,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      normalize: true,
      url: audioUrl,
    });
    wavesurferRef.current = ws;

    ws.on('ready', () => {
      setDuration(ws.getDuration());
      setIsReady(true);
      ws.setVolume(volume);

      try {
        const mediaEl = ws.getMediaElement();
        const AudioCtx = window.AudioContext;
        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaElementSource(mediaEl);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
        sourceRef.current = source;
        forceRerender((n) => n + 1);
      } catch (e) {
        // Non-fatal: waveform + playback still work without the live analyser.
        console.warn('Frequency analyser unavailable in this browser', e);
      }
    });

    ws.on('timeupdate', (t: number) => setCurrentTime(t));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));
    ws.on('error', () => setError('Could not load this audio file for playback.'));

    // Independently decode the full buffer for the spectrogram worker. This
    // uses its own short-lived AudioContext and never touches the playback
    // graph above.
    let cancelled = false;
    setIsDecoding(true);
    fetch(audioUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const DecodeCtx = window.AudioContext;
        const decodeCtx = new DecodeCtx();
        return decodeCtx.decodeAudioData(buf).finally(() => decodeCtx.close());
      })
      .then((audioBuffer) => {
        if (!cancelled) setDecodedBuffer(audioBuffer);
      })
      .catch(() => {
        if (!cancelled) {
          setError((prev) => prev ?? 'Could not analyze this audio file.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsDecoding(false);
      });

    return () => {
      cancelled = true;
      try {
        sourceRef.current?.disconnect();
        analyserRef.current?.disconnect();
        audioContextRef.current?.close();
      } catch {
        /* already torn down */
      }
      sourceRef.current = null;
      analyserRef.current = null;
      audioContextRef.current = null;
      ws.destroy();
      wavesurferRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    audioContextRef.current?.resume();
    wavesurferRef.current?.playPause();
  }, []);

  const seekBy = useCallback((deltaSeconds: number) => {
    const ws = wavesurferRef.current;
    if (!ws || !ws.getDuration()) return;
    const dur = ws.getDuration();
    const next = Math.min(Math.max(ws.getCurrentTime() + deltaSeconds, 0), dur);
    ws.seekTo(next / dur);
  }, []);

  const seekToFraction = useCallback((fraction: number) => {
    wavesurferRef.current?.seekTo(Math.min(Math.max(fraction, 0), 1));
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    wavesurferRef.current?.setVolume(v);
  }, []);

  return {
    containerRef,
    isReady,
    isPlaying,
    currentTime,
    duration,
    volume,
    error,
    decodedBuffer,
    isDecoding,
    analyserNode: analyserRef.current,
    togglePlay,
    seekBy,
    seekToFraction,
    setVolume,
  };
}
