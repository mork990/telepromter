import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Check, X } from "lucide-react";

function formatTime(seconds) {
  if (seconds == null) return '0:00.00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 100);
  return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function parseTime(str) {
  const parts = str.split(':');
  if (parts.length !== 2) return 0;
  const [min, secPart] = parts;
  const secParts = secPart.split('.');
  const sec = parseInt(secParts[0]) || 0;
  const ms = secParts[1] ? parseInt(secParts[1]) / 100 : 0;
  return (parseInt(min) || 0) * 60 + sec + ms;
}

export default function SubtitleBubble({ subtitle, index, position, onUpdate, onDelete, onClose }) {
  const [text, setText] = useState(subtitle.text);
  const [startStr, setStartStr] = useState(formatTime(subtitle.start));
  const [endStr, setEndStr] = useState(formatTime(subtitle.end));
  const ref = useRef(null);

  useEffect(() => {
    setText(subtitle.text);
    setStartStr(formatTime(subtitle.start));
    setEndStr(formatTime(subtitle.end));
  }, [subtitle]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [onClose]);

  const handleSave = () => {
    onUpdate(index, {
      text,
      start: parseTime(startStr),
      end: parseTime(endStr),
    });
    onClose();
  };

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-[#1a1a2e] rounded-xl shadow-2xl border border-white/10 p-3 w-56"
      style={{
        left: `${Math.min(Math.max(position.x, 20), 80)}%`,
        top: `${position.y || 50}%`,
        transform: 'translate(-50%, -50%)',
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >

      <div className="space-y-2 relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full text-sm border border-white/10 bg-white/5 rounded-lg p-2 h-16 resize-none text-white placeholder-white/30"
          dir="rtl"
          placeholder="טקסט כתובית..."
          autoFocus
        />
        <div className="flex gap-2 items-center" dir="ltr">
          <Input
            value={startStr}
            onChange={(e) => setStartStr(e.target.value)}
            className="text-[10px] h-6 text-center flex-1"
            dir="ltr"
          />
          <span className="text-[10px] text-gray-400">→</span>
          <Input
            value={endStr}
            onChange={(e) => setEndStr(e.target.value)}
            className="text-[10px] h-6 text-center flex-1"
            dir="ltr"
          />
        </div>
        <div className="flex items-center justify-between">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-red-400 hover:text-red-600"
            onClick={() => { onDelete(index); onClose(); }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
              <X className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" className="h-7 w-7 bg-[#00d4aa] hover:bg-[#00a89d] text-black" onClick={handleSave}>
              <Check className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}