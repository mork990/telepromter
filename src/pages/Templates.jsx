import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight, Search } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TemplateCard from '../components/teleprompter/TemplateCard';
import { Input } from "@/components/ui/input";

export default function Templates() {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.Template.list('-created_date')
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.Template.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    }
  });

  const handleLoad = (template) => {
    const params = new URLSearchParams({
      text: template.text,
      fontSize: template.font_size,
      textColor: template.text_color,
      backgroundColor: template.background_color,
      scrollSpeed: template.scroll_speed
    });
    window.location.href = createPageUrl('Home') + '?' + params.toString();
  };

  const handleEdit = (template) => {
    handleLoad(template);
  };

  const handleDelete = async (id) => {
    if (confirm('האם אתה בטוח שברצונך למחוק תבנית זו?')) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-800">תבניות שמורות</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש תבניות..."
            className="pr-10 text-right"
            dir="rtl"
          />
        </div>

        {/* Templates List */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            טוען תבניות...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto mb-3" />
              <p className="text-lg font-medium">אין תבניות שמורות</p>
              <p className="text-sm">שמור תבניות מהדף הראשי כדי לראות אותן כאן</p>
            </div>
            <Link to={createPageUrl('Home')}>
              <Button className="mt-4">
                חזור לדף הראשי
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onLoad={handleLoad}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}