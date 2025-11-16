import React, { useRef, useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Circle, Square, Pause, Play, FastForward, Rewind } from "lucide-react";

export default function CameraView({ 
  text, 
  fontSize, 
  textColor, 
  backgroundColor,
  cameraFacing,
  scrollSpeed,
  onStop 
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollIntervalRef = useRef(null);
  const containerRef = useRef(null);

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
        video: { facingMode: cameraFacing },
        audio: false
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

  const handleRecordToggle = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setScrollPosition(0);
    }
  };

  const handleSpeedAdjust = (adjustment) => {
    setScrollPosition(prev => Math.max(0, prev + adjustment));
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
        />
      </div>

      {/* Teleprompter Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ backgroundColor: `${backgroundColor}CC` }}
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
            className="text-right leading-relaxed whitespace-pre-wrap"
            style={{
              fontSize: `${fontSize}px`,
              color: textColor,
              fontWeight: 500,
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
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
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full h-14 w-14"
            onClick={() => handleSpeedAdjust(-100)}
          >
            <Rewind className="w-6 h-6" />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            className="rounded-full h-14 w-14"
            onClick={() => setIsPaused(!isPaused)}
            disabled={!isRecording}
          >
            {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
          </Button>

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
        </div>
      </div>

      {/* Recording Indicator */}
      {isRecording && !isPaused && (
        <div className="absolute top-6 right-6 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full pointer-events-none">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          <span className="text-sm font-medium">מצלם</span>
        </div>
      )}
    </div>
  );
}