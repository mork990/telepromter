import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Crown } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import SettingsPanel from '../components/teleprompter/SettingsPanel';
import QualitySelector from '../components/teleprompter/QualitySelector';
import { useSubscription } from '../components/subscription/useSubscription';
import BottomNav from '../components/navigation/BottomNav';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const navigate = useNavigate();
  const [fontSize, setFontSize] = useState(32);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [cameraFacing, setCameraFacing] = useState('user');
  const [scrollSpeed, setScrollSpeed] = useState(50);
  const [backgroundOpacity, setBackgroundOpacity] = useState(80);
  const [videoQuality, setVideoQuality] = useState('1080');
  const [isDeleting, setIsDeleting] = useState(false);
  const { isPremium } = useSubscription();

  useEffect(() => {
    const saved = localStorage.getItem('teleprompterSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      setFontSize(settings.fontSize || 32);
      setTextColor(settings.textColor || '#FFFFFF');
      setBackgroundColor(settings.backgroundColor || '#000000');
      setCameraFacing(settings.cameraFacing || 'user');
      setScrollSpeed(settings.scrollSpeed || 50);
      setBackgroundOpacity(settings.backgroundOpacity || 80);
      setVideoQuality(settings.videoQuality || '1080');
    }
  }, []);

  const handleSave = () => {
    const settings = { fontSize, textColor, backgroundColor, cameraFacing, scrollSpeed, backgroundOpacity, videoQuality };
    localStorage.setItem('teleprompterSettings', JSON.stringify(settings));
    alert('ההגדרות נשמרו בהצלחה!');
    navigate(createPageUrl('Home'));
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      localStorage.clear();
      await base44.auth.logout();
    } catch (error) {
      console.error('Error deleting account:', error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} dir="rtl">
      {/* Header */}
      <div 
        className="sticky z-10 backdrop-blur-xl"
        style={{ top: 'env(safe-area-inset-top)', backgroundColor: 'var(--nav-bg)', borderBottom: '1px solid var(--border-color)' }}
      >
        <div className="px-4 h-12 flex items-center">
          <h1 className="text-base font-bold">הגדרות</h1>
        </div>
      </div>

      <div className="px-4 py-4 pb-24 space-y-4">
        {/* Settings Panel */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <SettingsPanel
            fontSize={fontSize}
            setFontSize={setFontSize}
            textColor={textColor}
            setTextColor={setTextColor}
            backgroundColor={backgroundColor}
            setBackgroundColor={setBackgroundColor}
            cameraFacing={cameraFacing}
            setCameraFacing={setCameraFacing}
            scrollSpeed={scrollSpeed}
            setScrollSpeed={setScrollSpeed}
            backgroundOpacity={backgroundOpacity}
            setBackgroundOpacity={setBackgroundOpacity}
          />
        </div>

        {/* Quality */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <QualitySelector 
            value={videoQuality} 
            onChange={(val) => {
              if (['1440', '2160'].includes(val) && !isPremium) return;
              setVideoQuality(val);
            }}
            isPremium={isPremium}
          />
        </div>

        {/* Premium Upsell */}
        {!isPremium && (
          <button
            className="w-full rounded-2xl border border-amber-500/20 p-4 flex items-center gap-3 select-none"
            style={{ backgroundColor: 'var(--bg-card)' }}
            onClick={() => navigate(createPageUrl('Pricing'))}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-amber-400">שדרג לפרימיום</p>
              <p className="text-xs text-white/40">קבל איכות 4K, ללא סימן מים ועוד</p>
            </div>
          </button>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full h-12 rounded-full text-black font-bold text-sm select-none active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-secondary))' }}
        >
          שמור הגדרות
        </button>

        {/* Delete Account */}
        <div className="pt-8" style={{ borderTop: '1px solid var(--border-color)' }}>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full h-10 rounded-xl text-red-400/60 text-sm font-medium flex items-center justify-center gap-2 hover:bg-red-500/5 select-none">
                <Trash2 className="w-4 h-4" />
                מחיקת חשבון
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-subtle)' }}>
              <AlertDialogHeader>
                <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
                <AlertDialogDescription className="text-white/50">
                  פעולה זו תמחק את כל הנתונים שלך ותתנתק מהמערכת. לא ניתן לבטל פעולה זו.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogCancel className="bg-white/10 border-white/10 text-white hover:bg-white/20 select-none">ביטול</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 select-none"
                >
                  {isDeleting ? 'מוחק...' : 'מחק חשבון'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <BottomNav activePage="Settings" />
    </div>
  );
}