import { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Normalize Hebrew text for matching - remove punctuation, diacritics, etc.
function normalizeWord(word) {
  return word
    .replace(/[\u0591-\u05C7]/g, '') // Remove Hebrew diacritics (nikkud)
    .replace(/[^\u05D0-\u05EA\w]/g, '') // Keep only Hebrew letters and alphanumeric
    .toLowerCase()
    .trim();
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

// Find best matching position in text for a recognized word
function findNextMatch(recognizedWord, textWords, searchFrom) {
  const normalized = normalizeWord(recognizedWord);
  if (!normalized) return -1;

  // Search forward within a window of 15 words
  const windowSize = 15;
  const end = Math.min(searchFrom + windowSize, textWords.length);

  for (let i = searchFrom; i < end; i++) {
    if (textWords[i].normalized === normalized) {
      return i;
    }
  }

  // Partial match - if recognized word starts with or contains text word
  for (let i = searchFrom; i < end; i++) {
    if (textWords[i].normalized.startsWith(normalized) || normalized.startsWith(textWords[i].normalized)) {
      return i;
    }
  }

  return -1;
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
    const transcript = parsed?.channel?.alternatives?.[0]?.transcript;
    if (!transcript) return;

    const words = parsed?.channel?.alternatives?.[0]?.words || [];
    if (words.length === 0) return;

    // Match each recognized word to the teleprompter text
    for (const word of words) {
      const matchIndex = findNextMatch(
        word.punctuated_word || word.word,
        textWordsRef.current,
        currentWordIndexRef.current
      );

      if (matchIndex >= 0) {
        currentWordIndexRef.current = matchIndex + 1;
        setCurrentWordIndex(matchIndex);

        // Calculate scroll position based on word's character position
        if (onScrollTo) {
          const totalChars = text.length;
          const wordCharIndex = textWordsRef.current[matchIndex].charIndex;
          const progress = wordCharIndex / totalChars;
          onScrollTo(progress, matchIndex);
        }
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
    const wsUrl = 'wss://api.deepgram.com/v1/listen?language=he&model=nova-3&smart_format=true&interim_results=true&punctuate=true';

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

      recorder.start(250); // Send every 250ms
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