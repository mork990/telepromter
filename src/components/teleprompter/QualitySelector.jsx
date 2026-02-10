import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import PremiumBadge from '../subscription/PremiumBadge';
import PremiumLock from '../subscription/PremiumLock';

const qualities = [
  { value: '720', label: '720p HD', width: 1280, height: 720, fps: 30, premium: false },
  { value: '1080', label: '1080p Full HD', width: 1920, height: 1080, fps: 30, premium: false },
  { value: '1440', label: '1440p 2K', width: 2560, height: 1440, fps: 30, premium: true },
  { value: '2160', label: '2160p 4K', width: 3840, height: 2160, fps: 30, premium: true },
];

export default function QualitySelector({ value, onChange, isPremium }) {
  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardContent className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-right">🎬 איכות וידאו</h3>
        <RadioGroup value={value} onValueChange={onChange} className="space-y-2" dir="rtl">
          {qualities.map((q) => {
            const isLocked = q.premium && !isPremium;
            return (
              <div key={q.value} className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                value === q.value ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-gray-600'
              } ${isLocked ? 'opacity-50' : ''}`}>
                <RadioGroupItem 
                  value={q.value} 
                  id={`quality-${q.value}`}
                  disabled={isLocked}
                />
                <Label 
                  htmlFor={`quality-${q.value}`} 
                  className={`flex-1 cursor-pointer text-sm ${isLocked ? 'cursor-not-allowed' : ''}`}
                >
                  {q.label}
                </Label>
                {q.premium && <PremiumBadge small />}
              </div>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

export { qualities };