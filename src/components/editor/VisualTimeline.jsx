import React, { useRef, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Scissors, Type, Trash2, MousePointer } from "lucide-react";
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
  cuts, 
  onSeek, 
  onSubtitleDrag, 
  onCutDrag,
  onAddCut,
  onAddSubtitle,
  onDeleteCut,
  onDeleteSubtitle,
  onUpdateSubtitle,
}) {
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const dragStartRef = useRef({ x: 0, startVal: 0, endVal: 0 });
  
  // Tool mode: 'select' | 'cut' | 'subtitle'
  const [toolMode, setToolMode] = useState('select');
  
  // Range selection for cut/subtitle creation
  const [rangeSelection, setRangeSelection] = useState(null); // { start, end }
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const rangeStartRef = useRef(0);

  // Subtitle edit bubble
  const [editingSubIndex, setEditingSubIndex] = useState(null);
  const [bubblePosition, setBubblePosition] = useState({ x: 50 });

  const timeToPct = (time) => {
    if (!duration) return 0;
    return (time / duration) * 100;
  };

  const pxToTime = (clientX) => {
    if (!containerRef.current || !duration) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(duration, (x / rect.width) * duration));
  };

  // --- Drag existing items ---
  const handleItemPointerDown = (e, type, index, edge) => {
    if (toolMode !== 'select') return;
    e.stopPropagation();
    e.preventDefault();
    const items = type === 'sub' ? subtitles : cuts;
    setDragging({ type, index, edge });
    dragStartRef.current = {
      x: e.clientX,
      startVal: items[index].start,
      endVal: items[index].end,
    };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    // Range selection drawing
    if (isSelectingRange && containerRef.current) {
      const time = pxToTime(e.clientX);
      setRangeSelection({
        start: Math.min(rangeStartRef.current, time),
        end: Math.max(rangeStartRef.current, time),
      });
      return;
    }

    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - dragStartRef.current.x;
    const dt = (dx / rect.width) * duration;
    const { type, index, edge } = dragging;
    const items = type === 'sub' ? subtitles : cuts;
    const item = { ...items[index] };

    if (edge === 'start') {
      item.start = Math.max(0, Math.min(item.end - 0.2, dragStartRef.current.startVal + dt));
    } else if (edge === 'end') {
      item.end = Math.min(duration, Math.max(item.start + 0.2, dragStartRef.current.endVal + dt));
    } else {
      const dur = dragStartRef.current.endVal - dragStartRef.current.startVal;
      let newStart = dragStartRef.current.startVal + dt;
      newStart = Math.max(0, Math.min(duration - dur, newStart));
      item.start = newStart;
      item.end = newStart + dur;
    }

    if (type === 'sub') onSubtitleDrag(index, item.start, item.end);
    else onCutDrag(index, item.start, item.end);
  };

  const handlePointerUp = () => {
    // Finish range selection
    if (isSelectingRange && rangeSelection) {
      const { start, end } = rangeSelection;
      if (end - start > 0.3) {
        if (toolMode === 'cut') {
          onAddCut(start, end);
        } else if (toolMode === 'subtitle') {
          onAddSubtitle(start, end);
        }
      }
      setRangeSelection(null);
      setIsSelectingRange(false);
      return;
    }
    setDragging(null);
  };

  // --- Timeline background click ---
  const handleTimelinePointerDown = (e) => {
    if (toolMode === 'cut' || toolMode === 'subtitle') {
      // Start range selection
      const time = pxToTime(e.clientX);
      rangeStartRef.current = time;
      setIsSelectingRange(true);
      setRangeSelection({ start: time, end: time });
      e.preventDefault();
    } else {
      // Seek
      const time = pxToTime(e.clientX);
      onSeek(time);
    }
  };

  // --- Subtitle click to edit ---
  const handleSubtitleClick = (e, index) => {
    if (toolMode !== 'select') return;
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    setBubblePosition({ x: xPct });
    setEditingSubIndex(index);
  };

  const handleUpdateSubtitle = useCallback((index, data) => {
    onUpdateSubtitle(index, data);
  }, [onUpdateSubtitle]);

  // Time markers
  const markers = [];
  if (duration > 0) {
    const step = duration < 30 ? 5 : duration < 120 ? 10 : 30;
    for (let t = 0; t <= duration; t += step) {
      markers.push(t);
    }
  }

  const toolButtons = [
    { mode: 'select', icon: MousePointer, label: 'בחירה', color: 'text-gray-600' },
    { mode: 'cut', icon: Scissors, label: 'חתוך', color: 'text-red-500' },
    { mode: 'subtitle', icon: Type, label: 'כתובית', color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-2" dir="rtl">
      {/* Toolbar */}
      <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border dark:border-gray-700 shadow-sm">
        {toolButtons.map(({ mode, icon: Icon, label, color }) => (
          <Button
            key={mode}
            size="sm"
            variant={toolMode === mode ? 'default' : 'ghost'}
            className={`gap-1.5 text-xs ${toolMode === mode ? '' : color}`}
            onClick={() => { setToolMode(mode); setRangeSelection(null); setIsSelectingRange(false); }}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Button>
        ))}
        
        {/* Hint */}
        <span className="text-[10px] text-gray-400 mr-auto">
          {toolMode === 'cut' && 'גרור על הטיימליין לסמן קטע לחיתוך'}
          {toolMode === 'subtitle' && 'גרור על הטיימליין להוספת כתובית'}
          {toolMode === 'select' && 'לחץ על כתובית לעריכה, גרור לשינוי מיקום'}
        </span>
      </div>

      {/* Time ruler */}
      <div className="relative h-4 text-[9px] text-gray-400" dir="ltr">
        {markers.map(t => (
          <span 
            key={t} 
            className="absolute" 
            style={{ left: `${timeToPct(t)}%`, transform: 'translateX(-50%)' }}
          >
            {formatTime(t)}
          </span>
        ))}
      </div>

      {/* Timeline tracks */}
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
          className={`relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-visible select-none touch-none ${
            toolMode === 'select' ? 'cursor-pointer' : 'cursor-crosshair'
          }`}
          style={{ height: '88px' }}
          onPointerDown={handleTimelinePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Range selection preview */}
          {rangeSelection && (
            <div
              className={`absolute top-0 h-full ${
                toolMode === 'cut' ? 'bg-red-400/30 border-x-2 border-red-500' : 'bg-amber-400/30 border-x-2 border-amber-500'
              } pointer-events-none z-30`}
              style={{
                left: `${timeToPct(rangeSelection.start)}%`,
                width: `${timeToPct(rangeSelection.end - rangeSelection.start)}%`,
              }}
            />
          )}

          {/* Cut zones (red) - top half */}
          {cuts.map((cut, i) => (
            <div
              key={`cut-${i}`}
              className="absolute"
              style={{
                left: `${timeToPct(cut.start)}%`,
                width: `${Math.max(timeToPct(cut.end - cut.start), 0.5)}%`,
                top: '4px',
                height: '36px',
              }}
            >
              <div
                className="absolute inset-0 bg-red-500/25 border border-red-400 rounded-md cursor-grab active:cursor-grabbing group"
                onPointerDown={(e) => handleItemPointerDown(e, 'cut', i, 'move')}
              >
                <div className="flex items-center justify-center h-full gap-1">
                  <Scissors className="w-3 h-3 text-red-500" />
                  <span className="text-[8px] text-red-600 font-semibold">חיתוך</span>
                </div>
                {/* Delete button */}
                {toolMode === 'select' && (
                  <button
                    className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center z-20"
                    onClick={(e) => { e.stopPropagation(); onDeleteCut(i); }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
              {/* Handles */}
              <div
                className="absolute top-0 bottom-0 w-2 bg-red-500 cursor-ew-resize rounded-l-sm -left-1 z-10 opacity-60 hover:opacity-100"
                onPointerDown={(e) => handleItemPointerDown(e, 'cut', i, 'start')}
              />
              <div
                className="absolute top-0 bottom-0 w-2 bg-red-500 cursor-ew-resize rounded-r-sm -right-1 z-10 opacity-60 hover:opacity-100"
                onPointerDown={(e) => handleItemPointerDown(e, 'cut', i, 'end')}
              />
            </div>
          ))}

          {/* Subtitle blocks (amber) - bottom half */}
          {subtitles.map((sub, i) => (
            <div
              key={`sub-${i}`}
              className="absolute"
              style={{
                left: `${timeToPct(sub.start)}%`,
                width: `${Math.max(timeToPct(sub.end - sub.start), 1)}%`,
                top: '48px',
                height: '36px',
              }}
            >
              <div
                className={`absolute inset-0 border rounded-md cursor-pointer overflow-hidden group transition-colors ${
                  editingSubIndex === i 
                    ? 'bg-amber-500/70 border-amber-600 ring-2 ring-amber-400' 
                    : 'bg-amber-400/50 dark:bg-amber-500/30 border-amber-500 hover:bg-amber-400/70'
                }`}
                onPointerDown={(e) => handleItemPointerDown(e, 'sub', i, 'move')}
                onClick={(e) => handleSubtitleClick(e, i)}
              >
                <span className="text-[9px] text-amber-900 dark:text-amber-100 px-1 font-medium truncate block leading-[36px]">
                  {sub.text || 'כתובית ריקה'}
                </span>
                {/* Delete button */}
                {toolMode === 'select' && (
                  <button
                    className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center z-20"
                    onClick={(e) => { e.stopPropagation(); onDeleteSubtitle(i); setEditingSubIndex(null); }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
              {/* Handles */}
              <div
                className="absolute top-0 bottom-0 w-1.5 bg-amber-600 cursor-ew-resize rounded-l-sm -left-0.5 z-10 opacity-60 hover:opacity-100"
                onPointerDown={(e) => handleItemPointerDown(e, 'sub', i, 'start')}
              />
              <div
                className="absolute top-0 bottom-0 w-1.5 bg-amber-600 cursor-ew-resize rounded-r-sm -right-0.5 z-10 opacity-60 hover:opacity-100"
                onPointerDown={(e) => handleItemPointerDown(e, 'sub', i, 'end')}
              />
            </div>
          ))}

          {/* Track labels */}
          <div className="absolute top-1 right-1 text-[9px] text-red-400 font-medium pointer-events-none">חיתוך</div>
          <div className="absolute bottom-1 right-1 text-[9px] text-amber-500 font-medium pointer-events-none">כתוביות</div>

          {/* Divider between tracks */}
          <div className="absolute left-0 right-0 top-[44px] h-px bg-gray-200 dark:bg-gray-700 pointer-events-none" />

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-indigo-600 z-20 pointer-events-none"
            style={{ left: `${timeToPct(currentTime)}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-indigo-600 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}