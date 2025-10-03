// src/react/src/components/editor/MetadataEditor.jsx
import React from 'react';
import { Hash, Calendar, Globe, Tag, Folder } from 'lucide-react';

export default function MetadataEditor({ metadata, onChange }) {
  const {
    pageTitle = '',
    tags = '',
    category = '',
    sourceUrl = '',
    date = new Date().toISOString().split('T')[0],
    time = new Date().toTimeString().split(' ')[0].substring(0, 5)
  } = metadata || {};

  const handleChange = (field, value) => {
    onChange({
      ...metadata,
      [field]: value
    });
  };

  return (
    <div className="border-t border-notion-gray-200 dark:border-notion-dark-border">
      <div className="p-4 space-y-3 bg-notion-gray-50 dark:bg-notion-dark-hover">
        {/* Titre de la page */}
        <div className="flex items-center gap-3">
          <Tag size={16} className="text-notion-gray-500" />
          <input
            type="text"
            value={pageTitle}
            onChange={(e) => handleChange('pageTitle', e.target.value)}
            placeholder="Titre de la page"
            className="flex-1 text-sm border border-notion-gray-200 dark:border-notion-dark-border rounded-lg px-3 py-1.5 bg-white dark:bg-notion-dark-secondary focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tags et catégorie */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Hash size={16} className="text-notion-gray-500" />
            <input
              type="text"
              value={tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              placeholder="Tags (séparés par des virgules)"
              className="flex-1 text-sm border border-notion-gray-200 dark:border-notion-dark-border rounded-lg px-3 py-1.5 bg-white dark:bg-notion-dark-secondary focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-3 flex-1">
            <Folder size={16} className="text-notion-gray-500" />
            <input
              type="text"
              value={category}
              onChange={(e) => handleChange('category', e.target.value)}
              placeholder="Catégorie"
              className="flex-1 text-sm border border-notion-gray-200 dark:border-notion-dark-border rounded-lg px-3 py-1.5 bg-white dark:bg-notion-dark-secondary focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* URL source */}
        <div className="flex items-center gap-3">
          <Globe size={16} className="text-notion-gray-500" />
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => handleChange('sourceUrl', e.target.value)}
            placeholder="URL source"
            className="flex-1 text-sm border border-notion-gray-200 dark:border-notion-dark-border rounded-lg px-3 py-1.5 bg-white dark:bg-notion-dark-secondary focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Date et heure */}
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-notion-gray-500" />
          <input
            type="date"
            value={date}
            onChange={(e) => handleChange('date', e.target.value)}
            className="text-sm border border-notion-gray-200 dark:border-notion-dark-border rounded-lg px-3 py-1.5 bg-white dark:bg-notion-dark-secondary focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => handleChange('time', e.target.value)}
            className="text-sm border border-notion-gray-200 dark:border-notion-dark-border rounded-lg px-3 py-1.5 bg-white dark:bg-notion-dark-secondary focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}