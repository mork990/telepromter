import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Play, Download, Share2, Trash2, Film, Loader2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import VideoCard from '../components/videos/VideoCard';

export default function MyVideos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: recordings = [], isLoading } = useQuery({
    queryKey: ['recordings'],
    queryFn: () => base44.entities.Recording.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Recording.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recordings'] }),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 sticky z-10" style={{ top: 'env(safe-area-inset-top)' }}>
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Home'))}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">הסרטונים שלי</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : recordings.length === 0 ? (
          <div className="text-center py-20">
            <Film className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">אין סרטונים עדיין</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">הסרטונים שתצלם יופיעו כאן</p>
            <Button className="mt-6 bg-gradient-to-r from-indigo-600 to-purple-600" onClick={() => navigate(createPageUrl('Home'))}>
              התחל צילום
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {recordings.map((rec) => (
              <VideoCard
                key={rec.id}
                recording={rec}
                onDelete={() => deleteMutation.mutate(rec.id)}
                onUpdate={() => queryClient.invalidateQueries({ queryKey: ['recordings'] })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}