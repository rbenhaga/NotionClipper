/**
 * VoiceRecorder Component - Premium Design
 * Enregistrement vocal avec design moderne Apple/Notion
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '../common/MotionWrapper';
import { Mic, Square, Play, Pause, Trash2, Loader, Clock, Languages } from 'lucide-react';
import { useTranslation } from '@notion-clipper/i18n';

export interface VoiceRecording {
  id: string;
  blob: Blob;
  duration: number;
  timestamp: Date;
  transcription?: string;
  isTranscribing?: boolean;
}

export interface VoiceRecorderProps {
  onRecordingComplete?: (recording: VoiceRecording) => void;
  onTranscriptionComplete?: (text: string, recordingId: string) => void;
  maxDuration?: number;
  autoTranscribe?: boolean;
  language?: string;
  className?: string;
}

export function VoiceRecorder({
  onRecordingComplete,
  onTranscriptionComplete,
  maxDuration = 300,
  autoTranscribe = true,
  language = 'fr-FR',
  className = ''
}: VoiceRecorderProps): JSX.Element {
  const { t } = useTranslation();
  const tr = t as (key: string, fallback?: string) => string;
  
  // Textes traduits
  const texts = {
    title: tr('voice.title', 'Enregistrement vocal'),
    subtitle: tr('voice.subtitle', 'Dictez vos notes'),
    readyToRecord: tr('voice.readyToRecord', 'Prêt à enregistrer'),
    start: tr('voice.start', 'Commencer'),
    micAccessDenied: tr('voice.micAccessDenied', 'Accès au microphone refusé'),
    recordings: tr('voice.recordings', 'Enregistrements'),
    transcribing: tr('voice.transcribing', 'Transcription en cours...'),
  };
  
  // États
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);


  // Nettoyage
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Analyser le niveau audio
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setAudioLevel(average / 255);
    
    if (isRecording && !isPaused) {
      animationRef.current = requestAnimationFrame(analyzeAudio);
    }
  }, [isRecording, isPaused]);

  // Simuler la transcription (à remplacer par vraie API)
  const simulateTranscription = useCallback((recordingId: string) => {
    setTimeout(() => {
      const mockTranscription = "Ceci est une transcription simulée de votre enregistrement vocal. Dans la version finale, cette transcription sera générée par un service de reconnaissance vocale.";
      
      setRecordings(prev => prev.map(rec => 
        rec.id === recordingId 
          ? { ...rec, transcription: mockTranscription, isTranscribing: false }
          : rec
      ));
      
      onTranscriptionComplete?.(mockTranscription, recordingId);
    }, 2000);
  }, [onTranscriptionComplete]);

  // Démarrer l'enregistrement
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup audio context pour visualisation
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      // Setup MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const recording: VoiceRecording = {
          id: `rec-${Date.now()}`,
          blob,
          duration,
          timestamp: new Date(),
          isTranscribing: autoTranscribe
        };
        
        setRecordings(prev => [...prev, recording]);
        onRecordingComplete?.(recording);
        
        // Auto-transcription (simulée pour le frontend)
        if (autoTranscribe) {
          simulateTranscription(recording.id);
        }
        
        // Cleanup stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setDuration(0);
      
      // Timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
      // Start audio analysis
      analyzeAudio();
      
    } catch (err) {
      console.error('Erreur accès microphone:', err);
      setError(texts.micAccessDenied);
    }
  }, [maxDuration, autoTranscribe, analyzeAudio, duration, onRecordingComplete, simulateTranscription, texts.micAccessDenied]);

  // Arrêter l'enregistrement
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      setAudioLevel(0);
    }
  }, [isRecording]);

  // Pause/Resume
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    
    if (isPaused) {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      analyzeAudio();
    } else {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    setIsPaused(!isPaused);
  }, [isPaused, analyzeAudio]);

  // Jouer un enregistrement
  const playRecording = useCallback((recording: VoiceRecording) => {
    if (playingId === recording.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(URL.createObjectURL(recording.blob));
      audioRef.current.onended = () => setPlayingId(null);
      audioRef.current.play();
      setPlayingId(recording.id);
    }
  }, [playingId]);

  // Supprimer un enregistrement
  const deleteRecording = useCallback((id: string) => {
    setRecordings(prev => prev.filter(rec => rec.id !== id));
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    }
  }, [playingId]);

  // Formater la durée
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  return (
    <div className={`space-y-4 ${className}`}>
      {/* Zone d'enregistrement principale */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
              <Mic size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {texts.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {texts.subtitle}
              </p>
            </div>
          </div>
          
          {/* Indicateur de langue */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <Languages size={12} className="text-gray-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">{language}</span>
          </div>
        </div>

        {/* Visualisation audio */}
        <div className="relative h-16 bg-gray-50 dark:bg-gray-900 rounded-lg mb-4 overflow-hidden">
          {isRecording ? (
            <div className="absolute inset-0 flex items-center justify-center gap-1">
              {[...Array(20)].map((_, i) => (
                <MotionDiv
                  key={i}
                  className="w-1 bg-gradient-to-t from-red-500 to-pink-400 rounded-full"
                  animate={{
                    height: isPaused ? 4 : Math.max(4, audioLevel * 60 * (0.5 + Math.random() * 0.5))
                  }}
                  transition={{ duration: 0.1 }}
                />
              ))}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {texts.readyToRecord}
              </p>
            </div>
          )}
          
          {/* Timer overlay */}
          {isRecording && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-red-500/90 rounded-full">
              <div className={`w-2 h-2 rounded-full bg-white ${isPaused ? '' : 'animate-pulse'}`} />
              <span className="text-xs font-mono text-white">{formatDuration(duration)}</span>
            </div>
          )}
        </div>

        {/* Contrôles */}
        <div className="flex items-center justify-center gap-3">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/40 active:scale-[0.98]"
            >
              <Mic size={18} />
              <span>{texts.start}</span>
            </button>
          ) : (
            <>
              <button
                onClick={togglePause}
                className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                {isPaused ? <Play size={20} /> : <Pause size={20} />}
              </button>
              
              <button
                onClick={stopRecording}
                className="w-14 h-14 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors shadow-lg shadow-red-500/25"
              >
                <Square size={20} fill="currentColor" />
              </button>
              
              <div className="w-12" /> {/* Spacer pour centrage */}
            </>
          )}
        </div>

        {/* Erreur */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Liste des enregistrements */}
      <AnimatePresence>
        {recordings.length > 0 && (
          <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
              {texts.recordings} ({recordings.length})
            </h4>
            
            {recordings.map((recording) => (
              <MotionDiv
                key={recording.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200 dark:border-gray-700 p-3"
              >
                <div className="flex items-start gap-3">
                  {/* Play button */}
                  <button
                    onClick={() => playRecording(recording)}
                    className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg transition-colors ${
                      playingId === recording.id
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {playingId === recording.id ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDuration(recording.duration)}
                      </span>
                      <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                      <span className="text-xs text-gray-400">
                        {recording.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {/* Transcription */}
                    {recording.isTranscribing ? (
                      <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
                        <Loader size={12} className="animate-spin" />
                        <span>{texts.transcribing}</span>
                      </div>
                    ) : recording.transcription ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                        {recording.transcription}
                      </p>
                    ) : null}
                  </div>
                  
                  {/* Actions */}
                  <button
                    onClick={() => deleteRecording(recording.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </MotionDiv>
            ))}
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}
