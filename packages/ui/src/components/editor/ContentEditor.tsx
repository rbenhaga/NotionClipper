import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Copy, Edit3, X, ChevronDown, Settings, FileText,
  Database, Sparkles, AlertCircle,
  Loader, Image
} from 'lucide-react';
import { DynamicDatabaseProperties } from './DynamicDatabaseProperties';

const MAX_CLIPBOARD_LENGTH = 200000;

// Interfaces
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

// ImagePreview simple
function ImagePreview({ imageData, size }: any) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Image capturée</span>
        {size && <span>{formatSize(size)}</span>}
      </div>
      <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
        {imageData?.data && (
          <img
            src={`data:image/png;base64,${imageData.data}`}
            alt="Clipboard"
            className="w-full h-full object-contain"
          />
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
      <motion.div
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
      </motion.div>
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
  config
}: ContentEditorProps) {
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [wasTextTruncated, setWasTextTruncated] = useState(false);
  const [showEmojiModal, setShowEmojiModal] = useState(false);
  const [hasScrollbar, setHasScrollbar] = useState(false);
  const destinationRef = useRef<HTMLDivElement>(null);

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
  }, [selectedPages, selectedPage, multiSelectMode]);

  // États
  const [contentType, setContentType] = useState('paragraph');
  const [pageTitle, setPageTitle] = useState('');
  const [tags, setTags] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [pageIcon, setPageIcon] = useState('');
  const [iconModified, setIconModified] = useState(false);
  const [pageCover, setPageCover] = useState('');
  const [isDatabasePage, setIsDatabasePage] = useState(false);
  const [databaseSchema, setDatabaseSchema] = useState<any>(null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [propertyTab, setPropertyTab] = useState('format');

  const currentClipboard = editedClipboard || clipboard;

  // Reset tab si pas database
  useEffect(() => {
    if (selectedPage && !isDatabasePage && propertyTab === 'database') {
      setPropertyTab('format');
    }
  }, [selectedPage, isDatabasePage, propertyTab]);

  // Mettre à jour les propriétés
  useEffect(() => {
    const properties = {
      contentType: contentType || 'paragraph',
      parseAsMarkdown: true,
      ...(pageCover && { cover: pageCover }),
    };
    onUpdateProperties(properties);
  }, [contentType, pageIcon, pageCover, iconModified]);

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

  // Reset en mode multi-select
  useEffect(() => {
    if (multiSelectMode) {
      setPageTitle('');
      setTags('');
      setSourceUrl('');
      setDate(new Date().toISOString().split('T')[0]);
      setPageIcon('');
      setPageCover('');
      setIconModified(false);
      onUpdateProperties({
        contentType: contentType || 'paragraph',
        parseAsMarkdown: true,
        databaseProperties: {},
        icon: '',
        cover: ''
      });
    }
  }, [multiSelectMode, contentType]);

  const handleIconChange = (newIcon: string) => {
    setPageIcon(newIcon);
    setIconModified(true);
    onUpdateProperties({
      ...contentProperties,
      icon: newIcon
    });
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
  }, [selectedPage, isDatabasePage, fetchDatabaseSchema]);

  const getTargetInfo = () => {
    if (multiSelectMode) {
      if (selectedPages.length === 0) return 'Sélectionnez des pages';
      if (selectedPages.length === 1) return `Envoyer vers 1 page`;
      return `Envoyer vers ${selectedPages.length} pages`;
    } else {
      if (!selectedPage) return 'Sélectionnez une page';
      return `Envoyer vers "${selectedPage.title || 'Page'}"`;
    }
  };

  return (
    <motion.main
      className="flex-1 flex flex-col bg-gradient-to-b from-gray-50/50 to-white min-h-0 relative"
      animate={{ marginLeft: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex-1 overflow-y-auto pb-24 notion-scrollbar-vertical">

        {/* PRESSE-PAPIERS */}
        <div className="p-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div
              className="px-6 py-5 cursor-pointer select-none hover:bg-gray-50/30 transition-all"
              onClick={() => setPropertiesCollapsed(!propertiesCollapsed)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
                    <Copy size={14} className="text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Presse-papiers</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Contenu à envoyer</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {currentClipboard?.truncated && (
                    <span className="text-xs text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg font-medium">
                      Tronqué
                    </span>
                  )}
                  {editedClipboard && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg font-medium">
                      Modifié
                    </span>
                  )}
                  <div className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                    <ChevronDown
                      size={14}
                      className={`text-gray-400 transition-transform ${propertiesCollapsed ? '' : 'rotate-180'}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {!propertiesCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-gray-50"
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
                              <label className="text-xs font-medium text-gray-600 flex items-center gap-2">
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
                                  className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-50 transition-all"
                                >
                                  <X size={12} />
                                  Annuler les modifications
                                </button>
                              )}
                            </div>

                            {(() => {
                              // ✅ PRIORITÉ ABSOLUE: Contenu édité (protégé) > Contenu clipboard
                              const rawText = editedClipboard?.text 
                                ?? editedClipboard?.content 
                                ?? editedClipboard?.data
                                ?? currentClipboard?.text 
                                ?? currentClipboard?.content 
                                ?? currentClipboard?.data
                                ?? '';
                              
                              const contentText = typeof rawText === 'string' ? rawText : '';

                              // Log pour debug
                              console.log('[ContentEditor] Content display:', {
                                source: editedClipboard ? '📝 EDITED (protected)' : '📋 CLIPBOARD',
                                isProtected: !!editedClipboard,
                                length: contentText.length,
                                preview: contentText.substring(0, 50) + '...'
                              });

                              // Calculer la hauteur dynamique
                              const lineCount = contentText.split('\n').length;
                              const charPerLine = 100;
                              const estimatedLines = Math.max(lineCount, Math.ceil(contentText.length / charPerLine));
                              const lineHeight = 20;
                              const padding = 32;
                              const minHeight = 120;
                              const maxHeight = 256;
                              const dynamicHeight = Math.min(maxHeight, Math.max(minHeight, (estimatedLines * lineHeight) + padding));

                              return (
                                <>
                                  <textarea
                                    key={`editor-${editedClipboard ? 'edited' : 'clipboard'}-${contentText.length}`}
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

                                      console.log('[ContentEditor] ✏️ Content updated by user:', {
                                        newLength: newContent.length,
                                        isEdited: true,
                                        willBeProtected: true
                                      });

                                      onEditContent(updatedContent);
                                    }}
                                    style={{ height: `${dynamicHeight}px` }}
                                    className="w-full p-4 border border-gray-200 rounded-xl font-mono text-sm text-gray-700 bg-gray-50/50 resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all notion-scrollbar-vertical"
                                    placeholder="Éditez votre contenu ici..."
                                    maxLength={MAX_CLIPBOARD_LENGTH}
                                  />

                                  {/* ✅ INDICATEUR DE PROTECTION */}
                                  {editedClipboard && (
                                    <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                      </svg>
                                      <div className="flex-1">
                                        <span className="font-semibold">Contenu protégé</span>
                                        <span className="text-blue-500 ml-2">
                                          - Les nouveaux contenus copiés n'affecteront pas ce texte jusqu'à l'envoi ou l'annulation
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Compteur de caractères */}
                                  <div className="flex items-center justify-between">
                                    <span className={`text-xs transition-colors ${
                                      contentText.length >= MAX_CLIPBOARD_LENGTH
                                        ? 'text-red-600 font-medium'
                                        : contentText.length >= MAX_CLIPBOARD_LENGTH * 0.9
                                        ? 'text-orange-600'
                                        : 'text-gray-500'
                                    }`}>
                                      {contentText.length.toLocaleString()} / {MAX_CLIPBOARD_LENGTH.toLocaleString()} caractères
                                      {contentText.length >= MAX_CLIPBOARD_LENGTH * 0.9 && (
                                        <span className="ml-2">
                                          {contentText.length >= MAX_CLIPBOARD_LENGTH 
                                            ? '⚠️ Limite atteinte'
                                            : '⚡ Approche de la limite'}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-64 flex flex-col items-center justify-center text-center rounded-xl bg-gray-50/50 border border-gray-100">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                          <Copy size={20} className="text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">Aucun contenu copié</p>
                        <p className="text-xs text-gray-400 mt-1">Copiez du texte ou une image pour commencer</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* OPTIONS */}
        {currentClipboard && (
          <div className="px-6 pb-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setOptionsExpanded(!optionsExpanded)}
                className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                    <Settings size={14} className="text-purple-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-gray-900">Options d'envoi</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {contentType !== 'paragraph' && (
                        <span className="inline-flex items-center gap-1 mr-2">
                          <span className="text-purple-600">•</span>
                          {contentType.replace(/_/g, ' ')}
                        </span>
                      )}
                      {(pageIcon || pageCover) && (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-blue-600">•</span>
                          {pageIcon && '📎 Icône'} {pageIcon && pageCover && '+'} {pageCover && 'Couverture'}
                        </span>
                      )}
                      {!contentType && !pageIcon && !pageCover && 'Formatage et propriétés'}
                    </p>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                  <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform ${optionsExpanded ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              <AnimatePresence>
                {optionsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-50 overflow-hidden"
                  >
                    <div className="p-6">
                      {/* Tabs */}
                      <div className="flex gap-2 mb-6">
                        <button
                          onClick={() => setPropertyTab('format')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${propertyTab === 'format'
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                        >
                          Formatage
                        </button>
                        <button
                          onClick={() => setPropertyTab('properties')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${propertyTab === 'properties'
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                        >
                          Apparence
                        </button>
                        {isDatabasePage && selectedPage && !multiSelectMode && (
                          <button
                            onClick={() => setPropertyTab('database')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${propertyTab === 'database'
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                              }`}
                          >
                            <Database size={10} />
                            Base de données
                          </button>
                        )}
                      </div>

                      <AnimatePresence mode="wait">
                        {propertyTab === 'format' && (
                          <motion.div key="format" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="space-y-3">
                              <p className="text-xs text-gray-500">Choisissez le type de bloc pour votre contenu</p>

                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { value: 'paragraph', icon: 'Aa', label: 'Texte' },
                                  { value: 'heading_1', icon: 'H1', label: 'Titre 1' },
                                  { value: 'heading_2', icon: 'H2', label: 'Titre 2' },
                                  { value: 'heading_3', icon: 'H3', label: 'Titre 3' },
                                  { value: 'bulleted_list_item', icon: '•', label: 'Liste' },
                                  { value: 'numbered_list_item', icon: '1.', label: 'Numéro' },
                                  { value: 'to_do', icon: '☐', label: 'Tâche' },
                                  { value: 'toggle', icon: '▸', label: 'Toggle' },
                                  { value: 'quote', icon: '"', label: 'Citation' },
                                  { value: 'callout', icon: '💡', label: 'Callout' },
                                  { value: 'code', icon: '</>', label: 'Code' },
                                  { value: 'divider', icon: '—', label: 'Ligne' }
                                ].map(type => (
                                  <button
                                    key={type.value}
                                    onClick={() => {
                                      setContentType(type.value);
                                      onUpdateProperties({ ...contentProperties, contentType: type.value });
                                    }}
                                    className={`relative group p-2.5 rounded-lg border transition-all ${contentType === type.value
                                      ? 'bg-gray-900 text-white border-gray-900'
                                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                      }`}
                                  >
                                    <div className="flex flex-col items-center gap-1">
                                      <span className={`text-sm font-mono ${contentType === type.value ? 'text-white' : 'text-gray-600'}`}>
                                        {type.icon}
                                      </span>
                                      <span className="text-[10px] font-medium">
                                        {type.label}
                                      </span>
                                    </div>

                                    {contentType === type.value && (
                                      <motion.div
                                        layoutId="formatSelector"
                                        className="absolute inset-0 bg-gray-900 rounded-lg -z-10"
                                        transition={{ type: "spring", duration: 0.3 }}
                                      />
                                    )}
                                  </button>
                                ))}
                              </div>

                              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium">Astuce :</span> Le type de bloc détermine comment votre contenu apparaîtra dans Notion.
                                  {contentType === 'code' && " Le bloc code conservera la mise en forme."}
                                  {contentType === 'to_do' && " Les tâches créeront des cases à cocher."}
                                  {contentType === 'callout' && " Les callouts ajoutent une mise en évidence."}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {propertyTab === 'properties' && (
                          <motion.div key="properties" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs text-gray-600 mb-2 block">Icône</label>
                                  <button
                                    onClick={() => setShowEmojiModal(true)}
                                    className={`w-full h-20 rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 ${pageIcon
                                      ? 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                                      }`}
                                  >
                                    {pageIcon ? (
                                      <>
                                        <span className="text-2xl">{pageIcon}</span>
                                        <span className="text-[10px] text-gray-500">Cliquer pour modifier</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles size={16} className="text-gray-400" />
                                        <span className="text-xs text-gray-500">Ajouter</span>
                                      </>
                                    )}
                                  </button>
                                  {pageIcon && (
                                    <button
                                      onClick={() => {
                                        setPageIcon('');
                                        setIconModified(true);
                                        onUpdateProperties({ ...contentProperties, icon: '' });
                                      }}
                                      className="mt-2 w-full text-xs text-gray-500 hover:text-red-600 transition-colors"
                                    >
                                      Supprimer l'icône
                                    </button>
                                  )}
                                </div>

                                <div>
                                  <label className="text-xs text-gray-600 mb-2 block">Couverture</label>
                                  <div
                                    className={`w-full h-20 rounded-lg border-2 border-dashed transition-all flex items-center justify-center ${pageCover
                                      ? 'border-gray-300 bg-gray-50'
                                      : 'border-gray-300 hover:border-gray-400'
                                      }`}
                                  >
                                    {pageCover ? (
                                      <div className="text-center px-2">
                                        <Image size={16} className="text-gray-600 mx-auto mb-1" />
                                        <span className="text-[10px] text-gray-500 truncate block">Image définie</span>
                                      </div>
                                    ) : (
                                      <div className="text-center">
                                        <Image size={16} className="text-gray-400 mx-auto mb-1" />
                                        <span className="text-xs text-gray-500">Aucune</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div>
                                <input
                                  type="url"
                                  value={pageCover}
                                  onChange={(e) => setPageCover(e.target.value)}
                                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                                  placeholder="URL de l'image de couverture (optionnel)"
                                />
                              </div>

                              {(pageIcon || pageCover) && (
                                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                  <p className="text-xs text-gray-600 mb-2">Aperçu dans Notion :</p>
                                  <div className="bg-white rounded border border-gray-200 p-2">
                                    {pageCover && (
                                      <div className="h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded mb-2" />
                                    )}
                                    <div className="flex items-center gap-2">
                                      {pageIcon && <span className="text-xl">{pageIcon}</span>}
                                      <span className="text-xs font-medium text-gray-700">Votre page</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}

                        {propertyTab === 'database' && isDatabasePage && (
                          <motion.div
                            key="database"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            {loadingSchema ? (
                              <div className="text-center py-8">
                                <Loader className="animate-spin mx-auto text-gray-400" size={20} />
                                <p className="text-xs text-gray-500 mt-2">Chargement du schéma...</p>
                              </div>
                            ) : (
                              <DynamicDatabaseProperties
                                selectedPage={selectedPage}
                                databaseSchema={databaseSchema}
                                multiSelectMode={multiSelectMode}
                                onUpdateProperties={(props: any) => {
                                  onUpdateProperties({
                                    ...contentProperties,
                                    ...props
                                  });
                                }}
                              />
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* DESTINATIONS */}
        <div className="px-6 pb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center">
                    <Send size={14} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {multiSelectMode ? 'Destinations' : 'Destination'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {multiSelectMode && selectedPages.length > 0
                        ? `${selectedPages.length} page${selectedPages.length > 1 ? 's' : ''} sélectionnée${selectedPages.length > 1 ? 's' : ''}`
                        : 'Pages cibles pour l\'envoi'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className={`relative w-full transition-all duration-200 ${hasScrollbar ? 'h-14' : 'h-11'}`}>
                <div
                  ref={destinationRef}
                  className="absolute inset-0 flex gap-2 overflow-x-auto overflow-y-hidden notion-scrollbar pb-1"
                >
                  {multiSelectMode ? (
                    selectedPages.length > 0 ? (
                      selectedPages.map((pageId) => {
                        const page = pages?.find(p => p.id === pageId);
                        const icon = page ? getPageIcon(page) : { type: 'default', value: null };
                        return (
                          <motion.div
                            key={pageId}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex-shrink-0 bg-gradient-to-br from-gray-50 to-white rounded-lg px-3 py-2 border border-gray-200 flex items-center gap-2 min-w-[140px] max-w-[180px] h-9 group hover:border-gray-300 transition-all"
                          >
                            {icon.type === 'emoji' && <span className="text-sm">{icon.value}</span>}
                            {icon.type === 'url' && <img src={icon.value} alt="" className="w-4 h-4 rounded" />}
                            {icon.type === 'default' && <FileText size={14} className="text-gray-400" />}
                            <span className="text-xs font-medium text-gray-900 truncate flex-1">{page?.title || 'Sans titre'}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onDeselectPage) {
                                  onDeselectPage(pageId);
                                }
                              }}
                              className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X size={12} />
                            </button>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="h-full flex items-center justify-center px-4 w-full">
                        <div className="text-center">
                          <Database size={18} className="text-gray-300 mx-auto mb-1" />
                          <p className="text-xs text-gray-400">Sélectionnez des pages</p>
                        </div>
                      </div>
                    )
                  ) : (
                    selectedPage ? (
                      (() => {
                        const icon = getPageIcon(selectedPage);
                        return (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-gradient-to-br from-gray-50 to-white rounded-lg px-3 py-2 border border-gray-200 flex items-center gap-2 h-9 hover:border-gray-300 transition-all"
                          >
                            {icon.type === 'emoji' && <span className="text-sm">{icon.value}</span>}
                            {icon.type === 'url' && <img src={icon.value} alt="" className="w-4 h-4 rounded" />}
                            {icon.type === 'default' && <FileText size={14} className="text-gray-400" />}
                            <span className="text-xs font-medium text-gray-900">{selectedPage.title || 'Sans titre'}</span>
                          </motion.div>
                        );
                      })()
                    ) : (
                      <div className="h-full flex items-center justify-center px-4 w-full">
                        <div className="text-center">
                          <FileText size={18} className="text-gray-300 mx-auto mb-1" />
                          <p className="text-xs text-gray-400">Sélectionnez une page</p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOUTON FIXE */}
      <div
        className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-white/95 backdrop-blur-sm border-t border-gray-100"
        style={{ zIndex: 1000 }}
      >
        <motion.button
          className={`w-full py-3 px-6 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2.5 shadow-lg ${!canSend
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-gray-800 to-gray-900 text-white hover:from-gray-900 hover:to-black shadow-xl'
            }`}
          onClick={onSend}
          disabled={!canSend}
          whileTap={{ scale: canSend ? 0.98 : 1 }}
        >
          <AnimatePresence mode="wait">
            {sending ? (
              <motion.div key="sending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5">
                <Loader size={16} className="animate-spin" />
                <span>Envoi en cours...</span>
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5">
                <Send size={16} />
                <span>{getTargetInfo()}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {showEmojiModal && (
        <EmojiInputModal
          initial={pageIcon}
          onClose={() => setShowEmojiModal(false)}
          onSubmit={(emoji: string) => {
            handleIconChange(emoji);
            setShowEmojiModal(false);
          }}
        />
      )}

      <style>{`
        .notion-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db #f9fafb;
        }
        
        .notion-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        
        .notion-scrollbar::-webkit-scrollbar-track {
          background: #f9fafb;
          border-radius: 3px;
        }
        
        .notion-scrollbar::-webkit-scrollbar-thumb {
          background-color: #d1d5db;
          border-radius: 3px;
          border: 2px solid #f9fafb;
          transition: background-color 0.2s;
        }
        
        .notion-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: #9ca3af;
        }
        
        .notion-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #6b7280;
        }
        
        .notion-scrollbar-vertical {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db #f9fafb;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar {
          width: 8px;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar-track {
          background: #f9fafb;
          border-radius: 4px;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar-thumb {
          background-color: #d1d5db;
          border-radius: 4px;
          border: 2px solid #f9fafb;
          transition: background-color 0.2s;
        }
        
        .notion-scrollbar-vertical:hover::-webkit-scrollbar-thumb {
          background-color: #9ca3af;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar-thumb:hover {
          background-color: #6b7280;
        }
        
        .notion-scrollbar-vertical {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db #f9fafb;
        }
        
        .notion-scrollbar-vertical:hover {
          scrollbar-color: #9ca3af #f9fafb;
        }
      `}</style>
    </motion.main>
  );
}