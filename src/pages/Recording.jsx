import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CameraView from '../components/teleprompter/CameraView';
import { createPageUrl } from '@/utils';

export default function Recording() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Load saved settings from localStorage as defaults
    let saved = {};
    try {
      const raw = localStorage.getItem('teleprompterSettings');
      if (raw) saved = JSON.parse(raw);
    } catch (e) {}

    setSettings({
      text: params.get('text') || '',
      fontSize: params.get('fontSize') ? parseInt(params.get('fontSize')) : (saved.fontSize || 32),
      textColor: params.get('textColor') || saved.textColor || '#FFFFFF',
      backgroundColor: params.get('backgroundColor') || saved.backgroundColor || '#000000',
      scrollSpeed: params.get('scrollSpeed') ? parseInt(params.get('scrollSpeed')) : (saved.scrollSpeed || 50),
      cameraFacing: params.get('cameraFacing') || saved.cameraFacing || 'user',
      backgroundOpacity: params.get('backgroundOpacity') ? parseInt(params.get('backgroundOpacity')) : (saved.backgroundOpacity !== undefined ? saved.backgroundOpacity : 80),
      videoQuality: params.get('videoQuality') || saved.videoQuality || '1080',
      isPremium: params.get('isPremium') === '1'
    });
  }, []);

  const handleStop = () => {
    navigate(createPageUrl('Home'));
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">טוען...</div>
      </div>
    );
  }

  return (
    <CameraView
      text={settings.text}
      fontSize={settings.fontSize}
      textColor={settings.textColor}
      backgroundColor={settings.backgroundColor}
      cameraFacing={settings.cameraFacing}
      scrollSpeed={settings.scrollSpeed}
      backgroundOpacity={settings.backgroundOpacity}
      videoQuality={settings.videoQuality}
      isPremium={settings.isPremium}
      onStop={handleStop}
    />
  );
}