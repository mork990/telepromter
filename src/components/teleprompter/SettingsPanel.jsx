import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, Type, Palette, Video } from "lucide-react";

const PRESET_COLORS = [
  { name: 'שחור', value: '#000000' },
  { name: 'לבן', value: '#FFFFFF' },
  { name: 'אפור כהה', value: '#1F2937' },
  { name: 'כחול כהה', value: '#1E3A8A' },
  { name: 'ירוק כהה', value: '#14532D' }
];

export default function SettingsPanel({ 
  fontSize, 
  setFontSize, 
  textColor, 
  setTextColor,
  backgroundColor,
  setBackgroundColor,
  cameraFacing,
  setCameraFacing,
  scrollSpeed,
  setScrollSpeed,
  backgroundOpacity,
  setBackgroundOpacity
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings2 className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-bold text-gray-800">הגדרות עיצוב</h2>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Type className="w-4 h-4" />
            גודל גופן
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>קטן</span>
            <span className="font-medium">{fontSize}px</span>
            <span>גדול</span>
          </div>
          <Slider
            value={[fontSize]}
            onValueChange={(value) => setFontSize(value[0])}
            min={16}
            max={72}
            step={2}
            className="w-full"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" />
            צבעים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-right block">צבע טקסט</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setTextColor(color.value)}
                  className={`w-12 h-12 rounded-lg border-2 transition-all ${
                    textColor === color.value ? 'border-indigo-600 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-right block">צבע רקע</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setBackgroundColor(color.value)}
                  className={`w-12 h-12 rounded-lg border-2 transition-all ${
                    backgroundColor === color.value ? 'border-indigo-600 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="w-4 h-4" />
            מצלמה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={cameraFacing} onValueChange={setCameraFacing}>
            <SelectTrigger className="text-right">
              <SelectValue placeholder="בחר מצלמה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">מצלמה קדמית</SelectItem>
              <SelectItem value="environment">מצלמה אחורית</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">מהירות גלילה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>איטי</span>
            <span className="font-medium">{scrollSpeed}</span>
            <span>מהיר</span>
          </div>
          <Slider
            value={[scrollSpeed]}
            onValueChange={(value) => setScrollSpeed(value[0])}
            min={10}
            max={200}
            step={10}
            className="w-full"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" />
            כהות רקע על המצלמה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>שקוף</span>
            <span className="font-medium">{backgroundOpacity}%</span>
            <span>אטום</span>
          </div>
          <Slider
            value={[backgroundOpacity]}
            onValueChange={(value) => setBackgroundOpacity(value[0])}
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-gray-500 text-right">
            שולט בכמה שהרקע מכסה את המצלמה בזמן צילום
          </p>
        </CardContent>
      </Card>
    </div>
  );
}