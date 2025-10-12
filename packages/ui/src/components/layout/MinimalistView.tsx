import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Send, X, Search, FileText, Eye } from 'lucide-react';
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
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ✅ FIX: Calculer le contenu à afficher avec priorité correcte
  const displayContent = useMemo(() => {
    // Si on est en mode édition, afficher le contenu local
    if (isEditing) {
      return localContent;
    }
    // Si l'utilisateur a édité le contenu, afficher la version éditée
    if (editedClipboard !== null && editedClipboard !== undefined) {
      return typeof editedClipboard === 'string' ? editedClipboard : '';
    }
    // Sinon, afficher le contenu du clipboard
    if (clipboard?.text && typeof clipboard.text === 'string') return clipboard.text;
    if (clipboard?.content && typeof clipboard.content === 'string') return clipboard.content;
    if (clipboard?.data && typeof clipboard.data === 'string') return clipboard.data;
    return '';
  }, [editedClipboard, clipboard, isEditing, localContent]);

  // Top 5 pages récentes
  const suggestedPages = useMemo(() => {
    return [...pages].sort((a, b) => {
      const dateA = new Date(a.last_edited_time || 0).getTime();
      const dateB = new Date(b.last_edited_time || 0).getTime();
      return dateB - dateA;
    }).slice(0, 5);
  }, [pages]);

  // Filtrage des pages
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return pages;
    const query = searchQuery.toLowerCase();
    return pages.filter(page =>
      page.title.toLowerCase().includes(query)
    );
  }, [pages, searchQuery]);

  // ✅ FIX: Auto-resize textarea avec hauteur dynamique
  useEffect(() => {
    if (textareaRef.current && containerRef.current) {
      textareaRef.current.style.height = 'auto';
      // Calculer la hauteur disponible
      const containerHeight = containerRef.current.clientHeight;
      const maxHeight = Math.max(containerHeight - 180, 150); // Au moins 150px
      const newHeight = Math.min(textareaRef.current.scrollHeight, maxHeight);
      textareaRef.current.style.height = newHeight + 'px';
    }
  }, [displayContent, isEditing]);

  // ✅ NOUVEAU: Démarrer l'édition
  const handleStartEdit = () => {
    setIsEditing(true);
    setLocalContent(displayContent);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  // ✅ NOUVEAU: Annuler l'édition
  const handleCancelEdit = () => {
    setIsEditing(false);
    setLocalContent('');
  };

  // ✅ NOUVEAU: Sauvegarder l'édition
  const handleSaveEdit = () => {
    onEditContent(localContent);
    setIsEditing(false);
  };

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
          setShowPageSelector(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowPageSelector(false);
        break;
    }
  };

  const handlePageSelect = (page: NotionPage) => {
    onPageSelect(page);
    setShowPageSelector(false);
    setSearchQuery('');
  };

  // Icône de la page sélectionnée
  const pageIcon = selectedPage ? getPageIcon(selectedPage) : null;
  const hasContent = !!displayContent && displayContent.trim().length > 0;

  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col bg-white relative"
      onKeyDown={handleKeyDown}
    >
      {/* Header compact avec bouton retour */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onExitMinimalist}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-all"
            title="Retour au mode normal"
          >
            <X size={16} className="text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700">Mode Compact</span>
        </div>
        <span className="text-xs text-gray-500">
          {hasContent ? `${displayContent.length} caractères` : 'Aucun contenu'}
        </span>
      </div>

      {/* Container principal avec scroll */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {hasContent ? (
          <div className="flex-1 flex flex-col min-h-0 p-4 gap-3">
            {/* Sélecteur de page */}
            <div className="flex-shrink-0 relative">
              <button
                onClick={() => setShowPageSelector(!showPageSelector)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all text-left"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  {pageIcon?.type === 'emoji' ? (
                    <span className="text-lg flex-shrink-0">{pageIcon.value}</span>
                  ) : pageIcon?.type === 'url' ? (
                    <img src={pageIcon.value} alt="" className="w-5 h-5 rounded flex-shrink-0" />
                  ) : (
                    <FileText size={18} className="text-gray-400 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {selectedPage ? selectedPage.title : 'Sélectionner une page'}
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 flex-shrink-0 transition-transform ${showPageSelector ? 'rotate-180' : ''
                    }`}
                />
              </button>

              {/* Dropdown des pages */}
              <AnimatePresence>
                {showPageSelector && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-50 w-full mt-2 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden"
                  >
                    {/* Recherche */}
                    <div className="p-2 border-b border-gray-100">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Rechercher..."
                          className="w-full pl-8 pr-3 py-1.5 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-lg bg-gray-50"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Liste des pages avec scroll */}
                    <div className="max-h-64 overflow-y-auto minimalist-scrollbar">
                      {searchQuery ? (
                        // Mode recherche
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
                          {/* Suggérées */}
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ✅ FIX: Contenu éditable avec hauteur adaptative */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">Contenu</label>
                {!isEditing && hasContent && (
                  <button
                    onClick={handleStartEdit}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Eye size={12} />
                    Éditer
                  </button>
                )}
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="text-xs text-gray-600 hover:text-gray-800"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Sauvegarder
                    </button>
                  </div>
                )}
              </div>

              <textarea
                ref={textareaRef}
                value={isEditing ? localContent : displayContent}
                onChange={(e) => {
                  if (isEditing) {
                    setLocalContent(e.target.value);
                  }
                }}
                readOnly={!isEditing}
                placeholder="Copiez du contenu pour commencer..."
                className={`w-full flex-1 min-h-[100px] px-3 py-2 text-[13px] border rounded-lg resize-none focus:outline-none transition-all ${isEditing
                  ? 'border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white'
                  : 'border-gray-200 bg-gray-50 cursor-default'
                  }`}
              />
            </div>

            {/* Actions - ✅ FIX: BOUTON "EFFACER" RETIRÉ */}
            <div className="flex-shrink-0 flex items-center justify-between pt-2">
              <div className="text-xs text-gray-500">
                {selectedPage ? '1 page' : 'Aucune page'} sélectionnée
              </div>

              {/* Bouton Envoyer uniquement */}
              <button
                onClick={onSend}
                disabled={!canSend || sending}
                className={`flex items-center gap-2 px-4 py-2.5
                  text-[13px] font-medium rounded-lg
                  transition-all
                  ${canSend && !sending
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
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
        ) : (
          // État vide
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
  );
}

// Composant pour un item de page dans la liste
function PageListItem({
  page,
  isSelected,
  onClick
}: {
  page: NotionPage;
  isSelected: boolean;
  onClick: () => void;
}) {
  const icon = getPageIcon(page);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-all ${isSelected ? 'bg-blue-50' : ''
        }`}
    >
      {icon?.type === 'emoji' ? (
        <span className="text-base flex-shrink-0">{icon.value}</span>
      ) : icon?.type === 'url' ? (
        <img src={icon.value} alt="" className="w-4 h-4 rounded flex-shrink-0" />
      ) : (
        <FileText size={14} className="text-gray-400 flex-shrink-0" />
      )}
      <span className="text-sm text-gray-700 truncate flex-1">{page.title}</span>
    </button>
  );
}