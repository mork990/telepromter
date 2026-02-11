import React from 'react';
import { LayoutTemplate } from 'lucide-react';

const templates = [
  {
    id: 'cinematic',
    label: 'קולנועי',
    desc: 'כתוביות + גוון חם',
    subtitleStyle: { fontSize: 28, fontColor: '#FFFFFF', bgColor: '#000000', bgOpacity: 50 },
    effect: 'sepia(20%) contrast(110%)',
    effectId: 'vintage',
    color: 'from-amber-600 to-orange-800',
  },
  {
    id: 'social',
    label: 'רשתות חברתיות',
    desc: 'כתוביות גדולות + צבעוני',
    subtitleStyle: { fontSize: 36, fontColor: '#FFFF00', bgColor: '#000000', bgOpacity: 80 },
    effect: 'saturate(140%)',
    effectId: 'saturate',
    color: 'from-pink-600 to-purple-800',
  },
  {
    id: 'clean',
    label: 'מינימלי',
    desc: 'כתוביות קטנות ונקיות',
    subtitleStyle: { fontSize: 20, fontColor: '#FFFFFF', bgColor: '#000000', bgOpacity: 40 },
    effect: 'none',
    effectId: 'none',
    color: 'from-slate-600 to-slate-800',
  },
  {
    id: 'bw',
    label: 'שחור לבן',
    desc: 'מונוכרום דרמטי',
    subtitleStyle: { fontSize: 24, fontColor: '#FFFFFF', bgColor: '#000000', bgOpacity: 60 },
    effect: 'grayscale(100%) contrast(120%)',
    effectId: 'grayscale',
    color: 'from-gray-600 to-gray-900',
  },
  {
    id: 'bright',
    label: 'בהיר ושמח',
    desc: 'צבעים חיים',
    subtitleStyle: { fontSize: 30, fontColor: '#FFFFFF', bgColor: '#FF6B00', bgOpacity: 70 },
    effect: 'brightness(115%) saturate(130%)',
    effectId: 'brightness',
    color: 'from-yellow-500 to-orange-600',
  },
  {
    id: 'news',
    label: 'חדשות',
    desc: 'סגנון מקצועי',
    subtitleStyle: { fontSize: 22, fontColor: '#FFFFFF', bgColor: '#1a1a2e', bgOpacity: 90 },
    effect: 'none',
    effectId: 'none',
    color: 'from-blue-700 to-indigo-900',
  },
];

export default function TemplatesPanel({ onApplyTemplate }) {
  return (
    <div className="bg-[#2a1b30] rounded-2xl border border-white/5 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <LayoutTemplate className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-bold text-white">תבניות מוכנות</h3>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => onApplyTemplate(t)}
            className="relative overflow-hidden rounded-xl p-4 text-right active:scale-[0.97] transition-transform"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${t.color} opacity-80`} />
            <div className="relative z-10">
              <h4 className="text-sm font-bold text-white">{t.label}</h4>
              <p className="text-[10px] text-white/70 mt-0.5">{t.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}