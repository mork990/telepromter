import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Scissors, Type, Trash2, ZoomIn, ZoomOut, Undo2 } from "lucide-react";
import SubtitleBubble from './SubtitleBubble';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VisualTimeline({ 
  duration, 
  currentTime, 
  subtitles, 
  segments = [],
  onSeek, 
  onSubtitleDrag,
  onSplitSegment,
  onDeleteSegment,
  onRestoreSegment,
  onTrimSegment,
  onAddSubtitle,
  onDeleteSubtitle,
  onUpdateSubtitle,
}) {
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const dragStartRef = useRef({ x: 0, startVal: 0, endVal: 0 });
  const didDragRef = useRef(false);
  
  const [toolMode, setToolMode] = useState(null);
  
  // Zoom
  const [pxPerSec, setPxPerSec] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  // Range selection for subtitle
  const [rangeSelection, setRangeSelection] = useState(null);
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const rangeStartRef = useRef(0);

  // Subtitle edit bubble
  const [editingSubIndex, setEditingSubIndex] = useState(null);
  const [bubblePosition, setBubblePosition] = useState({ x: 50 });

  // Selected item for delete tool
  const [selectedItem, setSelectedItem] = useState(null);

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
      if (next <= minPx * 1.1) {
        setIsZoomed(false);
        return minPx;
      }
      return next;
    });
  };

  // Auto-scroll to playhead
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

  // --- Generic drag handler for subtitles and segment edges ---
  const handleItemPointerDown = (e, type, index, edge) => {
    e.stopPropagation();
    e.preventDefault();
    didDragRef.current = false;

    if (type === 'sub') {
      dragStartRef.current = {
        x: e.clientX,
        startVal: subtitles[index].start,
        endVal: subtitles[index].end,
      };
    } else if (type === 'seg') {
      const seg = segments[index];
      dragStartRef.current = {
        x: e.clientX,
        startVal: seg.originalStart,
        endVal: seg.originalEnd,
      };
    }

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
      if (edge === 'start') {
        sub.start = Math.max(0, Math.min(sub.end - 0.2, dragStartRef.current.startVal + dt));
      } else if (edge === 'end') {
        sub.end = Math.min(duration, Math.max(sub.start + 0.2, dragStartRef.current.endVal + dt));
      } else {
        const dur = dragStartRef.current.endVal - dragStartRef.current.startVal;
        let newStart = dragStartRef.current.startVal + dt;
        newStart = Math.max(0, Math.min(duration - dur, newStart));
        sub.start = newStart;
        sub.end = newStart + dur;
      }
      onSubtitleDrag(index, sub.start, sub.end);
    } else if (type === 'seg') {
      const newTime = (edge === 'start')
        ? dragStartRef.current.startVal + dt
        : dragStartRef.current.endVal + dt;
      onTrimSegment(index, edge, newTime);
    }
  };

  const handlePointerUp = () => {
    if (isSelectingRange && rangeSelection) {
      const { start, end } = rangeSelection;
      if (end - start > 0.3) {
        onAddSubtitle(start, end);
      }
      setRangeSelection(null);
      setIsSelectingRange(false);
      setToolMode(null);
      return;
    }
    setDragging(null);
  };

  const handleSubBodyClick = (e, index) => {
    if (didDragRef.current) return;
    e.stopPropagation();
    if (toolMode === 'delete') {
      onDeleteSubtitle(index);
      return;
    }
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    setBubblePosition({ x: xPct });
    setEditingSubIndex(index);
  };

  const handleSegClick = (e, index) => {
    if (didDragRef.current) return;
    e.stopPropagation();
    if (toolMode === 'delete') {
      onDeleteSegment(index);
      return;
    }
  };

  const handleTimelinePointerDown = (e) => {
    if (toolMode === 'split') {
      const time = pxToTime(e.clientX);
      onSplitSegment(time);
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
    if (toolMode === 'delete') {
      // Clicking on empty area does nothing in delete mode
      return;
    }
    const time = pxToTime(e.clientX);
    onSeek(time);
  };

  const handleUpdateSubtitle = useCallback((index, data) => {
    onUpdateSubtitle(index, data);
  }, [onUpdateSubtitle]);

  // Time markers
  const markers = [];
  if (duration > 0 && pxPerSec > 0) {
    const targetSpacingPx = 60;
    let step = targetSpacingPx / pxPerSec;
    const niceSteps = [0.5, 1, 2, 5, 10, 15, 30, 60];
    step = niceSteps.find(s => s >= step) || 60;
    for (let t = 0; t <= duration; t += step) {
      markers.push(t);
    }
  }

  // Split cursor
  const [splitCursorTime, setSplitCursorTime] = useState(null);

  const handleTimelineMouseMove = (e) => {
    if (toolMode === 'split') {
      setSplitCursorTime(pxToTime(e.clientX));
    } else {
      setSplitCursorTime(null);
    }
    handlePointerMove(e);
  };

  const toolButtons = [
    { mode: 'split', icon: Scissors, label: 'פיצול', color: 'text-red-500' },
    { mode: 'subtitle', icon: Type, label: 'כתובית', color: 'text-amber-500' },
    { mode: 'delete', icon: Trash2, label: 'מחק', color: 'text-rose-500' },
  ];

  return (
    <div className="space-y-2" dir="rtl">
      {/* Toolbar */}
      <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1.5 border dark:border-gray-700 shadow-sm flex-wrap">
        {toolButtons.map(({ mode, icon: Icon, label, color }) => (
          <Button
            key={mode}
            size="sm"
            variant={toolMode === mode ? 'default' : 'ghost'}
            className={`gap-1.5 text-xs ${toolMode === mode ? '' : color}`}
            onClick={() => {
              setToolMode(prev => prev === mode ? null : mode);
              setRangeSelection(null);
              setIsSelectingRange(false);
              setSplitCursorTime(null);
              setSelectedItem(null);
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Button>
        ))}
        
        <div className="h-5 w-px bg-gray-200 dark:bg-gray-600 mx-1" />
        
        <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={handleZoomIn}>
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={handleZoomOut} disabled={!isZoomed}>
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>

        {toolMode && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-gray-500 mr-1"
            onClick={() => { setToolMode(null); setRangeSelection(null); setIsSelectingRange(false); setSplitCursorTime(null); setSelectedItem(null); }}
          >
            ביטול
          </Button>
        )}
        
        <span className="text-[10px] text-gray-400 mr-auto truncate">
          {toolMode === 'split' && 'לחץ על הטיימליין כדי לפצל קטע'}
          {toolMode === 'subtitle' && 'גרור על הטיימליין להוספת כתובית'}
          {toolMode === 'delete' && 'לחץ על קטע וידאו או כתובית למחיקה'}
          {!toolMode && 'גרור קצוות לקיצור/הארכה • לחץ על כתובית לעריכה'}
        </span>
      </div>

      {/* Scrollable timeline */}
      <div 
        ref={scrollRef}
        className="overflow-x-auto rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div style={{ width: `${timelineWidth}px`, minWidth: '100%' }}>
          {/* Ruler */}
          <div className="relative h-5 text-[9px] text-gray-400 border-b dark:border-gray-700 bg-white dark:bg-gray-800" dir="ltr">
            {markers.map(t => (
              <div 
                key={t} 
                className="absolute flex flex-col items-center"
                style={{ left: `${timeToPx(t)}px` }}
              >
                <span className="transform -translate-x-1/2">{formatTime(t)}</span>
                <div className="w-px h-1.5 bg-gray-300 dark:bg-gray-600 mt-0.5" />
              </div>
            ))}
          </div>

          {/* Timeline area */}
          <div className="relative">
            {/* Subtitle edit bubble */}
            {editingSubIndex !== null && subtitles[editingSubIndex] && (
              <SubtitleBubble
                subtitle={subtitles[editingSubIndex]}
                index={editingSubIndex}
                position={bubblePosition}
                onUpdate={handleUpdateSubtitle}
                onDelete={onDeleteSubtitle}
                onClose={() => setEditingSubIndex(null)}
              />
            )}

            <div 
              ref={containerRef}
              className={`relative select-none touch-none ${
                toolMode === 'split' ? 'cursor-crosshair' : 
                toolMode === 'subtitle' ? 'cursor-crosshair' : 
                toolMode === 'delete' ? 'cursor-pointer' : 'cursor-pointer'
              }`}
              style={{ height: '120px', width: `${timelineWidth}px`, minWidth: '100%' }}
              onPointerDown={handleTimelinePointerDown}
              onPointerMove={handleTimelineMouseMove}
              onPointerUp={handlePointerUp}
            >
              {/* Background grid */}
              <div className="absolute inset-0 pointer-events-none rounded-b-lg" 
                style={{ background: 'repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(0,0,0,0.04) 49px, rgba(0,0,0,0.04) 50px)' }} 
              />

              {/* === VIDEO SEGMENTS TRACK (top) === */}
              <div className="absolute left-0 right-0 top-0" style={{ height: '54px' }}>
                <div className="absolute top-0.5 right-1 text-[9px] text-indigo-500 font-medium pointer-events-none z-10">וידאו</div>
                
                {segments.map((seg, i) => {
                  const segWidth = Math.max(timeToPx(seg.originalEnd - seg.originalStart), 2);
                  return (
                    <div
                      key={`seg-${i}`}
                      className="absolute group"
                      style={{
                        left: `${timeToPx(seg.originalStart)}px`,
                        width: `${segWidth}px`,
                        top: '4px',
                        height: '46px',
                      }}
                    >
                      {seg.deleted ? (
                        <div className="absolute inset-0 bg-gray-300/30 dark:bg-gray-600/30 border border-dashed border-gray-400 dark:border-gray-500 rounded-md flex items-center justify-center">
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-700 rounded-full p-1.5 shadow-md"
                            onClick={(e) => { e.stopPropagation(); onRestoreSegment(i); }}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <Undo2 className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div 
                            className={`absolute inset-0 bg-gradient-to-b from-indigo-400/25 to-indigo-500/15 dark:from-indigo-500/25 dark:to-indigo-600/15 border border-indigo-400/80 dark:border-indigo-500/80 rounded-md overflow-hidden ${
                              toolMode === 'delete' ? 'hover:bg-red-500/20 hover:border-red-400 cursor-pointer' : ''
                            }`}
                            onClick={(e) => handleSegClick(e, i)}
                            onPointerDown={(e) => {
                              // Only stop propagation, don't start drag on body
                              if (toolMode === 'delete') e.stopPropagation();
                            }}
                          >
                            {/* Waveform decoration */}
                            <div className="absolute inset-0 flex items-center justify-center gap-[1px] px-1 opacity-30 pointer-events-none">
                              {Array.from({ length: Math.min(200, Math.max(1, Math.floor(segWidth / 3))) }).map((_, j) => (
                                <div
                                  key={j}
                                  className="w-[2px] bg-indigo-500 dark:bg-indigo-400 rounded-full flex-shrink-0"
                                  style={{ height: `${14 + Math.sin(j * 0.7) * 10 + Math.sin(j * 1.3) * 6}px` }}
                                />
                              ))}
                            </div>
                            
                            {/* Time labels */}
                            {segWidth > 40 && (
                              <>
                                <div className="absolute bottom-0.5 left-1 text-[8px] text-indigo-600/60 dark:text-indigo-300/60 pointer-events-none">
                                  {formatTime(seg.originalStart)}
                                </div>
                                <div className="absolute bottom-0.5 right-1 text-[8px] text-indigo-600/60 dark:text-indigo-300/60 pointer-events-none">
                                  {formatTime(seg.originalEnd)}
                                </div>
                              </>
                            )}
                            
                            {/* Delete button on hover */}
                            <button
                              className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center z-20"
                              onClick={(e) => { e.stopPropagation(); onDeleteSegment(i); }}
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          
                          {/* Left edge handle (trim start) */}
                          <div
                            className="absolute top-0 bottom-0 w-2 cursor-ew-resize -left-1 z-10 flex items-center justify-center group/handle"
                            onPointerDown={(e) => handleItemPointerDown(e, 'seg', i, 'start')}
                          >
                            <div className="w-1 h-6 bg-indigo-500 rounded-full opacity-40 group-hover/handle:opacity-100 transition-opacity" />
                          </div>
                          
                          {/* Right edge handle (trim end) */}
                          <div
                            className="absolute top-0 bottom-0 w-2 cursor-ew-resize -right-1 z-10 flex items-center justify-center group/handle"
                            onPointerDown={(e) => handleItemPointerDown(e, 'seg', i, 'end')}
                          >
                            <div className="w-1 h-6 bg-indigo-500 rounded-full opacity-40 group-hover/handle:opacity-100 transition-opacity" />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="absolute left-0 right-0 top-[58px] h-px bg-gray-200 dark:bg-gray-700 pointer-events-none" />

              {/* === SUBTITLE TRACK (bottom) === */}
              <div className="absolute left-0 right-0" style={{ top: '62px', height: '54px' }}>
                <div className="absolute top-0.5 right-1 text-[9px] text-amber-500 font-medium pointer-events-none z-10">כתוביות</div>

                {rangeSelection && (
                  <div
                    className="absolute bg-amber-400/30 border-x-2 border-amber-500 pointer-events-none z-30 rounded-md"
                    style={{
                      left: `${timeToPx(rangeSelection.start)}px`,
                      width: `${timeToPx(rangeSelection.end - rangeSelection.start)}px`,
                      top: '4px',
                      height: '46px',
                    }}
                  />
                )}

                {subtitles.map((sub, i) => (
                  <div
                    key={`sub-${i}`}
                    className="absolute"
                    style={{
                      left: `${timeToPx(sub.start)}px`,
                      width: `${Math.max(timeToPx(sub.end - sub.start), 4)}px`,
                      top: '4px',
                      height: '46px',
                    }}
                  >
                    <div
                      className={`absolute inset-0 border rounded-md cursor-pointer overflow-hidden group transition-colors ${
                        editingSubIndex === i 
                          ? 'bg-amber-500/60 border-amber-600 ring-2 ring-amber-400' 
                          : toolMode === 'delete'
                            ? 'bg-amber-400/40 border-amber-500 hover:bg-red-500/20 hover:border-red-400'
                            : 'bg-amber-400/40 dark:bg-amber-500/25 border-amber-500 hover:bg-amber-400/60'
                      }`}
                      onPointerDown={(e) => {
                        if (toolMode !== 'delete') {
                          handleItemPointerDown(e, 'sub', i, 'move');
                        } else {
                          e.stopPropagation();
                        }
                      }}
                      onClick={(e) => handleSubBodyClick(e, i)}
                    >
                      <span className="text-[9px] text-amber-900 dark:text-amber-100 px-1.5 font-medium truncate block leading-[46px]">
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
                    <div
                      className="absolute top-0 bottom-0 w-2 cursor-ew-resize -left-0.5 z-10 flex items-center justify-center group/handle"
                      onPointerDown={(e) => handleItemPointerDown(e, 'sub', i, 'start')}
                    >
                      <div className="w-1 h-5 bg-amber-600 rounded-full opacity-40 group-hover/handle:opacity-100 transition-opacity" />
                    </div>
                    <div
                      className="absolute top-0 bottom-0 w-2 cursor-ew-resize -right-0.5 z-10 flex items-center justify-center group/handle"
                      onPointerDown={(e) => handleItemPointerDown(e, 'sub', i, 'end')}
                    >
                      <div className="w-1 h-5 bg-amber-600 rounded-full opacity-40 group-hover/handle:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Split cursor */}
              {toolMode === 'split' && splitCursorTime !== null && (
                <div
                  className="absolute top-0 pointer-events-none z-30"
                  style={{ left: `${timeToPx(splitCursorTime)}px`, height: '58px' }}
                >
                  <div className="w-0.5 h-full bg-red-500 opacity-70" />
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Scissors className="w-3.5 h-3.5 text-red-500" />
                  </div>
                </div>
              )}

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ left: `${timeToPx(currentTime)}px` }}
              >
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