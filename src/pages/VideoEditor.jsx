import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Pause, Download, Loader2, Save } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SubtitleOverlay from '../components/editor/SubtitleOverlay';
import StylePanel from '../components/editor/StylePanel';
import TimelineEditor from '../components/editor/TimelineEditor';

export default function VideoEditor() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const recordingId = params.get('id');

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [subtitles, setSubtitles] = useState([]);
  const [style, setStyle] = useState({
    fontSize: 24,
    fontColor: '#FFFFFF',
    bgColor: '#000000',
    bgOpacity: 70,
    positionX: 50,
    positionY: 85,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data: recording, isLoading } = useQuery({
    queryKey: ['recording', recordingId],
    queryFn: async () => {
      const list = await base44.entities.Recording.filter({ id: recordingId });
      return list[0];
    },
    enabled: !!recordingId,
  });

  useEffect(() => {
    if (recording) {
      setSubtitles(recording.subtitles || []);
      if (recording.subtitle_style) {
        setStyle(prev => ({ ...prev, ...recording.subtitle_style }));
      }
    }
  }, [recording]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoaded = () => setDuration(video.duration);
    const onEnded = () => setIsPlaying(false);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('ended', onEnded);
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('ended', onEnded);
    };
  }, [recording]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    handleSeek(pct * duration);
  };

  const currentSubtitle = subtitles.find(s => currentTime >= s.start && currentTime <= s.end);

  const handlePositionChange = useCallback((x, y) => {
    setStyle(prev => ({ ...prev, positionX: x, positionY: y }));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const cleaned = subtitles
      .filter(s => s.text && s.text.trim())
      .sort((a, b) => a.start - b.start);
    await base44.entities.Recording.update(recordingId, {
      subtitles: cleaned,
      subtitle_style: style,
      subtitles_status: cleaned.length > 0 ? 'done' : 'none',
    });
    setIsSaving(false);
  };

  const handleExport = async () => {
    setIsExporting(true);
    const cleaned = subtitles
      .filter(s => s.text && s.text.trim())
      .sort((a, b) => a.start - b.start);
    
    const response = await base44.functions.invoke('burnSubtitles', {
      recording_id: recordingId,
      subtitles: cleaned,
      style,
    });
    
    const blob = new Blob([response.data], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording?.title || 'video'}_subtitled.mp4`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
    setIsExporting(false);
  };

  const formatTimestamp = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (isLoading || !recording) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 sticky z-10" style={{ top: 'env(safe-area-inset-top)' }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('MyVideos'))}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">עורך כתוביות</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
              שמור
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Video Player */}
        <div ref={containerRef} className="relative bg-black rounded-xl overflow-hidden aspect-video">
          <video
            ref={videoRef}
            src={recording.file_url}
            className="w-full h-full object-contain"
            playsInline
            preload="metadata"
            onClick={togglePlay}
          />
          <SubtitleOverlay
            currentSubtitle={currentSubtitle}
            style={style}
            containerRef={containerRef}
            onPositionChange={handlePositionChange}
          />
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/40 rounded-full p-4">
                <Play className="w-10 h-10 text-white fill-white" />
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div
            className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer relative"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-indigo-600 rounded-full transition-all"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
            {/* Subtitle markers */}
            {subtitles.map((s, i) => (
              <div
                key={i}
                className="absolute top-0 h-full bg-amber-400/50 rounded-sm"
                style={{
                  left: duration ? `${(s.start / duration) * 100}%` : '0%',
                  width: duration ? `${((s.end - s.start) / duration) * 100}%` : '0%',
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400" dir="ltr">
            <span>{formatTimestamp(currentTime)}</span>
            <button onClick={togglePlay} className="text-indigo-600 font-medium">
              {isPlaying ? 'השהה' : 'נגן'}
            </button>
            <span>{formatTimestamp(duration)}</span>
          </div>
        </div>

        {/* Style Panel */}
        <StylePanel style={style} onChange={setStyle} />

        {/* Timeline Editor */}
        <TimelineEditor
          subtitles={subtitles}
          onChange={setSubtitles}
          currentTime={currentTime}
          onSeek={handleSeek}
        />

        {/* Export Button */}
        <Button
          className="w-full h-12 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          onClick={handleExport}
          disabled={isExporting || subtitles.length === 0}
        >
          {isExporting ? (
            <>
              <Loader2 className="w-5 h-5 ml-2 animate-spin" />
              מייצא סרטון עם כתוביות...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 ml-2" />
              ייצא סרטון עם כתוביות
            </>
          )}
        </Button>
      </div>
    </div>
  );
}