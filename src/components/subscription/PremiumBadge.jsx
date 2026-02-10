import React from 'react';
import { Crown } from 'lucide-react';

export default function PremiumBadge({ small = false }) {
  if (small) {
    return (
      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
        <Crown className="w-3 h-3" />
        PRO
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">
      <Crown className="w-4 h-4" />
      פרימיום
    </div>
  );
}