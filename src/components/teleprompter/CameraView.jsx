import React, { useRef, useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Square, Play, Download, Scissors, Share2, Loader2, Lock, Mic } from "lucide-react";
import Watermark from './Watermark';
import DraggableTextFrame from './DraggableTextFrame';
import { useSubscription } from '../subscription/useSubscription';
import { useAutoScroll } from './useAutoScroll';

const qualityMap = {
  '720': { width: 1280, height: 720 },
  '1080': { width: 1920, height: 1080 },
  '1440': { width: 2560, height: 1440 },
  '2160': { width: 3840, height: 2160 },
};

export default function CameraView({ 
  text, 
  fontSize, 
  textColor, 
  backgroundColor,
  cameraFacing,
  scrollSpeed,
  backgroundOpacity,
  videoQuality = '1080',
  isPremium = false,
  autoScrollEnabled = false,
  onStop 
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollPositionRef = useRef(0);
  const scrollIntervalRef = useRef(null);
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartScroll = useRef(0);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const recordingStartTime = useRef(null);
  const [countdown, setCountdown] = useState(null);
  const [maxDuration, setMaxDuration] = useState(60); // 15, 60, 180
  const [elapsedTime, setElapsedTime] = useState(0);
  const elapsedIntervalRef = useRef(null);
  const [textFrame, setTextFrame] = useState({ left: 5, top: 10, width: 90, height: 60 });
  const { isPremium: subscriptionPremium } = useSubscription();
  const effectivePremium = isPremium || subscriptionPremium;
  const [useAutoScrollMode, setUseAutoScrollMode] = useState(autoScrollEnabled && effectivePremium);

  const autoScrollTargetRef = useRef(null);
  const autoScrollAnimRef = useRef(null);

  const animateToScroll = useCallback((target) => {
    autoScrollTargetRef.current = target;
    if (autoScrollAnimRef.current) return; // already animating

    const tick = () => {
      const current = scrollPositionRef.current;
      const dest = autoScrollTargetRef.current;
      if (dest === null) { autoScrollAnimRef.current = null; return; }
      
      const diff = dest - current;
      if (Math.abs(diff) < 0.5) {
        setScrollPosition(dest);
        scrollPositionRef.current = dest;
        autoScrollAnimRef.current = null;
        return;
      }
      // Ease toward target: 8-12% per frame for smooth feel
      const step = diff * 0.1;
      const next = current + step;
      setScrollPosition(next);
      scrollPositionRef.current = next;
      autoScrollAnimRef.current = requestAnimationFrame(tick);
    };
    autoScrollAnimRef.current = requestAnimationFrame(tick);
  }, []);

  const handleAutoScrollTo = useCallback((progress, wordIndex) => {
    if (!containerRef.current) return;
    const containerHeight = containerRef.current.scrollHeight;
    const newScroll = Math.max(0, containerHeight * progress - 50);
    animateToScroll(newScroll);
  }, [animateToScroll]);

  const autoScroll = useAutoScroll({
    text,
    enabled: useAutoScrollMode,
    onScrollTo: handleAutoScrollTo,
  });

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [cameraFacing]);

  useEffect(() => {
    if (useAutoScrollMode) {
      stopScrolling(); // Don't use manual scroll when auto-scroll is on
      return;
    }
    if (!isPaused && isRecording) {
      startScrolling();
    } else {
      stopScrolling();
    }
    return () => stopScrolling();
  }, [isPaused, isRecording, scrollSpeed, useAutoScrollMode]);

  const startCamera = async () => {
    try {
      const qSettings = qualityMap[videoQuality] || qualityMap['1080'];
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: cameraFacing,
          width: { ideal: qSettings.width },
          height: { ideal: qSettings.height },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 2
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('לא ניתן לגשת למצלמה. אנא וודא שנתת הרשאות.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(null);

  const startScrolling = () => {
    stopScrolling();
    lastTimeRef.current = null;
    const tick = (timestamp) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      // scrollSpeed: 0-100, map to ~0.3-3 px per frame at 60fps
      const speed = 0.3 + (scrollSpeed / 100) * 2.7;
      const pxPerMs = speed / 16.67; // normalize to per-ms
      setScrollPosition(prev => {
        const next = prev + pxPerMs * delta;
        scrollPositionRef.current = next;
        return next;
      });
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  };

  const stopScrolling = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    lastTimeRef.current = null;
  };

  const startRecording = async () => {
    try {
      recordedChunksRef.current = [];
      
      // Ensure we have audio track
      const audioTracks = streamRef.current.getAudioTracks();
      if (audioTracks.length === 0) {
        alert('לא נמצא מיקרופון. אנא וודא שנתת הרשאות למיקרופון.');
        return;
      }
      
      let options = {
        videoBitsPerSecond: 8000000,
        audioBitsPerSecond: 192000
      };
      
      // Prioritize MP4 format (works on Safari/iOS)
      // Then H264 WebM (more compatible than VP9)
      const mimeTypes = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4;codecs=h264,aac',
        'video/mp4',
        'video/webm;codecs=h264,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        ''
      ];
      
      let selectedMime = '';
      for (const mimeType of mimeTypes) {
        if (mimeType === '' || MediaRecorder.isTypeSupported(mimeType)) {
          if (mimeType) options.mimeType = mimeType;
          selectedMime = mimeType;
          console.log('Using mimeType:', mimeType || 'default');
          break;
        }
      }
      
      // Store the mime type for later use
      options.selectedMime = selectedMime;
      
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current.selectedMime = selectedMime;
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.start(500);
          recordingStartTime.current = Date.now();
          setElapsedTime(0);
          elapsedIntervalRef.current = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - recordingStartTime.current) / 1000));
          }, 500);
          setIsRecording(true);
          if (!isDragging) {
            setIsPaused(false);
          }

          // Start auto-scroll if enabled
          if (useAutoScrollMode && streamRef.current) {
            autoScroll.start(streamRef.current);
          }
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('שגיאה בהתחלת ההקלטה: ' + error.message);
    }
  };

  // Auto-stop when maxDuration is reached
  useEffect(() => {
    if (isRecording && !isRecordingPaused && elapsedTime >= maxDuration) {
      handleRecordToggle();
    }
  }, [elapsedTime, maxDuration, isRecording, isRecordingPaused]);

  const stopRecording = () => {
    // Stop auto-scroll
    if (useAutoScrollMode) {
      autoScroll.stop();
    }
    if (autoScrollAnimRef.current) {
      cancelAnimationFrame(autoScrollAnimRef.current);
      autoScrollAnimRef.current = null;
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = () => {
          const mimeType = mediaRecorderRef.current.mimeType || 'video/webm';
          console.log('Recording stopped with chunks:', recordedChunksRef.current.length);
          console.log('MimeType:', mimeType);
          const blob = new Blob(recordedChunksRef.current, { type: mimeType });
          console.log('Blob size:', blob.size, 'bytes');
          resolve(blob);
        };
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      } else {
        resolve(null);
      }
    });
  };

  const convertToMP4 = async (blob) => {
    // If already MP4 (Safari/iOS), return as-is
    if (blob.type.includes('mp4')) {
      console.log('Already MP4, no conversion needed');
      return blob;
    }

    // Send WebM to server for real FFmpeg conversion to MP4
    console.log('Converting WebM to MP4 on server...', blob.type, blob.size);
    setIsConverting(true);
    
    const formData = new FormData();
    formData.append('video', blob, 'video.webm');
    
    const response = await base44.functions.invoke('convertToMp4', formData);
    setIsConverting(false);
    
    // response.data is an ArrayBuffer for binary responses
    const mp4Blob = new Blob([response.data], { type: 'video/mp4' });
    console.log('Server conversion complete, MP4 size:', mp4Blob.size);
    return mp4Blob;
  };

  const saveRecordingToCloud = async (blob) => {
    setIsSaving(true);
    const durationSeconds = recordingStartTime.current 
      ? Math.round((Date.now() - recordingStartTime.current) / 1000) 
      : 0;
    const file = new File([blob], `teleprompter-${Date.now()}.mp4`, { type: 'video/mp4' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Recording.create({
      title: `סרטון ${new Date().toLocaleDateString('he-IL')}`,
      file_url,
      duration_seconds: durationSeconds,
      quality: videoQuality,
      file_size_bytes: blob.size
    });
    setIsSaving(false);
  };

  const downloadVideo = async (blob) => {
    const filename = `teleprompter-${new Date().getTime()}.mp4`;
    const file = new File([blob], filename, { type: 'video/mp4' });
    
    // On iOS Safari, use Web Share API for download (download attribute doesn't work)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'סרטון מהפרומפטר' });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    
    // Fallback for desktop
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);
  };

  const shareToWhatsApp = async (blob) => {
    const filename = `video_${Date.now()}.mp4`;
    const file = new File([blob], filename, { type: 'video/mp4', lastModified: Date.now() });
    
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'סרטון מהפרומפטר' });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    
    // Fallback: download and let user share manually
    await downloadVideo(blob);
  };

  const startCountdownThenRecord = () => {
    setCountdown(3);
    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        setCountdown(null);
        clearInterval(interval);
        startRecording();
      }
    }, 1000);
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      if (blob) {
        // Save original blob immediately for preview/download
        setRecordedVideo(blob);
        // Fire-and-forget: convert + upload in background
        // This way user can leave the page and it continues
        convertAndSave(blob);
      }
    } else {
      startCountdownThenRecord();
    }
  };

  const convertAndSave = (blob) => {
    // Don't await - let it run in background
    convertToMP4(blob)
      .then(mp4Blob => {
        setRecordedVideo(mp4Blob);
        return saveRecordingToCloud(mp4Blob);
      })
      .catch(err => {
        console.error('Conversion failed, saving original:', err);
        setIsConverting(false);
        return saveRecordingToCloud(blob);
      });
  };

  const handleRetake = () => {
    setRecordedVideo(null);
    setScrollPosition(0);
  };

  const handleDownload = () => {
    if (recordedVideo) {
      downloadVideo(recordedVideo);
      setRecordedVideo(null);
    }
  };

  const handlePauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsRecordingPaused(true);
      setIsPaused(true);
    }
  };

  const handleResumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsRecordingPaused(false);
      setIsPaused(false);
    }
  };

  const handleSpeedAdjust = (adjustment) => {
    setScrollPosition(prev => Math.max(0, prev + adjustment));
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    if (isRecording) {
      setIsPaused(true);
    }
    dragStartY.current = e.touches[0].clientY;
    dragStartScroll.current = scrollPosition;
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    e.preventDefault(); // Prevent pull-to-refresh
    const deltaY = dragStartY.current - e.touches[0].clientY;
    setScrollPosition(Math.max(0, dragStartScroll.current + deltaY));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (isRecording) {
      setIsPaused(false);
    }
  };

  const hexToRgba = (hex, opacity) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Video Background */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: cameraFacing === 'user' ? 'scaleX(-1)' : 'none' }}
        />
      </div>

      {/* Watermark for free users */}
      <Watermark show={!effectivePremium && isRecording} />

      {/* Teleprompter Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: hexToRgba(backgroundColor, backgroundOpacity) }}
      >
        <DraggableTextFrame frameStyle={textFrame} onFrameChange={setTextFrame}>
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              // Only handle single finger touch for scrolling
              if (e.pointerType === 'touch' || e.pointerType === 'mouse') {
                e.stopPropagation();
                setIsDragging(true);
                if (isRecording) setIsPaused(true);
                dragStartY.current = e.clientY;
                dragStartScroll.current = scrollPosition;
                e.target.setPointerCapture(e.pointerId);
              }
            }}
            onPointerMove={(e) => {
              if (!isDragging) return;
              const deltaY = dragStartY.current - e.clientY;
              setScrollPosition(Math.max(0, dragStartScroll.current + deltaY));
            }}
            onPointerUp={() => {
              if (isDragging) {
                setIsDragging(false);
                if (isRecording) setIsPaused(false);
              }
            }}
          >
            <div
              ref={containerRef}
              className="absolute inset-x-0 p-4"
              style={{
                transform: `translateY(-${scrollPosition}px)`,
                top: '50%',
                willChange: 'transform'
              }}
            >
              <div
                className="text-right leading-relaxed whitespace-pre-wrap select-none"
                style={{
                  fontSize: `${fontSize}px`,
                  color: textColor,
                  fontWeight: 500,
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                }}
                dir="rtl"
              >
                {text}
              </div>
            </div>
          </div>
        </DraggableTextFrame>
      </div>

      {/* Controls */}
      <div 
        className="absolute inset-x-0 pointer-events-auto z-10"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        {/* Auto-scroll toggle for premium users - above duration */}
        {!isRecording && !recordedVideo && countdown === null && effectivePremium && (
          <div className="flex items-center justify-center mb-3 px-6">
            <button
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all select-none ${
                useAutoScrollMode
                  ? 'bg-[#00d4aa] text-black shadow-lg'
                  : 'bg-white/15 text-white/70 border border-white/20'
              }`}
              onClick={() => setUseAutoScrollMode(!useAutoScrollMode)}
            >
              <Mic className="w-4 h-4" />
              {useAutoScrollMode ? 'גלילה אוטומטית: פעיל' : 'גלילה אוטומטית'}
            </button>
          </div>
        )}

        {/* Duration selector - above controls */}
        {!isRecording && !recordedVideo && countdown === null && (
          <div className="flex items-center justify-center gap-2 mb-4 px-6">
            {[
              { label: '15 שנ׳', value: 15, premium: false },
              { label: '60 שנ׳', value: 60, premium: false },
              { label: '3 דק׳', value: 180, premium: true },
            ].map(opt => {
              const locked = opt.premium && !effectivePremium;
              const active = maxDuration === opt.value;
              return (
                <button
                  key={opt.value}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all select-none ${
                    active
                      ? 'bg-white text-black shadow-lg scale-105'
                      : locked
                      ? 'bg-white/10 text-white/40 border border-white/10'
                      : 'bg-white/20 text-white border border-white/20 hover:bg-white/30'
                  }`}
                  onClick={() => { if (!locked) setMaxDuration(opt.value); }}
                >
                  {locked && <Lock className="w-3 h-3" />}
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Timer display during recording */}
        {isRecording && (
          <div className="flex items-center justify-center mb-3">
            <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-base font-mono select-none pointer-events-none flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRecordingPaused ? 'bg-yellow-400' : 'bg-red-500 animate-pulse'}`} />
              <span>{Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}</span>
              <span className="text-white/40">/</span>
              <span className="text-white/60">{Math.floor(maxDuration / 60)}:{(maxDuration % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4 px-6">
          {recordedVideo ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="default"
                  className="rounded-full h-14 px-6 bg-green-600 hover:bg-green-700 select-none"
                  onClick={handleDownload}
                >
                  <Download className="w-5 h-5 ml-2" />
                  שמור לגלריה
                </Button>
                <Button
                  variant="default"
                  className="rounded-full h-14 px-6 bg-[#25D366] hover:bg-[#128C7E] select-none"
                  onClick={() => shareToWhatsApp(recordedVideo)}
                >
                  <Share2 className="w-5 h-5 ml-2" />
                  שתף בוואטסאפ
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="rounded-full bg-white/90 select-none"
                  onClick={handleRetake}
                >
                  צלם מחדש
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full bg-white/90 select-none"
                  onClick={onStop}
                >
                  סיום
                </Button>
              </div>
            </div>
          ) : (
            <>
              {isRecording && !isRecordingPaused && (
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full h-14 w-14 bg-yellow-500 hover:bg-yellow-600 text-white border-0 select-none"
                  onClick={handlePauseRecording}
                >
                  <Scissors className="w-6 h-6" />
                </Button>
              )}

              {isRecording && isRecordingPaused && (
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full h-14 w-14 bg-green-500 hover:bg-green-600 text-white border-0 select-none"
                  onClick={handleResumeRecording}
                >
                  <Play className="w-6 h-6" />
                </Button>
              )}

              <button
                className={`rounded-full h-24 w-24 select-none flex items-center justify-center transition-all shadow-lg ${
                  isRecording 
                    ? 'bg-red-600 hover:bg-red-700 ring-4 ring-red-400/50' 
                    : 'bg-red-500 hover:bg-red-600 ring-4 ring-white/30'
                }`}
                onClick={handleRecordToggle}
                disabled={countdown !== null}
              >
                {isRecording ? (
                  <Square className="w-10 h-10 text-white fill-white" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-red-400 border-4 border-white" />
                )}
              </button>

              <Button
                variant="outline"
                className="rounded-full select-none"
                onClick={onStop}
              >
                סיום
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Auto-scroll status indicator */}
      {isRecording && useAutoScrollMode && autoScroll.isListening && (
        <div className="absolute top-6 left-6 flex items-center gap-2 bg-[#00d4aa] text-black px-3 py-1.5 rounded-full pointer-events-none z-20">
          <Mic className="w-3 h-3" />
          <span className="text-xs font-medium">גלילה אוטומטית</span>
        </div>
      )}
      {isRecording && useAutoScrollMode && autoScroll.error && (
        <div className="absolute top-6 left-6 flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full pointer-events-none z-20">
          <span className="text-xs font-medium">{autoScroll.error}</span>
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && !isRecordingPaused && (
        <div className="absolute top-6 right-6 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full pointer-events-none">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          <span className="text-sm font-medium">מצלם</span>
        </div>
      )}
      {isRecording && isRecordingPaused && (
        <div className="absolute top-6 right-6 flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-full pointer-events-none">
          <Scissors className="w-4 h-4" />
          <span className="text-sm font-medium">הפסקה</span>
        </div>
      )}
      {isConverting && (
        <div className="absolute top-6 right-6 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full pointer-events-none">
          <div className="w-3 h-3 bg-white rounded-full animate-spin border-2 border-transparent border-t-white" />
          <span className="text-sm font-medium">ממיר ל-MP4...</span>
        </div>
      )}
      {isSaving && (
        <div className="absolute top-6 right-6 flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-full pointer-events-none">
          <div className="w-3 h-3 bg-white rounded-full animate-spin border-2 border-transparent border-t-white" />
          <span className="text-sm font-medium">שומר לענן...</span>
        </div>
      )}

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-white text-[120px] font-bold animate-pulse drop-shadow-2xl" style={{ textShadow: '0 0 40px rgba(0,0,0,0.8)' }}>
            {countdown}
          </div>
        </div>
      )}
    </div>
  );
}