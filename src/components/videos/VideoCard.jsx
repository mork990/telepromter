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

export default function VideoCard({ recording, onDelete, onUpdate, compact }) {
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
          <div className={`bg-black/50 rounded-full ${compact ? 'p-2' : 'p-3'}`}>
            <Play className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} text-white fill-white`} />
          </div>
        </div>
        {recording.duration_seconds > 0 && (
          <div className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
            {formatDuration(recording.duration_seconds)}
          </div>
        )}
        {recording.quality && (
          <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
            {recording.quality}p
          </div>
        )}
      </div>
      <div className={compact ? 'p-2.5' : 'p-4'}>
        <h3 className={`font-semibold text-white truncate ${compact ? 'text-xs' : 'text-sm'}`}>
          {recording.title || 'סרטון ללא שם'}
        </h3>
        <p className={`text-white/30 mt-0.5 ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {moment(recording.created_date).format('DD/MM/YY')}
          {!compact && recording.file_size_bytes > 0 && ` • ${formatSize(recording.file_size_bytes)}`}
        </p>

        <button
          className={`w-full rounded-lg bg-[#00d4aa]/10 text-[#00d4aa] font-medium flex items-center justify-center gap-1 select-none hover:bg-[#00d4aa]/20 transition-colors ${compact ? 'h-7 text-[11px] mt-2 mb-1.5' : 'h-9 text-sm mt-3 mb-3'}`}
          onClick={() => navigate(createPageUrl('VideoEditor') + '?id=' + recording.id)}
        >
          <Film className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
          עריכה
        </button>

        <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
          <button className={`flex-1 rounded-lg bg-white/5 text-white/70 font-medium flex items-center justify-center gap-1 select-none hover:bg-white/10 transition-colors ${compact ? 'h-7 text-[11px]' : 'h-9 text-sm'}`} onClick={handleDownload}>
            <Download className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
            {!compact && 'הורד'}
          </button>
          <button className={`flex-1 rounded-lg bg-white/5 text-white/70 font-medium flex items-center justify-center gap-1 select-none hover:bg-white/10 transition-colors ${compact ? 'h-7 text-[11px]' : 'h-9 text-sm'}`} onClick={handleShare}>
            <Share2 className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
            {!compact && 'שתף'}
          </button>
          {showConfirm ? (
            <button className={`px-2 rounded-lg bg-red-600 text-white font-medium select-none ${compact ? 'h-7 text-[10px]' : 'h-9 text-sm px-3'}`} onClick={() => { onDelete(); setShowConfirm(false); }}>
              בטוח?
            </button>
          ) : (
            <button className={`rounded-lg bg-white/5 text-red-400/60 flex items-center justify-center select-none hover:bg-red-500/10 transition-colors ${compact ? 'h-7 w-7' : 'h-9 w-9'}`} onClick={() => setShowConfirm(true)}>
              <Trash2 className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}