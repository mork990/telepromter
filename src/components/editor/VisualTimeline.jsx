import React, { useRef, useState, useEffect } from 'react';

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
  onCutDrag 
}) {
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null); // { type: 'sub'|'cut', index, edge: 'start'|'end'|'move' }
  const dragStartRef = useRef({ x: 0, startVal: 0, endVal: 0 });

  const pxToTime = (px) => {
    if (!containerRef.current || !duration) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(duration, (px / rect.width) * duration));
  };

  const timeToPct = (time) => {
    if (!duration) return 0;
    return (time / duration) * 100;
  };

  const handleClick = (e) => {
    if (dragging) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = pxToTime(x);
    onSeek(time);
  };

  const handlePointerDown = (e, type, index, edge) => {
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

    if (type === 'sub') {
      onSubtitleDrag(index, item.start, item.end);
    } else {
      onCutDrag(index, item.start, item.end);
    }
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  // Time markers
  const markers = [];
  if (duration > 0) {
    const step = duration < 30 ? 5 : duration < 120 ? 10 : 30;
    for (let t = 0; t <= duration; t += step) {
      markers.push(t);
    }
  }

  return (
    <div className="space-y-1">
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
      <div 
        ref={containerRef}
        className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer select-none touch-none"
        style={{ height: '80px' }}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Cut zones (red) */}
        {cuts.map((cut, i) => (
          <div
            key={`cut-${i}`}
            className="absolute top-0 h-full"
            style={{
              left: `${timeToPct(cut.start)}%`,
              width: `${timeToPct(cut.end - cut.start)}%`,
            }}
          >
            {/* Cut body */}
            <div
              className="absolute inset-0 bg-red-500/20 border-y-2 border-red-400 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => handlePointerDown(e, 'cut', i, 'move')}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] text-red-600 font-semibold bg-red-100/80 px-1 rounded">חיתוך</span>
              </div>
            </div>
            {/* Left handle */}
            <div
              className="absolute top-0 bottom-0 w-2 bg-red-500 cursor-ew-resize rounded-l-sm -left-1 z-10"
              onPointerDown={(e) => handlePointerDown(e, 'cut', i, 'start')}
            />
            {/* Right handle */}
            <div
              className="absolute top-0 bottom-0 w-2 bg-red-500 cursor-ew-resize rounded-r-sm -right-1 z-10"
              onPointerDown={(e) => handlePointerDown(e, 'cut', i, 'end')}
            />
          </div>
        ))}

        {/* Subtitle blocks (amber/yellow) */}
        {subtitles.map((sub, i) => (
          <div
            key={`sub-${i}`}
            className="absolute"
            style={{
              left: `${timeToPct(sub.start)}%`,
              width: `${Math.max(timeToPct(sub.end - sub.start), 1)}%`,
              top: '40px',
              height: '36px',
            }}
          >
            {/* Subtitle body */}
            <div
              className="absolute inset-0 bg-amber-400/60 dark:bg-amber-500/40 border border-amber-500 rounded-md cursor-grab active:cursor-grabbing overflow-hidden"
              onPointerDown={(e) => handlePointerDown(e, 'sub', i, 'move')}
            >
              <span className="text-[9px] text-amber-900 dark:text-amber-100 px-1 font-medium truncate block leading-[36px]">
                {sub.text}
              </span>
            </div>
            {/* Left handle */}
            <div
              className="absolute top-0 bottom-0 w-1.5 bg-amber-600 cursor-ew-resize rounded-l-sm -left-0.5 z-10"
              onPointerDown={(e) => handlePointerDown(e, 'sub', i, 'start')}
            />
            {/* Right handle */}
            <div
              className="absolute top-0 bottom-0 w-1.5 bg-amber-600 cursor-ew-resize rounded-r-sm -right-0.5 z-10"
              onPointerDown={(e) => handlePointerDown(e, 'sub', i, 'end')}
            />
          </div>
        ))}

        {/* Track labels */}
        <div className="absolute top-1 right-1 text-[9px] text-gray-400 font-medium pointer-events-none">וידאו</div>
        <div className="absolute bottom-1 right-1 text-[9px] text-amber-500 font-medium pointer-events-none">כתוביות</div>

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-indigo-600 z-20 pointer-events-none"
          style={{ left: `${timeToPct(currentTime)}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-indigo-600 rounded-full" />
        </div>
      </div>
    </div>
  );
}