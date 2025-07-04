import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Copy, Trash2, Edit3, X, ChevronDown, Settings, FileText,
  Database, Hash, Folder, Globe, Calendar, Clock, Star, Bookmark,
  Bell, Eye, Code, Info, Sparkles
} from 'lucide-react';
import NotionPreviewEmbed from '../NotionPreviewEmbed';

const MAX_CLIPBOARD_LENGTH = 100000;

// Composant Tooltip simple
function Tooltip({ children, content }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-notion-gray-900 text-white rounded whitespace-nowrap z-50">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-notion-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}

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
  showNotification
}) {
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // États des propriétés Notion
  const [contentType, setContentType] = useState('text');
  const [parseAsMarkdown, setParseAsMarkdown] = useState(true);
  const [pageTitle, setPageTitle] = useState('');
  const [tags, setTags] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [markAsFavorite, setMarkAsFavorite] = useState(false);
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState('medium');
  const [addReminder, setAddReminder] = useState(false);
  const [addToReadingList, setAddToReadingList] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [pageIcon, setPageIcon] = useState('📄');
  const [pageColor, setPageColor] = useState('default');
  const [insertPosition, setInsertPosition] = useState('append');
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const currentClipboard = editedClipboard || clipboard;

  // Fonction pour obtenir les infos de destination
  const getTargetInfo = () => {
    if (multiSelectMode) {
      if (selectedPages.length === 0) return 'Sélectionnez des pages';
      if (selectedPages.length === 1) {
        return `Envoyer vers 1 page`;
      }
      return `Envoyer vers ${selectedPages.length} pages`;
    } else {
      if (!selectedPage) return 'Sélectionnez une page';
      return `Envoyer vers "${selectedPage.title || 'Page'}"`;
    }
  };

  return (
    <motion.main
      className="flex-1 flex flex-col bg-notion-gray-50 min-h-0 relative"
      animate={{ marginLeft: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Conteneur scrollable global */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        {/* Zone presse-papiers avec panneau pliable */}
        <div className="p-6 pb-3">
          <div className="bg-white rounded-notion border border-notion-gray-200">
            {/* Header avec toggle */}
            <div 
              className="px-6 py-4 border-b border-notion-gray-100 cursor-pointer hover:bg-notion-gray-50"
              onClick={() => setPropertiesCollapsed(!propertiesCollapsed)}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-notion-gray-900">Presse-papiers</h2>
                <div className="flex items-center gap-2">
                  {currentClipboard?.truncated && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                      Tronqué
                    </span>
                  )}
                  {editedClipboard && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Modifié
                    </span>
                  )}
                  <ChevronDown size={16} className={`transform transition-transform ${propertiesCollapsed ? '' : 'rotate-180'}`} />
                </div>
              </div>
            </div>

            {/* Contenu avec édition et prévisualisation */}
            {!propertiesCollapsed && (
              <div className="p-6">
                {currentClipboard ? (
                  <div className="space-y-4">
                    {/* Zone d'édition du contenu brut */}
                    <div>
                      <label className="block text-sm font-medium text-notion-gray-700 mb-2 flex items-center gap-2">
                        <Edit3 size={14} />
                        Contenu éditable (Markdown/HTML visible) :
                      </label>
                      <textarea
                        value={editedClipboard?.content || currentClipboard.content}
                        onChange={(e) => {
                          const newContent = e.target.value;
                          const edited = {
                            ...currentClipboard,
                            content: newContent,
                            originalLength: newContent.length
                          };
                          onEditContent(edited);
                          window.lastClipboardContent = newContent;
                          window.lastContentType = contentType || 'text';
                          window.dispatchEvent(new Event('clipboard-content-changed'));
                        }}
                        className="w-full h-48 p-3 border border-notion-gray-200 rounded-lg font-mono text-sm bg-notion-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Éditez votre contenu ici..."
                      />
                      <div className="mt-2 flex justify-between text-xs text-notion-gray-500">
                        <span>{(editedClipboard?.content || currentClipboard.content).length} caractères</span>
                      </div>
                    </div>

                    {/* Boutons d'action rapide */}
                    <div className="flex gap-2 pt-2">
                      {editedClipboard && (
                        <button
                          onClick={() => {
                            onEditContent(null);
                            showNotification('Modifications annulées', 'info');
                          }}
                          className="px-3 py-1.5 text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg flex items-center gap-1.5"
                        >
                          <X size={14} />
                          Annuler les modifications
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onClearClipboard();
                          showNotification('Presse-papiers vidé', 'info');
                        }}
                        className="px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg flex items-center gap-1.5 ml-auto"
                      >
                        <Trash2 size={14} />
                        Vider
                      </button>
                    </div>

                    {/* Prévisualisation Notion */}
                    <div className="min-h-[400px]">
                      <NotionPreviewEmbed autoReload={true} />
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-center text-notion-gray-400">
                    <div>
                      <Copy size={32} className="mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Aucun contenu copié</p>
                      <p className="text-xs mt-1 opacity-75">Copiez du texte, une image ou un tableau</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Carousel Destinations avec dimensions fixes et badge */}
        <div className="px-6 pb-6">
          <div className="bg-white rounded-notion border border-notion-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-notion-gray-700">
                {multiSelectMode ? 'Destinations' : 'Destination'}
              </h3>
              {multiSelectMode && selectedPages.length > 0 && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {selectedPages.length} sélectionnée{selectedPages.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="relative h-16 w-full">
              <div className="absolute inset-0 flex gap-2 overflow-x-auto overflow-y-hidden custom-scrollbar-horizontal">
                {multiSelectMode ? (
                  selectedPages.length > 0 ? (
                    selectedPages.map((page, idx) => (
                      <div
                        key={idx}
                        className="flex-shrink-0 bg-notion-gray-50 rounded px-3 py-2 border border-notion-gray-200 flex items-center gap-2 h-fit"
                        style={{ minWidth: '180px', maxWidth: '220px' }}
                      >
                        <span className="text-sm text-notion-gray-900 truncate">
                          Page {idx + 1}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-notion-gray-400 italic">Cliquez sur les pages pour les sélectionner</p>
                  )
                ) : (
                  selectedPage ? (
                    <div
                      className="flex-shrink-0 bg-notion-gray-50 rounded px-3 py-2 border border-notion-gray-200 flex items-center gap-2 h-fit"
                      style={{ minWidth: '180px', maxWidth: '220px' }}
                    >
                      <span className="text-sm text-notion-gray-900 truncate max-w-[120px]">
                        {selectedPage.title || 'Sans titre'}
                      </span>
                      <button
                        onClick={() => {}}
                        className="ml-1 text-notion-gray-400 hover:text-red-600 flex-shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-notion-gray-400 italic">Sélectionnez une page</p>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bouton d'action fixe en bas */}
      <div className="p-4 border-t border-notion-gray-200 bg-white">
        <motion.button
          className={`w-full py-3 px-6 rounded-notion font-medium transition-all duration-200 flex items-center justify-center gap-2 relative overflow-hidden ${
            !canSend
              ? 'bg-notion-gray-100 text-notion-gray-400 cursor-not-allowed'
              : 'bg-notion-gray-900 text-white hover:bg-notion-gray-800 shadow-notion'
          }`}
          onClick={onSend}
          disabled={!canSend}
          whileTap={{ scale: 0.98 }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <AnimatePresence mode="wait">
            {sending ? (
              <motion.div
                key="sending"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2"
              >
                <motion.div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Envoi en cours...</span>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2"
              >
                <Send size={16} />
                <span>{getTargetInfo()}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Effet de progression */}
          {sending && (
            <motion.div
              className="absolute inset-0 bg-white bg-opacity-10 rounded-notion"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
        </motion.button>
      </div>
    </motion.main>
  );
}