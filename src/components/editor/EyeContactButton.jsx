import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Eye, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function EyeContactButton({ recordingId, onComplete }) {
  const [status, setStatus] = useState('idle'); // idle | processing | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleFixEyeContact = async () => {
    setStatus('processing');
    setErrorMsg('');

    const response = await base44.functions.invoke('fixEyeContact', {
      recording_id: recordingId,
    });

    if (response.data?.success) {
      setStatus('success');
      if (onComplete) onComplete(response.data);
    } else {
      setStatus('error');
      setErrorMsg(response.data?.error || 'שגיאה לא ידועה');
    }
  };

  if (status === 'processing') {
    return (
      <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-4" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">מתקן מבט...</h3>
            <p className="text-xs text-white/40 mt-0.5">התהליך עשוי לקחת כמה דקות</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="bg-[#1a1a2e] rounded-2xl border border-[#00d4aa]/20 p-4" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#00d4aa]/20 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-[#00d4aa]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#00d4aa]">תיקון מבט הושלם!</h3>
            <p className="text-xs text-white/40 mt-0.5">הסרטון המתוקן נשמר</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-[#1a1a2e] rounded-2xl border border-red-500/20 p-4 space-y-3" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-400">שגיאה בתיקון המבט</h3>
            <p className="text-xs text-white/40 mt-0.5">{errorMsg}</p>
          </div>
        </div>
        <button
          className="w-full h-10 rounded-xl bg-white/5 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
          onClick={handleFixEyeContact}
        >
          <Eye className="w-4 h-4" />
          נסה שוב
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-4 space-y-3" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Eye className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">תיקון מבט (Eye Contact)</h3>
          <p className="text-xs text-white/40 mt-0.5">תיקון אוטומטי של כיוון המבט למצלמה</p>
        </div>
      </div>
      <button
        className="w-full h-10 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white text-sm font-bold flex items-center justify-center gap-2 select-none active:scale-[0.98] transition-transform"
        onClick={handleFixEyeContact}
      >
        <Eye className="w-4 h-4" />
        תקן מבט
      </button>
    </div>
  );
}