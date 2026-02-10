import React, { useState } from 'react';
import { Trash2, Move } from "lucide-react";

const typeLabels = {
  overlay: 'שכבה',
  replace: 'החלפה',
  background: 'רקע',
};

export default function ImageTrackItem({
  img, index, timeToPx, trackTop, trackHeight,
  toolMode, onDelete, onTrimStart, onTrimEnd, onMove, onUpdateType,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const itemWidth = Math.max(timeToPx(img.end - img.start), 4);

  return (
    <div
      className="absolute group"
      style={{
        left: `${timeToPx(img.start)}px`,
        width: `${itemWidth}px`,
        top: `${trackTop}px`,
        height: `${trackHeight}px`,
      }}
    >
      <div
        className={`absolute inset-0 border rounded-md overflow-hidden cursor-grab active:cursor-grabbing transition-colors ${
          toolMode === 'delete'
            ? 'bg-pink-400/40 border-pink-500 hover:bg-red-500/20 hover:border-red-400'
            : 'bg-pink-400/30 dark:bg-pink-500/20 border-pink-400/80 dark:border-pink-500/80 hover:bg-pink-400/50'
        }`}
        onPointerDown={(e) => {
          if (toolMode === 'delete') { e.stopPropagation(); return; }
          // Move the image in the timeline
          onMove(e);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (toolMode === 'delete') { onDelete(); return; }
          setShowMenu(!showMenu);
        }}
      >
        {/* Thumbnail */}
        <img src={img.file_url} className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none" alt="" />
        
        {/* Type badge */}
        <div className="absolute top-0.5 left-0.5 bg-pink-600 text-white text-[7px] px-1 rounded font-medium pointer-events-none">
          {typeLabels[img.type] || 'שכבה'}
        </div>

        {/* Delete */}
        <button
          className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center z-20"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Type selection menu */}
      {showMenu && (
        <div className="absolute -top-20 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-600 p-1 z-30 min-w-[80px]"
          onPointerDown={(e) => e.stopPropagation()}>
          {['overlay', 'replace', 'background'].map(type => (
            <button key={type}
              className={`block w-full text-right text-[10px] px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${img.type === type ? 'bg-pink-100 dark:bg-pink-900/30 font-bold' : ''}`}
              onClick={(e) => { e.stopPropagation(); onUpdateType(type); setShowMenu(false); }}
            >
              {typeLabels[type]}
            </button>
          ))}
        </div>
      )}

      {/* Edge handles */}
      <div className="absolute top-0 bottom-0 w-2 cursor-ew-resize -left-0.5 z-10 flex items-center justify-center group/handle"
        onPointerDown={onTrimStart}>
        <div className="w-1 h-5 bg-pink-500 rounded-full opacity-40 group-hover/handle:opacity-100 transition-opacity" />
      </div>
      <div className="absolute top-0 bottom-0 w-2 cursor-ew-resize -right-0.5 z-10 flex items-center justify-center group/handle"
        onPointerDown={onTrimEnd}>
        <div className="w-1 h-5 bg-pink-500 rounded-full opacity-40 group-hover/handle:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}