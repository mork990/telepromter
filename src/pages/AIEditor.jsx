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
      content: `הסרטון "${video.title}" נטען בהצלחה! 🎬\n\nספר לי מה תרצה לעשות איתו. הנה כמה דוגמאות:\n\n✂️ **חיתוך ועריכה:**\n• "קצר את הסרטון לשניות 5-30"\n• "הסר את הקטע בין שניה 10 ל-20"\n\n🎨 **אפקטים ופילטרים:**\n• "הפוך לשחור-לבן"\n• "הוסף טשטוש"\n• "העלה את הבהירות"\n\n⚡ **מהירות:**\n• "האט את הסרטון פי 2"\n• "הגבר מהירות כפולה"\n\n📝 **טקסט וכתוביות:**\n• "הוסף כתוביות"\n• "הוסף טקסט עם הלוגו שלי"\n\n🔊 **אודיו:**\n• "הסר את הקול"\n• "הנמך את העוצמה"\n\n🔄 **עוד:**\n• "סובב 90 מעלות"\n• "שנה רזולוציה"\n• "המר ל-GIF"\n• "חבר עם סרטון אחר"`
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

    const videoDuration = selectedVideo.duration_seconds ? `${selectedVideo.duration_seconds} שניות` : 'לא ידוע';

    const prompt = `אתה עורך וידאו מקצועי AI. המשתמש העלה סרטון ורוצה לערוך אותו.

פרטי הסרטון:
- כתובת: ${selectedVideo.file_url}
- שם: ${selectedVideo.title}
- אורך: ${videoDuration}

היסטוריית השיחה:
${conversationHistory}

הודעת המשתמש הנוכחית: ${text}

תפקידך:
1. אם המשתמש מבקש עריכה כללית - תן המלצות ספציפיות ושאל אם להמשיך.
2. אם המשתמש מבקש פעולה ספציפית - החזר JSON עם הפעולה.
3. אם המשתמש מאשר המלצה - החזר JSON.

כשאתה רוצה לבצע פעולה, החזר בפורמט:
הטקסט שלך למשתמש
---ACTION---
{"action": "שם_הפעולה", "params": {הפרמטרים}}

הפעולות הזמינות:
- trim: שמירת קטע מהסרטון - params: {start_offset, end_offset} (בשניות). דוגמה: לשמור רק שניות 5-30 -> start_offset=5, end_offset=30
- cut: מחיקת קטע מאמצע הסרטון (הסרטון לפני ואחרי הקטע מתחבר) - params: {cut_start, cut_end} (בשניות). דוגמה: למחוק שניות 5-8 מסרטון של 18 שניות -> cut_start=5, cut_end=8. התוצאה תהיה סרטון באורך 15 שניות (18 פחות 3).
- add_subtitles: כתוביות - params: {subtitles: [{start, end, text}], font_size, font_color}
- speed: מהירות - params: {rate} (0.5=חצי, 2=כפול)
- resize: גודל - params: {width, height, crop}
- crop_area: חיתוך אזור - params: {width, height, x, y, gravity}
- rotate: סיבוב - params: {angle}
- flip: היפוך - params: {direction: "horizontal"/"vertical"}
- filter: אפקט - params: {effect: "grayscale"/"sepia"/"brightness"/"contrast"/"saturation"/"blur"/"pixelate", value}
- add_text: טקסט - params: {text, font_size, font_color, gravity, x, y, font_family}
- add_image_overlay: תמונה - params: {image_url, gravity, width, height, x, y, opacity}
- remove_audio: הסרת אודיו - params: {}
- volume: עוצמת קול - params: {level} (0-200)
- replace_audio: החלפת אודיו - params: {audio_url}
- to_gif: ל-GIF - params: {start_offset, end_offset, fps}
- concatenate: חיבור - params: {video_urls: [...]}
- transition: מעבר - params: {video_url, effect, duration}
- extract_frame: חילוץ פריים - params: {time}

חשוב מאוד:
- שים לב להבדל בין trim ל-cut: trim שומר רק את הקטע שצוין, cut מוחק את הקטע שצוין.
- "מחק/הסר את הקטע בין X ל-Y" = פעולת cut (cut_start=X, cut_end=Y)
- "קצר/שמור רק שניות X עד Y" = פעולת trim (start_offset=X, end_offset=Y)
- אם המשתמש מבקש פעולה ברורה - בצע מיד! כלול ---ACTION--- עם JSON. אל תשאל שוב.
- אם לא ברור - שאל.

ענה בעברית. היה ידידותי ומקצועי. תן תשובות קצרות.`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({ prompt });

      // Check if LLM returned an action to execute
      const responseText = typeof response === 'string' ? response : JSON.stringify(response);
      
      if (responseText.includes('---ACTION---')) {
        const parts = responseText.split('---ACTION---');
        const displayText = parts[0].trim();
        const actionPart = parts[1] || '';
        
        // Show the AI message first
        setMessages(prev => {
          const updated = prev.filter(m => !m.loading);
          return [...updated, { role: 'assistant', content: displayText + '\n\n⏳ מבצע את הפעולה...' }];
        });

        // Parse and execute the action
        const match = actionPart.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const { action, params } = JSON.parse(match[0]);
            
            const result = await base44.functions.invoke('cloudinaryEdit', {
              video_url: selectedVideo.file_url,
              action,
              params
            });

            const resultData = result.data;
            
            if (resultData.success) {
              setMessages(prev => {
                const updated = prev.slice(0, -1);
                return [...updated, { 
                  role: 'assistant', 
                  content: displayText,
                  resultUrl: resultData.processed_url,
                  resultAction: action
                }];
              });
            } else {
              setMessages(prev => {
                const updated = prev.slice(0, -1);
                return [...updated, { 
                  role: 'assistant', 
                  content: displayText + `\n\n❌ שגיאה: ${resultData.error || 'משהו השתבש'}` 
                }];
              });
            }
          } catch (parseErr) {
            console.error('Action parse/execute error:', parseErr);
            setMessages(prev => {
              const updated = prev.slice(0, -1);
              return [...updated, { 
                role: 'assistant', 
                content: displayText + '\n\n❌ שגיאה בביצוע הפעולה. נסה שוב.' 
              }];
            });
          }
        } else {
          // No valid JSON found, just show text
          setMessages(prev => {
            const updated = prev.slice(0, -1);
            return [...updated, { role: 'assistant', content: displayText }];
          });
        }
      } else {
        setMessages(prev => {
          const updated = prev.filter(m => !m.loading);
          return [...updated, { role: 'assistant', content: responseText }];
        });
      }
    } catch (err) {
      console.error('AI Editor error:', err);
      setMessages(prev => {
        const updated = prev.filter(m => !m.loading);
        return [...updated, { role: 'assistant', content: '❌ קרתה שגיאה. נסה שוב.' }];
      });
    }
    
    setProcessing(false);
  };

  const handleReset = () => {
    setSelectedVideo(null);
    setMessages([]);
    setShowSelector(true);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} dir="rtl">
      {/* Header */}
      <div
        className="sticky z-10 backdrop-blur-xl"
        style={{ top: 'env(safe-area-inset-top)', backgroundColor: 'var(--nav-bg)', borderBottom: '1px solid var(--border-color)' }}
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
              className="text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1"
              style={{ color: 'var(--text-faint)', backgroundColor: 'var(--chip-bg)' }}
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
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold">עריכת סרטון עם AI</h2>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--text-faint)' }}>
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
            <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
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
                  <p className="text-xs" style={{ color: 'var(--accent)' }}>סרטון נטען</p>
                </div>
                <button
                  onClick={() => setShowSelector(true)}
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{ color: 'var(--text-muted)', backgroundColor: 'var(--chip-bg)' }}
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
          className="fixed left-0 right-0 z-40 px-4 pb-2 backdrop-blur-xl"
          style={{ backgroundColor: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)' }}
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