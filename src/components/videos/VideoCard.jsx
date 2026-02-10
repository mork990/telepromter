import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Download, Share2, Trash2, Clock, HardDrive, Subtitles, Pencil, Loader2 } from "lucide-react";
import { base44 } from '@/api/base44Client';
import moment from 'moment';
import SubtitleEditor from './SubtitleEditor';

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
  const [showConfirm, setShowConfirm] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

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

  const handleTranscribe = async () => {
    setIsTranscribing(true);
    await base44.functions.invoke('transcribeVideo', { recording_id: recording.id });
    if (onUpdate) onUpdate();
    setIsTranscribing(false);
  };

  const handleSaveSubtitles = async (subtitles) => {
    await base44.entities.Recording.update(recording.id, { subtitles, subtitles_status: 'done' });
    if (onUpdate) onUpdate();
    setShowEditor(false);
  };

  const hasSubtitles = recording.subtitles && recording.subtitles.length > 0;
  const isProcessing = recording.subtitles_status === 'processing' || isTranscribing;

  return (
    <Card className="shadow-md dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
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
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {recording.title || 'סרטון ללא שם'}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {moment(recording.created_date).format('DD/MM/YYYY HH:mm')}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
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
        {/* Subtitle Section */}
        <div className="mb-3">
          {showEditor ? (
            <SubtitleEditor
              subtitles={recording.subtitles || []}
              onSave={handleSaveSubtitles}
              onCancel={() => setShowEditor(false)}
            />
          ) : hasSubtitles ? (
            <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                  <Subtitles className="w-3 h-3" />
                  כתוביות ({recording.subtitles.length} קטעים)
                </span>
                <Button size="sm" variant="ghost" className="h-6 text-xs text-indigo-600" onClick={() => setShowEditor(true)}>
                  <Pencil className="w-3 h-3 ml-1" />
                  ערוך
                </Button>
              </div>
              <div className="max-h-20 overflow-y-auto text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                {recording.subtitles.slice(0, 3).map((s, i) => (
                  <p key={i} className="truncate">{s.text}</p>
                ))}
                {recording.subtitles.length > 3 && (
                  <p className="text-indigo-500 text-[10px]">+ עוד {recording.subtitles.length - 3} קטעים...</p>
                )}
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              onClick={handleTranscribe}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                  מתמלל...
                </>
              ) : (
                <>
                  <Subtitles className="w-4 h-4 ml-1" />
                  צור כתוביות אוטומטית
                </>
              )}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={handleDownload}>
            <Download className="w-4 h-4 ml-1" />
            הורד
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={handleShare}>
            <Share2 className="w-4 h-4 ml-1" />
            שתף
          </Button>
          {showConfirm ? (
            <Button size="sm" variant="destructive" onClick={() => { onDelete(); setShowConfirm(false); }}>
              בטוח?
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setShowConfirm(true)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}