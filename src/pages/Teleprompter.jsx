import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowRight, Play } from 'lucide-react';
import TextInput from '../components/teleprompter/TextInput';
import BottomNav from '../components/navigation/BottomNav';

export default function Teleprompter() {
  const navigate = useNavigate();
  const [text, setText] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('teleprompterText');
    if (saved) setText(saved);
  }, []);

  const handleStart = () => {
    localStorage.setItem('teleprompterText', text);
    const params = new URLSearchParams();
    params.set('text', text);
    navigate(createPageUrl('Recording') + '?' + params.toString());
  };

  return (
    <div className="min-h-screen bg-[#1d1022] text-white" dir="rtl">
      <header
        className="sticky top-0 z-10 bg-[#1d1022]/90 backdrop-blur-xl border-b border-purple-500/10"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 h-12 flex items-center gap-3">
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10"
            onClick={() => navigate(createPageUrl('Home'))}
          >
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-base font-bold">טלפרומפטר</h1>
        </div>
      </header>

      <div className="px-4 py-5 pb-32 space-y-5">
        <div className="bg-[#2a1b30] rounded-2xl border border-white/5 p-4">
          <TextInput text={text} onTextChange={setText} />
        </div>

        <button
          onClick={handleStart}
          disabled={!text.trim()}
          className="w-full h-12 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 text-white font-bold text-sm flex items-center justify-center gap-2 select-none active:scale-[0.98] transition-transform disabled:opacity-40"
        >
          <Play className="w-5 h-5" />
          התחל הקלטה
        </button>
      </div>

      <BottomNav activePage="Recording" />
    </div>
  );
}