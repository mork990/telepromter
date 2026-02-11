import React, { useState } from 'react';
import { Send } from 'lucide-react';

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="תאר מה לעשות עם הסרטון..."
        disabled={disabled}
        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#00d4aa]/50 disabled:opacity-50"
        dir="rtl"
      />
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className="h-[46px] w-[46px] rounded-xl bg-[#00d4aa] text-black flex items-center justify-center disabled:opacity-30 transition-opacity active:scale-95"
      >
        <Send className="w-5 h-5 rotate-180" />
      </button>
    </form>
  );
}