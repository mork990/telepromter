import React, { useState } from 'react';
import { Sparkles, Zap, Sun, Moon, Droplets, Flame, Wind, Eye } from 'lucide-react';

const effects = [
  { id: 'none', label: 'ללא', icon: Eye, preview: 'none' },
  { id: 'grayscale', label: 'שחור לבן', icon: Moon, preview: 'grayscale(100%)' },
  { id: 'sepia', label: 'ספיה', icon: Sun, preview: 'sepia(80%)' },
  { id: 'contrast', label: 'קונטרסט', icon: Zap, preview: 'contrast(140%)' },
  { id: 'saturate', label: 'רוויה', icon: Flame, preview: 'saturate(180%)' },
  { id: 'blur', label: 'טשטוש', icon: Droplets, preview: 'blur(2px)' },
  { id: 'brightness', label: 'בהיר', icon: Sun, preview: 'brightness(130%)' },
  { id: 'vintage', label: 'וינטג׳', icon: Wind, preview: 'sepia(40%) contrast(110%) brightness(90%)' },
];

export default function EffectsPanel({ activeEffect, onApplyEffect }) {
  return (
    <div className="bg-[#2a1b30] rounded-2xl border border-white/5 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-bold text-white">אפקטים</h3>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {effects.map((effect) => {
          const Icon = effect.icon;
          const isActive = activeEffect === effect.id;
          return (
            <button
              key={effect.id}
              onClick={() => onApplyEffect(effect.id, effect.preview)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all active:scale-95 ${
                isActive
                  ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                  : 'bg-white/5 border border-transparent text-white/60 hover:bg-white/10'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{effect.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}