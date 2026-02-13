import { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Normalize Hebrew text - remove punctuation, diacritics, prefixes
function normalizeWord(word) {
  let w = word
    .replace(/[\u0591-\u05C7]/g, '') // Remove Hebrew diacritics (nikkud)
    .replace(/[^\u05D0-\u05EA\w]/g, '') // Keep only Hebrew letters and alphanumeric
    .toLowerCase()
    .trim();
  // Strip common Hebrew prefixes (ו, ה, ב, כ, ל, מ, ש)
  if (w.length > 2) {
    const prefixes = ['ו', 'ה', 'ב', 'כ', 'ל', 'מ', 'ש'];
    if (prefixes.includes(w[0])) {
      w = w.slice(1);
    }
  }
  return w;
}

// Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

// Calculate similarity ratio (0 to 1)
function similarity(a, b) {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// Split text into words with their character positions
function indexWords(text) {
  const words = [];
  const regex = /\S+/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    words.push({
      original: match[0],
      normalized: normalizeWord(match[0]),
      charIndex: match.index,
    });
  }
  return words;
}

// Stable lookahead window search with fuzzy matching
const EXACT_WINDOW = 25;      // Wider window for exact matches
const FUZZY_WINDOW = 15;      // Tighter window for fuzzy matches
const SIMILARITY_THRESHOLD = 0.7;

function findNextMatch(recognizedWord, textWords, searchFrom) {
  const normalized = normalizeWord(recognizedWord);
  if (!normalized || normalized.length < 2) return -1;

  const end = Math.min(searchFrom + EXACT_WINDOW, textWords.length);

  // Pass 1: exact match in window
  for (let i = searchFrom; i < end; i++) {
    if (textWords[i].normalized === normalized) {
      return i;
    }
  }

  // Pass 2: fuzzy match in tighter window
  const fuzzyEnd = Math.min(searchFrom + FUZZY_WINDOW, textWords.length);
  let bestIndex = -1;
  let bestScore = 0;

  for (let i = searchFrom; i < fuzzyEnd; i++) {
    const score = similarity(normalized, textWords[i].normalized);
    if (score >= SIMILARITY_THRESHOLD && score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

export function useAutoScroll({ text, enabled, onScrollTo }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const textWordsRef = useRef([]);
  const currentWordIndexRef = useRef(0);
  const streamRef = useRef(null);

  // Index the teleprompter text
  useEffect(() => {
    if (text) {
      textWordsRef.current = indexWords(text);
      currentWordIndexRef.current = 0;
      setCurrentWordIndex(0);
    }
  }, [text]);

  const handleTranscript = useCallback((data) => {
    const parsed = JSON.parse(data);
    const alt = parsed?.channel?.alternatives?.[0];
    if (!alt) return;

    const transcript = alt.transcript;
    if (!transcript) return;

    const isFinal = parsed.is_final;
    const confidence = alt.confidence || 0;

    // Skip very low confidence interim results
    if (!isFinal && confidence < 0.6) return;

    const words = alt.words || [];
    if (words.length === 0) return;

    // For interim: use last 2 words for responsiveness. For final: use all.
    const recentWords = isFinal ? words : words.slice(-2);

    let lastMatchedIndex = currentWordIndexRef.current;
    let bestMatchIndex = lastMatchedIndex;

    for (const word of recentWords) {
      // Skip very low-confidence individual words
      if (word.confidence !== undefined && word.confidence < 0.5) continue;

      const matchIndex = findNextMatch(
        word.punctuated_word || word.word,
        textWordsRef.current,
        lastMatchedIndex
      );

      if (matchIndex >= 0) {
        // For exact window matches allow bigger jumps, for safety cap at 20
        if (matchIndex - lastMatchedIndex > 20) continue;

        lastMatchedIndex = matchIndex + 1;
        bestMatchIndex = matchIndex;
      }
    }

    // Only update scroll if we actually advanced forward
    if (lastMatchedIndex > currentWordIndexRef.current) {
      currentWordIndexRef.current = lastMatchedIndex;
      setCurrentWordIndex(bestMatchIndex);

      if (onScrollTo && textWordsRef.current[bestMatchIndex]) {
        // Progress based on word index (more accurate than char position)
        const totalWords = textWordsRef.current.length;
        const progress = bestMatchIndex / totalWords;
        onScrollTo(progress, bestMatchIndex);
      }
    }
  }, [text, onScrollTo]);

  const start = useCallback(async (audioStream) => {
    if (!enabled || !text) return;

    setError(null);
    streamRef.current = audioStream;

    // Get temporary token from backend
    let token;
    try {
      const res = await base44.functions.invoke('getDeepgramToken');
      token = res.data?.token;
      if (!token) {
        setError(res.data?.error || 'לא ניתן לקבל טוקן');
        return;
      }
    } catch (err) {
      setError('שגיאה בקבלת טוקן: ' + (err.message || ''));
      return;
    }

    // Open WebSocket to Deepgram
    // Optimized Deepgram config: shorter endpointing for faster final results, 
    // no_delay for lower latency, utterance_end for better sentence boundaries
    const wsUrl = 'wss://api.deepgram.com/v1/listen?language=he&model=nova-3&smart_format=true&interim_results=true&punctuate=true&endpointing=300&no_delay=true&vad_events=true';

    const socket = new WebSocket(wsUrl, ['token', token]);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setIsListening(true);

      // Start sending audio data
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        setError('הדפדפן לא תומך בפורמט הנדרש');
        return;
      }

      // Create a separate audio-only stream for Deepgram
      const audioTracks = audioStream.getAudioTracks();
      if (audioTracks.length === 0) {
        setError('לא נמצא מיקרופון');
        return;
      }

      const audioOnlyStream = new MediaStream(audioTracks);
      const recorder = new MediaRecorder(audioOnlyStream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
          socket.send(event.data);
        }
      };

      recorder.start(100); // Send every 100ms for lower latency
    };

    socket.onmessage = (message) => {
      handleTranscript(message.data);
    };

    socket.onclose = () => {
      setIsConnected(false);
      setIsListening(false);
    };

    socket.onerror = (err) => {
      console.error('Deepgram WebSocket error:', err);
      setError('שגיאת חיבור ל-Deepgram');
      setIsConnected(false);
      setIsListening(false);
    };
  }, [enabled, text, handleTranscript]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
      socketRef.current = null;
    }
    setIsConnected(false);
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    currentWordIndexRef.current = 0;
    setCurrentWordIndex(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isConnected,
    isListening,
    currentWordIndex,
    error,
    start,
    stop,
    reset,
    totalWords: textWordsRef.current.length,
  };
}