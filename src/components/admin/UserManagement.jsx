import React, { useState } from 'react';
import { Crown, Search, UserCheck, UserX, Mail } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function UserManagement({ users, subscriptions }) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(null);
  const queryClient = useQueryClient();

  const getSubscription = (email) => {
    return subscriptions.find(s => s.user_email === email && s.plan === 'premium' && s.status === 'active');
  };

  const togglePremium = async (user) => {
    setLoading(user.email);
    const existing = getSubscription(user.email);
    
    if (existing) {
      await base44.entities.Subscription.update(existing.id, { status: 'cancelled' });
    } else {
      await base44.entities.Subscription.create({
        user_email: user.email,
        plan: 'premium',
        status: 'active',
        start_date: new Date().toISOString(),
      });
    }
    
    queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    setLoading(null);
  };

  const filtered = users.filter(u => 
    !search || 
    (u.full_name || '').includes(search) || 
    (u.email || '').includes(search)
  );

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          placeholder="חפש לפי שם או אימייל..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pr-10 pl-4 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#00d4aa]/50"
          dir="rtl"
        />
      </div>

      {/* User List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-center text-white/30 text-sm py-8">לא נמצאו משתמשים</p>
        )}
        {filtered.map(user => {
          const isPremium = !!getSubscription(user.email);
          const isLoading = loading === user.email;
          
          return (
            <div key={user.id} className="bg-[#1a1a2e] rounded-xl border border-white/5 p-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">
                    {user.full_name || 'ללא שם'}
                  </p>
                  {isPremium && (
                    <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-white/40 truncate flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3" />
                  {user.email}
                </p>
              </div>
              
              <button
                onClick={() => togglePremium(user)}
                disabled={isLoading}
                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full select-none transition-all active:scale-95 ${
                  isPremium 
                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                    : 'bg-amber-400/10 text-amber-400 hover:bg-amber-400/20'
                } ${isLoading ? 'opacity-50' : ''}`}
              >
                {isLoading ? '...' : isPremium ? (
                  <span className="flex items-center gap-1"><UserX className="w-3 h-3" />הסר</span>
                ) : (
                  <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" />פרימיום</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}