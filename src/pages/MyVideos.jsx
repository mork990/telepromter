import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Film, Loader2, Users } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import VideoCard from '../components/videos/VideoCard';
import UploadVideoButton from '../components/videos/UploadVideoButton';
import BottomNav from '../components/navigation/BottomNav';

export default function MyVideos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recordings = [], isLoading } = useQuery({
    queryKey: ['recordings', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      let recs;
      if (currentUser.role === 'admin') {
        recs = await base44.entities.Recording.list('-created_date');
      } else {
        recs = await base44.entities.Recording.filter({ created_by: currentUser.email }, '-created_date');
      }
      return recs.filter(r => !r.title?.startsWith('__upload_session_'));
    },
    enabled: !!currentUser,
  });

  const { data: sharedData = [] } = useQuery({
    queryKey: ['sharedWithMe', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const shares = await base44.entities.VideoShare.filter({ shared_with_email: currentUser.email });
      const results = [];
      for (const share of shares) {
        try {
          const recs = await base44.entities.Recording.filter({ id: share.recording_id });
          if (recs.length > 0) {
            results.push({ recording: recs[0], permission: share.permission });
          }
        } catch {}
      }
      return results;
    },
    enabled: !!currentUser,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Recording.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recordings'] }),
  });

  return (
    <div className="min-h-screen bg-[#0e0e1a] text-white" dir="rtl">
      {/* Header */}
      <div 
        className="sticky z-10 bg-[#1a1a2e]/80 backdrop-blur-xl border-b border-white/5"
        style={{ top: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 h-12 flex items-center justify-between">
          <h1 className="text-base font-bold">הסרטונים שלי</h1>
          <UploadVideoButton onUploaded={() => queryClient.invalidateQueries({ queryKey: ['recordings'] })} />
        </div>
      </div>

      <div className="px-4 py-4 pb-24">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#00d4aa]" />
          </div>
        ) : recordings.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Film className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/50 text-base font-medium">אין סרטונים עדיין</p>
            <p className="text-white/30 text-sm mt-1">הסרטונים שתצלם יופיעו כאן</p>
            <button 
              className="mt-6 h-10 px-6 rounded-full bg-gradient-to-r from-[#00d4aa] to-[#00a89d] text-black font-bold text-sm select-none"
              onClick={() => navigate(createPageUrl('Home'))}
            >
              התחל צילום
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recordings.map((rec) => (
              <VideoCard
                key={rec.id}
                recording={rec}
                onDelete={() => deleteMutation.mutate(rec.id)}
                onUpdate={() => queryClient.invalidateQueries({ queryKey: ['recordings'] })}
                compact
              />
            ))}
          </div>
        )}

        {/* Shared with me */}
        {sharedData.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white">שותפו איתי</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {sharedData.map(({ recording: rec, permission }) => (
                <VideoCard
                  key={'shared-' + rec.id}
                  recording={rec}
                  isShared
                  sharedPermission={permission}
                  onDelete={() => {}}
                  onUpdate={() => {}}
                  compact
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav activePage="MyVideos" />
    </div>
  );
}