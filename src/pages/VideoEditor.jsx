import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Pause, Download, Loader2, Save } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SubtitleOverlay from '../components/editor/SubtitleOverlay';
import StylePanel from '../components/editor/StylePanel';
import VisualTimeline from '../components/editor/VisualTimeline';
import DraggableImage from '../components/editor/DraggableImage';

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

  // Video segments (visual track)
  const [videoSegments, setVideoSegments] = useState([]);
  // Audio segments (audio track) - independent from video
  const [audioSegments, setAudioSegments] = useState([]);
  // Image overlays: { file_url, start, end, type: 'overlay'|'replace'|'background' }
  const [imageOverlays, setImageOverlays] = useState([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [videoHidden, setVideoHidden] = useState(false);

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

  // Initialize segments when duration is known
  useEffect(() => {
    if (duration > 0 && videoSegments.length === 0) {
      setVideoSegments([{ originalStart: 0, originalEnd: duration, deleted: false }]);
      setAudioSegments([{ originalStart: 0, originalEnd: duration, deleted: false }]);
    }
  }, [duration]);

  // Playback: skip deleted video segments AND mute deleted audio segments
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      const ct = video.currentTime;

      // Mute/unmute based on audio segments
      const inDeletedAudio = audioSegments.some(s => s.deleted && ct >= s.originalStart && ct < s.originalEnd);
      video.muted = inDeletedAudio;

      // Hide video (black) when in a deleted video segment
      const inDeletedVideo = videoSegments.some(s => s.deleted && ct >= s.originalStart && ct < s.originalEnd);
      setVideoHidden(inDeletedVideo);

      setCurrentTime(video.currentTime);
    };

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
  }, [recording, videoSegments, audioSegments, isPlaying]);

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

  // --- Video segment handlers ---
  const handleSplitVideoSegment = useCallback((time) => {
    setVideoSegments(prev => {
      const newSegs = [];
      for (const seg of prev) {
        if (!seg.deleted && time > seg.originalStart + 0.1 && time < seg.originalEnd - 0.1) {
          newSegs.push({ originalStart: seg.originalStart, originalEnd: time, deleted: false });
          newSegs.push({ originalStart: time, originalEnd: seg.originalEnd, deleted: false });
        } else {
          newSegs.push(seg);
        }
      }
      return newSegs;
    });
  }, []);

  const handleDeleteVideoSegment = useCallback((index) => {
    setVideoSegments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], deleted: true };
      return updated;
    });
  }, []);

  const handleRestoreVideoSegment = useCallback((index) => {
    setVideoSegments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], deleted: false };
      return updated;
    });
  }, []);

  const handleTrimVideoSegment = useCallback((index, edge, newTime) => {
    setVideoSegments(prev => {
      const updated = [...prev];
      const seg = { ...updated[index] };
      if (edge === 'start') {
        seg.originalStart = Math.max(0, Math.min(seg.originalEnd - 0.2, newTime));
      } else {
        seg.originalEnd = Math.min(duration, Math.max(seg.originalStart + 0.2, newTime));
      }
      updated[index] = seg;
      return updated;
    });
  }, [duration]);

  // --- Audio segment handlers ---
  const handleSplitAudioSegment = useCallback((time) => {
    setAudioSegments(prev => {
      const newSegs = [];
      for (const seg of prev) {
        if (!seg.deleted && time > seg.originalStart + 0.1 && time < seg.originalEnd - 0.1) {
          newSegs.push({ originalStart: seg.originalStart, originalEnd: time, deleted: false });
          newSegs.push({ originalStart: time, originalEnd: seg.originalEnd, deleted: false });
        } else {
          newSegs.push(seg);
        }
      }
      return newSegs;
    });
  }, []);

  const handleDeleteAudioSegment = useCallback((index) => {
    setAudioSegments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], deleted: true };
      return updated;
    });
  }, []);

  const handleRestoreAudioSegment = useCallback((index) => {
    setAudioSegments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], deleted: false };
      return updated;
    });
  }, []);

  const handleTrimAudioSegment = useCallback((index, edge, newTime) => {
    setAudioSegments(prev => {
      const updated = [...prev];
      const seg = { ...updated[index] };
      if (edge === 'start') {
        seg.originalStart = Math.max(0, Math.min(seg.originalEnd - 0.2, newTime));
      } else {
        seg.originalEnd = Math.min(duration, Math.max(seg.originalStart + 0.2, newTime));
      }
      updated[index] = seg;
      return updated;
    });
  }, [duration]);

  // --- Image overlay handlers ---
  const handleAddImage = useCallback(async (file, start, end) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageOverlays(prev => [...prev, { file_url, start, end, type: 'overlay', x: 5, y: 5, width: 30, height: 30 }]);
  }, []);

  const handleDeleteImage = useCallback((index) => {
    setImageOverlays(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleTrimImage = useCallback((index, edge, newTime) => {
    setImageOverlays(prev => {
      const updated = [...prev];
      const img = { ...updated[index] };
      if (edge === 'start') {
        img.start = Math.max(0, Math.min(img.end - 0.2, newTime));
      } else {
        img.end = Math.min(duration, Math.max(img.start + 0.2, newTime));
      }
      updated[index] = img;
      return updated;
    });
  }, [duration]);

  const handleUpdateImageType = useCallback((index, type) => {
    setImageOverlays(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], type };
      return updated;
    });
  }, []);

  const handleMoveImage = useCallback((index, start, end) => {
    setImageOverlays(prev => {
      const updated = [...prev];
      const dur = updated[index].end - updated[index].start;
      const newStart = Math.max(0, Math.min(duration - dur, start));
      updated[index] = { ...updated[index], start: newStart, end: newStart + dur };
      return updated;
    });
  }, [duration]);

  const handleUpdateImagePosition = useCallback((index, pos) => {
    setImageOverlays(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...pos };
      return updated;
    });
  }, []);

  // Selected image for editing position/size
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);

  // --- Subtitle handlers ---
  const currentSubtitle = subtitles.find(s => currentTime >= s.start && currentTime <= s.end);

  const handlePositionChange = useCallback((x, y) => {
    setStyle(prev => ({ ...prev, positionX: x, positionY: y }));
  }, []);

  const handleSubtitleDrag = useCallback((index, start, end) => {
    setSubtitles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], start, end };
      return updated;
    });
  }, []);

  const handleAddSubtitle = useCallback((start, end) => {
    setSubtitles(prev => [...prev, { start, end, text: '' }]);
  }, []);

  const handleDeleteSubtitle = useCallback((index) => {
    setSubtitles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateSubtitle = useCallback((index, data) => {
    setSubtitles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...data };
      return updated;
    });
  }, []);

  // --- Save & Export ---
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
    
    const videoCuts = videoSegments
      .filter(s => s.deleted)
      .map(s => ({ start: s.originalStart, end: s.originalEnd }))
      .sort((a, b) => a.start - b.start);

    const audioCuts = audioSegments
      .filter(s => s.deleted)
      .map(s => ({ start: s.originalStart, end: s.originalEnd }))
      .sort((a, b) => a.start - b.start);
    
    const response = await base44.functions.invoke('burnSubtitles', {
      recording_id: recordingId,
      subtitles: cleaned,
      style,
      cuts: videoCuts,
      audio_cuts: audioCuts,
      image_overlays: imageOverlays,
    });
    
    const blob = new Blob([response.data], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording?.title || 'video'}_edited.mp4`;
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

  // Current image overlay for preview
  const currentImage = imageOverlays.find(img => currentTime >= img.start && currentTime <= img.end);

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
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">עורך וידאו</h1>
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
            className={`w-full h-full object-contain transition-opacity duration-150 ${videoHidden ? 'opacity-0' : 'opacity-100'}`}
            playsInline
            preload="metadata"
            onClick={togglePlay}
          />
          {/* Image overlay preview */}
          {currentImage && (
            currentImage.type === 'replace' ? (
              <div className="absolute inset-0 pointer-events-none">
                <img src={currentImage.file_url} className="w-full h-full object-cover" alt="" />
              </div>
            ) : currentImage.type === 'background' ? (
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: -1 }}>
                <img src={currentImage.file_url} className="w-full h-full object-cover" alt="" />
              </div>
            ) : (
              <DraggableImage
                img={currentImage}
                index={imageOverlays.indexOf(currentImage)}
                containerRef={containerRef}
                onUpdatePosition={handleUpdateImagePosition}
                isSelected={selectedImageIndex === imageOverlays.indexOf(currentImage)}
                onSelect={() => setSelectedImageIndex(imageOverlays.indexOf(currentImage))}
              />
            )
          )}
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

        {/* Playback controls */}
        <div className="flex items-center justify-between" dir="ltr">
          <span className="text-xs text-gray-400">{formatTimestamp(currentTime)}</span>
          <Button size="sm" variant="ghost" onClick={togglePlay} className="text-indigo-600">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <span className="text-xs text-gray-400">{formatTimestamp(duration)}</span>
        </div>

        {/* Visual Timeline */}
        <VisualTimeline
          duration={duration}
          currentTime={currentTime}
          subtitles={subtitles}
          videoSegments={videoSegments}
          audioSegments={audioSegments}
          imageOverlays={imageOverlays}
          onSeek={handleSeek}
          onSubtitleDrag={handleSubtitleDrag}
          onSplitVideoSegment={handleSplitVideoSegment}
          onDeleteVideoSegment={handleDeleteVideoSegment}
          onRestoreVideoSegment={handleRestoreVideoSegment}
          onTrimVideoSegment={handleTrimVideoSegment}
          onSplitAudioSegment={handleSplitAudioSegment}
          onDeleteAudioSegment={handleDeleteAudioSegment}
          onRestoreAudioSegment={handleRestoreAudioSegment}
          onTrimAudioSegment={handleTrimAudioSegment}
          onAddImage={handleAddImage}
          onDeleteImage={handleDeleteImage}
          onTrimImage={handleTrimImage}
          onMoveImage={handleMoveImage}
          onUpdateImageType={handleUpdateImageType}
          onUpdateImagePosition={handleUpdateImagePosition}
          onAddSubtitle={handleAddSubtitle}
          onDeleteSubtitle={handleDeleteSubtitle}
          onUpdateSubtitle={handleUpdateSubtitle}
        />

        {/* Style Panel */}
        <StylePanel style={style} onChange={setStyle} />

        {/* Export Button */}
        <Button
          className="w-full h-12 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <Loader2 className="w-5 h-5 ml-2 animate-spin" />
              מייצא סרטון...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 ml-2" />
              ייצא סרטון
            </>
          )}
        </Button>
      </div>
    </div>
  );
}