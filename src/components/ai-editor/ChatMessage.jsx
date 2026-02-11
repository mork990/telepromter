import React from 'react';
import { Bot, User, Loader2, Download, CheckCircle } from 'lucide-react';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const isLoading = message.loading;

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-[#00d4aa]/20' : 'bg-purple-500/20'
      }`}>
        {isUser ? (
          <User className="w-3.5 h-3.5 text-[#00d4aa]" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-purple-400" />
        )}
      </div>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser 
          ? 'bg-[#00d4aa]/15 text-white' 
          : 'bg-white/5 text-white/90'
      }`}>
        {isLoading ? (
          <div className="flex items-center gap-2 text-white/50">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>חושב...</span>
          </div>
        ) : (
          <>
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.resultUrl && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-[#00d4aa] text-xs font-medium">
                  <CheckCircle className="w-4 h-4" />
                  <span>הפעולה בוצעה בהצלחה!</span>
                </div>
                <video 
                  src={message.resultUrl} 
                  controls 
                  className="w-full rounded-xl max-h-48"
                  playsInline
                />
                <a
                  href={message.resultUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-[#00d4aa]/20 text-[#00d4aa] text-xs font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  הורד סרטון ערוך
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}