import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Type, Subtitles, Film, LogIn, User, Shield, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
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
      description: 'צלם סרטונים עם טקסט נגלל על המסך – מושלם להקלטות מקצועיות',
      page: 'Recording',
      iconBg: 'bg-gradient-to-br from-[#00d4aa] to-[#00a89d]',
    },
    {
      icon: Subtitles,
      title: 'כתוביות אוטומטיות',
      description: 'הוסף כתוביות לסרטונים שלך באופן אוטומטי עם AI',
      page: 'MyVideos',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    },
    {
      icon: Film,
      title: 'עריכת סרטונים',
      description: 'חתוך, ערוך והוסף אפקטים לסרטונים שלך בממשק פשוט ונוח',
      page: 'MyVideos',
      iconBg: 'bg-gradient-to-br from-indigo-500 to-purple-600',
    },
    {
      icon: Sparkles,
      title: 'עורך AI',
      description: 'תן ל-AI לערוך את הסרטונים שלך – פשוט תגיד מה אתה רוצה',
      page: 'AIEditor',
      iconBg: 'bg-gradient-to-br from-pink-500 to-rose-600',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0e0e1a] text-white" dir="rtl">
      {/* Header */}
      <div
        className="sticky z-10 bg-[#1a1a2e]/80 backdrop-blur-xl border-b border-white/5"
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

      {/* Hero Section */}
      <div className="px-5 pt-8 pb-4">
        <h1 className="text-2xl font-extrabold leading-tight mb-2">
          הכלי המקצועי שלך
          <br />
          <span className="bg-gradient-to-l from-[#00d4aa] to-[#00a89d] bg-clip-text text-transparent">
            לעריכת סרטונים
          </span>
        </h1>
        <p className="text-sm text-white/40 leading-relaxed">
          טלפרומפטר, כתוביות אוטומטיות ועריכה מתקדמת — הכל במקום אחד
        </p>
      </div>

      {/* Feature Cards */}
      <div className="px-4 pb-28 space-y-3">
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>

      <BottomNav activePage="Home" />
    </div>
  );
}