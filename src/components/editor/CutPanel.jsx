import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Scissors, Plus, Trash2 } from "lucide-react";

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

export default function CutPanel({ cuts, onChange, currentTime, duration }) {
  const addCut = () => {
    const start = currentTime || 0;
    const end = Math.min(start + 5, duration || start + 5);
    onChange([...cuts, { start, end }]);
  };

  const updateCut = (index, field, value) => {
    const updated = [...cuts];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const deleteCut = (index) => {
    onChange(cuts.filter((_, i) => i !== index));
  };

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardContent className="p-4 space-y-3" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">חיתוך קטעים ({cuts.length})</span>
          </div>
          <Button size="sm" variant="outline" onClick={addCut} className="text-red-600 border-red-200 hover:bg-red-50">
            <Plus className="w-3 h-3 ml-1" />
            הוסף חיתוך
          </Button>
        </div>

        {cuts.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">
            סמן קטעים שברצונך להסיר מהסרטון
          </p>
        )}

        <div className="max-h-32 overflow-y-auto space-y-2">
          {cuts.map((cut, i) => (
            <div key={i} className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
              <div className="flex-1 flex items-center gap-2">
                <span className="text-[10px] text-red-400">מ-</span>
                <Input
                  value={typeof cut.start === 'number' ? formatTime(cut.start) : cut.start}
                  onChange={(e) => updateCut(i, 'start', parseTime(e.target.value))}
                  className="text-[10px] h-6 w-20 text-center"
                  dir="ltr"
                />
                <span className="text-[10px] text-red-400">עד</span>
                <Input
                  value={typeof cut.end === 'number' ? formatTime(cut.end) : cut.end}
                  onChange={(e) => updateCut(i, 'end', parseTime(e.target.value))}
                  className="text-[10px] h-6 w-20 text-center"
                  dir="ltr"
                />
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-red-400 hover:text-red-600 shrink-0"
                onClick={() => deleteCut(i)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}