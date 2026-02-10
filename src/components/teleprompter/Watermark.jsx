import React from 'react';
import { Video } from 'lucide-react';

export default function Watermark({ show }) {
  if (!show) return null;

  return (
    <div className="absolute bottom-20 left-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white/70 px-3 py-1.5 rounded-full pointer-events-none z-20">
      <Video className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">פרומפטר</span>
    </div>
  );
}