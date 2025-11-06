// packages/ui/src/components/layout/MinimalistView.tsx
// 🎯 VERSION OPTIMISÉE - Design minimaliste moderne avec gestion complète images/fichiers

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '../common/MotionWrapper';
import {
  Send, X, Paperclip,
  Image as ImageIcon, Upload, Loader, File
} from 'lucide-react';
import { PageSelector } from '../common/PageSelector';
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
  onPageSelect: (page: NotionPage) => void;
  onSend: () => void;
  onClearClipboard: () => void;
  onExitMinimalist: () => void;
  sending: boolean;
  canSend: boolean;
  attachedFiles?: AttachedFile[];
  onFilesChange?: (files: AttachedFile[]) => void;
  onFileUpload?: (config: any) => Promise<void>;
}

// getPageIcon est maintenant dans PageSelector.tsx

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

// Cette fonction est maintenant dans PageSelector.tsx

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
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  
  // Pas besoin de filteredPages et pageIcon, c'est géré dans PageSelector
  
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
  const handlePageSelect = useCallback((page: NotionPage) => {
    onPageSelect(page);
  }, [onPageSelect]);
  
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
  
  // Navigation clavier et sync sont maintenant gérés dans PageSelector
  
  // ============================================
  // 🎯 RENDER
  // ============================================
  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col bg-white dark:bg-[#191919] relative"
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
        <div className="flex-shrink-0">
          <PageSelector
            selectedPage={selectedPage}
            pages={pages}
            onPageSelect={handlePageSelect}
            placeholder="Sélectionner une page"
            className="w-full"
          />
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