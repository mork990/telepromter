import React, { useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { Video, Settings, RefreshCw, Crown } from "lucide-react";
import TextInput from '../components/teleprompter/TextInput';
import PrompterPreview from '../components/teleprompter/PrompterPreview';
import { useSubscription } from '../components/subscription/useSubscription';
import PremiumBadge from '../components/subscription/PremiumBadge';


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
  
  // Pull to refresh state
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef(null);
  const startY = useRef(0);
  const PULL_THRESHOLD = 80;

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(diff * 0.5, PULL_THRESHOLD * 1.5));
    }
  }, [isPulling]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      // Simulate refresh
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 1000);
    } else {
      setPullDistance(0);
    }
    setIsPulling(false);
  }, [pullDistance]);

  // Load settings and text on mount
  React.useEffect(() => {
    // Load settings
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

    // Load current text
    const savedText = localStorage.getItem('currentText');
    if (savedText) {
      setText(savedText);
    }

    // Load from URL params if coming from templates
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

  // Save text whenever it changes
  React.useEffect(() => {
    if (text) {
      localStorage.setItem('currentText', text);
    }
  }, [text]);



  const startRecording = () => {
    if (!text.trim()) {
      alert('אנא הזן טקסט לפני תחילת הצילום');
      return;
    }

    // Save current settings before navigating
    const settings = {
      fontSize,
      textColor,
      backgroundColor,
      cameraFacing,
      scrollSpeed,
      backgroundOpacity
    };
    localStorage.setItem('teleprompterSettings', JSON.stringify(settings));

    const params = new URLSearchParams({
      text,
      fontSize,
      textColor,
      backgroundColor,
      scrollSpeed,
      cameraFacing,
      backgroundOpacity,
      videoQuality,
      isPremium: isPremium ? '1' : '0'
    });
    
    navigate(createPageUrl('Recording') + '?' + params.toString());
  };

  const goToSettings = () => {
    // Save current state before navigating
    const settings = {
      fontSize,
      textColor,
      backgroundColor,
      cameraFacing,
      scrollSpeed,
      backgroundOpacity
    };
    localStorage.setItem('teleprompterSettings', JSON.stringify(settings));
    navigate(createPageUrl('Settings'));
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" 
      dir="rtl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      <div 
        className="flex justify-center items-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance }}
      >
        <RefreshCw 
          className={`w-6 h-6 text-indigo-600 dark:text-indigo-400 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
          style={{ transform: `rotate(${pullDistance * 2}deg)` }}
        />
      </div>

      {/* Header */}
      <div 
        className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 sticky z-10"
        style={{ top: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl">
                <Video className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                פרומפטר
              </h1>
              {isPremium && <PremiumBadge small />}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-amber-600"
                  onClick={() => navigate(createPageUrl('Pricing'))}
                >
                  <Crown className="w-4 h-4" />
                </Button>
              </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Text Input */}
        <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-6">
            <TextInput text={text} onTextChange={setText} />
          </CardContent>
        </Card>

        {/* Preview */}
        {text && (
          <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-6">
              <PrompterPreview
                text={text}
                fontSize={fontSize}
                textColor={textColor}
                backgroundColor={backgroundColor}
              />
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={startRecording}
            className="w-full h-14 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg select-none"
            disabled={!text.trim()}
          >
            <Video className="w-5 h-5 ml-2" />
            התחל צילום
          </Button>

          <Button variant="outline" className="w-full h-12 dark:border-gray-600 dark:text-gray-200 select-none" onClick={goToSettings}>
            <Settings className="w-4 h-4 ml-2" />
            הגדרות
          </Button>
        </div>

        {/* Info Card */}
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 border-indigo-200 dark:border-gray-600">
          <CardContent className="p-4 text-sm text-gray-700 dark:text-gray-300 text-right">
            <p className="font-medium mb-2">💡 טיפים לשימוש:</p>
            <ul className="space-y-1 text-xs">
              <li>• הזן את הטקסט או העלה קובץ טקסט</li>
              <li>• התאם את הגדרות הגופן והצבעים בעמוד ההגדרות</li>
              <li>• לחץ על "התחל צילום" כדי להתחיל</li>
              <li>• שלוט במהירות הגלילה במהלך הצילום</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}