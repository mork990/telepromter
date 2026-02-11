import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { Video, LogIn, User, Type, ChevronLeft, Shield } from "lucide-react";
import { base44 } from '@/api/base44Client';
import TextInput from '../components/teleprompter/TextInput';
import PrompterPreview from '../components/teleprompter/PrompterPreview';
import { useSubscription } from '../components/subscription/useSubscription';
import BottomNav from '../components/navigation/BottomNav';
import ThemeToggle from '@/components/theme/ThemeToggle';

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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} dir="rtl">
      {/* Header */}
      <div 
        className="sticky z-10 backdrop-blur-xl"
        style={{ top: 'env(safe-area-inset-top)', backgroundColor: 'var(--nav-bg)', borderBottom: '1px solid var(--border-color)' }}
      >
        <div className="px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, var(--accent), var(--accent-secondary))` }}>
              <Type className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight">פרומפטר</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {!authLoading && !currentUser && (
              <button 
                className="text-xs font-medium px-3 py-1.5 rounded-full select-none"
                style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-bg)' }}
                onClick={() => base44.auth.redirectToLogin()}
              >
                <LogIn className="w-3.5 h-3.5 inline ml-1" />
                התחבר
              </button>
            )}
            {!authLoading && currentUser && (
              <div className="flex items-center gap-1">
                {currentUser.role === 'admin' && (
                  <button
                    className="text-xs font-medium px-2.5 py-1.5 rounded-full select-none"
                    style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-bg)' }}
                    onClick={() => navigate(createPageUrl('AdminPanel'))}
                  >
                    <Shield className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  className="text-xs font-medium px-3 py-1.5 rounded-full select-none"
                  style={{ color: 'var(--text-muted)', backgroundColor: 'var(--chip-bg)' }}
                  onClick={() => base44.auth.logout()}
                >
                  <User className="w-3.5 h-3.5 inline ml-1" />
                  {currentUser.full_name?.split(' ')[0] || 'חשבון'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* Text Input Area */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>הטקסט שלך</span>
            {text.trim() && (
              <button 
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs font-medium" style={{ color: 'var(--accent)' }}
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
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>💡 טיפים מהירים</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
            {['הזן טקסט או העלה קובץ', 'התאם הגדרות בעמוד הגדרות', 'גלול ידנית בזמן צילום'].map((tip, i) => (
              <div key={i} className="flex-shrink-0 rounded-lg px-3 py-2 text-[11px]" style={{ backgroundColor: 'var(--chip-bg)', color: 'var(--text-faint)' }}>
                {tip}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Record Button */}
      <div 
        className="fixed left-0 right-0 z-40 flex justify-center"
        style={{ bottom: 'calc(72px + 12px + env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={startRecording}
          disabled={!text.trim()}
          className="h-14 px-8 rounded-full font-bold text-base flex items-center gap-2 shadow-lg select-none transition-all active:scale-95"
          style={text.trim() ? {
            background: `linear-gradient(90deg, var(--accent), var(--accent-secondary))`,
            color: '#000',
            boxShadow: `0 10px 25px var(--shadow-accent)`,
          } : {
            backgroundColor: 'var(--hover-bg)',
            color: 'var(--text-muted)',
          }}
        >
          <Video className="w-5 h-5" />
          התחל צילום
        </button>
      </div>

      <BottomNav activePage="Home" />
    </div>
  );
}