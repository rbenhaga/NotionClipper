// packages/ui/src/components/layout/MinimalistView.tsx
// 🎯 VERSION OPTIMISÉE - Design minimaliste moderne avec gestion complète images/fichiers

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv, MotionButton, MotionMain, MotionAside } from '../common/MotionWrapper';
import {
  ChevronDown, Send, X, Search, FileText, Paperclip,
  Image as ImageIcon, Upload, Check, AlertCircle, Loader, File
} from 'lucide-react';
import { NotionPage } from '../../types';

// Types
interface AttachedFile {
  id: string;
  file?: File;
  url?: string;
  name: string;
  type: string;
  size?: number;
  preview?: string;
}

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
  attachedFiles?: AttachedFile[];
  onFilesChange?: (files: AttachedFile[]) => void;
  onFileUpload?: (config: any) => Promise<void>;
}

// ============================================
// 🎨 HELPERS
// ============================================
function getPageIcon(page: any) {
  if (!page) return { type: 'default', value: null };
  
  if (page.icon) {
    if (page.icon.type === 'emoji') {
      return { type: 'emoji', value: page.icon.emoji };
    } else if (page.icon.type === 'external' && page.icon.external?.url) {
      return { type: 'url', value: page.icon.external.url };
    } else if (page.icon.type === 'file' && page.icon.file?.url) {
      return { type: 'url', value: page.icon.file.url };
    }
  }
  
  return { type: 'default', value: null };
}

// Helper pour construire l'URL de l'image (même logique que ContentEditor)
function getImageSrc(imageData: any): string | null {
  if (!imageData) return null;

  // Cas 1: preview existe (Data URL prête à l'emploi)
  if (imageData.preview) {
    return imageData.preview;
  }

  // Cas 2: content (nouveau format IPC) est une string base64
  if (typeof imageData.content === 'string') {
    return imageData.content.startsWith('data:')
      ? imageData.content
      : `data:image/png;base64,${imageData.content}`;
  }

  // Cas 3: data (ancien format) est une string base64
  if (typeof imageData.data === 'string') {
    return imageData.data.startsWith('data:')
      ? imageData.data
      : `data:image/png;base64,${imageData.data}`;
  }

  // Cas 4: content est un Buffer ou Uint8Array
  if (imageData.content && (imageData.content.buffer || Array.isArray(imageData.content))) {
    try {
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imageData.content)));
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error('Erreur conversion Buffer vers base64:', error);
      return null;
    }
  }

  // Cas 5: data est un Buffer ou Uint8Array
  if (imageData.data && (imageData.data.buffer || Array.isArray(imageData.data))) {
    try {
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imageData.data)));
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error('Erreur conversion Buffer vers base64:', error);
      return null;
    }
  }

  // Cas 6: URL directe
  if (imageData.url) {
    return imageData.url;
  }

  // Cas 7: path local
  if (imageData.path) {
    return `file://${imageData.path}`;
  }

  console.warn('Format d\'image non reconnu dans MinimalistView:', imageData);
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string, size: number = 12) {
  const mainType = type.split('/')[0];
  
  switch (mainType) {
    case 'image':
      return <ImageIcon size={size} className="text-blue-500" />;
    case 'video':
      return <File size={size} className="text-purple-500" />;
    case 'audio':
      return <File size={size} className="text-green-500" />;
    default:
      return <File size={size} className="text-gray-500" />;
  }
}

// ============================================
// 🎨 COMPOSANT: Item de la liste de pages
// ============================================
function PageListItem({
  page,
  isSelected,
  isHighlighted,
  onClick
}: {
  page: NotionPage;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: () => void;
}) {
  const icon = getPageIcon(page);
  
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-all group ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500'
          : isHighlighted
          ? 'bg-gray-50 dark:bg-gray-800/50'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
      }`}
    >
      {icon?.type === 'emoji' ? (
        <span className="text-sm flex-shrink-0">{icon.value}</span>
      ) : icon?.type === 'url' ? (
        <img src={icon.value} alt="" className="w-4 h-4 rounded flex-shrink-0" />
      ) : (
        <FileText size={13} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
      )}
      
      <span className={`text-[13px] truncate flex-1 ${
        isSelected
          ? 'text-blue-900 dark:text-blue-100 font-semibold'
          : 'text-gray-700 dark:text-gray-300'
      }`}>
        {page.title}
      </span>
      
      {isSelected && (
        <Check size={14} className="text-blue-500 flex-shrink-0" />
      )}
    </button>
  );
}

// ============================================
// 🎨 COMPOSANT PRINCIPAL: MinimalistView
// ============================================
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
  onFilesChange
}: MinimalistViewProps) {
  // ============================================
  // 🎯 ÉTATS
  // ============================================
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState('');
  const [selectedPages, setSelectedPages] = useState<NotionPage[]>(selectedPage ? [selectedPage] : []);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // ============================================
  // 🎯 CONTENU ACTUEL
  // ============================================
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
  }, [isEditing, localContent, editedClipboard, clipboard]);
  
  const hasImage = clipboard?.type === 'image' || clipboard?.images?.length > 0;
  const imageData = hasImage ? (clipboard?.type === 'image' ? clipboard : clipboard?.images?.[0]) : null;
  
  const hasTextContent = displayContent.trim().length > 0;
  const hasContent = hasTextContent || hasImage || attachedFiles.length > 0;
  
  const charCount = displayContent.length;
  const wordCount = displayContent.trim() ? displayContent.trim().split(/\s+/).length : 0;
  
  // ============================================
  // 🎯 PAGES FILTRÉES
  // ============================================
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return pages;
    
    const query = searchQuery.toLowerCase();
    return pages.filter(page =>
      page.title.toLowerCase().includes(query)
    );
  }, [pages, searchQuery]);
  
  const pageIcon = selectedPage ? getPageIcon(selectedPage) : null;
  
  // ============================================
  // 🎯 GESTION DU CONTENU
  // ============================================
  const handleStartEdit = () => {
    if (!isEditing) {
      setIsEditing(true);
      setLocalContent(displayContent);
    }
  };
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    
    if (isEditing) {
      onEditContent({
        ...(editedClipboard || clipboard),
        text: newContent,
        content: newContent
      });
    }
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setLocalContent('');
    textareaRef.current?.blur();
  };
  
  // ============================================
  // 🎯 GESTION DES PAGES
  // ============================================
  const handlePageToggle = (page: NotionPage) => {
    setSelectedPages(prev => {
      const isSelected = prev.find(p => p.id === page.id);
      
      if (isSelected) {
        const newSelection = prev.filter(p => p.id !== page.id);
        if (newSelection.length === 0) {
          setShowPageSelector(false);
          setSearchQuery('');
        }
        return newSelection;
      } else {
        return [...prev, page];
      }
    });
  };
  
  const handleApplySelection = () => {
    if (selectedPages.length > 0) {
      const pagesToSend = selectedPages.length === 1 ? selectedPages[0] : selectedPages;
      onPageSelect(pagesToSend);
    }
    setShowPageSelector(false);
    setSearchQuery('');
  };
  
  // ============================================
  // 🎯 DRAG & DROP
  // ============================================
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => prev + 1);
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragging(false);
      }
      return newCount;
    });
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(false);
    setDragCounter(0);
    
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    const newFiles = fileArray.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));
    
    if (onFilesChange) {
      onFilesChange([...attachedFiles, ...newFiles]);
    }
  }, [attachedFiles, onFilesChange]);
  
  // ============================================
  // 🎯 SÉLECTION DE FICHIERS
  // ============================================
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    const newFiles = fileArray.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));
    
    if (onFilesChange) {
      onFilesChange([...attachedFiles, ...newFiles]);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [attachedFiles, onFilesChange]);
  
  const handleRemoveFile = useCallback((fileId: string) => {
    if (onFilesChange) {
      const newFiles = attachedFiles.filter(f => f.id !== fileId);
      onFilesChange(newFiles);
      
      const file = attachedFiles.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
    }
  }, [attachedFiles, onFilesChange]);
  
  // ============================================
  // 🎯 NAVIGATION CLAVIER
  // ============================================
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showPageSelector) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < filteredPages.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : filteredPages.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredPages[selectedIndex]) {
          handlePageToggle(filteredPages[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowPageSelector(false);
        break;
    }
  };
  
  // ============================================
  // 🎯 AUTO-SCROLL DROPDOWN
  // ============================================
  useEffect(() => {
    if (showPageSelector && dropdownRef.current) {
      const selectedElement = dropdownRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, showPageSelector]);
  
  // ============================================
  // 🎯 SYNC SELECTED PAGE
  // ============================================
  useEffect(() => {
    if (selectedPage && !selectedPages.find(p => p.id === selectedPage.id)) {
      setSelectedPages([selectedPage]);
    }
  }, [selectedPage?.id, selectedPages]);
  
  // ============================================
  // 🎯 RENDER
  // ============================================
  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col bg-white dark:bg-[#191919] relative"
      onKeyDown={handleKeyDown}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Overlay de drag & drop */}
      <AnimatePresence>
        {isDragging && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-blue-50/95 dark:bg-blue-900/95 border-4 border-dashed border-blue-400 dark:border-blue-500 rounded-xl flex items-center justify-center"
          >
            <div className="text-center">
              <Upload size={48} className="mx-auto mb-3 text-blue-500" />
              <p className="text-base font-semibold text-blue-900 dark:text-blue-100">
                Déposez vos fichiers
              </p>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
      
      {/* Zone de contenu scrollable avec padding bottom pour le bouton fixe */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 pt-3 pb-16 gap-2.5">
        {/* Sélecteur de page */}
        <div className="flex-shrink-0 relative">
          <button
            onClick={() => setShowPageSelector(!showPageSelector)}
            className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-lg transition-all text-left group"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {selectedPages.length === 0 ? (
                <>
                  <FileText size={16} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className="text-[13px] font-medium text-gray-500 dark:text-gray-400 truncate">
                    Sélectionner une page
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
                            <FileText size={10} className="text-gray-400" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
                    {selectedPages.length} pages
                  </span>
                </>
              )}
            </div>
            
            <ChevronDown
              size={14}
              className={`flex-shrink-0 text-gray-400 transition-transform ${
                showPageSelector ? 'rotate-180' : ''
              }`}
            />
          </button>
          
          {/* Dropdown de sélection de pages */}
          <AnimatePresence>
            {showPageSelector && (
              <MotionDiv
                ref={dropdownRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden"
                style={{ maxHeight: '60vh' }}
              >
                {/* Barre de recherche */}
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher une page..."
                      autoFocus
                      className="w-full pl-8 pr-3 py-1.5 text-[13px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                    />
                  </div>
                </div>
                
                {/* Liste des pages */}
                <div className="max-h-64 overflow-y-auto">
                  {filteredPages.length > 0 ? (
                    filteredPages.map((page, index) => (
                      <div key={page.id} data-index={index}>
                        <PageListItem
                          page={page}
                          isSelected={selectedPages.some(p => p.id === page.id)}
                          isHighlighted={index === selectedIndex}
                          onClick={() => handlePageToggle(page)}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      Aucune page trouvée
                    </div>
                  )}
                </div>
                
                {/* Bouton d'application */}
                {selectedPages.length > 0 && (
                  <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleApplySelection}
                      className="w-full py-1.5 text-[13px] font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      Confirmer ({selectedPages.length})
                    </button>
                  </div>
                )}
              </MotionDiv>
            )}
          </AnimatePresence>
        </div>
        
        {/* Zone de contenu - AJUSTEMENT PARFAIT */}
        <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
          {/* Image si présente - Responsive et élégante */}
          {hasImage && imageData && (() => {
            const imageSrc = getImageSrc(imageData);
            return imageSrc ? (
              <div className="flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-sm">
                <img
                  src={imageSrc}
                  alt="Clipboard"
                  className="w-full max-h-40 object-contain hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    console.error('Image load error in MinimalistView');
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ) : null;
          })()}
          
          {/* Fichiers attachés */}
          {attachedFiles.length > 0 && (
            <div className="flex-shrink-0 flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {attachedFiles.map(file => (
                <div
                  key={file.id}
                  className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-[10px] text-blue-700 dark:text-blue-300"
                >
                  {getFileIcon(file.type, 10)}
                  <span className="truncate max-w-[100px]">{file.name}</span>
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
          
          {/* Textarea - S'AJUSTE AUTOMATIQUEMENT - Seulement si pas d'image seule */}
          {(!hasImage || hasTextContent) && (
            <div className="flex-1 flex flex-col min-h-0 relative">
              {isEditing && hasTextContent && (
                <button
                  onClick={handleCancelEdit}
                  className="absolute top-1 right-1 z-10 px-1.5 py-0.5 text-[9px] font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                  title="Annuler les modifications"
                >
                  <X size={9} className="inline mr-0.5" />
                  Annuler
                </button>
              )}
              
              <textarea
                ref={textareaRef}
                value={displayContent}
                onChange={handleContentChange}
                onFocus={handleStartEdit}
                placeholder={hasContent ? "" : "Copiez du contenu..."}
                className="flex-1 w-full px-2.5 py-2 text-[12px] border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-100 dark:focus:ring-blue-500/20 transition-all leading-relaxed cursor-text bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 overflow-y-auto"
              />
            </div>
          )}
          
          {/* Espace flexible si image seule */}
          {hasImage && !hasTextContent && (
            <div className="flex-1" />
          )}
          
          {/* Barre d'info et actions en bas */}
          <div className="flex-shrink-0 flex items-center justify-between pt-1">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <span>{charCount} car</span>
              {hasTextContent && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span>{wordCount} mots</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {/* Bouton joindre fichier */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
                title="Joindre un fichier"
              >
                <Paperclip size={14} />
              </button>
              
              {/* Bouton d'envoi */}
              <button
                onClick={onSend}
                disabled={!canSend || sending}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-200 ${
                  canSend && !sending
                    ? 'bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-100 text-white dark:text-gray-900 shadow-sm hover:shadow-md active:scale-[0.98]'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                {sending ? (
                  <>
                    <Loader className="animate-spin" size={11} />
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
          
          {/* Input file caché */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv"
          />
        </div>
      </div>
    </div>
  );
}