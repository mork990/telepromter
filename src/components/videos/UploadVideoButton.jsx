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

  const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunks for direct Cloudinary upload

  const uploadToCloudinary = async (file) => {
    cancelledRef.current = false;
    
    // Get signature from backend for signed upload
    const sigRes = await base44.functions.invoke('getUploadSignature');
    const { signature, timestamp, folder, cloud_name, api_key } = sigRes.data;

    const totalSize = file.size;

    // Small file - single upload with XHR for progress
    if (totalSize < 20 * 1024 * 1024) {
      return await uploadSingleFile(file, { signature, timestamp, folder, cloud_name, api_key });
    }

    // Large file - chunked upload directly to Cloudinary
    return await uploadChunkedDirect(file, { signature, timestamp, folder, cloud_name, api_key });
  };

  const uploadSingleFile = (file, { signature, timestamp, folder, cloud_name, api_key }) => {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', api_key);
      fd.append('timestamp', String(timestamp));
      fd.append('signature', signature);
      fd.append('folder', folder);
      fd.append('resource_type', 'video');

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 90) + 5;
          setPercent(pct);
          const loadedMB = (e.loaded / (1024 * 1024)).toFixed(1);
          const totalMB = (e.total / (1024 * 1024)).toFixed(0);
          setStatusText(`מעלה ${loadedMB}/${totalMB}MB... ${pct}%`);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } else {
          let errMsg = 'Upload failed: ' + xhr.status;
          try { errMsg = JSON.parse(xhr.responseText)?.error?.message || errMsg; } catch(_) {}
          reject(new Error(errMsg));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.onabort = () => reject(new Error('ההעלאה בוטלה'));

      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloud_name}/video/upload`);
      xhr.send(fd);
    });
  };

  const uploadChunkedDirect = async (file, { signature, timestamp, folder, cloud_name, api_key }) => {
    const totalSize = file.size;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
    const uploadId = `uqid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    let lastData = null;

    for (let i = 0; i < totalChunks; i++) {
      if (cancelledRef.current) throw new Error('ההעלאה בוטלה');

      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalSize);
      const chunk = file.slice(start, end);

      const fd = new FormData();
      fd.append('file', chunk, file.name || 'video.mp4');
      fd.append('api_key', api_key);
      fd.append('timestamp', String(timestamp));
      fd.append('signature', signature);
      fd.append('folder', folder);
      fd.append('resource_type', 'video');

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud_name}/video/upload`,
        {
          method: 'POST',
          headers: {
            'X-Unique-Upload-Id': uploadId,
            'Content-Range': `bytes ${start}-${end - 1}/${totalSize}`,
          },
          body: fd,
        }
      );

      const pct = Math.round(((i + 1) / totalChunks) * 90) + 5;
      setPercent(pct);
      const loadedMB = (end / (1024 * 1024)).toFixed(1);
      const totalMB = (totalSize / (1024 * 1024)).toFixed(0);
      setStatusText(`מעלה ${loadedMB}/${totalMB}MB... ${pct}%`);

      // Cloudinary returns 408 for intermediate chunks, 200 for last
      if (res.status === 408) {
        continue; // expected, next chunk
      }

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = 'Cloudinary error ' + res.status;
        try { errMsg = JSON.parse(errText)?.error?.message || errMsg; } catch(_) {}
        throw new Error(errMsg);
      }

      lastData = await res.json();
    }

    if (lastData?.secure_url) {
      return lastData;
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
      setStatus('uploading');
      setStatusText(`מעלה ${sizeMB}MB...`);
      setPercent(5);

      const cloudinaryResult = await uploadToCloudinary(file);

      if (!cloudinaryResult.secure_url) {
        throw new Error('לא התקבל קישור לקובץ');
      }

      setPercent(95);
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