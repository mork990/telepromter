import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { Video, LogIn, User, Type, ChevronLeft } from "lucide-react";
import { base44 } from '@/api/base44Client';
import TextInput from '../components/teleprompter/TextInput';
import PrompterPreview from '../components/teleprompter/PrompterPreview';
import { useSubscription } from '../components/subscription/useSubscription';
import BottomNav from '../components/navigation/BottomNav';

export default function Home() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(32);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [scrollSpeed, setScrollSpeed] = useState(50);
  const [cameraFacing, setCameraFacing] = useState('user');
  const [backgroundOpacity, setBackgroundOpacity] = useState(80);
  const [videoQuality, setVideoQuality] = useState('1080');
  const { isPremium } = useSubscription();
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (isAuth) => {
      if (isAuth) {
        const user = await base44.auth.me();
        setCurrentUser(user);
      }
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    const savedSettings = localStorage.getItem('teleprompterSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setFontSize(settings.fontSize || 32);
      setTextColor(settings.textColor || '#FFFFFF');
      setBackgroundColor(settings.backgroundColor || '#000000');
      setCameraFacing(settings.cameraFacing || 'user');
      setScrollSpeed(settings.scrollSpeed || 50);
      setBackgroundOpacity(settings.backgroundOpacity || 80);
      setVideoQuality(settings.videoQuality || '1080');
    }
    const savedText = localStorage.getItem('currentText');
    if (savedText) setText(savedText);

    const params = new URLSearchParams(window.location.search);
    const urlText = params.get('text');
    if (urlText) {
      setText(urlText);
      setFontSize(parseInt(params.get('fontSize')) || 32);
      setTextColor(params.get('textColor') || '#FFFFFF');
      setBackgroundColor(params.get('backgroundColor') || '#000000');
      setScrollSpeed(parseInt(params.get('scrollSpeed')) || 50);
      setBackgroundOpacity(parseInt(params.get('backgroundOpacity')) || 80);
    }
  }, []);

  useEffect(() => {
    if (text) localStorage.setItem('currentText', text);
  }, [text]);

  const startRecording = () => {
    if (!text.trim()) {
      alert('אנא הזן טקסט לפני תחילת הצילום');
      return;
    }
    const settings = { fontSize, textColor, backgroundColor, cameraFacing, scrollSpeed, backgroundOpacity, videoQuality };
    localStorage.setItem('teleprompterSettings', JSON.stringify(settings));
    const params = new URLSearchParams({
      text, fontSize, textColor, backgroundColor, scrollSpeed, cameraFacing, backgroundOpacity, videoQuality,
      isPremium: isPremium ? '1' : '0'
    });
    navigate(createPageUrl('Recording') + '?' + params.toString());
  };

  return (
    <div className="min-h-screen bg-[#0e0e1a] text-white" dir="rtl">
      {/* Header */}
      <div 
        className="sticky z-10 bg-[#1a1a2e]/80 backdrop-blur-xl border-b border-white/5"
        style={{ top: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00d4aa] to-[#00a89d] flex items-center justify-center">
              <Type className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight">פרומפטר</span>
          </div>
          <div className="flex items-center gap-1">
            {!authLoading && !currentUser && (
              <button 
                className="text-xs text-[#00d4aa] font-medium px-3 py-1.5 rounded-full bg-[#00d4aa]/10 select-none"
                onClick={() => base44.auth.redirectToLogin()}
              >
                <LogIn className="w-3.5 h-3.5 inline ml-1" />
                התחבר
              </button>
            )}
            {!authLoading && currentUser && (
              <button
                className="text-xs text-white/50 font-medium px-3 py-1.5 rounded-full bg-white/5 select-none"
                onClick={() => base44.auth.logout()}
              >
                <User className="w-3.5 h-3.5 inline ml-1" />
                {currentUser.full_name?.split(' ')[0] || 'חשבון'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* Text Input Area */}
        <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <span className="text-sm font-medium text-white/70">הטקסט שלך</span>
            {text.trim() && (
              <button 
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-[#00d4aa] font-medium"
              >
                {showPreview ? 'עריכה' : 'תצוגה מקדימה'}
              </button>
            )}
          </div>
          <div className="p-4">
            {showPreview && text ? (
              <div className="rounded-xl overflow-hidden" style={{ height: 200 }}>
                <PrompterPreview
                  text={text}
                  fontSize={fontSize}
                  textColor={textColor}
                  backgroundColor={backgroundColor}
                />
              </div>
            ) : (
              <TextInput text={text} onTextChange={setText} />
            )}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-4">
          <p className="text-xs text-white/40 mb-2 font-medium">💡 טיפים מהירים</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
            {['הזן טקסט או העלה קובץ', 'התאם הגדרות בעמוד הגדרות', 'גלול ידנית בזמן צילום'].map((tip, i) => (
              <div key={i} className="flex-shrink-0 bg-white/5 rounded-lg px-3 py-2 text-[11px] text-white/50">
                {tip}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Record Button */}
      <div 
        className="fixed left-0 right-0 z-40 flex justify-center"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={startRecording}
          disabled={!text.trim()}
          className={`h-14 px-8 rounded-full font-bold text-base flex items-center gap-2 shadow-lg shadow-[#00d4aa]/20 select-none transition-all active:scale-95 ${
            text.trim() 
              ? 'bg-gradient-to-r from-[#00d4aa] to-[#00a89d] text-black' 
              : 'bg-white/10 text-white/30'
          }`}
        >
          <Video className="w-5 h-5" />
          התחל צילום
        </button>
      </div>

      <BottomNav activePage="Home" />
    </div>
  );
}