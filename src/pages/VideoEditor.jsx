import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Pause, Download, Loader2, Save, Subtitles } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SubtitleOverlay from '../components/editor/SubtitleOverlay';
import StylePanel from '../components/editor/StylePanel';
import VisualTimeline from '../components/editor/VisualTimeline';
import DraggableImage from '../components/editor/DraggableImage';
import EffectsPanel from '../components/editor/EffectsPanel';
import TemplatesPanel from '../components/editor/TemplatesPanel';
import useSignedUrl from '../components/videos/useSignedUrl';
import EyeContactButton from '../components/editor/EyeContactButton';

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
  // Media layers: { file_url, start, end, mediaType: 'video'|'image'|'audio' }
  const [mediaLayers, setMediaLayers] = useState([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [videoHidden, setVideoHidden] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [activeEffect, setActiveEffect] = useState('none');
  const [videoFilter, setVideoFilter] = useState('none');

  const { data: recording, isLoading } = useQuery({
    queryKey: ['recording', recordingId],
    queryFn: async () => {
      const list = await base44.entities.Recording.filter({ id: recordingId });
      return list[0];
    },
    enabled: !!recordingId,
  });

  const videoUrl = useSignedUrl(recording?.file_url);

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

  const handleMoveImage = useCallback((index, start) => {
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

  // --- Media layer handlers ---
  const handleAddMediaLayer = useCallback(async (file, start, end, mediaType) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setMediaLayers(prev => [...prev, { file_url, start, end, mediaType }]);
  }, []);

  const handleDeleteMediaLayer = useCallback((index) => {
    setMediaLayers(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleTrimMediaLayer = useCallback((index, edge, newTime) => {
    setMediaLayers(prev => {
      const updated = [...prev];
      const layer = { ...updated[index] };
      if (edge === 'start') {
        layer.start = Math.max(0, Math.min(layer.end - 0.2, newTime));
      } else {
        layer.end = Math.min(duration, Math.max(layer.start + 0.2, newTime));
      }
      updated[index] = layer;
      return updated;
    });
  }, [duration]);

  const handleMoveMediaLayer = useCallback((index, start) => {
    setMediaLayers(prev => {
      const updated = [...prev];
      const dur = updated[index].end - updated[index].start;
      const newStart = Math.max(0, Math.min(duration - dur, start));
      updated[index] = { ...updated[index], start: newStart, end: newStart + dur };
      return updated;
    });
  }, [duration]);

  // --- Insert file into deleted segment ---
  const handleInsertVideoFile = useCallback(async (segIndex, file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const seg = videoSegments[segIndex];
    if (!seg) return;
    // Add as image overlay (video or image) that replaces the deleted segment visually
    const isImage = file.type.startsWith('image/');
    setImageOverlays(prev => [...prev, {
      file_url,
      start: seg.originalStart,
      end: seg.originalEnd,
      type: isImage ? 'replace' : 'replace',
      x: 0, y: 0, width: 100, height: 100,
      isVideo: !isImage,
    }]);
  }, [videoSegments]);

  const handleInsertAudioFile = useCallback(async (segIndex, file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const seg = audioSegments[segIndex];
    if (!seg) return;
    setAudioSegments(prev => {
      const updated = [...prev];
      updated[segIndex] = { ...updated[segIndex], deleted: false, replacementUrl: file_url };
      return updated;
    });
  }, [audioSegments]);

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

  // --- Auto transcribe ---
  const handleAutoTranscribe = async () => {
    setIsTranscribing(true);
    await base44.functions.invoke('transcribeVideo', { recording_id: recordingId });
    const list = await base44.entities.Recording.filter({ id: recordingId });
    if (list[0]?.subtitles) {
      setSubtitles(list[0].subtitles);
    }
    setIsTranscribing(false);
  };

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
      <div className="min-h-screen flex items-center justify-center bg-[#1d1022]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1d1022] text-white" dir="rtl">
      {/* Header */}
      <div className="sticky z-10 bg-[#1d1022]/90 backdrop-blur-xl border-b border-purple-500/10" style={{ top: 'env(safe-area-inset-top)' }}>
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 select-none" onClick={() => navigate(createPageUrl('MyVideos'))}>
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-base font-bold">עורך וידאו</h1>
          </div>
          <button 
            className="h-8 px-4 rounded-full bg-white/10 text-white text-sm font-medium flex items-center gap-1.5 select-none hover:bg-white/15 transition-colors disabled:opacity-50"
            onClick={handleSave} 
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            שמור
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-3 space-y-3">
        {/* Video Player */}
        <div ref={containerRef} className="relative bg-black rounded-2xl overflow-hidden aspect-video ring-1 ring-white/10">
          {/* Background image - absolutely positioned behind video */}
          {currentImage && currentImage.type === 'background' && (
            <img src={currentImage.file_url} className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ zIndex: 0 }} alt="" />
          )}

          <video
            ref={videoRef}
            src={videoUrl || ''}
            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-150 ${videoHidden ? 'opacity-0' : 'opacity-100'}`}
            style={{ zIndex: 1, filter: videoFilter !== 'none' ? videoFilter : undefined }}
            playsInline
            preload="metadata"
            onClick={togglePlay}
          />

          {/* Replace image - covers video */}
          {currentImage && currentImage.type === 'replace' && (
            <img src={currentImage.file_url} className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ zIndex: 2 }} alt="" />
          )}

          {/* Overlay image - draggable */}
          {currentImage && currentImage.type === 'overlay' && (
            <DraggableImage
              img={currentImage}
              index={imageOverlays.indexOf(currentImage)}
              containerRef={containerRef}
              onUpdatePosition={handleUpdateImagePosition}
              isSelected={selectedImageIndex === imageOverlays.indexOf(currentImage)}
              onSelect={() => setSelectedImageIndex(imageOverlays.indexOf(currentImage))}
            />
          )}
          <SubtitleOverlay
            currentSubtitle={currentSubtitle}
            style={style}
            containerRef={containerRef}
            onPositionChange={handlePositionChange}
          />
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/50 backdrop-blur-sm rounded-full p-3.5">
                <Play className="w-8 h-8 text-white fill-white" />
              </div>
            </div>
          )}
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-between bg-[#2a1b30] rounded-xl px-4 py-2" dir="ltr">
          <span className="text-xs text-white/40 font-mono">{formatTimestamp(currentTime)}</span>
          <button onClick={togglePlay} className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center select-none active:scale-95 transition-transform">
            {isPlaying ? <Pause className="w-4 h-4 text-black" /> : <Play className="w-4 h-4 text-black" />}
          </button>
          <span className="text-xs text-white/40 font-mono">{formatTimestamp(duration)}</span>
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
          onSelectImage={setSelectedImageIndex}
          onAddSubtitle={handleAddSubtitle}
          onDeleteSubtitle={handleDeleteSubtitle}
          onUpdateSubtitle={handleUpdateSubtitle}
          onAutoTranscribe={handleAutoTranscribe}
          isTranscribing={isTranscribing}
          onInsertVideoFile={handleInsertVideoFile}
          onInsertAudioFile={handleInsertAudioFile}
          mediaLayers={mediaLayers}
          onAddMediaLayer={handleAddMediaLayer}
          onDeleteMediaLayer={handleDeleteMediaLayer}
          onTrimMediaLayer={handleTrimMediaLayer}
          onMoveMediaLayer={handleMoveMediaLayer}
        />

        {/* Style Panel */}
        <StylePanel style={style} onChange={setStyle} />

        {/* Templates Panel */}
        <TemplatesPanel
          onApplyTemplate={(template) => {
            setStyle(prev => ({ ...prev, ...template.subtitleStyle }));
            setActiveEffect(template.effectId);
            setVideoFilter(template.effect);
          }}
        />

        {/* Effects Panel */}
        <EffectsPanel
          activeEffect={activeEffect}
          onApplyEffect={(id, filter) => {
            setActiveEffect(id);
            setVideoFilter(filter);
          }}
        />

        {/* Export Button */}
        <button
          className="w-full h-12 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 text-white font-bold text-sm flex items-center justify-center gap-2 select-none active:scale-[0.98] transition-transform disabled:opacity-50"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              מייצא סרטון...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              ייצא סרטון
            </>
          )}
        </button>
      </div>
    </div>
  );
}