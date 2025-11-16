import React, { useEffect, useState } from 'react';
import CameraView from '../components/teleprompter/CameraView';
import { createPageUrl } from './utils';

export default function Recording() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSettings({
      text: params.get('text') || '',
      fontSize: parseInt(params.get('fontSize')) || 32,
      textColor: params.get('textColor') || '#FFFFFF',
      backgroundColor: params.get('backgroundColor') || '#000000',
      scrollSpeed: parseInt(params.get('scrollSpeed')) || 50,
      cameraFacing: params.get('cameraFacing') || 'user'
    });
  }, []);

  const handleStop = () => {
    window.location.href = createPageUrl('Home');
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
      onStop={handleStop}
    />
  );
}