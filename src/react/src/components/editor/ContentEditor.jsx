import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Copy, Trash2, Tag, Link2, Folder, Calendar, ChevronDown,
  AlertCircle, Loader, FileText, Image as ImageIcon
} from 'lucide-react';
import TextEditor from './TextEditor';
import NotionPreviewEmbed from '../NotionPreviewEmbed';

const MAX_CLIPBOARD_LENGTH = 10000;

export default function ContentEditor({
  clipboard,
  editedClipboard,
  onEditContent,
  onClearClipboard,
  selectedPage,
  selectedPages,
  multiSelectMode,
  sending,
  onSend,
  canSend,
  contentProperties,
  onUpdateProperties,
  config
}) {
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const currentContent = editedClipboard || clipboard;
  const hasContent = currentContent?.content;
  const contentLength = currentContent?.content?.length || 0;

  // Mise à jour des propriétés
  const updateProperty = (key, value) => {
    onUpdateProperties(prev => ({ ...prev, [key]: value }));
  };

  // Ouvrir l'éditeur de texte
  const handleEditText = () => {
    if (currentContent?.type === 'text') {
      setShowTextEditor(true);
    }
  };

  // Sauvegarder le texte édité
  const saveEditedText = (newContent) => {
    onEditContent({
      ...currentContent,
      content: newContent
    });
    setShowTextEditor(false);
  };

  // Obtenir les infos de destination
  const getTargetInfo = () => {
    if (multiSelectMode) {
      if (selectedPages.length === 0) return 'Sélectionnez des pages';
      if (selectedPages.length === 1) {
        return `Vers 1 page`;
      }
      return `Vers ${selectedPages.length} pages`;
    } else {
      if (!selectedPage) return 'Sélectionnez une page';
      return `Vers "${selectedPage.title || 'Page'}"`;
    }
  };

  // Gestion de l'envoi avec Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && canSend) {
      onSend();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canSend]);

  if (!hasContent) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-notion-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Copy size={24} className="text-notion-gray-400" />
          </div>
          <p className="text-notion-gray-600">
            Copiez du contenu pour commencer
          </p>
          <p className="text-sm text-notion-gray-400 mt-2">
            Texte, liens, images...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="space-y-4">
            {/* Header avec compteur */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-notion-gray-800">
                Presse-papiers
              </h3>
              <div className="flex items-center gap-3">
                <span className={`text-sm ${
                  contentLength > MAX_CLIPBOARD_LENGTH 
                    ? 'text-red-600' 
                    : 'text-notion-gray-500'
                }`}>
                  {contentLength} / {MAX_CLIPBOARD_LENGTH} caractères
                </span>
                <button
                  onClick={onClearClipboard}
                  className="p-1.5 hover:bg-notion-gray-100 rounded transition-colors"
                  title="Vider le presse-papiers"
                >
                  <Trash2 size={16} className="text-notion-gray-500" />
                </button>
              </div>
            </div>

            {/* Aperçu du contenu */}
            <div className="border border-notion-gray-200 rounded-lg overflow-hidden">
              {currentContent.type === 'text' ? (
                <div className="p-4">
                  {contentProperties.parseAsMarkdown && config.notionPageId ? (
                    <NotionPreviewEmbed
                      content={currentContent.content}
                      pageId={config.notionPageId}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-sm text-notion-gray-700">
                      {currentContent.content}
                    </pre>
                  )}
                  <button
                    onClick={handleEditText}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700"
                  >
                    Modifier le texte
                  </button>
                </div>
              ) : currentContent.type === 'image' ? (
                <div className="p-4 text-center">
                  <ImageIcon size={48} className="mx-auto mb-2 text-notion-gray-400" />
                  <p className="text-sm text-notion-gray-600">Image prête à envoyer</p>
                </div>
              ) : (
                <div className="p-4">
                  <FileText size={48} className="mx-auto mb-2 text-notion-gray-400" />
                  <p className="text-sm text-notion-gray-600">
                    Contenu de type: {currentContent.type}
                  </p>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-4">
              {/* Options de base */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={contentProperties.parseAsMarkdown}
                    onChange={(e) => updateProperty('parseAsMarkdown', e.target.checked)}
                    className="rounded border-notion-gray-300"
                  />
                  <span className="text-sm text-notion-gray-700">
                    Parser en Markdown
                  </span>
                </label>
                
                <button
                  onClick={() => setShowMoreOptions(!showMoreOptions)}
                  className="flex items-center gap-1 text-sm text-notion-gray-600 hover:text-notion-gray-800"
                >
                  Options avancées
                  <ChevronDown 
                    size={14} 
                    className={`transform transition-transform ${
                      showMoreOptions ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Options avancées */}
              <AnimatePresence>
                {showMoreOptions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    {/* Tags */}
                    <div>
                      <label className="block text-sm font-medium text-notion-gray-700 mb-1">
                        Tags
                      </label>
                      <div className="flex items-center gap-2">
                        <Tag size={16} className="text-notion-gray-400" />
                        <input
                          type="text"
                          placeholder="Séparez par des virgules"
                          value={contentProperties.tags.join(', ')}
                          onChange={(e) => updateProperty('tags', 
                            e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                          )}
                          className="flex-1 px-3 py-1.5 text-sm border border-notion-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-notion-gray-300"
                        />
                      </div>
                    </div>

                    {/* URL source */}
                    <div>
                      <label className="block text-sm font-medium text-notion-gray-700 mb-1">
                        URL source
                      </label>
                      <div className="flex items-center gap-2">
                        <Link2 size={16} className="text-notion-gray-400" />
                        <input
                          type="url"
                          placeholder="https://..."
                          value={contentProperties.sourceUrl}
                          onChange={(e) => updateProperty('sourceUrl', e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm border border-notion-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-notion-gray-300"
                        />
                      </div>
                    </div>

                    {/* Catégorie */}
                    <div>
                      <label className="block text-sm font-medium text-notion-gray-700 mb-1">
                        Catégorie
                      </label>
                      <div className="flex items-center gap-2">
                        <Folder size={16} className="text-notion-gray-400" />
                        <input
                          type="text"
                          placeholder="Travail, Personnel..."
                          value={contentProperties.category}
                          onChange={(e) => updateProperty('category', e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm border border-notion-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-notion-gray-300"
                        />
                      </div>
                    </div>

                    {/* Date d'échéance */}
                    <div>
                      <label className="block text-sm font-medium text-notion-gray-700 mb-1">
                        Date d'échéance
                      </label>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-notion-gray-400" />
                        <input
                          type="date"
                          value={contentProperties.dueDate}
                          onChange={(e) => updateProperty('dueDate', e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm border border-notion-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-notion-gray-300"
                        />
                      </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={contentProperties.markAsFavorite}
                          onChange={(e) => updateProperty('markAsFavorite', e.target.checked)}
                          className="rounded border-notion-gray-300"
                        />
                        <span className="text-sm text-notion-gray-700">
                          Marquer comme favori
                        </span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={contentProperties.addReminder}
                          onChange={(e) => updateProperty('addReminder', e.target.checked)}
                          className="rounded border-notion-gray-300"
                        />
                        <span className="text-sm text-notion-gray-700">
                          Ajouter un rappel
                        </span>
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Barre d'action */}
      <div className="p-4 border-t border-notion-gray-200 bg-notion-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-notion-gray-600">
            {getTargetInfo()}
          </div>
          
          <button
            onClick={onSend}
            disabled={!canSend}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              canSend
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                : 'bg-notion-gray-200 text-notion-gray-400 cursor-not-allowed'
            }`}
          >
            {sending ? (
              <>
                <Loader size={16} className="animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send size={16} />
                Envoyer
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal éditeur de texte */}
      <AnimatePresence>
        {showTextEditor && (
          <TextEditor
            content={currentContent.content}
            onSave={saveEditedText}
            onClose={() => setShowTextEditor(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}