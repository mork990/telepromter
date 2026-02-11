import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronLeft } from 'lucide-react';

export default function FeatureCard({ icon: Icon, title, description, page, gradient, iconBg }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(createPageUrl(page))}
      className="w-full bg-[#1a1a2e] rounded-2xl border border-white/5 p-5 text-right transition-all active:scale-[0.98] hover:border-white/10 group"
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white mb-1">{title}</h3>
          <p className="text-xs text-white/40 leading-relaxed">{description}</p>
        </div>
        <ChevronLeft className="w-5 h-5 text-white/20 group-hover:text-white/40 transition-colors mt-1 flex-shrink-0" />
      </div>
    </button>
  );
}