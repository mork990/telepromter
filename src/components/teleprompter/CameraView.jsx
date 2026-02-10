import React, { useRef, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Circle, Square, Pause, Play, FastForward, Rewind, Download, Scissors, Share2, Loader2 } from "lucide-react";
import Watermark from './Watermark';

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
  onStop 
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
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

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [cameraFacing]);

  useEffect(() => {
    if (!isPaused && isRecording) {
      startScrolling();
    } else {
      stopScrolling();
    }
    return () => stopScrolling();
  }, [isPaused, isRecording, scrollSpeed]);

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

  const startScrolling = () => {
    stopScrolling();
    scrollIntervalRef.current = setInterval(() => {
      setScrollPosition(prev => prev + 1);
    }, 100 - scrollSpeed / 2);
  };

  const stopScrolling = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
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
          setIsRecording(true);
          if (!isDragging) {
            setIsPaused(false);
          }
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('שגיאה בהתחלת ההקלטה: ' + error.message);
    }
  };

  const stopRecording = () => {
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
        try {
              const mp4Blob = await convertToMP4(blob);
              setRecordedVideo(mp4Blob);
              await saveRecordingToCloud(mp4Blob);
            } catch (err) {
              console.error('Conversion failed, using original:', err);
              setIsConverting(false);
              setRecordedVideo(blob);
              await saveRecordingToCloud(blob);
            }
      }
    } else {
      startCountdownThenRecord();
    }
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
      <Watermark show={!isPremium && isRecording} />

      {/* Teleprompter Overlay */}
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{ backgroundColor: hexToRgba(backgroundColor, backgroundOpacity) }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={containerRef}
          className="absolute inset-x-0 p-6 transition-transform duration-100"
          style={{
            transform: `translateY(-${scrollPosition}px)`,
            top: '50%'
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

      {/* Controls */}
      <div 
        className="absolute inset-x-0 pointer-events-auto z-10"
        style={{ bottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
      >
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
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full h-14 w-14 select-none"
                onClick={() => handleSpeedAdjust(-100)}
                disabled={isRecording && isRecordingPaused}
              >
                <Rewind className="w-6 h-6" />
              </Button>

              <Button
                variant="secondary"
                size="icon"
                className="rounded-full h-14 w-14 select-none"
                onClick={() => setIsPaused(!isPaused)}
                disabled={!isRecording || isRecordingPaused}
              >
                {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
              </Button>

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
                variant="secondary"
                size="icon"
                className="rounded-full h-14 w-14 select-none"
                onClick={() => handleSpeedAdjust(100)}
                disabled={isRecording && isRecordingPaused}
              >
                <FastForward className="w-6 h-6" />
              </Button>

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