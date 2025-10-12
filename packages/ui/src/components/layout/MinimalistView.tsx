// packages/ui/src/components/layout/MinimalistView.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Send, X, Search, Sparkles, FileText, Star } from 'lucide-react';
import { NotionPage } from '../../types';
import { getPageIcon } from '../../utils/helpers';

export interface MinimalistViewProps {
  clipboard: any;
  editedClipboard: string | null;
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Calculer le contenu à afficher (priorité à editedClipboard)
  const displayContent = useMemo(() => {
    // Si l'utilisateur a édité le contenu, on garde sa version
    if (editedClipboard !== null && editedClipboard !== undefined) {
      return typeof editedClipboard === 'string' ? editedClipboard : '';
    }

    // Sinon, on affiche le contenu du clipboard
    if (clipboard?.text && typeof clipboard.text === 'string') return clipboard.text;
    if (clipboard?.content && typeof clipboard.content === 'string') return clipboard.content;
    if (clipboard?.data && typeof clipboard.data === 'string') return clipboard.data;
    return '';
  }, [editedClipboard, clipboard]);

  // Top 5 pages récentes
  const suggestedPages = useMemo(() => {
    return [...pages]
      .sort((a, b) => {
        const dateA = new Date(a.last_edited_time || 0).getTime();
        const dateB = new Date(b.last_edited_time || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [pages]);

  // Filtrage des pages
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return pages;
    const query = searchQuery.toLowerCase();
    return pages.filter(page =>
      page.title.toLowerCase().includes(query)
    );
  }, [pages, searchQuery]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 280);
      textareaRef.current.style.height = newHeight + 'px';
    }
  }, [displayContent]);

  // Liste combinée pour la navigation au clavier
  const allPages = useMemo(() => {
    if (searchQuery) return filteredPages;
    return [...suggestedPages, ...pages.filter(p => !suggestedPages.find(sp => sp.id === p.id))];
  }, [searchQuery, filteredPages, suggestedPages, pages]);

  // Réinitialiser l'index sélectionné quand la liste change
  useEffect(() => {
    setSelectedIndex(0);
  }, [allPages]);

  // Navigation au clavier dans le dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showPageSelector) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % allPages.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev <= 0 ? allPages.length - 1 : prev - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (allPages[selectedIndex]) {
          handlePageSelect(allPages[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowPageSelector(false);
        setSearchQuery('');
        break;
    }
  };

  // Raccourcis clavier globaux
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSend && !sending) {
        e.preventDefault();
        onSend();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [canSend, onSend, sending]);

  const handlePageSelect = (page: NotionPage) => {
    onPageSelect(page);
    setShowPageSelector(false);
    setSearchQuery('');
  };

  // ✅ NOUVEAU DESIGN: Composant PageListItem amélioré
  const PageListItem = ({ page, isSelected, onClick }: {
    page: NotionPage;
    isSelected: boolean;
    onClick: () => void;
  }) => {
    const icon = getPageIcon(page);

    return (
      <button
        onClick={onClick}
        className={`
          w-full px-3 py-2.5 flex items-center gap-3
          transition-all duration-150 group
          ${isSelected
            ? 'bg-blue-50 border-l-2 border-blue-500'
            : 'hover:bg-gray-50 border-l-2 border-transparent'
          }
        `}
      >
        {/* Icône de page */}
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
          {icon.type === 'emoji' ? (
            <span className="text-lg">{icon.value}</span>
          ) : icon.type === 'url' ? (
            <img src={icon.value} alt="" className="w-5 h-5 rounded" />
          ) : (
            <div className="w-4 h-4 bg-gray-300 rounded flex items-center justify-center">
              <span className="text-xs text-gray-600">📄</span>
            </div>
          )}
        </div>

        {/* Titre de la page */}
        <div className="flex-1 min-w-0 text-left">
          <div className={`
            text-sm font-medium truncate
            ${isSelected ? 'text-blue-900' : 'text-gray-900'}
          `}>
            {page.title || 'Sans titre'}
          </div>
        </div>
      </button>
    );
  };

  const hasContent = clipboard && (clipboard.text || clipboard.content || clipboard.html || clipboard.images?.length > 0);
  const charCount = displayContent.length;
  const wordCount = displayContent.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Contenu principal */}
      <div className="flex-1 flex flex-col p-6 gap-5 overflow-hidden">

        {/* Sélecteur de page - Style Notion épuré */}
        <div className="relative">
          <button
            onClick={() => setShowPageSelector(!showPageSelector)}
            disabled={sending}
            className={`
              w-full flex items-center justify-between px-4 py-3.5
              bg-gray-50 hover:bg-gray-100 active:bg-gray-100
              rounded-xl border border-gray-200/70
              transition-all
              ${sending ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {selectedPage ? (
                <>
                  <span className="text-xl flex-shrink-0">
                    {getPageIcon(selectedPage).value}
                  </span>
                  <span className="text-[13px] font-medium text-gray-900 truncate">
                    {selectedPage.title}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center flex-shrink-0">
                    <Search size={13} className="text-gray-600" />
                  </div>
                  <span className="text-[13px] text-gray-500 font-medium">
                    Choisir une page Notion...
                  </span>
                </>
              )}
            </div>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform flex-shrink-0 ${showPageSelector ? 'rotate-180' : ''
                }`}
            />
          </button>

          {/* Dropdown - Style Notion */}
          <AnimatePresence>
            {showPageSelector && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-0 bg-black/5 backdrop-blur-[2px] z-40"
                  onClick={() => {
                    setShowPageSelector(false);
                    setSearchQuery('');
                  }}
                />

                {/* Menu */}
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl border border-gray-200/80 shadow-2xl overflow-hidden z-50"
                >
                  {/* Recherche */}
                  <div className="p-3 border-b border-gray-100">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Rechercher une page..."
                        autoFocus
                        className="w-full pl-9 pr-3 py-2 text-[13px] bg-gray-50 border border-gray-200/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all"
                      />
                    </div>
                  </div>

                  {/* Liste des pages avec sections */}
                  <div className="flex-1 overflow-y-auto max-h-[400px] minimalist-scrollbar">
                    {searchQuery ? (
                      // Mode recherche: Afficher les résultats filtrés
                      <div>
                        {filteredPages.length > 0 ? (
                          filteredPages.map((page, index) => (
                            <PageListItem
                              key={page.id}
                              page={page}
                              isSelected={selectedIndex === index}
                              onClick={() => handlePageSelect(page)}
                            />
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-sm text-gray-500">
                            Aucune page trouvée
                          </div>
                        )}
                      </div>
                    ) : (
                      // Mode normal: Sections Suggérées / Toutes
                      <div>
                        {/* Suggérées (5 pages récentes) */}
                        {suggestedPages.length > 0 && (
                          <div>
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Suggérées
                            </div>
                            {suggestedPages.map((page, index) => (
                              <PageListItem
                                key={page.id}
                                page={page}
                                isSelected={selectedIndex === index}
                                onClick={() => handlePageSelect(page)}
                              />
                            ))}
                          </div>
                        )}

                        {/* Séparateur */}
                        {suggestedPages.length > 0 && (
                          <div className="my-2 border-t border-gray-100" />
                        )}

                        {/* Toutes les pages */}
                        <div>
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Toutes ({pages.length})
                          </div>
                          {pages.filter(p => !suggestedPages.find(sp => sp.id === p.id)).map((page, index) => (
                            <PageListItem
                              key={page.id}
                              page={page}
                              isSelected={selectedIndex === (suggestedPages.length + index)}
                              onClick={() => handlePageSelect(page)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer avec raccourci */}
                  <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/50">
                    <div className="text-xs text-gray-500 flex items-center justify-between">
                      <span>↑↓ pour naviguer</span>
                      <span>↵ pour sélectionner</span>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Zone de contenu */}
        <div className="flex-1 flex flex-col min-h-0">
          {hasContent ? (
            <div className="flex-1 flex flex-col min-h-0 gap-3">
              {/* Textarea */}
              <div className="flex-1 flex flex-col min-h-0">
                <textarea
                  ref={textareaRef}
                  value={displayContent}
                  onChange={(e) => onEditContent(e.target.value)}
                  placeholder="Votre contenu ici..."
                  disabled={sending}
                  className={`
                    w-full flex-1 px-4 py-3.5
                    text-[14px] text-gray-900 leading-relaxed
                    bg-gray-50/50 border border-gray-200/70 rounded-xl
                    resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40
                    placeholder:text-gray-400
                    transition-all
                    ${sending ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  style={{
                    minHeight: '120px',
                    maxHeight: '280px',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }}
                />
              </div>

              {/* Stats et boutons */}
              <div className="flex items-center justify-between gap-3 pt-1">
                {/* Stats */}
                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                  <span>{charCount} car.</span>
                  <span>•</span>
                  <span>{wordCount} mot{wordCount > 1 ? 's' : ''}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={onClearClipboard}
                    disabled={!hasContent || sending}
                    className="px-3 py-2 text-[13px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Effacer
                  </button>

                  <button
                    onClick={onSend}
                    disabled={!canSend || sending}
                    className={`
                      flex items-center gap-2 px-4 py-2.5
                      text-[13px] font-medium rounded-lg
                      transition-all
                      ${canSend && !sending
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    {sending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Envoi...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Envoyer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // État vide - Design Apple
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-[200px]">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <Search size={24} className="text-gray-400" />
                </div>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  Copiez du contenu pour commencer
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}