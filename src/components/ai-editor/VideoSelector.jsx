import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Upload, Film, Loader2, Check } from 'lucide-react';

export default function VideoSelector({ onVideoSelected, selectedVideoUrl }) {
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState('library');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recordings = [], isLoading } = useQuery({
    queryKey: ['recordings-for-ai', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      if (currentUser.role === 'admin') {
        return base44.entities.Recording.list('-created_date', 20);
      }
      return base44.entities.Recording.filter({ created_by: currentUser.email }, '-created_date', 20);
    },
    enabled: !!currentUser,
  });

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

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const duration = await getVideoDuration(file_url);
    const recording = await base44.entities.Recording.create({
      title: file.name.replace(/\.[^/.]+$/, ''),
      file_url,
      duration_seconds: duration || undefined,
      file_size_bytes: file.size,
    });
    onVideoSelected({ 
      file_url, 
      title: recording.title, 
      recordingId: recording.id,
      duration_seconds: duration 
    });
    setUploading(false);
  };

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('library')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === 'library' ? 'bg-[#00d4aa]/20 text-[#00d4aa]' : 'bg-white/5 text-white/50'
          }`}
        >
          <Film className="w-4 h-4 inline ml-1" />
          הסרטונים שלי
        </button>
        <button
          onClick={() => setTab('upload')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === 'upload' ? 'bg-[#00d4aa]/20 text-[#00d4aa]' : 'bg-white/5 text-white/50'
          }`}
        >
          <Upload className="w-4 h-4 inline ml-1" />
          העלאת סרטון
        </button>
      </div>

      {tab === 'upload' && (
        <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-white/20 rounded-2xl cursor-pointer hover:border-[#00d4aa]/50 transition-colors">
          {uploading ? (
            <Loader2 className="w-8 h-8 text-[#00d4aa] animate-spin" />
          ) : (
            <>
              <Upload className="w-8 h-8 text-white/40" />
              <span className="text-sm text-white/50">לחץ להעלאת קובץ וידאו</span>
              <span className="text-xs text-white/30">MP4, MOV, WEBM</span>
            </>
          )}
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>
      )}

      {tab === 'library' && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 text-[#00d4aa] animate-spin" />
            </div>
          )}
          {!isLoading && recordings.length === 0 && (
            <p className="text-center text-white/40 text-sm py-6">אין סרטונים עדיין</p>
          )}
          {recordings.map((rec) => {
            const isSelected = selectedVideoUrl === rec.file_url;
            return (
              <button
                key={rec.id}
                onClick={() => onVideoSelected({ file_url: rec.file_url, title: rec.title || 'ללא כותרת', recordingId: rec.id })}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-right ${
                  isSelected ? 'bg-[#00d4aa]/20 border border-[#00d4aa]/50' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="w-16 h-10 rounded-lg bg-black/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {rec.thumbnail_url ? (
                    <img src={rec.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Film className="w-5 h-5 text-white/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{rec.title || 'ללא כותרת'}</p>
                  <p className="text-xs text-white/40">
                    {rec.duration_seconds ? `${Math.floor(rec.duration_seconds / 60)}:${String(Math.floor(rec.duration_seconds % 60)).padStart(2, '0')}` : ''}
                  </p>
                </div>
                {isSelected && <Check className="w-5 h-5 text-[#00d4aa] flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}