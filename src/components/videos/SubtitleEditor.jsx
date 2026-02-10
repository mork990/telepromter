import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Save, X } from "lucide-react";

function formatTime(seconds) {
  if (seconds == null) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 100);
  return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function parseTime(str) {
  // Parse "m:ss.ms" or "m:ss" format
  const parts = str.split(':');
  if (parts.length !== 2) return 0;
  const [min, secPart] = parts;
  const secParts = secPart.split('.');
  const sec = parseInt(secParts[0]) || 0;
  const ms = secParts[1] ? parseInt(secParts[1]) / 100 : 0;
  return (parseInt(min) || 0) * 60 + sec + ms;
}

export default function SubtitleEditor({ subtitles = [], onSave, onCancel }) {
  const [editedSubs, setEditedSubs] = useState(
    subtitles.map(s => ({ ...s }))
  );

  const updateSub = (index, field, value) => {
    const updated = [...editedSubs];
    updated[index] = { ...updated[index], [field]: value };
    setEditedSubs(updated);
  };

  const deleteSub = (index) => {
    setEditedSubs(editedSubs.filter((_, i) => i !== index));
  };

  const addSub = () => {
    const lastEnd = editedSubs.length > 0 ? editedSubs[editedSubs.length - 1].end : 0;
    setEditedSubs([...editedSubs, { start: lastEnd, end: lastEnd + 3, text: '' }]);
  };

  const handleSave = () => {
    const cleaned = editedSubs
      .filter(s => s.text.trim())
      .map(s => ({
        start: typeof s.start === 'string' ? parseTime(s.start) : s.start,
        end: typeof s.end === 'string' ? parseTime(s.end) : s.end,
        text: s.text.trim(),
      }))
      .sort((a, b) => a.start - b.start);
    onSave(cleaned);
  };

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">עריכת כתוביות</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>
            <X className="w-3 h-3 ml-1" />
            ביטול
          </Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave}>
            <Save className="w-3 h-3 ml-1" />
            שמור
          </Button>
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
        {editedSubs.map((sub, i) => (
          <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
            <div className="flex-1 space-y-1">
              <Input
                value={sub.text}
                onChange={(e) => updateSub(i, 'text', e.target.value)}
                placeholder="טקסט כתובית..."
                className="text-sm h-8"
                dir="rtl"
              />
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-400">מ-</span>
                  <Input
                    value={typeof sub.start === 'number' ? formatTime(sub.start) : sub.start}
                    onChange={(e) => updateSub(i, 'start', e.target.value)}
                    className="text-xs h-6 w-20 text-center"
                    dir="ltr"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-400">עד</span>
                  <Input
                    value={typeof sub.end === 'number' ? formatTime(sub.end) : sub.end}
                    onChange={(e) => updateSub(i, 'end', e.target.value)}
                    className="text-xs h-6 w-20 text-center"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => deleteSub(i)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>

      <Button size="sm" variant="outline" className="w-full" onClick={addSub}>
        <Plus className="w-3 h-3 ml-1" />
        הוסף כתובית
      </Button>
    </div>
  );
}