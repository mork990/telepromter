import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plus, FileText, Sparkles } from 'lucide-react';

export default function ActionCards() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* New Project - Full Width */}
      <button
        onClick={() => navigate(createPageUrl('Recording'))}
        className="col-span-2 relative group overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 to-purple-900 p-6 text-right active:scale-[0.98] transition-all duration-300"
        style={{ boxShadow: '0 0 20px -3px rgba(182, 19, 236, 0.3)' }}
      >
        <div className="absolute top-0 left-0 -ml-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-0 right-0 -mr-8 -mb-8 w-24 h-24 rounded-full bg-black/10 blur-xl" />
        <div className="relative z-10 flex flex-col items-start min-h-[130px] justify-between">
          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
            <Plus className="w-7 h-7 text-white" />
          </div>
          <div className="w-full">
            <h3 className="text-xl font-bold text-white mb-0.5">פרויקט חדש</h3>
            <p className="text-purple-200 text-sm font-medium">התחל מאפס</p>
          </div>
        </div>
      </button>

      {/* Teleprompter */}
      <button
        onClick={() => navigate(createPageUrl('Recording'))}
        className="relative group overflow-hidden rounded-3xl bg-[#2a1b30] p-5 text-right border border-white/5 hover:border-purple-500/50 active:scale-[0.98] transition-all duration-300"
      >
        <div className="flex flex-col h-full justify-between min-h-[110px]">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400 mb-3">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white leading-tight">טלפרומפטר</h3>
            <p className="text-xs text-slate-400 mt-1">הקלט עם תסריט</p>
          </div>
        </div>
      </button>

      {/* AI Magic */}
      <button
        onClick={() => navigate(createPageUrl('AIEditor'))}
        className="relative group overflow-hidden rounded-3xl bg-[#2a1b30] p-5 text-right border border-white/5 hover:border-purple-500/50 active:scale-[0.98] transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-transparent to-purple-500/10 opacity-50" />
        <div className="relative z-10 flex flex-col h-full justify-between min-h-[110px]">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/15 to-purple-500/20 flex items-center justify-center text-purple-400 mb-3"
            style={{ boxShadow: '0 0 10px rgba(182, 19, 236, 0.15)' }}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white leading-tight">קסם AI</h3>
            <p className="text-xs text-slate-400 mt-1">כתוביות ואפקטים</p>
          </div>
        </div>
      </button>
    </div>
  );
}