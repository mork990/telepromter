import React from 'react';
import { Film, UserPlus, Crown } from 'lucide-react';
import moment from 'moment';

export default function RecentActivity({ users, subscriptions, recordings }) {
  // Combine all activities and sort by date
  const activities = [
    ...users.map(u => ({
      type: 'user',
      label: `${u.full_name || u.email} הצטרף/ה`,
      date: u.created_date,
      icon: UserPlus,
      color: 'text-blue-400',
    })),
    ...subscriptions.filter(s => s.status === 'active').map(s => ({
      type: 'subscription',
      label: `${s.user_email} שודרג לפרימיום`,
      date: s.created_date,
      icon: Crown,
      color: 'text-amber-400',
    })),
    ...recordings.map(r => ({
      type: 'recording',
      label: `הקלטה חדשה: ${r.title || 'ללא כותרת'}`,
      date: r.created_date,
      icon: Film,
      color: 'text-purple-400',
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 15);

  return (
    <div className="space-y-2 max-h-[350px] overflow-y-auto">
      {activities.length === 0 && (
        <p className="text-center text-white/30 text-sm py-8">אין פעילות אחרונה</p>
      )}
      {activities.map((activity, i) => (
        <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2.5">
          <activity.icon className={`w-4 h-4 ${activity.color} shrink-0`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/70 truncate">{activity.label}</p>
          </div>
          <span className="text-[10px] text-white/30 shrink-0">
            {moment(activity.date).fromNow()}
          </span>
        </div>
      ))}
    </div>
  );
}