import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Video, Settings, BookOpen, Save } from "lucide-react";
import TextInput from '../components/teleprompter/TextInput';
import PrompterPreview from '../components/teleprompter/PrompterPreview';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Home() {
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(32);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [scrollSpeed, setScrollSpeed] = useState(50);
  const [cameraFacing, setCameraFacing] = useState('user');
  const [backgroundOpacity, setBackgroundOpacity] = useState(80);
  const [templateName, setTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Load settings and text on mount
  React.useEffect(() => {
    // Load settings
    const savedSettings = localStorage.getItem('teleprompterSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setFontSize(settings.fontSize || 32);
      setTextColor(settings.textColor || '#FFFFFF');
      setBackgroundColor(settings.backgroundColor || '#000000');
      setCameraFacing(settings.cameraFacing || 'user');
      setScrollSpeed(settings.scrollSpeed || 50);
      setBackgroundOpacity(settings.backgroundOpacity || 80);
    }

    // Load current text
    const savedText = localStorage.getItem('currentText');
    if (savedText) {
      setText(savedText);
    }

    // Load from URL params if coming from templates
    const params = new URLSearchParams(window.location.search);
    const urlText = params.get('text');
    if (urlText) {
      setText(urlText);
      setFontSize(parseInt(params.get('fontSize')) || 32);
      setTextColor(params.get('textColor') || '#FFFFFF');
      setBackgroundColor(params.get('backgroundColor') || '#000000');
      setScrollSpeed(parseInt(params.get('scrollSpeed')) || 50);
      setBackgroundOpacity(parseInt(params.get('backgroundOpacity')) || 80);
    }
  }, []);

  // Save text whenever it changes
  React.useEffect(() => {
    if (text) {
      localStorage.setItem('currentText', text);
    }
  }, [text]);

  const handleSaveTemplate = async () => {
    if (!text.trim() || !templateName.trim()) {
      alert('אנא הזן שם ותוכן לתבנית');
      return;
    }

    setIsSaving(true);
    try {
      await base44.entities.Template.create({
        name: templateName,
        text: text,
        font_size: fontSize,
        text_color: textColor,
        background_color: backgroundColor,
        scroll_speed: scrollSpeed,
        background_opacity: backgroundOpacity
      });
      alert('התבנית נשמרה בהצלחה!');
      setTemplateName('');
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving template:', error);
      alert('שגיאה בשמירת התבנית');
    } finally {
      setIsSaving(false);
    }
  };

  const startRecording = () => {
    if (!text.trim()) {
      alert('אנא הזן טקסט לפני תחילת הצילום');
      return;
    }

    // Save current settings before navigating
    const settings = {
      fontSize,
      textColor,
      backgroundColor,
      cameraFacing,
      scrollSpeed,
      backgroundOpacity
    };
    localStorage.setItem('teleprompterSettings', JSON.stringify(settings));

    const params = new URLSearchParams({
      text,
      fontSize,
      textColor,
      backgroundColor,
      scrollSpeed,
      cameraFacing,
      backgroundOpacity
    });
    
    window.location.href = createPageUrl('Recording') + '?' + params.toString();
  };

  const goToSettings = () => {
    // Save current state before navigating
    const settings = {
      fontSize,
      textColor,
      backgroundColor,
      cameraFacing,
      scrollSpeed,
      backgroundOpacity
    };
    localStorage.setItem('teleprompterSettings', JSON.stringify(settings));
    window.location.href = createPageUrl('Settings');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl">
                <Video className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                פרומפטר
              </h1>
            </div>
            <Link to={createPageUrl('Templates')}>
              <Button variant="outline" size="sm">
                <BookOpen className="w-4 h-4 ml-2" />
                תבניות
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Text Input */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <TextInput text={text} onTextChange={setText} />
          </CardContent>
        </Card>

        {/* Preview */}
        {text && (
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <PrompterPreview
                text={text}
                fontSize={fontSize}
                textColor={textColor}
                backgroundColor={backgroundColor}
              />
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={startRecording}
            className="w-full h-14 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg"
            disabled={!text.trim()}
          >
            <Video className="w-5 h-5 ml-2" />
            התחל צילום
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-12" disabled={!text.trim()}>
                  <Save className="w-4 h-4 ml-2" />
                  שמור תבנית
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl">
                <DialogHeader>
                  <DialogTitle>שמירת תבנית</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>שם התבנית</Label>
                    <Input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="הזן שם לתבנית..."
                      className="text-right"
                      dir="rtl"
                    />
                  </div>
                  <Button
                    onClick={handleSaveTemplate}
                    disabled={isSaving}
                    className="w-full"
                  >
                    {isSaving ? 'שומר...' : 'שמור'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" className="w-full h-12" onClick={goToSettings}>
              <Settings className="w-4 h-4 ml-2" />
              הגדרות
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
          <CardContent className="p-4 text-sm text-gray-700 text-right">
            <p className="font-medium mb-2">💡 טיפים לשימוש:</p>
            <ul className="space-y-1 text-xs">
              <li>• הזן את הטקסט או העלה קובץ טקסט</li>
              <li>• התאם את הגדרות הגופן והצבעים בעמוד ההגדרות</li>
              <li>• לחץ על "התחל צילום" כדי להתחיל</li>
              <li>• שלוט במהירות הגלילה במהלך הצילום</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}