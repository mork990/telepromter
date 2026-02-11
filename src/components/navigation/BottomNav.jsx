import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Film, FileText, Sparkles, User } from 'lucide-react';

export default function BottomNav({ activePage }) {
  const navigate = useNavigate();

  const tabs = [
    { id: 'Home', icon: Home, label: 'בית' },
    { id: 'MyVideos', icon: Film, label: 'עריכה' },
    { id: 'Recording', icon: FileText, label: 'טלפרומפטר' },
    { id: 'AIEditor', icon: Sparkles, label: 'כלי AI' },
    { id: 'Settings', icon: User, label: 'פרופיל' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#1d1022]/95 backdrop-blur-lg border-t border-white/5"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex justify-around items-center px-2 py-3" dir="rtl">
        {tabs.map(({ id, icon: Icon, label }) => {
          const isActive = activePage === id;
          return (
            <button
              key={id}
              onClick={() => navigate(createPageUrl(id))}
              className={`flex flex-col items-center gap-1 p-2 select-none transition-colors active:scale-95 ${
                isActive ? 'text-purple-500' : 'text-slate-500 hover:text-purple-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}