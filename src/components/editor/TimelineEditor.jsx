import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

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

export default function TimelineEditor({ subtitles, onChange, currentTime, onSeek }) {
  const [expanded, setExpanded] = useState(true);

  const updateSub = (index, field, value) => {
    const updated = [...subtitles];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const deleteSub = (index) => {
    onChange(subtitles.filter((_, i) => i !== index));
  };

  const addSub = () => {
    const lastEnd = subtitles.length > 0 ? subtitles[subtitles.length - 1].end : 0;
    const start = currentTime || lastEnd;
    onChange([...subtitles, { start, end: start + 3, text: '' }]);
  };

  const currentIndex = subtitles.findIndex(s => currentTime >= s.start && currentTime <= s.end);

  return (
    <div className="space-y-2" dir="rtl">
      <div className="flex items-center justify-between">
        <button 
          className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          כתוביות ({subtitles.length})
        </button>
        <Button size="sm" variant="outline" onClick={addSub}>
          <Plus className="w-3 h-3 ml-1" />
          הוסף
        </Button>
      </div>

      {expanded && (
        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
          {subtitles.map((sub, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-lg p-2 transition-colors cursor-pointer ${
                i === currentIndex 
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-300 dark:border-indigo-600' 
                  : 'bg-gray-50 dark:bg-gray-700/50'
              }`}
              onClick={() => onSeek && onSeek(sub.start)}
            >
              <div className="flex-1 space-y-1">
                <Input
                  value={sub.text}
                  onChange={(e) => updateSub(i, 'text', e.target.value)}
                  placeholder="טקסט..."
                  className="text-sm h-7"
                  dir="rtl"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex gap-2">
                  <Input
                    value={typeof sub.start === 'number' ? formatTime(sub.start) : sub.start}
                    onChange={(e) => updateSub(i, 'start', parseTime(e.target.value))}
                    className="text-[10px] h-5 w-16 text-center"
                    dir="ltr"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-[10px] text-gray-400 self-center">→</span>
                  <Input
                    value={typeof sub.end === 'number' ? formatTime(sub.end) : sub.end}
                    onChange={(e) => updateSub(i, 'end', parseTime(e.target.value))}
                    className="text-[10px] h-5 w-16 text-center"
                    dir="ltr"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-6 w-6 text-red-400 hover:text-red-600 shrink-0" 
                onClick={(e) => { e.stopPropagation(); deleteSub(i); }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}