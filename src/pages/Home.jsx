import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Type, Subtitles, Film, LogIn, User, Shield, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import FeatureCard from '../components/home/FeatureCard';
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

  const features = [
    {
      icon: Type,
      title: 'טלפרומפטר',
      description: 'צלם סרטונים עם טקסט נגלל על המסך',
      page: 'Recording',
      gradient: 'bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700',
    },
    {
      icon: Subtitles,
      title: 'כתוביות',
      description: 'כתוביות אוטומטיות עם AI לכל סרטון',
      page: 'MyVideos',
      gradient: 'bg-gradient-to-br from-amber-500 via-orange-600 to-red-600',
    },
    {
      icon: Film,
      title: 'עריכת וידאו',
      description: 'חתוך, ערוך והוסף אפקטים בקלות',
      page: 'MyVideos',
      gradient: 'bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-700',
    },
    {
      icon: Sparkles,
      title: 'עורך AI',
      description: 'ערוך סרטונים עם הוראות טקסט פשוטות',
      page: 'AIEditor',
      gradient: 'bg-gradient-to-br from-pink-500 via-rose-600 to-fuchsia-700',
    },
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

      {/* Hero */}
      <div className="px-5 pt-8 pb-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-extrabold leading-tight mb-3"
        >
          <span className="bg-gradient-to-l from-[#00d4aa] to-[#00e4bb] bg-clip-text text-transparent">
            סטודיו וידאו
          </span>
          <br />
          <span className="text-white/90 text-xl font-bold">בכף היד שלך</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-sm text-white/35"
        >
          בחר כלי להתחלה
        </motion.p>
      </div>

      {/* Feature Grid - 2x2 */}
      <div className="px-4 pb-28">
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} {...feature} delay={0.1 + i * 0.1} />
          ))}
        </div>
      </div>

      <BottomNav activePage="Home" />
    </div>
  );
}