import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Video, Film, Settings, Crown } from 'lucide-react';

export default function BottomNav({ activePage }) {
  const navigate = useNavigate();

  const tabs = [
    { id: 'Home', icon: Video, label: 'צילום' },
    { id: 'MyVideos', icon: Film, label: 'סרטונים' },
    { id: 'Settings', icon: Settings, label: 'הגדרות' },
    { id: 'Pricing', icon: Crown, label: 'פרימיום' },
  ];

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a2e]/95 backdrop-blur-xl border-t border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-14 max-w-md mx-auto">
        {tabs.map(({ id, icon: Icon, label }) => {
          const isActive = activePage === id;
          return (
            <button
              key={id}
              onClick={() => navigate(createPageUrl(id))}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full select-none transition-colors ${
                isActive ? 'text-[#00d4aa]' : 'text-white/50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}