import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2 } from 'lucide-react';

export default function UploadVideoButton({ onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

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
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const duration = await getVideoDuration(file_url);
    await base44.entities.Recording.create({
      title: file.name.replace(/\.[^/.]+$/, ''),
      file_url,
      duration_seconds: duration || undefined,
      file_size_bytes: file.size,
    });
    if (inputRef.current) inputRef.current.value = '';
    setUploading(false);
    onUploaded?.();
  };

  return (
    <label className="h-10 px-4 rounded-full bg-white/10 text-white text-sm font-medium flex items-center gap-2 cursor-pointer select-none hover:bg-white/15 transition-colors">
      {uploading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Upload className="w-4 h-4" />
      )}
      {uploading ? 'מעלה...' : 'העלה סרטון'}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleUpload}
        disabled={uploading}
      />
    </label>
  );
}