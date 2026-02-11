import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MainActionCard({ icon: Icon, title, page, gradient }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(createPageUrl(page))}
      className={`flex-1 aspect-[1.2/1] rounded-2xl ${gradient} flex flex-col items-center justify-center gap-3 active:scale-[0.97] transition-transform relative overflow-hidden`}
    >
      {/* Decorative glow */}
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10 blur-xl" />
      <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-sm font-bold text-white drop-shadow-lg">{title}</span>
    </button>
  );
}