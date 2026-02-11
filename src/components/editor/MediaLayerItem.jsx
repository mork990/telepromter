import React from 'react';
import { Trash2, Film, Image, Volume2 } from "lucide-react";

const typeConfig = {
  video: { icon: Film, color: 'bg-purple-500/30 border-purple-500/80', text: 'text-purple-300', label: 'וידאו' },
  image: { icon: Image, color: 'bg-pink-500/30 border-pink-500/80', text: 'text-pink-300', label: 'תמונה' },
  audio: { icon: Volume2, color: 'bg-cyan-500/30 border-cyan-500/80', text: 'text-cyan-300', label: 'אודיו' },
};

export default function MediaLayerItem({
  layer, index, timeToPx, trackTop, trackHeight,
  toolMode, onDelete, onTrimStart, onTrimEnd, onMove,
}) {
  const config = typeConfig[layer.mediaType] || typeConfig.video;
  const Icon = config.icon;
  const width = Math.max(timeToPx(layer.end - layer.start), 6);

  return (
    <div
      className="absolute group"
      style={{
        left: `${timeToPx(layer.start)}px`,
        width: `${width}px`,
        top: `${trackTop}px`,
        height: `${trackHeight}px`,
      }}
    >
      <div
        className={`absolute inset-0 ${config.color} border rounded-md overflow-hidden cursor-grab active:cursor-grabbing ${
          toolMode === 'delete' ? 'hover:bg-red-500/20 hover:border-red-400 cursor-pointer' : ''
        }`}
        onPointerDown={(e) => {
          if (toolMode === 'delete') { e.stopPropagation(); onDelete(); return; }
          e.stopPropagation();
          onMove(e);
        }}
        onClick={(e) => { if (toolMode === 'delete') { e.stopPropagation(); onDelete(); } }}
      >
        <div className="absolute inset-0 flex items-center gap-1 px-1.5 pointer-events-none">
          <Icon className={`w-3 h-3 ${config.text} flex-shrink-0`} />
          {width > 50 && <span className={`text-[8px] ${config.text} truncate`}>{config.label}</span>}
        </div>

        <button
          className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center z-20"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Trim handles */}
      <div className="absolute top-0 bottom-0 w-2 cursor-ew-resize -left-1 z-10 flex items-center justify-center group/handle"
        onPointerDown={onTrimStart}>
        <div className="w-1 h-5 bg-purple-500 rounded-full opacity-40 group-hover/handle:opacity-100 transition-opacity" />
      </div>
      <div className="absolute top-0 bottom-0 w-2 cursor-ew-resize -right-1 z-10 flex items-center justify-center group/handle"
        onPointerDown={onTrimEnd}>
        <div className="w-1 h-5 bg-purple-500 rounded-full opacity-40 group-hover/handle:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}