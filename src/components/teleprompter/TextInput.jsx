import React from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, Type } from "lucide-react";
import { base44 } from '@/api/base44Client';

export default function TextInput({ text, onTextChange }) {
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        onTextChange(event.target.result);
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error reading file:', error);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/50">{text.length} תווים</span>
        <label htmlFor="file-upload" className="cursor-pointer">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#00d4aa] bg-[#00d4aa]/10 px-3 py-1.5 rounded-full select-none">
            <Upload className="w-3.5 h-3.5" />
            העלה קובץ
          </span>
          <input
            id="file-upload"
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>
      
      <Textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="הקלד כאן את הטקסט שיוצג בפרומפטר..."
        className="min-h-[250px] text-base font-medium text-right resize-none bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:ring-1 focus:ring-[#00d4aa]/50 focus:border-[#00d4aa]/50 rounded-xl"
        dir="rtl"
      />
    </div>
  );
}