import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CameraView from '../components/teleprompter/CameraView';
import { createPageUrl } from '@/utils';

export default function Recording() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSettings({
      text: params.get('text') || '',
      fontSize: parseInt(params.get('fontSize')) || 32,
      textColor: params.get('textColor') || '#FFFFFF',
      backgroundColor: params.get('backgroundColor') || '#000000',
      scrollSpeed: parseInt(params.get('scrollSpeed')) || 50,
      cameraFacing: params.get('cameraFacing') || 'user',
      backgroundOpacity: parseInt(params.get('backgroundOpacity')) || 80,
      videoQuality: params.get('videoQuality') || '1080',
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