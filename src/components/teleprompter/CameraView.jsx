import React, { useRef, useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Circle, Square, Pause, Play, FastForward, Rewind, Download, Scissors } from "lucide-react";

export default function CameraView({ 
  text, 
  fontSize, 
  textColor, 
  backgroundColor,
  cameraFacing,
  scrollSpeed,
  backgroundOpacity,
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: cameraFacing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
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
        videoBitsPerSecond: 5000000,
        audioBitsPerSecond: 192000
      };
      
      // Try different mimeTypes - prefer formats that work well on mobile galleries
      const mimeTypes = [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm',
        'video/mp4',
        ''
      ];
      
      for (const mimeType of mimeTypes) {
        if (mimeType === '' || MediaRecorder.isTypeSupported(mimeType)) {
          if (mimeType) options.mimeType = mimeType;
          console.log('Using mimeType:', mimeType || 'default');
          break;
        }
      }
      
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.start(1000);
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

  const downloadVideo = (blob) => {
    // Create new blob with explicit type to ensure audio is included
    const finalBlob = new Blob([blob], { type: blob.type || 'video/webm' });
    
    const url = URL.createObjectURL(finalBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    const extension = finalBlob.type.includes('mp4') ? 'mp4' : 'webm';
    a.download = `טלפרומפטר-${new Date().getTime()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      if (blob) {
        setRecordedVideo(blob);
      }
    } else {
      await startRecording();
    }
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
      <div className="absolute bottom-8 inset-x-0 pointer-events-auto z-10">
        <div className="flex items-center justify-center gap-4 px-6">
          {recordedVideo ? (
            <>
              <Button
                variant="default"
                className="rounded-full h-16 px-8 bg-green-600 hover:bg-green-700"
                onClick={handleDownload}
              >
                <Download className="w-5 h-5 ml-2" />
                הורד וידאו
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setRecordedVideo(null)}
              >
                צלם שוב
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={onStop}
              >
                סיום
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full h-14 w-14"
                onClick={() => handleSpeedAdjust(-100)}
                disabled={isRecording && isRecordingPaused}
              >
                <Rewind className="w-6 h-6" />
              </Button>

              <Button
                variant="secondary"
                size="icon"
                className="rounded-full h-14 w-14"
                onClick={() => setIsPaused(!isPaused)}
                disabled={!isRecording || isRecordingPaused}
              >
                {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
              </Button>

              {isRecording && !isRecordingPaused && (
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full h-14 w-14 bg-yellow-500 hover:bg-yellow-600 text-white border-0"
                  onClick={handlePauseRecording}
                >
                  <Scissors className="w-6 h-6" />
                </Button>
              )}

              {isRecording && isRecordingPaused && (
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full h-14 w-14 bg-green-500 hover:bg-green-600 text-white border-0"
                  onClick={handleResumeRecording}
                >
                  <Play className="w-6 h-6" />
                </Button>
              )}

              <Button
                variant={isRecording ? "destructive" : "default"}
                size="icon"
                className="rounded-full h-20 w-20"
                onClick={handleRecordToggle}
              >
                {isRecording ? <Square className="w-8 h-8" /> : <Circle className="w-8 h-8" />}
              </Button>

              <Button
                variant="secondary"
                size="icon"
                className="rounded-full h-14 w-14"
                onClick={() => handleSpeedAdjust(100)}
                disabled={isRecording && isRecordingPaused}
              >
                <FastForward className="w-6 h-6" />
              </Button>

              <Button
                variant="outline"
                className="rounded-full"
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
    </div>
  );
}