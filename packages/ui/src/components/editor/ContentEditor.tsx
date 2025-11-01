import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv, MotionButton, MotionMain } from '../common/MotionWrapper';
import {
  Send, Copy, Edit3, X,
  Loader, Paperclip, ChevronDown, FileText, Database, ArrowUpRight
} from 'lucide-react';
import { FileCarousel } from './FileCarousel';
import { FileUploadModal } from './FileUploadModal';
import { DestinationsCarousel } from './DestinationsCarousel';

const MAX_CLIPBOARD_LENGTH = 200000;

// Interfaces
interface AttachedFile {
  id: string;
  file?: File;
  url?: string;
  name: string;
  type: string;
  size?: number;
  preview?: string;
}

interface ContentEditorProps {
  clipboard: any;
  editedClipboard: any;
  onEditContent: (content: any) => void;
  onClearClipboard: () => void;
  selectedPage: any;
  selectedPages: string[];
  multiSelectMode: boolean;
  sending: boolean;
  onSend: () => void;
  canSend: boolean;
  contentProperties: any;
  onUpdateProperties: (properties: any) => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  pages: any[];
  onDeselectPage?: (pageId: string) => void;
  showPreview?: boolean;
  config: any;
  // 🆕 Props pour les sections sélectionnées
  selectedSections?: Array<{ pageId: string; blockId: string; headingText: string }>;
  onSectionSelect?: (pageId: string, blockId: string, headingText: string) => void;
  // 🆕 Props pour les fichiers attachés
  attachedFiles?: AttachedFile[];
  onFilesChange?: (files: AttachedFile[]) => void;
  onFileUpload?: (config: any) => Promise<void>;
  maxFileSize?: number;
  allowedFileTypes?: string[];
}

// Helper pour l'icône de page
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

// ImagePreview amélioré avec debug
function ImagePreview({ imageData, size }: any) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Construire l'URL de l'image
  const getImageSrc = () => {
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

    console.warn('Format d\'image non reconnu:', imageData);
    return null;
  };

  const imageSrc = getImageSrc();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="font-medium">Image capturée</span>
        </div>
        {size && (
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md font-mono">
            {formatSize(size)}
          </span>
        )}
      </div>

      <div className="group relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-200">
        {imageSrc ? (
          <>
            <div className="relative">
              <img
                src={imageSrc}
                alt="Clipboard"
                className="w-full max-h-96 object-contain bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900"
                onLoad={() => {
                  setImageLoaded(true);
                  setImageError(false);
                }}
                onError={(e) => {
                  setImageError(true);
                  setImageLoaded(false);
                  console.error('❌ Erreur chargement image:', e);
                }}
              />

              {/* Overlay avec actions au hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-2">
                  <button className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-colors">
                    <ArrowUpRight size={16} className="text-gray-700 dark:text-gray-300" />
                  </button>
                  <button className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-colors">
                    <Copy size={16} className="text-gray-700 dark:text-gray-300" />
                  </button>
                </div>
              </div>
            </div>

            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Chargement...</span>
                </div>
              </div>
            )}

            {imageError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-3">
                  <X size={20} className="text-red-500" />
                </div>
                <span className="text-sm font-medium">Impossible de charger l'image</span>
                <span className="text-xs mt-1 opacity-70">Vérifiez le format du fichier</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
              <FileText size={20} />
            </div>
            <span className="text-sm font-medium">Image non disponible</span>
            <span className="text-xs mt-1 opacity-70">Aucune donnée d'image trouvée</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Modal Emoji
function EmojiInputModal({ initial, onClose, onSubmit }: any) {
  const [value, setValue] = useState(initial || '📄');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-6 w-80 border border-gray-100"
      >
        <h3 className="text-base font-medium text-gray-900 mb-4">Choisir un emoji</h3>
        <input
          type="text"
          className="text-5xl text-center w-full border border-gray-200 rounded-xl py-4 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
          value={value}
          onChange={e => setValue(e.target.value)}
          maxLength={2}
          autoFocus
        />
        <div className="flex gap-2 mt-6">
          <button
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all border border-gray-200"
            onClick={onClose}
          >
            Annuler
          </button>
          <button
            className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-all shadow-sm"
            onClick={() => { if (value.trim()) onSubmit(value.trim()); }}
          >
            Valider
          </button>
        </div>
      </MotionDiv>
    </div>
  );
}

export function ContentEditor({
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
  showNotification,
  pages,
  onDeselectPage,
  showPreview,
  config,
  // 🆕 Props pour les fichiers attachés
  attachedFiles = [],
  onFilesChange,
  onFileUpload,
  maxFileSize = 20 * 1024 * 1024,
  allowedFileTypes = [],
  // 🆕 Props pour les sections sélectionnées
  selectedSections = [],
  onSectionSelect
}: ContentEditorProps) {
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);
  const [wasTextTruncated, setWasTextTruncated] = useState(false);
  const [hasScrollbar, setHasScrollbar] = useState(false);
  const destinationRef = useRef<HTMLDivElement>(null);

  // 🆕 États pour les fichiers attachés
  const [showFileModal, setShowFileModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);



  // Définir currentClipboard d'abord
  const currentClipboard = editedClipboard || clipboard;

  // ✅ PRIORITÉ ABSOLUE: Contenu édité (protégé) > Contenu clipboard
  const rawText = editedClipboard?.text
    ?? editedClipboard?.content
    ?? editedClipboard?.data
    ?? currentClipboard?.text
    ?? currentClipboard?.content
    ?? currentClipboard?.data
    ?? '';

  const contentText = typeof rawText === 'string' ? rawText : '';

  // Calculer la hauteur dynamique
  const lineCount = contentText.split('\n').length;
  const charPerLine = 100;
  const estimatedLines = Math.max(lineCount, Math.ceil(contentText.length / charPerLine));
  const lineHeight = 20;
  const padding = 40; // Augmenté pour mieux s'aligner
  const minHeight = 140; // Augmenté pour plus d'espace
  const maxHeight = 280; // Augmenté pour plus d'espace
  const dynamicHeight = Math.min(maxHeight, Math.max(minHeight, (estimatedLines * lineHeight) + padding));

  // Détecter si scrollbar nécessaire
  useEffect(() => {
    const element = destinationRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(() => {
      const needsScrollbar = element.scrollWidth > element.clientWidth;
      setHasScrollbar(needsScrollbar);
    });

    resizeObserver.observe(element);

    const needsScrollbar = element.scrollWidth > element.clientWidth;
    setHasScrollbar(needsScrollbar);

    return () => resizeObserver.disconnect();
  }, [selectedPages || [], selectedPage, multiSelectMode]);

  // États (simplifiés - formatage retiré)
  const [isDatabasePage, setIsDatabasePage] = useState(false);
  const [databaseSchema, setDatabaseSchema] = useState<any>(null);
  const [loadingSchema, setLoadingSchema] = useState(false);

  // Mettre à jour les propriétés (simplifié - plus d'options de formatage)
  useEffect(() => {
    const properties = {};
    onUpdateProperties(properties);
  }, []); // Pas de dépendances, plus d'options de formatage

  // Détecter database page
  useEffect(() => {
    if (selectedPage) {
      const isDatabasePage = selectedPage && (
        selectedPage.object === 'database' ||
        (selectedPage.parent?.type === 'database_id' && selectedPage.parent?.database_id) ||
        (selectedPage.parent?.type === 'data_source_id' && selectedPage.parent?.data_source_id)
      );
      setIsDatabasePage(isDatabasePage);
    } else {
      setIsDatabasePage(false);
    }
  }, [selectedPage]);

  // Handlers simplifiés (formatage retiré)

  // 🆕 Handlers pour les fichiers attachés
  const handleFileUpload = async (config: any) => {
    if (onFileUpload) {
      await onFileUpload(config);
    }

    // Ajouter les fichiers à la liste
    if (config.files) {
      const newFiles: AttachedFile[] = await Promise.all(
        config.files.map(async (file: File) => {
          // Créer preview pour les images
          let preview: string | undefined;
          if (file.type.startsWith('image/')) {
            preview = await createImagePreview(file);
          }

          return {
            id: `${Date.now()}-${Math.random()}`,
            file,
            name: file.name,
            type: file.type,
            size: file.size,
            preview
          };
        })
      );

      onFilesChange?.([...attachedFiles, ...newFiles]);
    } else if (config.url) {
      // Fichier depuis URL
      const newFile: AttachedFile = {
        id: `${Date.now()}-${Math.random()}`,
        url: config.url,
        name: config.url.split('/').pop() || 'Fichier externe',
        type: 'external'
      };

      onFilesChange?.([...attachedFiles, newFile]);
    }
  };

  // Créer preview image
  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  // Retirer un fichier
  const handleRemoveFile = (id: string) => {
    onFilesChange?.(attachedFiles.filter(f => f.id !== id));
  };



  // Wrapper simple pour onSend
  const handleSendWithPosition = useCallback(async () => {
    await onSend();
  }, [onSend]);

  // Drag & drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileUpload({ mode: 'local', files });
    }
  };

  // Fetch database schema
  const fetchDatabaseSchema = useCallback(async () => {
    if (!selectedPage || !isDatabasePage) {
      setDatabaseSchema(null);
      setLoadingSchema(false);
      return;
    }

    setLoadingSchema(true);
    try {
      if (selectedPage.object === 'database') {
        // @ts-ignore
        const schema = await window.electronAPI?.getDatabase(selectedPage.id);
        if (schema && schema.properties) {
          setDatabaseSchema(schema);
        } else {
          setDatabaseSchema(null);
        }
      } else if (selectedPage.parent?.database_id || selectedPage.parent?.data_source_id) {
        // @ts-ignore
        const response = await window.electronAPI?.getPageInfo(selectedPage.id);
        if (response?.databaseSchema?.properties) {
          setDatabaseSchema(response.databaseSchema);
        } else {
          setDatabaseSchema(null);
        }
      } else {
        setDatabaseSchema(null);
      }
    } catch (error) {
      console.error('Error fetching schema:', error);
      setDatabaseSchema(null);
    } finally {
      setLoadingSchema(false);
    }
  }, [selectedPage, isDatabasePage]);

  useEffect(() => {
    fetchDatabaseSchema();
  }, [fetchDatabaseSchema]); // Utilisation de fetchDatabaseSchema qui est correctement mémorisé

  const getTargetInfo = () => {
    if (multiSelectMode) {
      const pages = selectedPages || [];
      if (pages.length === 0) return 'Sélectionnez des pages';
      if (pages.length === 1) return `Envoyer vers 1 page`;
      return `Envoyer vers ${pages.length} pages`;
    } else {
      if (!selectedPage) return 'Sélectionnez une page';
      return `Envoyer vers "${selectedPage.title || 'Page'}"`;
    }
  };

  return (
    <MotionMain
      className="flex-1 flex flex-col bg-[#fafafa] dark:bg-[#191919] min-h-0 relative overflow-y-auto custom-scrollbar"
      animate={{ marginLeft: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex-1">
        {/* PRESSE-PAPIERS */}
        <div className="p-6">
          <div className="bg-white dark:bg-[#202020] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div
              className="px-6 py-5 cursor-pointer select-none hover:bg-gray-50/30 dark:hover:bg-gray-800/30 transition-all"
              onClick={() => setPropertiesCollapsed(!propertiesCollapsed)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-800/20 flex items-center justify-center">
                    <Copy size={14} className="text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Presse-papiers</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Contenu à envoyer</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {currentClipboard?.truncated && (
                    <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2.5 py-1 rounded-lg font-medium">
                      Tronqué
                    </span>
                  )}
                  {editedClipboard && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg font-medium">
                      Modifié
                    </span>
                  )}
                  <div className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
                    <ChevronDown
                      size={14}
                      className={`text-gray-400 dark:text-gray-500 transition-transform ${propertiesCollapsed ? '' : 'rotate-180'}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {!propertiesCollapsed && (
                <MotionDiv
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-gray-50 dark:border-gray-800"
                >
                  <div className="p-6">
                    {currentClipboard ? (
                      <div className="space-y-4">
                        {currentClipboard.type === 'image' ? (
                          <ImagePreview
                            imageData={currentClipboard}
                            size={currentClipboard.bufferSize || currentClipboard.data?.length}
                          />
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <Edit3 size={12} />
                                Éditer le contenu
                              </label>
                              {editedClipboard && (
                                <button
                                  onClick={() => {
                                    console.log('[EDITOR] 🔄 User explicitly cancelled modifications');
                                    // ✅ Reset explicite - Le nouveau clipboard sera affiché
                                    onEditContent(null);
                                    setWasTextTruncated(false);
                                    if (showNotification) {
                                      showNotification('Modifications annulées - affichage du dernier contenu copié', 'info');
                                    }
                                  }}
                                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                                >
                                  <X size={12} />
                                  Annuler les modifications
                                </button>
                              )}
                            </div>

                            {/* Contenu éditable */}
                            <div className="relative group">
                              <div
                                className={`relative w-full rounded-xl border transition-all duration-200 overflow-hidden
                                  ${editedClipboard
                                    ? 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#202020] hover:border-gray-300 dark:hover:border-gray-600'
                                  }
                                  ${isDragging ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}
                                `}
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                              >
                                <textarea
                                  value={contentText || ''}
                                  onChange={(e) => {
                                    let newContent = e.target.value;

                                    // Limiter la longueur
                                    if (newContent.length > MAX_CLIPBOARD_LENGTH) {
                                      newContent = newContent.substring(0, MAX_CLIPBOARD_LENGTH);
                                      if (!wasTextTruncated) {
                                        setWasTextTruncated(true);
                                        if (showNotification) {
                                          showNotification('Contenu limité à 200 000 caractères', 'warning');
                                        }
                                      }
                                    } else {
                                      setWasTextTruncated(false);
                                    }

                                    // ✅ Créer le contenu édité avec marqueur "edited"
                                    const updatedContent = {
                                      ...currentClipboard,
                                      text: newContent,
                                      content: newContent,
                                      data: newContent,
                                      edited: true,
                                      timestamp: Date.now()
                                    };

                                    onEditContent(updatedContent);
                                  }}
                                  placeholder="Éditez votre contenu ici ou glissez des fichiers..."
                                  style={{ height: `${dynamicHeight}px` }}
                                  className={`w-full p-4 bg-transparent resize-none border-none outline-none rounded-xl
                                    text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                                    font-mono text-sm leading-relaxed
                                    focus:ring-0 focus:outline-none transition-all custom-scrollbar`}
                                  maxLength={MAX_CLIPBOARD_LENGTH}
                                />

                                {/* Overlay drag & drop */}
                                <AnimatePresence>
                                  {isDragging && (
                                    <MotionDiv
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                      className="absolute inset-0 bg-blue-50/80 backdrop-blur-sm rounded-xl flex items-center justify-center pointer-events-none"
                                    >
                                      <div className="text-center">
                                        <Paperclip size={48} className="mx-auto mb-3 text-blue-500" />
                                        <p className="text-lg font-medium text-blue-900">Déposez vos fichiers ici</p>
                                      </div>
                                    </MotionDiv>
                                  )}
                                </AnimatePresence>
                              </div>

                              {/* Barre du bas avec compteur */}
                              <div className="flex items-center justify-between pt-3 px-4 py-3 mt-4">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs transition-colors ${contentText.length >= MAX_CLIPBOARD_LENGTH
                                    ? 'text-red-600 dark:text-red-400 font-medium'
                                    : contentText.length >= MAX_CLIPBOARD_LENGTH * 0.9
                                      ? 'text-orange-600 dark:text-orange-400'
                                      : 'text-gray-500 dark:text-gray-400'
                                    }`}>
                                    {contentText.length.toLocaleString()} / {MAX_CLIPBOARD_LENGTH.toLocaleString()} caractères
                                  </span>
                                </div>

                                {/* Bouton Joindre */}
                                <MotionButton
                                  onClick={() => setShowFileModal(true)}
                                  disabled={sending}
                                  className={`group flex items-center gap-2 px-4 py-2 rounded-lg
                                    transition-all duration-200 font-medium text-sm
                                    ${sending
                                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm hover:shadow'
                                    }`}
                                  whileHover={!sending ? { scale: 1.02 } : {}}
                                  whileTap={!sending ? { scale: 0.98 } : {}}
                                >
                                  {sending ? (
                                    <>
                                      <Loader size={16} className="animate-spin" />
                                      <span>Upload...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Paperclip size={16} className="text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
                                      <span>Joindre</span>
                                    </>
                                  )}
                                </MotionButton>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-64 flex flex-col items-center justify-center text-center rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                          <Copy size={20} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Aucun contenu copié</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Copiez du texte ou une image pour commencer</p>
                      </div>
                    )}
                  </div>
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 🆕 CAROUSEL DE FICHIERS */}
        {attachedFiles.length > 0 && (
          <div className="px-6 pb-6">
            <FileCarousel
              files={attachedFiles}
              onRemove={handleRemoveFile}
            />
          </div>
        )}

        {/* 🆕 DESTINATIONS AVEC TOC INTÉGRÉ */}
        <div className="px-6 pb-6">
          <DestinationsCarousel
            selectedPage={selectedPage}
            selectedPages={selectedPages}
            multiSelectMode={multiSelectMode}
            pages={pages}
            onDeselectPage={onDeselectPage}
            onSectionSelect={onSectionSelect}
            selectedSections={selectedSections}
          />
        </div>
      </div>

      {/* BOUTON FIXE - Positionné par rapport au ContentEditor */}
      <div
        className="sticky bottom-0 left-0 right-0 p-6 bg-white/95 dark:bg-[#191919]/95 backdrop-blur-sm border-t border-gray-100 dark:border-[#373737] mt-auto"
        style={{ zIndex: 1000 }}
      >
        <MotionButton
          className={`w-full py-3 px-6 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2.5 ${!canSend
            ? 'bg-gray-100 dark:bg-[#373737] text-gray-400 dark:text-white/70 cursor-not-allowed border border-gray-200 dark:border-[#4a4a4a]'
            : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-100 shadow-sm hover:shadow-md border border-transparent'
            }`}
          onClick={handleSendWithPosition}
          disabled={!canSend}
          whileTap={{ scale: canSend ? 0.98 : 1 }}
        >
          <AnimatePresence mode="wait">
            {sending ? (
              <MotionDiv key="sending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5">
                <Loader size={16} className="animate-spin" />
                <span>Envoi en cours...</span>
              </MotionDiv>
            ) : (
              <MotionDiv key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5">
                <Send size={16} />
                <span>{getTargetInfo()}</span>
              </MotionDiv>
            )}
          </AnimatePresence>
        </MotionButton>
      </div>

      {/* 🆕 MODAL D'UPLOAD DE FICHIERS */}
      <FileUploadModal
        isOpen={showFileModal}
        onClose={() => setShowFileModal(false)}
        onAdd={handleFileUpload}
        maxSize={maxFileSize}
        allowedTypes={allowedFileTypes}
      />




    </MotionMain>
  );
}