import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Film, ChevronLeft, Play } from 'lucide-react';

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

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-bold text-white/80">סרטונים אחרונים</h3>
        <button
          onClick={() => navigate(createPageUrl('MyVideos'))}
          className="text-xs text-[#00d4aa] font-medium flex items-center gap-0.5"
        >
          הכל
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
        {recordings.map((rec) => (
          <button
            key={rec.id}
            onClick={() => navigate(createPageUrl('VideoEditor') + `?id=${rec.id}`)}
            className="flex-shrink-0 w-28 group"
          >
            <div className="w-28 h-36 rounded-xl bg-[#1a1a2e] border border-white/5 overflow-hidden relative">
              {rec.thumbnail_url ? (
                <img src={rec.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/[0.02]">
                  <Film className="w-6 h-6 text-white/20" />
                </div>
              )}
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Play className="w-6 h-6 text-white fill-white" />
              </div>
              {/* Duration badge */}
              {rec.duration_seconds > 0 && (
                <div className="absolute bottom-1.5 left-1.5 text-[9px] text-white bg-black/60 rounded px-1 py-0.5 font-medium">
                  {Math.floor(rec.duration_seconds / 60)}:{String(Math.floor(rec.duration_seconds % 60)).padStart(2, '0')}
                </div>
              )}
            </div>
            <p className="text-[10px] text-white/40 mt-1.5 truncate text-center px-1">
              {rec.title || 'ללא כותרת'}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}