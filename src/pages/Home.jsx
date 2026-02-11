import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Type, Subtitles, Film, Sparkles, LogIn, User, Shield, Scissors, Wand2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import MainActionCard from '../components/home/MainActionCard';
import FeatureCard from '../components/home/FeatureCard';
import RecentVideos from '../components/home/RecentVideos';
import BottomNav from '../components/navigation/BottomNav';

export default function Home() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (isAuth) => {
      if (isAuth) {
        const user = await base44.auth.me();
        setCurrentUser(user);
      }
      setAuthLoading(false);
    });
  }, []);

  const tools = [
    { icon: Sparkles, title: 'עורך AI', page: 'AIEditor', badge: 'חדש' },
    { icon: Subtitles, title: 'כתוביות', page: 'MyVideos' },
    { icon: Scissors, title: 'עריכת וידאו', page: 'MyVideos' },
    { icon: Film, title: 'הסרטונים שלי', page: 'MyVideos' },
    { icon: Wand2, title: 'אפקטים', page: 'MyVideos' },
    { icon: Type, title: 'טלפרומפטר', page: 'Recording' },
  ];

  return (
    <div className="min-h-screen bg-[#0e0e1a] text-white" dir="rtl">
      {/* Header */}
      <div
        className="sticky z-10 bg-[#0e0e1a]/80 backdrop-blur-xl border-b border-white/5"
        style={{ top: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00d4aa] to-[#00a89d] flex items-center justify-center">
              <Type className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight">VideoAI</span>
          </div>
          <div className="flex items-center gap-1">
            {!authLoading && !currentUser && (
              <button
                className="text-xs text-[#00d4aa] font-medium px-3 py-1.5 rounded-full bg-[#00d4aa]/10 select-none"
                onClick={() => base44.auth.redirectToLogin()}
              >
                <LogIn className="w-3.5 h-3.5 inline ml-1" />
                התחבר
              </button>
            )}
            {!authLoading && currentUser && (
              <div className="flex items-center gap-1">
                {currentUser.role === 'admin' && (
                  <button
                    className="text-xs text-[#00d4aa] font-medium px-2.5 py-1.5 rounded-full bg-[#00d4aa]/10 select-none"
                    onClick={() => navigate(createPageUrl('AdminPanel'))}
                  >
                    <Shield className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  className="text-xs text-white/50 font-medium px-3 py-1.5 rounded-full bg-white/5 select-none"
                  onClick={() => base44.auth.logout()}
                >
                  <User className="w-3.5 h-3.5 inline ml-1" />
                  {currentUser.full_name?.split(' ')[0] || 'חשבון'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 pb-28 space-y-6">
        {/* Main Action Cards - 2 big tiles */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex gap-3"
        >
          <MainActionCard
            icon={Film}
            title="סרטון חדש"
            page="Recording"
            gradient="bg-gradient-to-br from-[#00d4aa] to-[#00876e]"
          />
          <MainActionCard
            icon={Type}
            title="טלפרומפטר"
            page="Recording"
            gradient="bg-gradient-to-br from-indigo-500 to-violet-700"
          />
        </motion.div>

        {/* Recent Videos Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <RecentVideos />
        </motion.div>

        {/* Tools Grid - 3x2 */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h3 className="text-sm font-bold text-white/80 mb-3 px-1">כלים</h3>
          <div className="grid grid-cols-3 gap-2.5">
            {tools.map((tool) => (
              <FeatureCard key={tool.title} {...tool} />
            ))}
          </div>
        </motion.div>
      </div>

      <BottomNav activePage="Home" />
    </div>
  );
}