import React, { useRef, useState } from 'react';

export default function SubtitleOverlay({ 
  currentSubtitle, 
  style, 
  containerRef,
  onPositionChange 
}) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const posStartRef = useRef({ x: 0, y: 0 });

  if (!currentSubtitle) return null;

  const { fontSize = 24, fontColor = '#FFFFFF', bgColor = '#000000', bgOpacity = 70, positionX = 50, positionY = 85, fontFamily = 'sans-serif' } = style || {};

  const hexToRgba = (hex, opacity) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    posStartRef.current = { x: positionX, y: positionY };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !containerRef?.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
    const dy = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;
    const newX = Math.max(5, Math.min(95, posStartRef.current.x + dx));
    const newY = Math.max(5, Math.min(95, posStartRef.current.y + dy));
    onPositionChange(newX, newY);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      className="absolute select-none touch-none"
      style={{
        left: `${positionX}%`,
        top: `${positionY}%`,
        transform: 'translate(-50%, -50%)',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: 20,
        maxWidth: '90%',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        className="px-3 py-1.5 rounded-lg text-center whitespace-pre-wrap leading-snug"
        style={{
          fontSize: `${fontSize}px`,
          color: fontColor,
          backgroundColor: hexToRgba(bgColor, bgOpacity),
          textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
          fontWeight: 600,
          fontFamily,
          direction: 'rtl',
        }}
      >
        {currentSubtitle.text}
      </div>
      {isDragging && (
        <div className="absolute -inset-1 border-2 border-dashed border-[#00d4aa] rounded-lg pointer-events-none" />
      )}
    </div>
  );
}