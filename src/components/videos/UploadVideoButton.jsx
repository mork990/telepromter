import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2, CheckCircle } from 'lucide-react';

export default function UploadVideoButton({ onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [percent, setPercent] = useState(0);
  const inputRef = useRef(null);

  const MAX_SIZE_MB = 200;
  const MAX_DURATION_SEC = 600; // 10 minutes

  const getFileDuration = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        resolve(Math.round(video.duration));
        URL.revokeObjectURL(video.src);
        video.remove();
      };
      video.onerror = () => { resolve(0); URL.revokeObjectURL(video.src); video.remove(); };
      video.src = URL.createObjectURL(file);
    });
  };

  const getVideoDuration = (url) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        resolve(Math.round(video.duration));
        video.remove();
      };
      video.onerror = () => { resolve(0); video.remove(); };
      video.src = url;
    });
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`הקובץ גדול מדי. הגודל המקסימלי הוא ${MAX_SIZE_MB}MB`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setUploading(true);
    setProgress('בודק אורך...');
    const localDuration = await getFileDuration(file);
    if (localDuration > MAX_DURATION_SEC) {
      alert('הסרטון ארוך מדי. האורך המקסימלי הוא 5 דקות.');
      if (inputRef.current) inputRef.current.value = '';
      setUploading(false);
      setProgress('');
      return;
    }

    const sizeMB = (file.size / (1024 * 1024)).toFixed(0);
    setProgress('מעלה...');
    setPercent(0);

    // Estimate upload speed ~2MB/s, simulate progress up to 90%
    const estimatedSeconds = Math.max(5, (file.size / (1024 * 1024)) / 2);
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const estimated = Math.min(90, Math.round((elapsed / estimatedSeconds) * 90));
      setPercent(estimated);
      setProgress(`מעלה ${sizeMB}MB...`);
    }, 500);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      clearInterval(progressInterval);
      setPercent(95);
      setProgress('שומר...');
      const duration = localDuration || await getVideoDuration(file_url);
      await base44.entities.Recording.create({
        title: file.name.replace(/\.[^/.]+$/, ''),
        file_url,
        duration_seconds: duration || undefined,
        file_size_bytes: file.size,
      });
      setPercent(100);
      setProgress('הועלה בהצלחה!');
      setTimeout(() => onUploaded?.(), 500);
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Upload failed:', err);
      alert('ההעלאה נכשלה. נסה קובץ קטן יותר או נסה שוב.');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
      setTimeout(() => {
        setUploading(false);
        setProgress('');
        setPercent(0);
      }, 600);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <label className="h-10 px-4 rounded-full bg-white/10 text-white text-sm font-medium flex items-center gap-2 cursor-pointer select-none hover:bg-white/15 transition-colors">
        {uploading ? (
          percent === 100 ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {uploading ? `${progress} ${percent}%` : 'העלה סרטון'}
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
        <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}