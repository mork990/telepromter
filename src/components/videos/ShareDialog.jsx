import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Trash2, Eye, Download, Pencil, Loader2 } from "lucide-react";

const permissionLabels = {
  view: { label: 'צפייה', icon: Eye, desc: 'רק צפייה' },
  download: { label: 'הורדה', icon: Download, desc: 'צפייה + הורדה' },
  edit: { label: 'עריכה', icon: Pencil, desc: 'גישה מלאה' },
};

export default function ShareDialog({ open, onOpenChange, recording }) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const { data: shares = [], isLoading } = useQuery({
    queryKey: ['videoShares', recording?.id],
    queryFn: () => base44.entities.VideoShare.filter({ recording_id: recording.id }),
    enabled: !!recording?.id && open,
  });

  const addShare = useMutation({
    mutationFn: async () => {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !trimmed.includes('@')) {
        throw new Error('כתובת מייל לא תקינה');
      }
      const user = await base44.auth.me();
      if (trimmed === user.email) {
        throw new Error('לא ניתן לשתף עם עצמך');
      }
      const existing = shares.find(s => s.shared_with_email === trimmed);
      if (existing) {
        throw new Error('כבר שותף עם משתמש זה');
      }
      return base44.entities.VideoShare.create({
        recording_id: recording.id,
        owner_email: user.email,
        shared_with_email: trimmed,
        permission,
      });
    },
    onSuccess: () => {
      setEmail('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['videoShares', recording?.id] });
    },
    onError: (err) => setError(err.message),
  });

  const updatePermission = useMutation({
    mutationFn: ({ id, perm }) => base44.entities.VideoShare.update(id, { permission: perm }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['videoShares', recording?.id] }),
  });

  const removeShare = useMutation({
    mutationFn: (id) => base44.entities.VideoShare.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['videoShares', recording?.id] }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-white text-base">שיתוף סרטון</DialogTitle>
        </DialogHeader>

        <p className="text-white/40 text-xs truncate">{recording?.title || 'סרטון'}</p>

        {/* Add new share */}
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="מייל המשתמש..."
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm flex-1"
            dir="ltr"
          />
          <Select value={permission} onValueChange={setPermission}>
            <SelectTrigger className="w-24 bg-white/5 border-white/10 text-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#2a2a3e] border-white/10">
              {Object.entries(permissionLabels).map(([key, val]) => (
                <SelectItem key={key} value={key} className="text-white text-xs">
                  {val.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            className="h-9 w-9 rounded-lg bg-[#00d4aa] text-black flex items-center justify-center shrink-0 hover:bg-[#00d4aa]/80 transition-colors disabled:opacity-40"
            onClick={() => addShare.mutate()}
            disabled={addShare.isPending || !email.trim()}
          >
            {addShare.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          </button>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}

        {/* Current shares */}
        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
          ) : shares.length === 0 ? (
            <p className="text-white/30 text-xs text-center py-4">הסרטון לא משותף עם אף אחד</p>
          ) : (
            shares.map((share) => {
              const Icon = permissionLabels[share.permission]?.icon || Eye;
              return (
                <div key={share.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs truncate" dir="ltr">{share.shared_with_email}</p>
                    <p className="text-white/30 text-[10px]">{permissionLabels[share.permission]?.desc}</p>
                  </div>
                  <Select
                    value={share.permission}
                    onValueChange={(perm) => updatePermission.mutate({ id: share.id, perm })}
                  >
                    <SelectTrigger className="w-20 h-7 bg-white/5 border-white/10 text-white text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a3e] border-white/10">
                      {Object.entries(permissionLabels).map(([key, val]) => (
                        <SelectItem key={key} value={key} className="text-white text-xs">{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    className="h-7 w-7 rounded bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                    onClick={() => removeShare.mutate(share.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}