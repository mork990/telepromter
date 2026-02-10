import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Palette, Type, Move } from "lucide-react";

const colorPresets = ['#FFFFFF', '#FFFF00', '#00FF00', '#00FFFF', '#FF6B6B', '#FF69B4'];
const bgPresets = ['#000000', '#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560'];

export default function StylePanel({ style, onChange }) {
  const { fontSize = 24, fontColor = '#FFFFFF', bgColor = '#000000', bgOpacity = 70 } = style || {};

  const update = (field, value) => onChange({ ...style, [field]: value });

  return (
    <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-4 space-y-4" dir="rtl">
        {/* Font Size */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Type className="w-4 h-4 text-white/40" />
            <span className="text-sm font-medium text-white/70">גודל גופן: {fontSize}px</span>
          </div>
          <Slider
            value={[fontSize]}
            onValueChange={([v]) => update('fontSize', v)}
            min={14}
            max={48}
            step={1}
          />
        </div>

        {/* Font Color */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-4 h-4 text-white/40" />
            <span className="text-sm font-medium text-white/70">צבע טקסט</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {colorPresets.map(c => (
              <button
                key={c}
                className={`w-7 h-7 rounded-full border-2 ${fontColor === c ? 'border-[#00d4aa] scale-110' : 'border-white/20'}`}
                style={{ backgroundColor: c }}
                onClick={() => update('fontColor', c)}
              />
            ))}
            <Input
              type="color"
              value={fontColor}
              onChange={(e) => update('fontColor', e.target.value)}
              className="w-7 h-7 p-0 border-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Background Color */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-4 h-4 text-white/40" />
            <span className="text-sm font-medium text-white/70">צבע רקע</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {bgPresets.map(c => (
              <button
                key={c}
                className={`w-7 h-7 rounded-full border-2 ${bgColor === c ? 'border-[#00d4aa] scale-110' : 'border-white/20'}`}
                style={{ backgroundColor: c }}
                onClick={() => update('bgColor', c)}
              />
            ))}
            <Input
              type="color"
              value={bgColor}
              onChange={(e) => update('bgColor', e.target.value)}
              className="w-7 h-7 p-0 border-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Background Opacity */}
        <div>
          <span className="text-sm font-medium text-white/70">שקיפות רקע: {bgOpacity}%</span>
          <Slider
            value={[bgOpacity]}
            onValueChange={([v]) => update('bgOpacity', v)}
            min={0}
            max={100}
            step={5}
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-white/30">
          <Move className="w-3 h-3" />
          <span>גרור את הכתובית על הווידאו למיקום הרצוי</span>
        </div>
    </div>
  );
}