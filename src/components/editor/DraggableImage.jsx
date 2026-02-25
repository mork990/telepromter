import React, { useRef, useState, useCallback } from 'react';
import { Move, Maximize2 } from 'lucide-react';

export default function DraggableImage({ img, index, containerRef, onUpdatePosition, isSelected, onSelect }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const startRef = useRef({ x: 0, y: 0, imgX: 0, imgY: 0, imgW: 0, imgH: 0 });

  const getContainerSize = () => {
    if (!containerRef.current) return { w: 400, h: 225 };
    return { w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight };
  };

  const handleDragStart = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect?.();
    setIsDragging(true);
    startRef.current = { x: e.clientX, y: e.clientY, imgX: img.x || 5, imgY: img.y || 5, imgW: img.width || 30, imgH: img.height || 30 };
    
    const onMove = (ev) => {
      const { w, h } = getContainerSize();
      const dx = ((ev.clientX - startRef.current.x) / w) * 100;
      const dy = ((ev.clientY - startRef.current.y) / h) * 100;
      const newX = Math.max(0, Math.min(100 - startRef.current.imgW, startRef.current.imgX + dx));
      const newY = Math.max(0, Math.min(100 - startRef.current.imgH, startRef.current.imgY + dy));
      onUpdatePosition(index, { x: newX, y: newY });
    };
    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [img, index, onUpdatePosition, onSelect, containerRef]);

  const handleResizeStart = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    startRef.current = { x: e.clientX, y: e.clientY, imgX: img.x || 5, imgY: img.y || 5, imgW: img.width || 30, imgH: img.height || 30 };
    
    const onMove = (ev) => {
      const { w, h } = getContainerSize();
      const dx = ((ev.clientX - startRef.current.x) / w) * 100;
      const dy = ((ev.clientY - startRef.current.y) / h) * 100;
      const newW = Math.max(10, Math.min(100 - startRef.current.imgX, startRef.current.imgW + dx));
      const newH = Math.max(10, Math.min(100 - startRef.current.imgY, startRef.current.imgH + dy));
      onUpdatePosition(index, { width: newW, height: newH });
    };
    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [img, index, onUpdatePosition, containerRef]);

  const x = img.x ?? 5;
  const y = img.y ?? 5;
  const width = img.width ?? 30;
  const height = img.height ?? 30;

  return (
    <div
      className={`absolute z-10 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
      onPointerDown={handleDragStart}
    >
      <img
        src={img.file_url}
        className={`w-full h-full object-contain rounded-lg shadow-lg select-none ${
          isSelected ? 'ring-2 ring-pink-400 border border-white/50' : 'border border-white/30'
        }`}
        alt=""
        draggable={false}
      />

      {/* Resize handle bottom-right */}
      <div
        className="absolute -bottom-1 -right-1 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center cursor-se-resize z-20 shadow-md opacity-0 group-hover:opacity-100 hover:opacity-100"
        style={{ opacity: isSelected ? 1 : undefined }}
        onPointerDown={handleResizeStart}
      >
        <Maximize2 className="w-3 h-3 text-white" />
      </div>

      {/* Move indicator */}
      {isSelected && (
        <div className="absolute top-0.5 left-0.5 bg-black/50 rounded px-1 py-0.5 pointer-events-none">
          <Move className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
}