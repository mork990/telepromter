import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, ChevronRight, RotateCcw } from 'lucide-react';
import VideoSelector from '../components/ai-editor/VideoSelector';
import ChatMessage from '../components/ai-editor/ChatMessage';
import ChatInput from '../components/ai-editor/ChatInput';
import BottomNav from '../components/navigation/BottomNav';

export default function AIEditor() {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [showSelector, setShowSelector] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleVideoSelected = (video) => {
    setSelectedVideo(video);
    setShowSelector(false);
    setMessages([{
      role: 'assistant',
      content: `הסרטון "${video.title}" נטען בהצלחה! 🎬\n\nספר לי מה תרצה לעשות איתו. למשל:\n• "ערוך את הסרטון בצורה מקצועית"\n• "הוסף כתוביות אוטומטיות"\n• "קצר את הסרטון רק לחלקים המעניינים"\n• "תן לי סיכום של מה שקורה בסרטון"`
    }]);
  };

  const handleSendMessage = async (text) => {
    if (!selectedVideo) return;

    const userMsg = { role: 'user', content: text };
    const loadingMsg = { role: 'assistant', loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setProcessing(true);

    const conversationHistory = messages
      .filter(m => !m.loading)
      .map(m => `${m.role === 'user' ? 'משתמש' : 'עוזר'}: ${m.content}`)
      .join('\n');

    const prompt = `אתה עורך וידאו מקצועי AI. המשתמש העלה סרטון ורוצה לערוך אותו.
כתובת הסרטון: ${selectedVideo.file_url}
שם הסרטון: ${selectedVideo.title}

היסטוריית השיחה:
${conversationHistory}

הודעת המשתמש הנוכחית: ${text}

תפקידך:
1. אם המשתמש מבקש עריכה כללית (כמו "ערוך מקצועית") - תן המלצות ספציפיות מה כדאי לעשות ושאל אם להמשיך.
2. אם המשתמש מבקש פעולה ספציפית - תאר מה בדיוק תעשה ותן הוראות ברורות.
3. אם המשתמש מאשר - בצע את הפעולה ותאר מה עשית.

הפעולות שאתה יכול לבצע (דרך Cloudinary API):
- trim: קיצור סרטון - פרמטרים: start_offset, end_offset (בשניות)
- cut: חיתוך קטע מתוך הסרטון - פרמטרים: cut_start, cut_end (בשניות)
- add_subtitles: הוספת כתוביות - פרמטרים: subtitles (מערך של {start, end, text}), font_size, font_color
- speed: שינוי מהירות - פרמטרים: rate (0.5=חצי מהירות, 2=כפול)
- resize: שינוי גודל/רזולוציה - פרמטרים: width, height, crop (scale/fill/fit/crop)
- crop_area: חיתוך אזור מסוים מהפריים - פרמטרים: width, height, x, y, gravity
- rotate: סיבוב - פרמטרים: angle (90, 180, 270 או כל זווית)
- flip: היפוך - פרמטרים: direction (horizontal/vertical)
- filter: אפקטים - פרמטרים: effect (grayscale, sepia, brightness, contrast, saturation, blur, pixelate), value (עוצמה)
- add_text: הוספת טקסט מעוצב - פרמטרים: text, font_size, font_color, gravity, x, y, font_family
- add_image_overlay: הוספת תמונה/לוגו - פרמטרים: image_url, gravity, width, height, x, y, opacity
- remove_audio: הסרת אודיו (ללא פרמטרים)
- volume: שליטה בעוצמת קול - פרמטרים: level (0-200, 100=רגיל)
- replace_audio: החלפת רצועת אודיו - פרמטרים: audio_url
- to_gif: המרה ל-GIF - פרמטרים: start_offset, end_offset, fps
- concatenate: חיבור סרטונים - פרמטרים: video_urls (מערך כתובות)
- transition: מעבר בין סרטונים - פרמטרים: video_url, effect (fade, wipe...), duration
- extract_frame: חילוץ פריים כתמונה - פרמטרים: time (שניות)

ענה בעברית. היה ידידותי ומקצועי. תן תשובות קצרות וממוקדות.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
    });

    setMessages(prev => {
      const updated = prev.filter(m => !m.loading);
      return [...updated, { role: 'assistant', content: response }];
    });
    setProcessing(false);
  };

  const handleReset = () => {
    setSelectedVideo(null);
    setMessages([]);
    setShowSelector(true);
  };

  return (
    <div className="min-h-screen bg-[#0e0e1a] text-white flex flex-col" dir="rtl">
      {/* Header */}
      <div
        className="sticky z-10 bg-[#1a1a2e]/80 backdrop-blur-xl border-b border-white/5"
        style={{ top: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight">עורך AI</span>
          </div>
          {selectedVideo && (
            <button
              onClick={handleReset}
              className="text-xs text-white/50 font-medium px-3 py-1.5 rounded-full bg-white/5 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              התחל מחדש
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-44">
        {showSelector ? (
          <div className="space-y-4">
            <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold">עריכת סרטון עם AI</h2>
              </div>
              <p className="text-sm text-white/50 mb-4">
                בחר סרטון מהספרייה שלך או העלה סרטון חדש, ותאר ב-AI מה תרצה לעשות איתו.
              </p>
              <VideoSelector
                onVideoSelected={handleVideoSelected}
                selectedVideoUrl={selectedVideo?.file_url}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected video preview */}
            <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-3">
              <div className="flex items-center gap-3">
                <div className="w-20 h-12 rounded-lg bg-black/50 overflow-hidden flex-shrink-0">
                  <video
                    src={selectedVideo.file_url}
                    className="w-full h-full object-cover"
                    muted
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{selectedVideo.title}</p>
                  <p className="text-xs text-[#00d4aa]">סרטון נטען</p>
                </div>
                <button
                  onClick={() => setShowSelector(true)}
                  className="text-xs text-white/40 px-2 py-1 rounded-lg bg-white/5"
                >
                  החלף
                </button>
              </div>
            </div>

            {/* Chat messages */}
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <ChatMessage key={i} message={msg} />
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Chat input - only show when video is selected */}
      {selectedVideo && !showSelector && (
        <div
          className="fixed left-0 right-0 z-40 px-4 pb-2 bg-[#0e0e1a]/95 backdrop-blur-xl border-t border-white/5"
          style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}
        >
          <div className="pt-3">
            <ChatInput onSend={handleSendMessage} disabled={processing} />
          </div>
        </div>
      )}

      <BottomNav activePage="AIEditor" />
    </div>
  );
}