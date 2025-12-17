// packages/ui/src/components/layout/MinimalistView.tsx
// 🎯 VERSION OPTIMISÉE - Design minimaliste moderne avec gestion complète images/fichiers

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '../common/MotionWrapper';
import {
  Send, X, Paperclip,
  Image as ImageIcon, Upload, Loader, File
} from 'lucide-react';
import { PageSelector } from '../common/PageSelector';
import { NotionPage } from '../../types';
import { useTranslation } from '@notion-clipper/i18n';

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
  // 🆕 Quota check Compact Mode (MinimalistView)
  onCompactModeCheck?: () => Promise<{ canUse: boolean; quotaReached: boolean; remaining?: number }>;
  onQuotaExceeded?: () => void;
  isCompactModeActive?: boolean; // Pour tracker le temps d'utilisation
  onTrackCompactUsage?: (minutes: number) => Promise<void>; // Track minutes utilisées
  // 🔒 SECURITY: File quota enforcement
  fileQuotaRemaining?: number | null;
  onFileQuotaExceeded?: () => void;
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
  onFilesChange,
  isCompactModeActive,
  onTrackCompactUsage,
  fileQuotaRemaining,
  onFileQuotaExceeded
}: MinimalistViewProps) {
  const { t } = useTranslation();

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

  // 🆕 PHASE 3: Time tracking Compact Mode (1min intervals)
  // 🔧 FIX: Use ref to avoid infinite loop caused by callback changes
  const trackingCallbackRef = useRef(onTrackCompactUsage);
  
  useEffect(() => {
    trackingCallbackRef.current = onTrackCompactUsage;
  }, [onTrackCompactUsage]);

  useEffect(() => {
    if (!isCompactModeActive || !trackingCallbackRef.current) return;

    console.log('[CompactMode] Starting time tracking (1min intervals)');
    let minutesTracked = 0;
    const startTime = Date.now(); // 🔒 SECURITY: Store start time

    const interval = setInterval(async () => {
      minutesTracked++;
      console.log(`[CompactMode] Tracking usage: ${minutesTracked} minute(s)`);

      try {
        if (trackingCallbackRef.current) {
          await trackingCallbackRef.current(1); // Track 1 minute
        }
      } catch (error) {
        console.error('[CompactMode] Error tracking usage:', error);
      }
    }, 60000); // Toutes les 60 secondes = 1 minute

    return () => {
      clearInterval(interval);

      // 🔒 SECURITY FIX: Track any remaining partial time to prevent "cracking" by closing before 1 minute
      const elapsedMs = Date.now() - startTime;
      const elapsedMinutes = elapsedMs / 60000; // Convert to minutes
      const remainingMinutes = elapsedMinutes - minutesTracked;

      if (remainingMinutes > 0 && trackingCallbackRef.current) {
        const minutesToTrack = Math.ceil(remainingMinutes); // Round up to prevent gaming the system
        console.log(`[CompactMode] 🔒 Tracking remaining ${remainingMinutes.toFixed(2)} min (rounded to ${minutesToTrack} min) on close`);

        try {
          trackingCallbackRef.current(minutesToTrack);
        } catch (error) {
          console.error('[CompactMode] Error tracking remaining time:', error);
        }
      }

      console.log(`[CompactMode] Stopped time tracking (total tracked: ${minutesTracked} min)`);
    };
  }, [isCompactModeActive]); // 🔧 FIX: Only depend on isCompactModeActive, not the callback

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

    // 🔒 SECURITY: Check file quota before accepting drop
    if (fileQuotaRemaining !== null && fileQuotaRemaining !== undefined) {
      if (fileQuotaRemaining === 0) {
        console.warn('[MinimalistView] Drag & drop blocked - file quota = 0');
        if (onFileQuotaExceeded) {
          onFileQuotaExceeded();
        }
        return;
      }

      if (fileArray.length > fileQuotaRemaining) {
        console.warn(`[MinimalistView] Limiting drag & drop: ${fileArray.length} files dropped, only ${fileQuotaRemaining} allowed`);

        // Only process files up to quota limit
        const limitedFileArray = fileArray.slice(0, fileQuotaRemaining);
        const newFiles = limitedFileArray.map(file => ({
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
        return;
      }
    }

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
  }, [attachedFiles, onFilesChange, fileQuotaRemaining, onFileQuotaExceeded]);
  
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
  // 🎯 RENDER - Design compact optimisé
  // ============================================
  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col bg-gradient-to-b from-white to-purple-50/20 dark:from-[#191919] dark:to-purple-950/10 relative"
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
            className="absolute inset-0 z-50 bg-purple-50/95 dark:bg-purple-900/95 border-2 border-dashed border-purple-400 dark:border-purple-500 m-1.5 rounded-lg flex items-center justify-center"
          >
            <div className="text-center">
              <Upload size={28} className="mx-auto mb-1.5 text-purple-500" />
              <p className="text-xs font-medium text-purple-700 dark:text-purple-200">
                {t('common.dropYourFiles')}
              </p>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
      
      {/* Zone de contenu scrollable - flex-1 pour prendre l'espace disponible */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-2.5 pt-2.5 pb-2 gap-1.5">
        {/* Sélecteur de page - compact */}
        <div className="flex-shrink-0">
          <PageSelector
            selectedPage={selectedPage}
            pages={pages}
            onPageSelect={handlePageSelect}
            placeholder={t('common.selectPage')}
            className="w-full text-[11px]"
          />
        </div>
        
        {/* Zone de contenu */}
        <div className="flex-1 flex flex-col gap-1.5 min-h-0 overflow-hidden">
          {/* Image si présente */}
          {hasImage && imageData && (() => {
            const imageSrc = getImageSrc(imageData);
            return imageSrc ? (
              <div className="flex-shrink-0 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <img
                  src={imageSrc}
                  alt="Clipboard"
                  className="w-full max-h-28 object-contain"
                  onError={(e) => {
                    console.error('Image load error in MinimalistView');
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ) : null;
          })()}
          
          {/* Fichiers attachés - compact */}
          {attachedFiles.length > 0 && (
            <div className="flex-shrink-0 flex flex-wrap gap-1 max-h-14 overflow-y-auto">
              {attachedFiles.map(file => (
                <div
                  key={file.id}
                  className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded text-[9px] text-purple-700 dark:text-purple-300"
                >
                  {getFileIcon(file.type, 9)}
                  <span className="truncate max-w-[70px]">{file.name}</span>
                  <button
                    onClick={() => handleRemoveFile(file.id)}
                    className="hover:text-red-600 dark:hover:text-red-400"
                  >
                    <X size={9} />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Textarea - compact */}
          {(!hasImage || hasTextContent) && (
            <div className="flex-1 flex flex-col min-h-0 relative">
              {isEditing && hasTextContent && (
                <button
                  onClick={handleCancelEdit}
                  className="absolute top-0.5 right-0.5 z-10 px-1 py-0.5 text-[8px] font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                  title={t('common.cancelModifications')}
                >
                  <X size={8} className="inline" />
                </button>
              )}
              
              <textarea
                ref={textareaRef}
                value={displayContent}
                onChange={handleContentChange}
                onFocus={handleStartEdit}
                placeholder={hasContent ? "" : t('common.copyContent')}
                className="flex-1 w-full px-2 py-1.5 text-[11px] border border-gray-200 dark:border-gray-700 rounded-md resize-none focus:outline-none focus:border-purple-400 dark:focus:border-purple-500 focus:ring-1 focus:ring-purple-200 dark:focus:ring-purple-500/20 transition-all leading-relaxed cursor-text bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 hover:border-purple-300 dark:hover:border-purple-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 overflow-y-auto"
              />
            </div>
          )}
          
          {/* Espace flexible si image seule */}
          {hasImage && !hasTextContent && (
            <div className="flex-1" />
          )}
          
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
      
      {/* Footer FIXE en bas - ne bouge jamais */}
      <div className="flex-shrink-0 px-2.5 py-2 bg-gradient-to-r from-gray-50/90 via-white/80 to-purple-50/30 dark:from-[#141414] dark:via-[#161616] dark:to-purple-900/10 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="text-[9px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
            <span>{charCount}</span>
            {hasTextContent && (
              <>
                <span>•</span>
                <span>{wordCount} mots</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {/* Bouton joindre fichier */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="p-1 rounded text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all disabled:opacity-50"
              title={t('common.attachFile')}
            >
              <Paperclip size={12} />
            </button>
            
            {/* Bouton d'envoi - CTA VIOLET UNIFIÉ */}
            <button
              onClick={onSend}
              disabled={!canSend || sending}
              className={`
                ds-btn ds-btn-sm flex items-center gap-1.5 text-[11px] font-semibold
                ${canSend && !sending
                  ? 'ds-btn-primary'
                  : 'bg-[var(--ds-bg-muted)] text-[var(--ds-fg-subtle)] cursor-not-allowed'
                }
              `}
            >
              {sending ? (
                <>
                  <Loader className="animate-spin" size={11} />
                  <span>{t('common.sending')}</span>
                </>
              ) : (
                <>
                  <Send size={11} />
                  <span>{t('common.send')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}