import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Crown, ArrowRight, LogIn } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useSubscription } from '../components/subscription/useSubscription';

const freeFeaturesArr = [
  'הקלטת וידאו עם טלפרומפטר',
  'איכות עד 1080p',
  'שמירה ושיתוף סרטונים',
  'התאמת גופן וצבעים בסיסית',
  'העלאת קבצי טקסט',
];

const premiumFeaturesArr = [
  'הכל בחינמי, ובנוסף:',
  'איכות 2K ו-4K',
  'אורך הקלטה ללא הגבלה',
  'ללא סימן מים',
  'עריכת וידאו (חיתוך וקיטום)',
  'כתוביות אוטומטיות',
  'לוגו מותאם אישית',
  'החלפת רקע',
  'שילוב קטעי וידאו',
  'סנכרון ענן',
  'גופנים ופלטות מתקדמות',
  'שליטה קולית',
  'ייבוא מ-Google Drive',
];

export default function Pricing() {
  const navigate = useNavigate();
  const { isPremium, loading } = useSubscription();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsLoggedIn);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} dir="rtl">
      {/* Header */}
      <div className="sticky z-10 backdrop-blur-xl" style={{ top: 'env(safe-area-inset-top)', backgroundColor: 'var(--nav-bg)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="px-4 h-12 flex items-center gap-3">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg select-none" style={{ color: 'var(--text-primary)' }} onClick={() => navigate(createPageUrl('Home'))}>
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-base font-bold">תוכניות מנוי</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Free Plan */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold">חינמי</h2>
              <p className="text-3xl font-extrabold mt-2">₪0</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>לתמיד</p>
            </div>
            <ul className="space-y-3">
              {freeFeaturesArr.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {!isPremium && !loading && (
              <button className="w-full mt-6 h-10 rounded-full text-sm font-medium" style={{ backgroundColor: 'var(--chip-bg)', color: 'var(--text-muted)' }} disabled>
                התוכנית הנוכחית שלך
              </button>
            )}
        </div>

        {/* Premium Plan */}
        <div className="rounded-2xl border-2 border-amber-400/50 relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-center text-xs font-bold py-1">
            הכי פופולרי ⭐
          </div>
          <div className="p-6">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2">
                <Crown className="w-6 h-6 text-amber-400" />
                <h2 className="text-xl font-bold">פרימיום</h2>
              </div>
              <p className="text-3xl font-extrabold mt-2">₪29.90</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>לחודש</p>
            </div>
            <ul className="space-y-3">
              {premiumFeaturesArr.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: i === 0 ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: i === 0 ? 600 : 400 }}>
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {isPremium ? (
              <button className="w-full mt-6 h-12 rounded-full bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-1.5" disabled>
                <Check className="w-4 h-4" />
                מנוי פעיל
              </button>
            ) : !isLoggedIn ? (
              <button 
                className="w-full mt-6 h-12 rounded-full text-black font-bold text-sm flex items-center justify-center gap-1.5 select-none active:scale-[0.98] transition-transform"
                style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-secondary))' }}
                onClick={() => base44.auth.redirectToLogin(window.location.href)}
              >
                <LogIn className="w-5 h-5" />
                התחבר כדי לרכוש מנוי
              </button>
            ) : (
              <button 
                className="w-full mt-6 h-12 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold text-sm flex items-center justify-center gap-1.5 select-none active:scale-[0.98] transition-transform"
                onClick={() => alert('מערכת התשלומים תחובר בקרוב!')}
              >
                <Crown className="w-5 h-5" />
                שדרג לפרימיום
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}