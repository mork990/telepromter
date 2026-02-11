import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Film, Play, MoreVertical } from 'lucide-react';
import moment from 'moment';

export default function RecentVideos() {
  const navigate = useNavigate();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recordings = [] } = useQuery({
    queryKey: ['recentRecordings', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      if (currentUser.role === 'admin') {
        return base44.entities.Recording.list('-created_date', 6);
      }
      return base44.entities.Recording.filter({ created_by: currentUser.email }, '-created_date', 6);
    },
    enabled: !!currentUser,
  });

  if (!recordings.length) return null;

  const formatDuration = (sec) => {
    if (!sec) return '';
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(Math.floor(sec % 60)).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">פרויקטים אחרונים</h2>
        <button
          onClick={() => navigate(createPageUrl('MyVideos'))}
          className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
        >
          הצג הכל
        </button>
      </div>
      <div className="flex overflow-x-auto gap-4 pb-3 -mx-5 px-5" style={{ scrollbarWidth: 'none' }}>
        {recordings.map((rec) => (
          <div
            key={rec.id}
            onClick={() => navigate(createPageUrl('VideoEditor') + `?id=${rec.id}`)}
            className="shrink-0 w-64 group cursor-pointer"
          >
            <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-[#2a1b30] border border-white/5">
              {rec.thumbnail_url ? (
                <img src={rec.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film className="w-8 h-8 text-white/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
              {rec.duration_seconds > 0 && (
                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-medium text-white">
                  {formatDuration(rec.duration_seconds)}
                </div>
              )}
            </div>
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-white truncate text-right">
                  {rec.title || 'ללא כותרת'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 text-right">
                  {moment(rec.created_date).fromNow()}
                </p>
              </div>
              <button className="text-slate-400 hover:text-white shrink-0" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}