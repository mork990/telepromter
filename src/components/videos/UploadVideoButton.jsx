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
  const cancelledRef = useRef(false);

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

  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk

  const uploadChunked = async (file) => {
    const totalSize = file.size;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
    const uploadId = `uqid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let lastResponse = null;
    cancelledRef.current = false;

    for (let i = 0; i < totalChunks; i++) {
      if (cancelledRef.current) {
        throw new Error('ההעלאה בוטלה');
      }

      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalSize);
      const chunk = file.slice(start, end);

      // Convert chunk to base64 for JSON transport
      const arrayBuffer = await chunk.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let j = 0; j < bytes.length; j++) {
        binary += String.fromCharCode(bytes[j]);
      }
      const chunkBase64 = btoa(binary);

      const res = await base44.functions.invoke('uploadChunk', {
        chunk_base64: chunkBase64,
        upload_id: uploadId,
        chunk_index: i,
        total_chunks: totalChunks,
        total_size: totalSize,
        range_start: start,
        range_end: end - 1,
      });
      lastResponse = res.data;

      const pct = Math.round(((i + 1) / totalChunks) * 90) + 5;
      setPercent(pct);
      const loadedMB = (end / (1024 * 1024)).toFixed(1);
      const totalMB = (totalSize / (1024 * 1024)).toFixed(0);
      setStatusText(`מעלה ${loadedMB}/${totalMB}MB... ${pct}%`);

      if (lastResponse?.status === 'complete' && lastResponse?.data?.secure_url) {
        return lastResponse.data;
      }
    }

    // If last chunk didn't return complete, check the response
    if (lastResponse?.data?.secure_url) {
      return lastResponse.data;
    }

    throw new Error('ההעלאה הסתיימה אבל לא התקבל קישור לסרטון');
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
      // Step 1: Upload in chunks via backend
      setStatus('uploading');
      setStatusText(`מעלה ${sizeMB}MB...`);
      setPercent(5);

      const cloudinaryResult = await uploadChunked(file);

      if (!cloudinaryResult.secure_url) {
        throw new Error('לא התקבל קישור לקובץ');
      }

      setPercent(95);

      // Step 3: Save recording in DB
      setStatus('saving');
      setStatusText('שומר...');

      await base44.entities.Recording.create({
        title: (file.name || 'video').replace(/\.[^/.]+$/, ''),
        file_url: cloudinaryResult.secure_url,
        duration_seconds: Math.round(cloudinaryResult.duration || localDuration || 0),
        file_size_bytes: cloudinaryResult.bytes || file.size,
      });

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
    cancelledRef.current = true;
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
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