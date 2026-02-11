import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadVideoButton({ onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [statusText, setStatusText] = useState('');
  const [percent, setPercent] = useState(0);
  const inputRef = useRef(null);
  const xhrRef = useRef(null);

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

  // Upload directly to Cloudinary with real XHR progress
  const uploadToCloudinary = (file, signData) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('signature', signData.signature);
      formData.append('timestamp', signData.timestamp);
      formData.append('api_key', signData.api_key);
      formData.append('folder', signData.folder);
      formData.append('resource_type', 'video');

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 90);
          setPercent(pct);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error'));
      xhr.ontimeout = () => reject(new Error('Upload timeout'));
      xhr.timeout = 600000; // 10 min

      const url = `https://api.cloudinary.com/v1_1/${signData.cloud_name}/video/upload`;
      xhr.open('POST', url);
      xhr.send(formData);
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

    try {
      // Step 1: Get signed upload params from backend
      setStatus('uploading');
      setStatusText('מתחיל העלאה...');
      
      const signResponse = await base44.functions.invoke('getUploadSignature');
      const signData = signResponse.data;
      
      if (!signData?.signature) {
        throw new Error('Failed to get upload signature');
      }

      // Step 2: Upload directly to Cloudinary with real progress
      setStatusText(`מעלה ${sizeMB}MB...`);
      const cloudResult = await uploadToCloudinary(file, signData);
      
      const fileUrl = cloudResult.secure_url;
      if (!fileUrl) {
        throw new Error('No URL returned from Cloudinary');
      }

      // Step 3: Save recording in DB
      setPercent(93);
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