import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import SettingsPanel from '../components/teleprompter/SettingsPanel';

export default function Settings() {
  const [fontSize, setFontSize] = useState(32);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [cameraFacing, setCameraFacing] = useState('user');
  const [scrollSpeed, setScrollSpeed] = useState(50);

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
    }
  }, []);

  const handleSave = () => {
    const settings = {
      fontSize,
      textColor,
      backgroundColor,
      cameraFacing,
      scrollSpeed
    };
    localStorage.setItem('teleprompterSettings', JSON.stringify(settings));
    alert('ההגדרות נשמרו בהצלחה!');
    window.location.href = createPageUrl('Home');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-800">הגדרות עיצוב</h1>
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
        />

        <div className="mt-6 space-y-3">
          <Button
            onClick={handleSave}
            className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            שמור הגדרות
          </Button>
          
          <Link to={createPageUrl('Home')} className="block">
            <Button variant="outline" className="w-full h-12">
              ביטול
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}