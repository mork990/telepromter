import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Eye } from "lucide-react";

export default function PrompterPreview({ text, fontSize, textColor, backgroundColor }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Eye className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-800">תצוגה מקדימה</h3>
      </div>
      
      <Card 
        className="overflow-hidden shadow-lg"
        style={{ backgroundColor: backgroundColor || '#000000' }}
      >
        <CardContent className="p-6 min-h-[200px] max-h-[300px] overflow-y-auto">
          <div
            className="text-right leading-relaxed whitespace-pre-wrap"
            style={{
              fontSize: `${fontSize || 32}px`,
              color: textColor || '#FFFFFF',
              fontWeight: 500
            }}
            dir="rtl"
          >
            {text || 'הטקסט יופיע כאן...'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}