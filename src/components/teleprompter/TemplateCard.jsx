import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";

export default function TemplateCard({ template, onLoad, onEdit, onDelete }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span className="truncate">{template.name}</span>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(template)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:text-red-700"
              onClick={() => onDelete(template.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div 
          className="text-sm text-gray-600 line-clamp-3 text-right"
          dir="rtl"
        >
          {template.text}
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
          <span>{format(new Date(template.created_date), 'dd/MM/yyyy')}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLoad(template)}
          >
            טען תבנית
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}