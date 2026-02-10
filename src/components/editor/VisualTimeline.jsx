import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Scissors, Type, Trash2, ZoomIn, ZoomOut, Undo2, Image, Volume2 } from "lucide-react";
import SubtitleBubble from './SubtitleBubble';
import TrackSegment from './TrackSegment';
import ImageTrackItem from './ImageTrackItem';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const TRACK_HEIGHT = 40;
const TRACK_GAP = 4;
const LABEL_HEIGHT = 14;

export default function VisualTimeline({ 
  duration, 
  currentTime, 
  subtitles = [],
  videoSegments = [],
  audioSegments = [],
  imageOverlays = [],
  onSeek, 
  onSubtitleDrag,
  onSplitVideoSegment,
  onDeleteVideoSegment,
  onRestoreVideoSegment,
  onTrimVideoSegment,
  onSplitAudioSegment,
  onDeleteAudioSegment,
  onRestoreAudioSegment,
  onTrimAudioSegment,
  onAddImage,
  onDeleteImage,
  onTrimImage,
  onMoveImage,
  onUpdateImageType,
  onUpdateImagePosition,
  onAddSubtitle,
  onDeleteSubtitle,
  onUpdateSubtitle,
}) {
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const dragStartRef = useRef({ x: 0, startVal: 0, endVal: 0 });
  const didDragRef = useRef(false);
  
  const [toolMode, setToolMode] = useState(null); // 'split-video', 'split-audio', 'subtitle', 'delete', 'image'
  const [pxPerSec, setPxPerSec] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const [rangeSelection, setRangeSelection] = useState(null);
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const rangeStartRef = useRef(0);

  const [editingSubIndex, setEditingSubIndex] = useState(null);
  const [bubblePosition, setBubblePosition] = useState({ x: 50 });
  const [splitCursorTime, setSplitCursorTime] = useState(null);

  const fileInputRef = useRef(null);
  const [pendingImageTime, setPendingImageTime] = useState(null);

  useEffect(() => {
    if (!scrollRef.current || !duration) return;
    const width = scrollRef.current.offsetWidth || 400;
    setPxPerSec(width / duration);
  }, [duration]);

  const timelineWidth = duration * pxPerSec;
  const timeToPx = (time) => time * pxPerSec;
  
  const pxToTime = (clientX) => {
    if (!containerRef.current || !duration) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(duration, x / pxPerSec));
  };

  const handleZoomIn = () => {
    setPxPerSec(prev => Math.min(prev * 1.5, 100));
    setIsZoomed(true);
  };

  const handleZoomOut = () => {
    if (!scrollRef.current) return;
    const minPx = (scrollRef.current.offsetWidth || 400) / duration;
    setPxPerSec(prev => {
      const next = prev / 1.5;
      if (next <= minPx * 1.1) { setIsZoomed(false); return minPx; }
      return next;
    });
  };

  useEffect(() => {
    if (!scrollRef.current || !pxPerSec) return;
    const playheadPx = currentTime * pxPerSec;
    const scroll = scrollRef.current;
    const viewLeft = scroll.scrollLeft;
    const viewRight = viewLeft + scroll.clientWidth;
    if (playheadPx < viewLeft + 20 || playheadPx > viewRight - 20) {
      scroll.scrollLeft = playheadPx - scroll.clientWidth / 2;
    }
  }, [currentTime, pxPerSec]);

  // --- Drag handlers ---
  const handleItemPointerDown = (e, type, index, edge) => {
    e.stopPropagation();
    e.preventDefault();
    didDragRef.current = false;

    let startVal = 0, endVal = 0;
    if (type === 'sub') {
      startVal = subtitles[index].start;
      endVal = subtitles[index].end;
    } else if (type === 'video-seg') {
      startVal = videoSegments[index].originalStart;
      endVal = videoSegments[index].originalEnd;
    } else if (type === 'audio-seg') {
      startVal = audioSegments[index].originalStart;
      endVal = audioSegments[index].originalEnd;
    } else if (type === 'image') {
      startVal = imageOverlays[index].start;
      endVal = imageOverlays[index].end;
    }

    dragStartRef.current = { x: e.clientX, startVal, endVal };
    setDragging({ type, index, edge });
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (isSelectingRange && containerRef.current) {
      const time = pxToTime(e.clientX);
      setRangeSelection({
        start: Math.min(rangeStartRef.current, time),
        end: Math.max(rangeStartRef.current, time),
      });
      return;
    }

    if (!dragging || !containerRef.current) return;
    const dx = Math.abs(e.clientX - dragStartRef.current.x);
    if (dx > 3) didDragRef.current = true;

    const dxPx = e.clientX - dragStartRef.current.x;
    const dt = dxPx / pxPerSec;
    const { type, index, edge } = dragging;

    if (type === 'sub') {
      const sub = { ...subtitles[index] };
      if (edge === 'start') sub.start = Math.max(0, Math.min(sub.end - 0.2, dragStartRef.current.startVal + dt));
      else if (edge === 'end') sub.end = Math.min(duration, Math.max(sub.start + 0.2, dragStartRef.current.endVal + dt));
      else {
        const dur = dragStartRef.current.endVal - dragStartRef.current.startVal;
        let ns = Math.max(0, Math.min(duration - dur, dragStartRef.current.startVal + dt));
        sub.start = ns; sub.end = ns + dur;
      }
      onSubtitleDrag(index, sub.start, sub.end);
    } else if (type === 'video-seg') {
      const newTime = edge === 'start' ? dragStartRef.current.startVal + dt : dragStartRef.current.endVal + dt;
      onTrimVideoSegment(index, edge, newTime);
    } else if (type === 'audio-seg') {
      const newTime = edge === 'start' ? dragStartRef.current.startVal + dt : dragStartRef.current.endVal + dt;
      onTrimAudioSegment(index, edge, newTime);
    } else if (type === 'image') {
      if (edge === 'move') {
        // Move entire image overlay
        const dur = dragStartRef.current.endVal - dragStartRef.current.startVal;
        let ns = Math.max(0, Math.min(duration - dur, dragStartRef.current.startVal + dt));
        onTrimImage(index, 'start', ns);
        onTrimImage(index, 'end', ns + dur);
      } else {
        const newTime = edge === 'start' ? dragStartRef.current.startVal + dt : dragStartRef.current.endVal + dt;
        onTrimImage(index, edge, newTime);
      }
    }
  };

  const handlePointerUp = () => {
    if (isSelectingRange && rangeSelection) {
      const { start, end } = rangeSelection;
      if (end - start > 0.3) onAddSubtitle(start, end);
      setRangeSelection(null);
      setIsSelectingRange(false);
      setToolMode(null);
      return;
    }
    setDragging(null);
  };

  const handleTimelinePointerDown = (e) => {
    if (toolMode === 'split-video') {
      onSplitVideoSegment(pxToTime(e.clientX));
      e.preventDefault();
      return;
    }
    if (toolMode === 'split-audio') {
      onSplitAudioSegment(pxToTime(e.clientX));
      e.preventDefault();
      return;
    }
    if (toolMode === 'subtitle') {
      const time = pxToTime(e.clientX);
      rangeStartRef.current = time;
      setIsSelectingRange(true);
      setRangeSelection({ start: time, end: time });
      e.preventDefault();
      return;
    }
    if (toolMode === 'image') {
      const time = pxToTime(e.clientX);
      setPendingImageTime(time);
      fileInputRef.current?.click();
      e.preventDefault();
      return;
    }
    if (toolMode === 'delete') return;
    onSeek(pxToTime(e.clientX));
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || pendingImageTime === null) return;
    const end = Math.min(pendingImageTime + 3, duration);
    await onAddImage(file, pendingImageTime, end);
    setPendingImageTime(null);
    setToolMode(null);
    e.target.value = '';
  };

  const handleSubBodyClick = (e, index) => {
    if (didDragRef.current) return;
    e.stopPropagation();
    if (toolMode === 'delete') { onDeleteSubtitle(index); return; }
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setBubblePosition({ x: ((e.clientX - rect.left) / rect.width) * 100 });
    setEditingSubIndex(index);
  };

  const handleTimelineMouseMove = (e) => {
    if (toolMode === 'split-video' || toolMode === 'split-audio') {
      setSplitCursorTime(pxToTime(e.clientX));
    } else {
      setSplitCursorTime(null);
    }
    handlePointerMove(e);
  };

  // Time markers
  const markers = [];
  if (duration > 0 && pxPerSec > 0) {
    let step = 60 / pxPerSec;
    const niceSteps = [0.5, 1, 2, 5, 10, 15, 30, 60];
    step = niceSteps.find(s => s >= step) || 60;
    for (let t = 0; t <= duration; t += step) markers.push(t);
  }

  // Track layout calculations
  const videoTrackTop = LABEL_HEIGHT;
  const audioTrackTop = videoTrackTop + TRACK_HEIGHT + TRACK_GAP + LABEL_HEIGHT;
  const imageTrackTop = audioTrackTop + TRACK_HEIGHT + TRACK_GAP + LABEL_HEIGHT;
  const subtitleTrackTop = imageTrackTop + TRACK_HEIGHT + TRACK_GAP + LABEL_HEIGHT;
  const totalHeight = subtitleTrackTop + TRACK_HEIGHT + 4;

  // Split cursor height range
  const splitCursorTop = toolMode === 'split-video' ? videoTrackTop : audioTrackTop;
  const splitCursorH = TRACK_HEIGHT;

  const toolButtons = [
    { mode: 'split-video', icon: Scissors, label: 'פיצול וידאו', color: 'text-indigo-500' },
    { mode: 'split-audio', icon: Scissors, label: 'פיצול אודיו', color: 'text-green-500' },
    { mode: 'image', icon: Image, label: 'תמונה', color: 'text-pink-500' },
    { mode: 'subtitle', icon: Type, label: 'כתובית', color: 'text-amber-500' },
    { mode: 'delete', icon: Trash2, label: 'מחק', color: 'text-rose-500' },
  ];

  const toolHints = {
    'split-video': 'לחץ על הטיימליין לפיצול הוידאו',
    'split-audio': 'לחץ על הטיימליין לפיצול האודיו',
    'image': 'לחץ על הטיימליין להוספת תמונה',
    'subtitle': 'גרור על הטיימליין להוספת כתובית',
    'delete': 'לחץ על קטע למחיקה',
  };

  return (
    <div className="space-y-2" dir="rtl">
      <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileSelected} />

      {/* Toolbar */}
      <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1.5 border dark:border-gray-700 shadow-sm flex-wrap">
        {toolButtons.map(({ mode, icon: Icon, label, color }) => (
          <Button
            key={mode}
            size="sm"
            variant={toolMode === mode ? 'default' : 'ghost'}
            className={`gap-1 text-[11px] px-2 ${toolMode === mode ? '' : color}`}
            onClick={() => {
              setToolMode(prev => prev === mode ? null : mode);
              setRangeSelection(null); setIsSelectingRange(false); setSplitCursorTime(null);
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Button>
        ))}
        
        <div className="h-5 w-px bg-gray-200 dark:bg-gray-600 mx-0.5" />
        
        <Button size="sm" variant="ghost" className="text-xs gap-1 px-2" onClick={handleZoomIn}>
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="text-xs gap-1 px-2" onClick={handleZoomOut} disabled={!isZoomed}>
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>

        {toolMode && (
          <Button size="sm" variant="ghost" className="text-xs text-gray-500 mr-1 px-2"
            onClick={() => { setToolMode(null); setRangeSelection(null); setIsSelectingRange(false); setSplitCursorTime(null); }}
          >
            ביטול
          </Button>
        )}
        
        <span className="text-[10px] text-gray-400 mr-auto truncate">
          {toolMode ? toolHints[toolMode] : 'גרור קצוות לקיצור/הארכה • לחץ על כתובית לעריכה'}
        </span>
      </div>

      {/* Scrollable timeline - swipe to scroll when zoomed */}
      <div ref={scrollRef} className="overflow-x-auto rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-900" 
        style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch', overflowX: 'auto' }}>
        <div style={{ width: `${timelineWidth}px`, minWidth: '100%' }}>
          {/* Ruler */}
          <div className="relative h-5 text-[9px] text-gray-400 border-b dark:border-gray-700 bg-white dark:bg-gray-800" dir="ltr">
            {markers.map(t => (
              <div key={t} className="absolute flex flex-col items-center" style={{ left: `${timeToPx(t)}px` }}>
                <span className="transform -translate-x-1/2">{formatTime(t)}</span>
                <div className="w-px h-1.5 bg-gray-300 dark:bg-gray-600 mt-0.5" />
              </div>
            ))}
          </div>

          <div className="relative">
            {editingSubIndex !== null && subtitles[editingSubIndex] && (
              <SubtitleBubble
                subtitle={subtitles[editingSubIndex]}
                index={editingSubIndex}
                position={bubblePosition}
                onUpdate={(i, d) => onUpdateSubtitle(i, d)}
                onDelete={onDeleteSubtitle}
                onClose={() => setEditingSubIndex(null)}
              />
            )}

            <div 
              ref={containerRef}
              className={`relative select-none touch-none ${
                toolMode?.startsWith('split') ? 'cursor-crosshair' : 
                toolMode === 'subtitle' || toolMode === 'image' ? 'cursor-crosshair' : 'cursor-pointer'
              }`}
              style={{ height: `${totalHeight}px`, width: `${timelineWidth}px`, minWidth: '100%' }}
              onPointerDown={handleTimelinePointerDown}
              onPointerMove={handleTimelineMouseMove}
              onPointerUp={handlePointerUp}
            >
              {/* Background grid */}
              <div className="absolute inset-0 pointer-events-none" 
                style={{ background: 'repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(0,0,0,0.03) 49px, rgba(0,0,0,0.03) 50px)' }} 
              />

              {/* === VIDEO TRACK === */}
              <div className="absolute left-0 right-0" style={{ top: 0, height: `${LABEL_HEIGHT + TRACK_HEIGHT}px` }}>
                <div className="absolute top-0 right-1 text-[9px] text-indigo-500 font-medium pointer-events-none z-10">🎬 וידאו</div>
                {videoSegments.map((seg, i) => (
                  <TrackSegment
                    key={`vseg-${i}`}
                    seg={seg}
                    index={i}
                    timeToPx={timeToPx}
                    trackTop={LABEL_HEIGHT}
                    trackHeight={TRACK_HEIGHT}
                    color="indigo"
                    toolMode={toolMode}
                    onDelete={() => onDeleteVideoSegment(i)}
                    onRestore={() => onRestoreVideoSegment(i)}
                    onTrimStart={(e) => handleItemPointerDown(e, 'video-seg', i, 'start')}
                    onTrimEnd={(e) => handleItemPointerDown(e, 'video-seg', i, 'end')}
                  />
                ))}
              </div>

              {/* Divider */}
              <div className="absolute left-0 right-0 pointer-events-none bg-gray-200 dark:bg-gray-700" 
                style={{ top: `${audioTrackTop - TRACK_GAP / 2}px`, height: '1px' }} />

              {/* === AUDIO TRACK === */}
              <div className="absolute left-0 right-0" style={{ top: `${audioTrackTop - LABEL_HEIGHT}px`, height: `${LABEL_HEIGHT + TRACK_HEIGHT}px` }}>
                <div className="absolute top-0 right-1 text-[9px] text-green-500 font-medium pointer-events-none z-10">🔊 אודיו</div>
                {audioSegments.map((seg, i) => (
                  <TrackSegment
                    key={`aseg-${i}`}
                    seg={seg}
                    index={i}
                    timeToPx={timeToPx}
                    trackTop={LABEL_HEIGHT}
                    trackHeight={TRACK_HEIGHT}
                    color="green"
                    toolMode={toolMode}
                    onDelete={() => onDeleteAudioSegment(i)}
                    onRestore={() => onRestoreAudioSegment(i)}
                    onTrimStart={(e) => handleItemPointerDown(e, 'audio-seg', i, 'start')}
                    onTrimEnd={(e) => handleItemPointerDown(e, 'audio-seg', i, 'end')}
                  />
                ))}
              </div>

              {/* Divider */}
              <div className="absolute left-0 right-0 pointer-events-none bg-gray-200 dark:bg-gray-700" 
                style={{ top: `${imageTrackTop - TRACK_GAP / 2}px`, height: '1px' }} />

              {/* === IMAGE TRACK === */}
              <div className="absolute left-0 right-0" style={{ top: `${imageTrackTop - LABEL_HEIGHT}px`, height: `${LABEL_HEIGHT + TRACK_HEIGHT}px` }}>
                <div className="absolute top-0 right-1 text-[9px] text-pink-500 font-medium pointer-events-none z-10">🖼️ תמונות</div>
                {imageOverlays.map((img, i) => (
                  <ImageTrackItem
                    key={`img-${i}`}
                    img={img}
                    index={i}
                    timeToPx={timeToPx}
                    trackTop={LABEL_HEIGHT}
                    trackHeight={TRACK_HEIGHT}
                    toolMode={toolMode}
                    onDelete={() => onDeleteImage(i)}
                    onTrimStart={(e) => handleItemPointerDown(e, 'image', i, 'start')}
                    onTrimEnd={(e) => handleItemPointerDown(e, 'image', i, 'end')}
                    onMove={(e) => handleItemPointerDown(e, 'image', i, 'move')}
                    onUpdateType={(type) => onUpdateImageType(i, type)}
                  />
                ))}
              </div>

              {/* Divider */}
              <div className="absolute left-0 right-0 pointer-events-none bg-gray-200 dark:bg-gray-700" 
                style={{ top: `${subtitleTrackTop - TRACK_GAP / 2}px`, height: '1px' }} />

              {/* === SUBTITLE TRACK === */}
              <div className="absolute left-0 right-0" style={{ top: `${subtitleTrackTop - LABEL_HEIGHT}px`, height: `${LABEL_HEIGHT + TRACK_HEIGHT}px` }}>
                <div className="absolute top-0 right-1 text-[9px] text-amber-500 font-medium pointer-events-none z-10">💬 כתוביות</div>

                {rangeSelection && (
                  <div className="absolute bg-amber-400/30 border-x-2 border-amber-500 pointer-events-none z-30 rounded-md"
                    style={{ left: `${timeToPx(rangeSelection.start)}px`, width: `${timeToPx(rangeSelection.end - rangeSelection.start)}px`, top: `${LABEL_HEIGHT}px`, height: `${TRACK_HEIGHT}px` }}
                  />
                )}

                {subtitles.map((sub, i) => (
                  <div key={`sub-${i}`} className="absolute"
                    style={{ left: `${timeToPx(sub.start)}px`, width: `${Math.max(timeToPx(sub.end - sub.start), 4)}px`, top: `${LABEL_HEIGHT}px`, height: `${TRACK_HEIGHT}px` }}
                  >
                    <div
                      className={`absolute inset-0 border rounded-md cursor-pointer overflow-hidden group transition-colors ${
                        editingSubIndex === i ? 'bg-amber-500/60 border-amber-600 ring-2 ring-amber-400' 
                        : toolMode === 'delete' ? 'bg-amber-400/40 border-amber-500 hover:bg-red-500/20 hover:border-red-400'
                        : 'bg-amber-400/40 dark:bg-amber-500/25 border-amber-500 hover:bg-amber-400/60'
                      }`}
                      onPointerDown={(e) => { if (toolMode !== 'delete') handleItemPointerDown(e, 'sub', i, 'move'); else e.stopPropagation(); }}
                      onClick={(e) => handleSubBodyClick(e, i)}
                    >
                      <span className={`text-[9px] text-amber-900 dark:text-amber-100 px-1.5 font-medium truncate block`} style={{ lineHeight: `${TRACK_HEIGHT}px` }}>
                        {sub.text || 'כתובית ריקה'}
                      </span>
                      <button
                        className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center z-20"
                        onClick={(e) => { e.stopPropagation(); onDeleteSubtitle(i); setEditingSubIndex(null); }}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <div className="absolute top-0 bottom-0 w-2 cursor-ew-resize -left-0.5 z-10 flex items-center justify-center group/handle"
                      onPointerDown={(e) => handleItemPointerDown(e, 'sub', i, 'start')}>
                      <div className="w-1 h-5 bg-amber-600 rounded-full opacity-40 group-hover/handle:opacity-100 transition-opacity" />
                    </div>
                    <div className="absolute top-0 bottom-0 w-2 cursor-ew-resize -right-0.5 z-10 flex items-center justify-center group/handle"
                      onPointerDown={(e) => handleItemPointerDown(e, 'sub', i, 'end')}>
                      <div className="w-1 h-5 bg-amber-600 rounded-full opacity-40 group-hover/handle:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Split cursor */}
              {(toolMode === 'split-video' || toolMode === 'split-audio') && splitCursorTime !== null && (
                <div className="absolute pointer-events-none z-30"
                  style={{ left: `${timeToPx(splitCursorTime)}px`, top: `${splitCursorTop}px`, height: `${splitCursorH}px` }}>
                  <div className="w-0.5 h-full bg-red-500 opacity-70" />
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Scissors className="w-3.5 h-3.5 text-red-500" />
                  </div>
                </div>
              )}

              {/* Playhead */}
              <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: `${timeToPx(currentTime)}px` }}>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-md border-2 border-indigo-600" />
                <div className="w-0.5 h-full bg-indigo-600 shadow-sm shadow-indigo-600/50 -translate-x-[0.5px]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}