import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight, Trash2, Crown } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import SettingsPanel from '../components/teleprompter/SettingsPanel';
import QualitySelector from '../components/teleprompter/QualitySelector';
import { useSubscription } from '../components/subscription/useSubscription';
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
    // Load saved settings from localStorage
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
    const settings = {
      fontSize,
      textColor,
      backgroundColor,
      cameraFacing,
      scrollSpeed,
      backgroundOpacity,
      videoQuality
    };
    localStorage.setItem('teleprompterSettings', JSON.stringify(settings));
    alert('ההגדרות נשמרו בהצלחה!');
    navigate(createPageUrl('Home'));
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Clear all local data
      localStorage.clear();
      // Logout and redirect
      await base44.auth.logout();
    } catch (error) {
      console.error('Error deleting account:', error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" dir="rtl">
      {/* Header */}
      <div 
        className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 sticky z-10"
        style={{ top: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Home'))} className="select-none">
              <ArrowRight className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">הגדרות עיצוב</h1>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="max-w-md mx-auto px-4 py-6">
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

        <div className="mt-4">
          <QualitySelector 
            value={videoQuality} 
            onChange={(val) => {
              // Only allow premium qualities for premium users
              if (['1440', '2160'].includes(val) && !isPremium) return;
              setVideoQuality(val);
            }}
            isPremium={isPremium}
          />
        </div>

        {/* Premium Upsell */}
        {!isPremium && (
          <Button
            variant="outline"
            className="w-full mt-4 border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            onClick={() => navigate(createPageUrl('Pricing'))}
          >
            <Crown className="w-4 h-4 ml-2" />
            שדרג לפרימיום לפיצ׳רים נוספים
          </Button>
        )}

        <div className="mt-6 space-y-3">
          <Button
            onClick={handleSave}
            className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 select-none"
          >
            שמור הגדרות
          </Button>
          
          <Button variant="outline" className="w-full h-12 dark:border-gray-600 dark:text-gray-200 select-none" onClick={() => navigate(createPageUrl('Home'))}>
            ביטול
          </Button>
        </div>

        {/* Delete Account Section */}
        <div className="mt-12 pt-6 border-t dark:border-gray-700">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full h-12 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 select-none">
                <Trash2 className="w-4 h-4 ml-2" />
                מחיקת חשבון
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
                <AlertDialogDescription>
                  פעולה זו תמחק את כל הנתונים שלך ותתנתק מהמערכת. לא ניתן לבטל פעולה זו.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogCancel className="select-none">ביטול</AlertDialogCancel>
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
    </div>
  );
}