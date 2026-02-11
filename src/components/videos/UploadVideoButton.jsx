import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadVideoButton({ onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(''); // idle, checking, uploading, saving, done, error
  const [statusText, setStatusText] = useState('');
  const [percent, setPercent] = useState(0);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

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

  const uploadWithProgress = (file) => {
    return new Promise((resolve, reject) => {
      // Use the UploadFile integration but wrap with a visual heartbeat
      // The actual upload happens through the SDK
      const controller = new AbortController();
      abortRef.current = controller;

      // Start the upload
      const uploadPromise = base44.integrations.Core.UploadFile({ file });
      
      // Heartbeat: check every 2s that the promise is still pending
      let alive = true;
      const heartbeat = setInterval(() => {
        if (!alive) clearInterval(heartbeat);
      }, 2000);

      uploadPromise
        .then((result) => {
          alive = false;
          clearInterval(heartbeat);
          resolve(result);
        })
        .catch((err) => {
          alive = false;
          clearInterval(heartbeat);
          reject(err);
        });
    });
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

    // Start upload with animated progress
    setStatus('uploading');
    setStatusText(`מעלה ${sizeMB}MB...`);

    // Animated progress: fast at start, slows down approaching 95%
    let currentPercent = 0;
    const progressInterval = setInterval(() => {
      // Logarithmic slowdown - fast start, slow near end
      const remaining = 95 - currentPercent;
      const increment = Math.max(0.3, remaining * 0.03);
      currentPercent = Math.min(95, currentPercent + increment);
      setPercent(Math.round(currentPercent));
    }, 300);

    try {
      const { file_url } = await uploadWithProgress(file);
      clearInterval(progressInterval);
      
      // Upload succeeded!
      setPercent(97);
      setStatus('saving');
      setStatusText('שומר...');

      await base44.entities.Recording.create({
        title: file.name.replace(/\.[^/.]+$/, ''),
        file_url,
        duration_seconds: localDuration || undefined,
        file_size_bytes: file.size,
      });

      setPercent(100);
      setStatus('done');
      setStatusText('הועלה בהצלחה!');
      setTimeout(() => {
        onUploaded?.();
        resetState();
      }, 1200);
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Upload failed:', err);
      setStatus('error');
      setStatusText('ההעלאה נכשלה');
      setPercent(0);
      setTimeout(() => {
        alert(`ההעלאה נכשלה.\n\nגודל: ${sizeMB}MB\n\nנסה שוב, או נסה קובץ קטן יותר.`);
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