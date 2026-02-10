import React from 'react';
import { Lock, Crown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PremiumLock({ featureName, children, isPremium }) {
  const navigate = useNavigate();

  if (isPremium) return children;

  return (
    <div className="relative">
      <div className="opacity-40 pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-lg">
        <div className="flex flex-col items-center gap-2 text-center p-4">
          <div className="bg-gradient-to-br from-amber-400 to-yellow-500 p-2.5 rounded-full">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{featureName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">זמין למנויי פרימיום</p>
          <Button
            size="sm"
            className="mt-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
            onClick={() => navigate(createPageUrl('Pricing'))}
          >
            <Crown className="w-3.5 h-3.5 ml-1" />
            שדרג עכשיו
          </Button>
        </div>
      </div>
    </div>
  );
}