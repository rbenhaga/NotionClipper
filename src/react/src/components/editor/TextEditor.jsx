// src/react/src/components/editor/TextEditor.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save } from 'lucide-react';

const MAX_CLIPBOARD_LENGTH = 10000;

export default function TextEditor({ content, onSave, onCancel }) {
  const [editedContent, setEditedContent] = useState(content);
  const [charCount, setCharCount] = useState(content.length);

  useEffect(() => {
    setCharCount(editedContent.length);
  }, [editedContent]);

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-notion p-6 w-[600px] max-h-[80vh] flex flex-col"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-notion-gray-900">Modifier le texte</h2>
          <button onClick={onCancel} className="p-1 hover:bg-notion-gray-100 rounded">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 mb-4">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-64 p-4 border border-notion-gray-200 rounded-notion text-sm focus:outline-none focus:ring-2 focus:ring-notion-gray-300 resize-none"
            placeholder="Saisissez votre texte..."
          />

          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-notion-gray-500">
              Limite: {MAX_CLIPBOARD_LENGTH.toLocaleString()} caractères
            </div>
            <div className={`text-xs font-medium ${
              charCount > MAX_CLIPBOARD_LENGTH ? 'text-red-600' :
              charCount > MAX_CLIPBOARD_LENGTH * 0.9 ? 'text-orange-600' :
              'text-notion-gray-600'
            }`}>
              {charCount.toLocaleString()}/{MAX_CLIPBOARD_LENGTH.toLocaleString()}
            </div>
          </div>

          <div className="mt-1 w-full bg-notion-gray-200 rounded-full h-1">
            <div
              className={`h-1 rounded-full transition-all duration-300 ${
                charCount > MAX_CLIPBOARD_LENGTH ? 'bg-red-500' :
                charCount > MAX_CLIPBOARD_LENGTH * 0.9 ? 'bg-orange-500' :
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, (charCount / MAX_CLIPBOARD_LENGTH) * 100)}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-notion-gray-200 rounded-notion text-sm font-medium text-notion-gray-700 hover:bg-notion-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={() => onSave(editedContent)}
            className="flex-1 px-4 py-2 bg-notion-gray-900 text-white rounded-notion text-sm font-medium hover:bg-notion-gray-800 flex items-center justify-center gap-2"
          >
            <Save size={14} />
            Sauvegarder
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}