import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function FeatureCard({ icon: Icon, title, page, badge }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(createPageUrl(page))}
      className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] active:scale-95 transition-all relative"
    >
      {badge && (
        <span className="absolute top-2 right-2 text-[9px] font-bold bg-[#00d4aa] text-black px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className="w-10 h-10 flex items-center justify-center">
        <Icon className="w-6 h-6 text-white/70" />
      </div>
      <span className="text-xs text-white/60 font-medium">{title}</span>
    </button>
  );
}