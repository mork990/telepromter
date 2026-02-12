import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Eye, Loader2, CheckCircle, AlertCircle, Download } from 'lucide-react';

export default function EyeContactButton({ recordingId, onComplete }) {
  const [status, setStatus] = useState('idle'); // idle | processing | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const pollRef = useRef(null);

  // Check initial status from recording
  useEffect(() => {
    if (!recordingId) return;
    (async () => {
      const list = await base44.entities.Recording.filter({ id: recordingId });
      const rec = list[0];
      if (!rec) return;
      if (rec.eye_contact_status === 'processing') {
        setStatus('processing');
        startPolling();
      } else if (rec.eye_contact_status === 'done' && rec.eye_contact_url) {
        setStatus('done');
        setResultUrl(rec.eye_contact_url);
      } else if (rec.eye_contact_status === 'error') {
        setStatus('error');
        setErrorMsg(rec.eye_contact_error || 'שגיאה לא ידועה');
      }
    })();
    return () => stopPolling();
  }, [recordingId]);

  const pollCountRef = useRef(0);
  const MAX_POLLS = 60; // 5 minutes max (60 * 5s)

  const startPolling = () => {
    stopPolling();
    pollCountRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollCountRef.current++;
      if (pollCountRef.current > MAX_POLLS) {
        setStatus('error');
        setErrorMsg('העיבוד לקח יותר מדי זמן, נסה שוב');
        stopPolling();
        return;
      }
      const list = await base44.entities.Recording.filter({ id: recordingId });
      const rec = list[0];
      if (!rec) return;

      if (rec.eye_contact_status === 'done') {
        setStatus('done');
        setResultUrl(rec.eye_contact_url || '');
        stopPolling();
        if (onComplete) onComplete({ file_url: rec.eye_contact_url });
      } else if (rec.eye_contact_status === 'error') {
        setStatus('error');
        setErrorMsg(rec.eye_contact_error || 'שגיאה לא ידועה');
        stopPolling();
      }
    }, 5000);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleStart = async () => {
    setStatus('processing');
    setErrorMsg('');

    const response = await base44.functions.invoke('fixEyeContact', {
      recording_id: recordingId,
    });

    if (response.data?.error) {
      setStatus('error');
      setErrorMsg(response.data.error);
      return;
    }

    // Started successfully, begin polling
    startPolling();
  };

  const handleDownload = () => {
    if (resultUrl) {
      const a = document.createElement('a');
      a.href = resultUrl;
      a.download = 'eye_contact_fixed.mp4';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  if (status === 'processing') {
    return (
      <div className="bg-[#1a1a2e] rounded-2xl border border-purple-500/20 p-4" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">מעבד תיקון מבט...</h3>
            <p className="text-xs text-white/40 mt-0.5">התהליך רץ ברקע, אפשר להמשיך לערוך</p>
          </div>
        </div>
        <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-purple-500/60 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="bg-[#1a1a2e] rounded-2xl border border-[#00d4aa]/20 p-4 space-y-3" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#00d4aa]/20 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-[#00d4aa]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#00d4aa]">תיקון מבט הושלם!</h3>
            <p className="text-xs text-white/40 mt-0.5">הסרטון המתוקן מוכן להורדה</p>
          </div>
        </div>
        <button
          className="w-full h-10 rounded-xl bg-[#00d4aa]/10 text-[#00d4aa] text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#00d4aa]/20 transition-colors"
          onClick={handleDownload}
        >
          <Download className="w-4 h-4" />
          הורד סרטון מתוקן
        </button>
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
          onClick={handleStart}
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
        onClick={handleStart}
      >
        <Eye className="w-4 h-4" />
        תקן מבט
      </button>
    </div>
  );
}