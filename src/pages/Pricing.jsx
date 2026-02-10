import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Crown, ArrowRight } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Home'))}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            תוכניות מנוי
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Free Plan */}
        <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">חינמי</h2>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-2">₪0</p>
              <p className="text-sm text-gray-500">לתמיד</p>
            </div>
            <ul className="space-y-3">
              {freeFeaturesArr.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {!isPremium && !loading && (
              <Button variant="outline" className="w-full mt-6" disabled>
                התוכנית הנוכחית שלך
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className="shadow-xl border-2 border-amber-400 dark:bg-gray-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-center text-xs font-bold py-1">
            הכי פופולרי ⭐
          </div>
          <CardContent className="p-6 pt-10">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2">
                <Crown className="w-6 h-6 text-amber-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">פרימיום</h2>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-2">₪29.90</p>
              <p className="text-sm text-gray-500">לחודש</p>
            </div>
            <ul className="space-y-3">
              {premiumFeaturesArr.map((f, i) => (
                <li key={i} className={`flex items-center gap-2 text-sm ${i === 0 ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  <Check className="w-4 h-4 text-amber-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {isPremium ? (
              <Button className="w-full mt-6 bg-green-600" disabled>
                <Check className="w-4 h-4 ml-1" />
                מנוי פעיל
              </Button>
            ) : (
              <Button 
                className="w-full mt-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white text-lg h-12"
                onClick={() => alert('מערכת התשלומים תחובר בקרוב!')}
              >
                <Crown className="w-5 h-5 ml-2" />
                שדרג לפרימיום
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}