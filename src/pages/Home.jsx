import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LogIn, User, Shield } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import ActionCards from '../components/home/ActionCards';
import RecentVideos from '../components/home/RecentVideos';
import TemplatesSection from '../components/home/TemplatesSection';
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

  return (
    <div className="min-h-screen bg-[#1d1022] text-white font-sans" dir="rtl">
      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-[#1d1022]/90 backdrop-blur-md border-b border-purple-500/10"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="px-5 py-3 flex items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              className="block w-full pr-9 pl-3 py-2.5 border-none rounded-full bg-[#2a1b30] text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-right text-white"
              placeholder="חיפוש פרויקטים..."
              type="text"
            />
          </div>

          {/* User */}
          {!authLoading && !currentUser && (
            <button
              className="shrink-0 text-xs text-purple-400 font-medium px-3 py-2 rounded-full bg-purple-500/10 select-none"
              onClick={() => base44.auth.redirectToLogin()}
            >
              <LogIn className="w-3.5 h-3.5 inline ml-1" />
              התחבר
            </button>
          )}
          {!authLoading && currentUser && (
            <div className="flex items-center gap-1.5">
              {currentUser.role === 'admin' && (
                <button
                  className="text-xs text-purple-400 font-medium p-2 rounded-full bg-purple-500/10 select-none"
                  onClick={() => navigate(createPageUrl('AdminPanel'))}
                >
                  <Shield className="w-4 h-4" />
                </button>
              )}
              <button className="relative shrink-0 rounded-full p-0.5 border-2 border-purple-500/20 hover:border-purple-500 transition-colors">
                <div className="h-9 w-9 rounded-full bg-[#2a1b30] flex items-center justify-center">
                  <User className="w-4 h-4 text-white/60" />
                </div>
                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-[#1d1022] bg-green-400"></span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="px-5 pt-6 pb-28 space-y-8 text-right">
        {/* Hero Text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold">
            <span className="bg-clip-text text-transparent bg-gradient-to-l from-white to-slate-400">צור משהו</span>
            <br />
            <span className="text-purple-500">מדהים היום.</span>
          </h1>
        </motion.div>

        {/* Action Cards */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <ActionCards />
        </motion.div>

        {/* Recent Videos */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <RecentVideos />
        </motion.div>

        {/* Templates */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <TemplatesSection />
        </motion.div>
      </main>

      <BottomNav activePage="Home" />
    </div>
  );
}