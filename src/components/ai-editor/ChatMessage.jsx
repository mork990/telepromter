import React from 'react';
import { Bot, User, Loader2 } from 'lucide-react';

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
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
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
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  );
}