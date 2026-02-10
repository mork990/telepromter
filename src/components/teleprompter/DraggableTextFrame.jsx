import React, { useRef, useState, useCallback } from 'react';
import { Move } from 'lucide-react';

export default function DraggableTextFrame({
  children,
  frameStyle,
  onFrameChange,
}) {
  const frameRef = useRef(null);
  const parentRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const startRef = useRef({ x: 0, y: 0, left: 0, top: 0, width: 0, height: 0 });

  // frame: { left%, top%, width%, height% }
  const { left = 5, top = 20, width = 90, height = 60 } = frameStyle;

  const getParent = () => {
    if (parentRef.current) return parentRef.current;
    parentRef.current = frameRef.current?.parentElement;
    return parentRef.current;
  };

  const handleDragStart = useCallback((e) => {
    e.stopPropagation();
    const parent = getParent();
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    startRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      left,
      top,
      parentW: rect.width,
      parentH: rect.height,
    };
    setIsDragging(true);

    const onMove = (ev) => {
      ev.preventDefault();
      const t = ev.touches ? ev.touches[0] : ev;
      const dx = ((t.clientX - startRef.current.x) / startRef.current.parentW) * 100;
      const dy = ((t.clientY - startRef.current.y) / startRef.current.parentH) * 100;
      const newLeft = Math.max(0, Math.min(100 - width, startRef.current.left + dx));
      const newTop = Math.max(0, Math.min(100 - height, startRef.current.top + dy));
      onFrameChange({ left: newLeft, top: newTop, width, height });
    };

    const onEnd = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }, [left, top, width, height, onFrameChange]);

  const handleResizeStart = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    const parent = getParent();
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    startRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      width,
      height,
      parentW: rect.width,
      parentH: rect.height,
    };
    setIsResizing(true);

    const onMove = (ev) => {
      ev.preventDefault();
      const t = ev.touches ? ev.touches[0] : ev;
      const dx = ((t.clientX - startRef.current.x) / startRef.current.parentW) * 100;
      const dy = ((t.clientY - startRef.current.y) / startRef.current.parentH) * 100;
      // RTL: dragging left handle means dx negative = larger
      const newWidth = Math.max(20, Math.min(100 - left, startRef.current.width - dx));
      const newHeight = Math.max(15, Math.min(100 - top, startRef.current.height + dy));
      onFrameChange({ left, top, width: newWidth, height: newHeight });
    };

    const onEnd = () => {
      setIsResizing(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }, [left, top, width, height, onFrameChange]);

  return (
    <div
      ref={frameRef}
      className="absolute z-10 touch-none"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
    >
      {/* Border frame */}
      <div className={`absolute inset-0 border-2 rounded-lg pointer-events-none transition-colors ${
        isDragging || isResizing ? 'border-white/60' : 'border-white/20'
      }`} />

      {/* Content area - scrollable text goes here */}
      <div className="absolute inset-0 overflow-hidden">
        {children}
      </div>

      {/* Drag handle - top center */}
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-6 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing z-20"
        onPointerDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <Move className="w-3.5 h-3.5 text-white" />
      </div>

      {/* Resize handle - bottom left (RTL friendly) */}
      <div
        className="absolute -bottom-2 -left-2 w-7 h-7 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center cursor-nwse-resize z-20"
        onPointerDown={handleResizeStart}
        onTouchStart={handleResizeStart}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" className="text-white">
          <path d="M11 1L1 11M11 5L5 11M11 9L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}