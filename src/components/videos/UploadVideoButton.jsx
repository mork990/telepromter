import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadVideoButton({ onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [statusText, setStatusText] = useState('');
  const [percent, setPercent] = useState(0);
  const inputRef = useRef(null);

  const MAX_SIZE_MB = 500;
  const MAX_DURATION_SEC = 600;

  const getFileDuration = (file) => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(0), 5000);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve(Math.round(video.duration));
        URL.revokeObjectURL(video.src);
        video.remove();
      };
      video.onerror = () => { clearTimeout(timeout); resolve(0); URL.revokeObjectURL(video.src); video.remove(); };
      video.src = URL.createObjectURL(file);
    });
  };

  // Convert file to base64 in chunks to avoid memory issues
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Simulate progress
  const simulateProgress = (startPct, endPct, durationMs) => {
    const steps = 30;
    const stepMs = durationMs / steps;
    const stepPct = (endPct - startPct) / steps;
    let current = startPct;
    const interval = setInterval(() => {
      current += stepPct;
      if (current >= endPct) {
        current = endPct;
        clearInterval(interval);
      }
      setPercent(Math.round(current));
    }, stepMs);
    return () => clearInterval(interval);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeMB = (file.size / (1024 * 1024)).toFixed(0);

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`הקובץ גדול מדי (${sizeMB}MB). הגודל המקסימלי הוא ${MAX_SIZE_MB}MB`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setUploading(true);
    setStatus('checking');
    setStatusText('בודק סרטון...');
    setPercent(0);

    const localDuration = await getFileDuration(file);
    if (localDuration > MAX_DURATION_SEC) {
      alert('הסרטון ארוך מדי. האורך המקסימלי הוא 10 דקות.');
      resetState();
      return;
    }

    try {
      // Step 1: Convert to base64 data URI
      setStatus('uploading');
      setStatusText('מכין קובץ...');
      setPercent(5);

      const dataUri = await fileToBase64(file);
      setPercent(15);
      setStatusText(`מעלה ${sizeMB}MB...`);

      // Step 2: Upload to Cloudinary using fetch + base64 data URI
      const stopProgress = simulateProgress(15, 85, 60000);

      const formData = new FormData();
      formData.append('file', dataUri);
      formData.append('upload_preset', 'base44_video_unsigned');

      const cloudRes = await fetch('https://api.cloudinary.com/v1_1/dq9tkpfwm/video/upload', {
        method: 'POST',
        body: formData,
      });

      stopProgress();

      if (!cloudRes.ok) {
        const errData = await cloudRes.json().catch(() => ({}));
        throw new Error(errData?.error?.message || 'Cloudinary upload failed: ' + cloudRes.status);
      }

      const cloudResult = await cloudRes.json();
      const fileUrl = cloudResult.secure_url;
      if (!fileUrl) {
        throw new Error('No URL returned from Cloudinary');
      }

      setPercent(90);

      // Step 3: Save recording in DB via backend
      setStatus('saving');
      setStatusText('שומר...');

      const saveResponse = await base44.functions.invoke('saveRecording', {
        file_url: fileUrl,
        file_name: file.name,
        file_size_bytes: file.size,
        duration_seconds: localDuration || Math.round(cloudResult.duration || 0),
      });

      if (!saveResponse.data?.success) {
        throw new Error(saveResponse.data?.error || 'שגיאה בשמירה');
      }

      setPercent(100);
      setStatus('done');
      setStatusText('הועלה בהצלחה!');
      setTimeout(() => {
        onUploaded?.();
        resetState();
      }, 1200);
    } catch (err) {
      console.error('Upload failed:', err?.message || err);
      setStatus('error');
      setStatusText('ההעלאה נכשלה');
      setPercent(0);
      setTimeout(() => {
        alert(`ההעלאה נכשלה.\n\nגודל: ${sizeMB}MB\nשגיאה: ${err?.message || 'לא ידוע'}\n\nנסה שוב.`);
        resetState();
      }, 500);
    }
  };

  const resetState = () => {
    if (inputRef.current) inputRef.current.value = '';
    setUploading(false);
    setStatus('');
    setStatusText('');
    setPercent(0);
  };

  const getIcon = () => {
    if (status === 'done') return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === 'error') return <AlertCircle className="w-4 h-4 text-red-400" />;
    if (uploading) return <Loader2 className="w-4 h-4 animate-spin" />;
    return <Upload className="w-4 h-4" />;
  };

  const getProgressColor = () => {
    if (status === 'done') return 'bg-green-500';
    if (status === 'error') return 'bg-red-500';
    return 'bg-purple-500';
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <label className={`h-10 px-4 rounded-full text-white text-sm font-medium flex items-center gap-2 select-none transition-colors ${
        uploading ? 'bg-white/5 cursor-wait' : 'bg-white/10 cursor-pointer hover:bg-white/15'
      }`}>
        {getIcon()}
        {uploading ? statusText : 'העלה סרטון'}
        {uploading && percent > 0 && status !== 'done' && ` ${percent}%`}
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
      </label>
      {uploading && (
        <div className="w-36 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${getProgressColor()}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}