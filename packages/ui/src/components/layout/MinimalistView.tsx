import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Send, X, Search, FileText, Paperclip, Image as ImageIcon } from 'lucide-react';
import { NotionPage } from '../../types';
import { getPageIcon } from '../../utils/helpers';

export interface MinimalistViewProps {
  clipboard: any;
  editedClipboard: any;
  onEditContent: (content: any) => void;
  selectedPage: NotionPage | null;
  pages: NotionPage[];
  onPageSelect: (page: NotionPage | NotionPage[]) => void;
  onSend: () => void;
  onClearClipboard: () => void;
  onExitMinimalist: () => void;
  sending: boolean;
  canSend: boolean;
  // 🆕 Props pour les fichiers
  attachedFiles?: any[];
  onFilesChange?: (files: any[]) => void;
  onFileUpload?: (config: any) => Promise<void>;
}

export function MinimalistView({
  clipboard,
  editedClipboard,
  onEditContent,
  selectedPage,
  pages,
  onPageSelect,
  onSend,
  sending,
  canSend,
  attachedFiles = [],
  onFilesChange,
  onFileUpload
}: MinimalistViewProps) {
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState('');
  const [selectedPages, setSelectedPages] = useState<NotionPage[]>(selectedPage ? [selectedPage] : []);
  const [showFileModal, setShowFileModal] = useState(false);
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState(400);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🆕 Calculer la hauteur max du dropdown - simple et efficace
  useEffect(() => {
    const updateDropdownHeight = () => {
      if (containerRef.current) {
        const containerHeight = containerRef.current.clientHeight;
        // Dropdown prend 80% de la hauteur disponible, min 250px, max 500px
        const maxHeight = Math.max(Math.min(containerHeight * 0.8, 500), 250);
        setDropdownMaxHeight(maxHeight);
      }
    };

    updateDropdownHeight();
    
    // Observer les changements de taille
    const resizeObserver = new ResizeObserver(updateDropdownHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedPage && !selectedPages.find(p => p.id === selectedPage.id)) {
      setSelectedPages([selectedPage]);
    }
  }, [selectedPage?.id, selectedPages]);

  const displayContent = useMemo(() => {
    if (isEditing) return localContent;

    const rawText = editedClipboard?.text
      ?? editedClipboard?.content
      ?? editedClipboard?.data
      ?? clipboard?.text
      ?? clipboard?.content
      ?? clipboard?.data
      ?? '';

    return typeof rawText === 'string' ? rawText : '';
  }, [editedClipboard, clipboard, isEditing, localContent]);

  const suggestedPages = useMemo(() => {
    return [...pages].sort((a, b) => {
      const dateA = new Date(a.last_edited_time || 0).getTime();
      const dateB = new Date(b.last_edited_time || 0).getTime();
      return dateB - dateA;
    }).slice(0, 5);
  }, [pages]);

  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return pages;
    const query = searchQuery.toLowerCase();
    return pages.filter(page => page.title.toLowerCase().includes(query));
  }, [pages, searchQuery]);

  useEffect(() => {
    if (textareaRef.current && containerRef.current) {
      textareaRef.current.style.height = 'auto';
      const containerHeight = containerRef.current.clientHeight;
      const maxHeight = Math.max(containerHeight - 110, 250);
      const newHeight = Math.min(textareaRef.current.scrollHeight, maxHeight);
      textareaRef.current.style.height = newHeight + 'px';
    }
  }, [displayContent, isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setLocalContent(displayContent);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setLocalContent('');
    onEditContent(null);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);

    const updatedContent = {
      ...clipboard,
      text: newContent,
      content: newContent,
      data: newContent,
      edited: true,
      timestamp: Date.now()
    };

    onEditContent(updatedContent);
  };

  const allPages = useMemo(() => {
    if (searchQuery) return filteredPages;
    return [...suggestedPages, ...pages.filter(p => !suggestedPages.find(sp => sp.id === p.id))];
  }, [searchQuery, filteredPages, suggestedPages, pages]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [allPages]);

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
          handlePageToggle(allPages[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowPageSelector(false);
        break;
    }
  };

  const handlePageToggle = (page: NotionPage) => {
    setSelectedPages(prev => {
      const isSelected = prev.find(p => p.id === page.id);

      if (isSelected) {
        // Désélectionner la page
        const newSelection = prev.filter(p => p.id !== page.id);

        // Si aucune page n'est sélectionnée, fermer le dropdown
        if (newSelection.length === 0) {
          setShowPageSelector(false);
          setSearchQuery('');
        }

        return newSelection;
      } else {
        // Ajouter la page à la sélection
        return [...prev, page];
      }
    });
  };

  const handleApplyMultiSelection = () => {
    if (selectedPages.length > 0) {
      const pagesToSend = selectedPages.length === 1 ? selectedPages[0] : selectedPages;
      onPageSelect(pagesToSend);
    }
    setShowPageSelector(false);
    setSearchQuery('');
  };

  const handleClearSelection = () => {
    setSelectedPages([]);
    setShowPageSelector(false);
    setSearchQuery('');
    onPageSelect(null as any);
  };

  const pageIcon = selectedPage ? getPageIcon(selectedPage) : null;
  const hasContent = !!displayContent && displayContent.trim().length > 0;
  const charCount = displayContent.length;
  const wordCount = displayContent.trim() ? displayContent.trim().split(/\s+/).length : 0;

  // 🆕 Handlers pour les fichiers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      type: file.type,
      size: file.size
    }));

    if (onFilesChange) {
      onFilesChange([...attachedFiles, ...newFiles]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (id: string) => {
    if (onFilesChange) {
      onFilesChange(attachedFiles.filter(f => f.id !== id));
    }
  };

  // Vérifier si le clipboard contient une image
  const hasImage = clipboard?.type === 'image' || clipboard?.images?.length > 0;
  const imageData = clipboard?.type === 'image' ? clipboard : clipboard?.images?.[0];

  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col bg-white dark:bg-[#191919] relative"
      onKeyDown={handleKeyDown}
    >
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 px-4 pt-3 pb-2 gap-2.5">
          <div className="flex-shrink-0 relative">
            <button
              onClick={() => setShowPageSelector(!showPageSelector)}
              className="w-full flex items-center justify-between px-3.5 py-2 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-lg transition-all text-left group"
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                {selectedPages.length === 0 ? (
                  <>
                    <FileText size={16} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-[13px] font-medium text-gray-500 dark:text-gray-400 truncate">
                      Sélectionner des pages
                    </span>
                  </>
                ) : selectedPages.length === 1 ? (
                  <>
                    {pageIcon?.type === 'emoji' ? (
                      <span className="text-base flex-shrink-0">{pageIcon.value}</span>
                    ) : pageIcon?.type === 'url' ? (
                      <img src={pageIcon.value} alt="" className="w-4 h-4 rounded flex-shrink-0" />
                    ) : (
                      <FileText size={16} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    )}
                    <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300 truncate">
                      {selectedPages[0].title}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex -space-x-1 flex-shrink-0">
                      {selectedPages.slice(0, 3).map((page) => {
                        const icon = getPageIcon(page);
                        return (
                          <div key={page.id} className="w-5 h-5 rounded-full bg-white dark:bg-[#191919] flex items-center justify-center border border-gray-200 dark:border-gray-700">
                            {icon?.type === 'emoji' ? (
                              <span className="text-[10px]">{icon.value}</span>
                            ) : (
                              <FileText size={10} className="text-gray-400 dark:text-gray-500" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300 truncate">
                      {selectedPages.length} pages sélectionnées
                    </span>
                  </>
                )}
              </div>
              <ChevronDown
                size={14}
                className={`text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform duration-200 ${showPageSelector ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {showPageSelector && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute z-50 w-full mt-1.5 bg-white dark:bg-[#252525] rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden flex flex-col"
                  style={{ maxHeight: `${dropdownMaxHeight}px` }}
                >
                  {/* Header avec recherche */}
                  <div className="flex-shrink-0 p-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher..."
                        className="w-full pl-8 pr-3 py-1.5 text-[13px] border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Liste des pages - scrollable */}
                  <div className="flex-1 overflow-y-auto minimalist-scrollbar pt-1 min-h-0">
                    {searchQuery ? (
                      <div>
                        {filteredPages.length > 0 ? (
                          filteredPages.map((page, index) => (
                            <PageListItem
                              key={page.id}
                              page={page}
                              isSelected={!!selectedPages.find(p => p.id === page.id)}
                              isHighlighted={selectedIndex === index}
                              onClick={() => handlePageToggle(page)}
                            />
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-[13px] text-gray-500 dark:text-gray-400">
                            Aucune page trouvée
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        {suggestedPages.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Suggérées
                            </div>
                            {suggestedPages.map((page, index) => (
                              <PageListItem
                                key={page.id}
                                page={page}
                                isSelected={!!selectedPages.find(p => p.id === page.id)}
                                isHighlighted={selectedIndex === index}
                                onClick={() => handlePageToggle(page)}
                              />
                            ))}
                          </div>
                        )}

                        {suggestedPages.length > 0 && (
                          <div className="my-1.5 border-t border-gray-100 dark:border-gray-700" />
                        )}

                        <div>
                          <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Toutes ({pages.length})
                          </div>
                          {pages.filter(p => !suggestedPages.find(sp => sp.id === p.id)).map((page, index) => (
                            <PageListItem
                              key={page.id}
                              page={page}
                              isSelected={!!selectedPages.find(p => p.id === page.id)}
                              isHighlighted={selectedIndex === (suggestedPages.length + index)}
                              onClick={() => handlePageToggle(page)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer - toujours visible */}
                  <div className="flex-shrink-0 p-1.5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2 bg-white dark:bg-[#252525]">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {selectedPages.length > 0
                          ? `${selectedPages.length} page${selectedPages.length > 1 ? 's' : ''}`
                          : 'Aucune sélection'
                        }
                      </span>
                      {selectedPages.length > 0 && (
                        <button
                          onClick={handleClearSelection}
                          className="text-[10px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 px-1.5 py-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#2d2d2d] transition-all"
                        >
                          Effacer
                        </button>
                      )}
                    </div>
                    <button
                      onClick={handleApplyMultiSelection}
                      disabled={selectedPages.length === 0}
                      className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-all ${selectedPages.length > 0
                          ? 'text-white dark:text-gray-900 bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-100 active:scale-95'
                          : 'text-gray-400 dark:text-gray-600 bg-gray-200 dark:bg-gray-800 cursor-not-allowed'
                        }`}
                    >
                      OK
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Contenu
              </label>
              {editedClipboard && (
                <button
                  onClick={handleCancelEdit}
                  className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                  title="Revenir au dernier contenu copié"
                >
                  <X size={10} />
                  Annuler
                </button>
              )}
            </div>

            {/* 🆕 Affichage de l'image si présente */}
            {hasImage && imageData && (
              <div className="mb-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <img
                  src={imageData.preview || imageData.content || imageData.data}
                  alt="Clipboard"
                  className="w-full max-h-32 object-contain bg-gray-50 dark:bg-gray-800"
                  onError={(e) => {
                    console.error('Image load error');
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* 🆕 Fichiers attachés */}
            {attachedFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {attachedFiles.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-[10px] text-blue-700 dark:text-blue-300"
                  >
                    <Paperclip size={10} />
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <button
                      onClick={() => handleRemoveFile(file.id)}
                      className="hover:text-red-600 dark:hover:text-red-400"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={displayContent}
              onChange={handleContentChange}
              onFocus={handleStartEdit}
              placeholder={hasContent ? "" : "Copiez du contenu..."}
              className="w-full flex-1 px-2.5 py-2 text-[12px] border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-100 dark:focus:ring-blue-500/20 transition-all leading-relaxed cursor-text bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          <div className="flex-shrink-0 flex items-center justify-between pt-1 gap-1">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span>{charCount}</span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span>{wordCount}</span>
            </div>

            <div className="flex items-center gap-1">
              {/* 🆕 Bouton joindre fichier */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
                title="Joindre un fichier"
              >
                <Paperclip size={14} />
              </button>

              <button
                onClick={onSend}
                disabled={!canSend || sending}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-200 ${canSend && !sending
                  ? 'bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-100 text-white dark:text-gray-900 shadow-sm hover:shadow-md active:scale-[0.98]'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
              >
                {sending ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 dark:border-gray-900/30 border-t-white dark:border-t-gray-900 rounded-full animate-spin" />
                    <span>Envoi...</span>
                  </>
                ) : (
                  <>
                    <Send size={11} />
                    <span>Envoyer</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 🆕 Input file caché */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf"
          />
        </div>
      </div>
    </div>
  );
}

function PageListItem({
  page,
  isSelected,
  isHighlighted,
  onClick
}: {
  page: NotionPage;
  isSelected: boolean;
  isHighlighted?: boolean;
  onClick: () => void;
}) {
  const icon = getPageIcon(page);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-all group relative ${isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500 dark:border-blue-400'
          : isHighlighted
            ? 'bg-gray-50 dark:bg-gray-800/50'
            : 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
        }`}
    >
      {icon?.type === 'emoji' ? (
        <span className="text-sm flex-shrink-0">{icon.value}</span>
      ) : icon?.type === 'url' ? (
        <img src={icon.value} alt="" className="w-4 h-4 rounded flex-shrink-0" />
      ) : (
        <FileText size={13} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
      )}
      <span className={`text-[13px] truncate flex-1 transition-colors ${isSelected
        ? 'text-blue-900 dark:text-blue-100 font-semibold'
        : 'text-gray-700 dark:text-gray-300'
        }`}>
        {page.title}
      </span>
    </button>
  );
}
