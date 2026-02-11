import React, { useRef } from 'react';
import { Trash2, Undo2, Plus } from "lucide-react";

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const colorClasses = {
  indigo: {
    bg: 'bg-gradient-to-b from-indigo-400/25 to-indigo-500/15 dark:from-indigo-500/25 dark:to-indigo-600/15',
    border: 'border-indigo-400/80 dark:border-indigo-500/80',
    wave: 'bg-indigo-500 dark:bg-indigo-400',
    handle: 'bg-indigo-500',
    label: 'text-indigo-600/60 dark:text-indigo-300/60',
    hoverDelete: 'hover:bg-red-500/20 hover:border-red-400',
  },
  green: {
    bg: 'bg-gradient-to-b from-green-400/25 to-green-500/15 dark:from-green-500/25 dark:to-green-600/15',
    border: 'border-green-400/80 dark:border-green-500/80',
    wave: 'bg-green-500 dark:bg-green-400',
    handle: 'bg-green-500',
    label: 'text-green-600/60 dark:text-green-300/60',
    hoverDelete: 'hover:bg-red-500/20 hover:border-red-400',
  },
};

export default function TrackSegment({
  seg, index, timeToPx, trackTop, trackHeight, color,
  toolMode, onDelete, onRestore, onTrimStart, onTrimEnd,
  onInsertFile,
}) {
  const fileInputRef = useRef(null);
  const c = colorClasses[color] || colorClasses.indigo;
  const segWidth = Math.max(timeToPx(seg.originalEnd - seg.originalStart), 2);

  return (
    <div
      className="absolute group"
      style={{
        left: `${timeToPx(seg.originalStart)}px`,
        width: `${segWidth}px`,
        top: `${trackTop}px`,
        height: `${trackHeight}px`,
      }}
    >
      {seg.deleted ? (
        <div className="absolute inset-0 bg-white/5 border border-dashed border-white/20 rounded-md flex items-center justify-center">
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#1a1a2e] rounded-full p-1 shadow-md"
            onClick={(e) => { e.stopPropagation(); onRestore(); }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Undo2 className="w-3 h-3 text-gray-500" />
          </button>
        </div>
      ) : (
        <>
          <div
            className={`absolute inset-0 ${c.bg} border ${c.border} rounded-md overflow-hidden ${
              toolMode === 'delete' ? `${c.hoverDelete} cursor-pointer` : ''
            }`}
            onClick={(e) => { if (toolMode === 'delete') { e.stopPropagation(); onDelete(); } }}
            onPointerDown={(e) => { if (toolMode === 'delete') e.stopPropagation(); }}
          >
            {/* Waveform */}
            <div className="absolute inset-0 flex items-center justify-center gap-[1px] px-1 opacity-25 pointer-events-none">
              {Array.from({ length: Math.min(150, Math.max(1, Math.floor(segWidth / 3))) }).map((_, j) => (
                <div key={j} className={`w-[2px] ${c.wave} rounded-full flex-shrink-0`}
                  style={{ height: `${10 + Math.sin(j * 0.7) * 8 + Math.sin(j * 1.3) * 5}px` }} />
              ))}
            </div>
            
            {segWidth > 40 && (
              <>
                <div className={`absolute bottom-0.5 left-1 text-[7px] ${c.label} pointer-events-none`}>{formatTime(seg.originalStart)}</div>
                <div className={`absolute bottom-0.5 right-1 text-[7px] ${c.label} pointer-events-none`}>{formatTime(seg.originalEnd)}</div>
              </>
            )}
            
            <button
              className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center z-20"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          </div>
          
          <div className="absolute top-0 bottom-0 w-2 cursor-ew-resize -left-1 z-10 flex items-center justify-center group/handle"
            onPointerDown={onTrimStart}>
            <div className={`w-1 h-5 ${c.handle} rounded-full opacity-40 group-hover/handle:opacity-100 transition-opacity`} />
          </div>
          <div className="absolute top-0 bottom-0 w-2 cursor-ew-resize -right-1 z-10 flex items-center justify-center group/handle"
            onPointerDown={onTrimEnd}>
            <div className={`w-1 h-5 ${c.handle} rounded-full opacity-40 group-hover/handle:opacity-100 transition-opacity`} />
          </div>
        </>
      )}
    </div>
  );
}