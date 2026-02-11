import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Shield, BarChart3, Users, Activity } from 'lucide-react';
import AdminStats from '../components/admin/AdminStats';
import UserManagement from '../components/admin/UserManagement';
import RecentActivity from '../components/admin/RecentActivity';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('stats');
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        navigate(createPageUrl('Home'));
        return;
      }
      const user = await base44.auth.me();
      if (user.role !== 'admin') {
        navigate(createPageUrl('Home'));
        return;
      }
      setAuthorized(true);
      setChecking(false);
    };
    checkAdmin();
  }, [navigate]);

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    enabled: authorized,
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: () => base44.entities.Subscription.list('-created_date'),
    enabled: authorized,
  });

  const { data: recordings = [] } = useQuery({
    queryKey: ['admin-recordings'],
    queryFn: () => base44.entities.Recording.list('-created_date'),
    enabled: authorized,
  });

  if (checking || !authorized) {
    return (
      <div className="min-h-screen bg-[#0e0e1a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'stats', label: 'סטטיסטיקות', icon: BarChart3 },
    { id: 'users', label: 'משתמשים', icon: Users },
    { id: 'activity', label: 'פעילות', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#0e0e1a] text-white" dir="rtl">
      {/* Header */}
      <div className="sticky z-10 bg-[#1a1a2e]/80 backdrop-blur-xl border-b border-white/5" style={{ top: 'env(safe-area-inset-top)' }}>
        <div className="px-4 h-12 flex items-center gap-3">
          <button 
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 select-none" 
            onClick={() => navigate(createPageUrl('Home'))}
          >
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#00d4aa]" />
            <h1 className="text-base font-bold">פאנל ניהול</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4">
        <div className="flex gap-2 bg-[#1a1a2e] rounded-xl p-1 border border-white/5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all select-none ${
                activeTab === tab.id
                  ? 'bg-[#00d4aa] text-black'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {activeTab === 'stats' && (
          <AdminStats users={users} subscriptions={subscriptions} recordings={recordings} />
        )}
        {activeTab === 'users' && (
          <UserManagement users={users} subscriptions={subscriptions} />
        )}
        {activeTab === 'activity' && (
          <RecentActivity users={users} subscriptions={subscriptions} recordings={recordings} />
        )}
      </div>
    </div>
  );
}