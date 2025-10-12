// packages/ui/src/components/layout/MinimalistView.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Send, X, Search } from 'lucide-react';
import { NotionPage } from '../../types';
import { getPageIcon } from '../../utils/helpers';

export interface MinimalistViewProps {
  clipboard: any;
  editedClipboard: string;
  onEditContent: (content: string) => void;
  selectedPage: NotionPage | null;
  pages: NotionPage[];
  onPageSelect: (page: NotionPage) => void;
  onSend: () => void;
  onClearClipboard: () => void;
  onExitMinimalist: () => void;
  sending: boolean;
  canSend: boolean;
}

/**
 * MinimalistView - Mode Compact Repensé
 * 
 * Philosophie Apple/Notion:
 * - Minimalisme absolu
 * - Zéro scrollbar visible
 * - Focus sur l'essentiel
 * - Design épuré et élégant
 * - Une seule action: capturer et envoyer
 */
export function MinimalistView({
  clipboard,
  editedClipboard,
  onEditContent,
  selectedPage,
  pages,
  onPageSelect,
  onSend,
  onClearClipboard,
  onExitMinimalist,
  sending,
  canSend
}: MinimalistViewProps) {
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Suggestions intelligentes (5 pages récentes)
  const suggestedPages = useMemo(() => {
    return [...pages]
      .sort((a, b) => {
        const dateA = new Date(a.last_edited_time || 0).getTime();
        const dateB = new Date(b.last_edited_time || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [pages]);

  // Filtrer les pages
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return pages;
    return pages.filter(page =>
      page.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [pages, searchQuery]);

  // Auto-resize du textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editedClipboard]);

  // Raccourci Cmd+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSend) {
        onSend();
      }
      if (e.key === 'Escape') {
        if (showPageSelector) {
          setShowPageSelector(false);
          setSearchQuery('');
        } else {
          onExitMinimalist();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canSend, onSend, showPageSelector, onExitMinimalist]);

  const handlePageSelect = (page: NotionPage) => {
    onPageSelect(page);
    setShowPageSelector(false);
    setSearchQuery('');
  };

  const hasContent = clipboard && (clipboard.text || clipboard.html || clipboard.images?.length > 0);

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Bouton Exit en haut à droite - Style macOS */}
      <div className="absolute top-3 right-3 z-50">
        <button
          onClick={onExitMinimalist}
          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all group"
          title="Mode normal (Esc)"
        >
          <X size={14} className="text-gray-600 group-hover:text-gray-900" />
        </button>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col p-5 gap-4 overflow-hidden">
        
        {/* Sélecteur de page - Design épuré */}
        <div className="relative">
          <button
            onClick={() => setShowPageSelector(!showPageSelector)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all border border-gray-200"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {selectedPage ? (
                <>
                  <span className="text-xl">{getPageIcon(selectedPage).value}</span>
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {selectedPage.title}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-lg bg-gray-200 flex items-center justify-center">
                    <Search size={12} className="text-gray-500" />
                  </div>
                  <span className="text-sm text-gray-500">
                    Choisir une page...
                  </span>
                </>
              )}
            </div>
            <ChevronDown 
              size={16} 
              className={`text-gray-400 transition-transform flex-shrink-0 ${showPageSelector ? 'rotate-180' : ''}`} 
            />
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {showPageSelector && (
              <>
                {/* Overlay */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setShowPageSelector(false);
                    setSearchQuery('');
                  }}
                />

                {/* Menu */}
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl z-50 overflow-hidden border border-gray-200"
                  style={{ maxHeight: '300px' }}
                >
                  {/* Recherche */}
                  <div className="p-3 border-b border-gray-100">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Liste scrollable */}
                  <div className="overflow-y-auto" style={{ maxHeight: '240px' }}>
                    {/* Suggestions si pas de recherche */}
                    {!searchQuery && suggestedPages.length > 0 && (
                      <div className="py-1">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Récents
                        </div>
                        {suggestedPages.map((page) => (
                          <button
                            key={page.id}
                            onClick={() => handlePageSelect(page)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                          >
                            <span className="text-lg">{getPageIcon(page).value}</span>
                            <span className="text-sm text-gray-900 truncate flex-1">
                              {page.title}
                            </span>
                          </button>
                        ))}
                        <div className="h-px bg-gray-100 my-1" />
                      </div>
                    )}

                    {/* Toutes les pages */}
                    <div className="py-1">
                      {!searchQuery && (
                        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Toutes les pages
                        </div>
                      )}
                      {filteredPages.length > 0 ? (
                        filteredPages.map((page) => (
                          <button
                            key={page.id}
                            onClick={() => handlePageSelect(page)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                          >
                            <span className="text-lg">{getPageIcon(page).value}</span>
                            <span className="text-sm text-gray-900 truncate flex-1">
                              {page.title}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-8 text-center">
                          <p className="text-sm text-gray-400">Aucune page trouvée</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Zone de contenu - Auto-resize, pas de scrollbar */}
        <div className="flex-1 flex flex-col min-h-0">
          {hasContent ? (
            <>
              {/* Preview images si présentes */}
              {clipboard.images?.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {clipboard.images.slice(0, 3).map((img: string, idx: number) => (
                    <div
                      key={idx}
                      className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200"
                    >
                      <img
                        src={img}
                        alt={`Image ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {clipboard.images.length > 3 && (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        +{clipboard.images.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Textarea auto-resize */}
              <textarea
                ref={textareaRef}
                value={editedClipboard}
                onChange={(e) => onEditContent(e.target.value)}
                placeholder="Votre contenu..."
                className="flex-1 w-full resize-none bg-gray-50 rounded-xl p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all border border-gray-200 overflow-hidden"
                style={{ 
                  minHeight: '120px',
                  maxHeight: '240px'
                }}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <Search size={20} className="text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-400">Aucun contenu</p>
                <p className="text-xs text-gray-300 mt-1">Copiez du texte pour commencer</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions - Style Apple */}
        <div className="flex gap-2">
          <button
            onClick={onClearClipboard}
            disabled={!hasContent}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Effacer
          </button>

          <button
            onClick={onSend}
            disabled={!canSend || sending}
            className="flex-1 px-4 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Send size={16} />
                </motion.div>
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

        {/* Hint raccourci */}
        <div className="text-center">
          <p className="text-xs text-gray-400">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">⌘</kbd>
            {' '}+{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">↵</kbd>
            {' '}pour envoyer
          </p>
        </div>
      </div>
    </div>
  );
}