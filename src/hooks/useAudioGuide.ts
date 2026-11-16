import {useCallback, useEffect, useRef, useState} from 'react';
import {buildPlaceNarrationSentences} from '../services/placesTourService';
import type {TourPlace} from '../types/tour';

export type AudioGuideStatus = 'idle' | 'playing' | 'paused';
export type AudioPlaybackRate = 0.9 | 1 | 1.25;

export interface AudioGuideControls {
  supported: boolean;
  status: AudioGuideStatus;
  rate: AudioPlaybackRate;
  activePlaceId: string | null;
  currentSentenceIndex: number;
  totalSentences: number;
  currentSentenceText: string | null;
  playPlace: (place: TourPlace, stopNumber: number | null) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setRate: (rate: AudioPlaybackRate) => void;
}

function selectPortugueseVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const ptBrVoices = voices.filter((v) =>
    v.lang.toLowerCase().startsWith('pt-br')
  );
  if (ptBrVoices.length > 0) {
    return (
      ptBrVoices.find((v) => /google|luciana|francisca|daniel/i.test(v.name)) ||
      ptBrVoices[0]
    );
  }

  const anyPt = voices.filter((v) => v.lang.toLowerCase().startsWith('pt'));
  return anyPt[0] ?? null;
}

export function useAudioGuide(): AudioGuideControls {
  const supported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  const [status, setStatus] = useState<AudioGuideStatus>('idle');
  const [rate, setRateState] = useState<AudioPlaybackRate>(1);
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentences, setSentences] = useState<string[]>([]);

  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const sessionIdRef = useRef(0);
  const sentencesRef = useRef<string[]>([]);
  const rateRef = useRef<AudioPlaybackRate>(1);

  useEffect(() => {
    if (!supported) return;

    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();

    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      sessionIdRef.current += 1;
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const speakSentenceAt = useCallback(
    (index: number, list: string[], playbackRate: AudioPlaybackRate, session: number) => {
      if (!supported || session !== sessionIdRef.current) return;
      if (index >= list.length) {
        setStatus('idle');
        setCurrentSentenceIndex(0);
        return;
      }

      setCurrentSentenceIndex(index);
      const utterance = new SpeechSynthesisUtterance(list[index]);
      utterance.lang = 'pt-BR';
      utterance.rate = playbackRate;
      utterance.pitch = 1;

      const voice = selectPortugueseVoice(voicesRef.current);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => {
        if (session !== sessionIdRef.current) return;
        speakSentenceAt(index + 1, list, rateRef.current, session);
      };

      utterance.onerror = () => {
        if (session !== sessionIdRef.current) return;
        setStatus('idle');
        setCurrentSentenceIndex(0);
      };

      window.speechSynthesis.speak(utterance);
    },
    [supported]
  );

  const stop = useCallback(() => {
    if (!supported) return;
    sessionIdRef.current += 1;
    window.speechSynthesis.cancel();
    setStatus('idle');
    setActivePlaceId(null);
    setCurrentSentenceIndex(0);
    setSentences([]);
    sentencesRef.current = [];
  }, [supported]);

  const playPlace = useCallback(
    (place: TourPlace, stopNumber: number | null) => {
      if (!supported) return;
      sessionIdRef.current += 1;
      const currentSession = sessionIdRef.current;
      window.speechSynthesis.cancel();

      const nextSentences = buildPlaceNarrationSentences(place, stopNumber);
      sentencesRef.current = nextSentences;
      setSentences(nextSentences);
      setActivePlaceId(place.id);
      setStatus('playing');
      speakSentenceAt(0, nextSentences, rateRef.current, currentSession);
    },
    [supported, speakSentenceAt]
  );

  const pause = useCallback(() => {
    if (!supported || status !== 'playing') return;
    window.speechSynthesis.pause();
    setStatus('paused');
  }, [supported, status]);

  const resume = useCallback(() => {
    if (!supported || status !== 'paused') return;
    window.speechSynthesis.resume();
    setStatus('playing');
  }, [supported, status]);

  const setRate = useCallback(
    (nextRate: AudioPlaybackRate) => {
      rateRef.current = nextRate;
      setRateState(nextRate);

      if (
        supported &&
        status === 'playing' &&
        sentencesRef.current.length > 0
      ) {
        sessionIdRef.current += 1;
        const currentSession = sessionIdRef.current;
        window.speechSynthesis.cancel();
        speakSentenceAt(
          currentSentenceIndex,
          sentencesRef.current,
          nextRate,
          currentSession
        );
      }
    },
    [supported, status, currentSentenceIndex, speakSentenceAt]
  );

  const currentSentenceText =
    status !== 'idle' && sentences[currentSentenceIndex]
      ? sentences[currentSentenceIndex]
      : null;

  return {
    supported,
    status,
    rate,
    activePlaceId,
    currentSentenceIndex,
    totalSentences: sentences.length,
    currentSentenceText,
    playPlace,
    pause,
    resume,
    stop,
    setRate,
  };
}
