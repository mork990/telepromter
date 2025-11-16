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
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Type className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-800">הזן טקסט</h3>
        </div>
        <label htmlFor="file-upload" className="cursor-pointer">
          <Button variant="outline" size="sm" asChild>
            <span>
              <Upload className="w-4 h-4 ml-2" />
              העלה קובץ
            </span>
          </Button>
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
        className="min-h-[300px] text-lg font-medium text-right resize-none focus:ring-2 focus:ring-indigo-500"
        dir="rtl"
      />
      
      <div className="text-sm text-gray-500 text-right">
        {text.length} תווים
      </div>
    </div>
  );
}