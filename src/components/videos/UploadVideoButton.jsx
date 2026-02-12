import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk
const MAX_SIZE_MB = 500;
const MAX_DURATION_SEC = 600;

export default function UploadVideoButton({ onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [statusText, setStatusText] = useState('');
  const [percent, setPercent] = useState(0);
  const inputRef = useRef(null);
  const abortRef = useRef(false);

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

  const generateSessionId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  };

  const uploadChunk = async (file, sessionId, chunkIndex, totalChunks) => {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk, `chunk_${chunkIndex}`);
    formData.append('session_id', sessionId);
    formData.append('chunk_index', chunkIndex.toString());
    formData.append('total_chunks', totalChunks.toString());

    // Retry up to 3 times per chunk
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await base44.functions.invoke('receiveChunk', formData);
        return res.data;
      } catch (err) {
        console.warn(`Chunk ${chunkIndex} attempt ${attempt + 1} failed:`, err.message);
        if (attempt === 2) throw err;
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
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
    abortRef.current = false;

    const localDuration = await getFileDuration(file);
    if (localDuration > MAX_DURATION_SEC) {
      alert('הסרטון ארוך מדי. האורך המקסימלי הוא 10 דקות.');
      resetState();
      return;
    }

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const sessionId = generateSessionId();

    // For small files (< 50MB), use direct upload
    if (file.size < 50 * 1024 * 1024) {
      try {
        setStatus('uploading');
        setStatusText(`מעלה ${sizeMB}MB...`);
        setPercent(20);

        const result = await base44.integrations.Core.UploadFile({ file });
        if (!result.file_url) throw new Error('לא התקבל קישור לקובץ');

        setPercent(90);
        setStatus('saving');
        setStatusText('שומר...');

        await base44.entities.Recording.create({
          title: (file.name || 'video').replace(/\.[^/.]+$/, ''),
          file_url: result.file_url,
          duration_seconds: localDuration || 0,
          file_size_bytes: file.size,
        });

        setPercent(100);
        setStatus('done');
        setStatusText('הועלה בהצלחה!');
        setTimeout(() => { onUploaded?.(); resetState(); }, 1200);
        return;
      } catch (err) {
        console.warn('Direct upload failed, falling back to chunked:', err.message);
        // Fall through to chunked upload
      }
    }

    // Chunked upload for larger files
    try {
      setStatus('uploading');
      setStatusText(`מעלה 0/${sizeMB}MB...`);
      setPercent(5);

      console.log(`Starting chunked upload: ${totalChunks} chunks, session: ${sessionId}`);

      for (let i = 0; i < totalChunks; i++) {
        if (abortRef.current) throw new Error('Upload cancelled');

        await uploadChunk(file, sessionId, i, totalChunks);

        const uploadedBytes = Math.min((i + 1) * CHUNK_SIZE, file.size);
        const uploadedMB = (uploadedBytes / (1024 * 1024)).toFixed(0);
        const progress = 5 + ((i + 1) / totalChunks) * 80; // 5% to 85%
        setPercent(progress);
        setStatusText(`מעלה ${uploadedMB}/${sizeMB}MB...`);
      }

      setPercent(88);
      setStatus('assembling');
      setStatusText('מרכיב סרטון...');

      console.log('All chunks uploaded, assembling...');

      const assembleRes = await base44.functions.invoke('assembleVideo', {
        session_id: sessionId,
        total_chunks: totalChunks,
        file_name: file.name || 'video.mp4',
        duration_seconds: localDuration || 0,
        file_size_bytes: file.size,
      });

      if (!assembleRes.data?.success) {
        throw new Error(assembleRes.data?.error || 'Assembly failed');
      }

      setPercent(100);
      setStatus('done');
      setStatusText('הועלה בהצלחה!');
      setTimeout(() => { onUploaded?.(); resetState(); }, 1200);

    } catch (err) {
      console.error('Chunked upload failed:', err?.message || err);
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
    abortRef.current = false;
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
    if (status === 'assembling') return 'bg-amber-500';
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