import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { User, LogOut, Settings } from 'lucide-react';

export default function ProfileMenu({ user }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative shrink-0 rounded-full p-0.5 border-2 border-purple-500/20 hover:border-purple-500 transition-colors"
      >
        <div className="h-9 w-9 rounded-full bg-[#2a1b30] flex items-center justify-center">
          <User className="w-4 h-4 text-white/60" />
        </div>
        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-[#1d1022] bg-green-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-48 bg-[#2a1b30] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[999] animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User info */}
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-sm font-semibold text-white truncate">{user?.full_name || 'משתמש'}</p>
            <p className="text-[11px] text-white/40 truncate">{user?.email}</p>
          </div>

          {/* Menu items */}
          <button
            onClick={() => { setOpen(false); navigate(createPageUrl('Settings')); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5 transition-colors select-none"
          >
            <Settings className="w-4 h-4 text-purple-400" />
            <span>הגדרות</span>
          </button>

          <button
            onClick={() => { setOpen(false); base44.auth.logout(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400/80 hover:bg-red-500/5 transition-colors select-none border-t border-white/5"
          >
            <LogOut className="w-4 h-4" />
            <span>התנתק</span>
          </button>
        </div>
      )}
    </div>
  );
}