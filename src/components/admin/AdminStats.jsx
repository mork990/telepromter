import React from 'react';
import { Users, Crown, Film, TrendingUp } from 'lucide-react';

export default function AdminStats({ users, subscriptions, recordings }) {
  const totalUsers = users.length;
  const premiumUsers = subscriptions.filter(s => s.plan === 'premium' && s.status === 'active').length;
  const totalRecordings = recordings.length;
  
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const newUsersThisWeek = users.filter(u => new Date(u.created_date) > weekAgo).length;

  const stats = [
    { label: 'סה"כ משתמשים', value: totalUsers, icon: Users, color: 'from-blue-500 to-blue-600' },
    { label: 'משתמשי פרימיום', value: premiumUsers, icon: Crown, color: 'from-amber-400 to-yellow-500' },
    { label: 'סה"כ הקלטות', value: totalRecordings, icon: Film, color: 'from-purple-500 to-purple-600' },
    { label: 'משתמשים חדשים (שבוע)', value: newUsersThisWeek, icon: TrendingUp, color: 'from-[#00d4aa] to-[#00a89d]' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, i) => (
        <div key={i} className="bg-[#1a1a2e] rounded-xl border border-white/5 p-4">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
            <stat.icon className="w-4 h-4 text-white" />
          </div>
          <p className="text-2xl font-bold text-white">{stat.value}</p>
          <p className="text-xs text-white/40 mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}