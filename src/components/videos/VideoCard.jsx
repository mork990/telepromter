import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Download, Share2, Trash2, Clock, HardDrive, Film } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import moment from 'moment';

function formatDuration(seconds) {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VideoCard({ recording, onDelete, onUpdate }) {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = recording.file_url;
    a.download = recording.title || `video_${recording.id}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleShare = async () => {
    const file = await fetch(recording.file_url).then(r => r.blob());
    const f = new File([file], (recording.title || 'video') + '.mp4', { type: 'video/mp4' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      await navigator.share({ files: [f], title: recording.title || 'סרטון' });
    } else {
      handleDownload();
    }
  };

  return (
    <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 overflow-hidden">
      <div className="relative bg-black aspect-video">
        {recording.thumbnail_url ? (
          <img src={recording.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <video src={recording.file_url} className="w-full h-full object-cover" preload="metadata" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/50 rounded-full p-3">
            <Play className="w-8 h-8 text-white fill-white" />
          </div>
        </div>
        {recording.quality && (
          <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
            {recording.quality}p
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-white text-sm">
              {recording.title || 'סרטון ללא שם'}
            </h3>
            <p className="text-xs text-white/30 mt-0.5">
              {moment(recording.created_date).format('DD/MM/YYYY HH:mm')}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/30">
            {recording.duration_seconds > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(recording.duration_seconds)}
              </span>
            )}
            {recording.file_size_bytes > 0 && (
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {formatSize(recording.file_size_bytes)}
              </span>
            )}
          </div>
        </div>

        <button
          className="w-full h-9 rounded-lg bg-[#00d4aa]/10 text-[#00d4aa] text-sm font-medium flex items-center justify-center gap-1.5 mb-3 select-none hover:bg-[#00d4aa]/20 transition-colors"
          onClick={() => navigate(createPageUrl('VideoEditor') + '?id=' + recording.id)}
        >
          <Film className="w-4 h-4" />
          עריכת סרטון
        </button>

        <div className="flex items-center gap-2">
          <button className="flex-1 h-9 rounded-lg bg-white/5 text-white/70 text-sm font-medium flex items-center justify-center gap-1.5 select-none hover:bg-white/10 transition-colors" onClick={handleDownload}>
            <Download className="w-4 h-4" />
            הורד
          </button>
          <button className="flex-1 h-9 rounded-lg bg-white/5 text-white/70 text-sm font-medium flex items-center justify-center gap-1.5 select-none hover:bg-white/10 transition-colors" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
            שתף
          </button>
          {showConfirm ? (
            <button className="h-9 px-3 rounded-lg bg-red-600 text-white text-sm font-medium select-none" onClick={() => { onDelete(); setShowConfirm(false); }}>
              בטוח?
            </button>
          ) : (
            <button className="h-9 w-9 rounded-lg bg-white/5 text-red-400/60 flex items-center justify-center select-none hover:bg-red-500/10 transition-colors" onClick={() => setShowConfirm(true)}>
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}