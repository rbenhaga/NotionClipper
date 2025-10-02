import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Copy, Trash2, Edit3, X, ChevronDown, Settings, FileText,
  Database, Hash, Folder, Globe, Calendar, Clock, Star, Bookmark,
  Bell, Eye, Code, Info, Sparkles, AlertCircle, Type, Tag, CheckCircle, 
  ImageIcon, Link, Loader, Palette, Image, AlignLeft
} from 'lucide-react';
import ImagePreview from './ImagePreview';
import DynamicDatabaseProperties from './DynamicDatabaseProperties';
import { getPageIcon } from '../../utils/helpers';

const MAX_CLIPBOARD_LENGTH = 200000;

// Modal Emoji
function EmojiInputModal({ initial, onClose, onSubmit }) {
  const [value, setValue] = React.useState(initial || '📄');
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
  contentProperties,
  onUpdateProperties,
  showNotification,
  pages,
  onDeselectPage,
  showPreview,
  config
}) {
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [wasTextTruncated, setWasTextTruncated] = useState(false);
  const [showEmojiModal, setShowEmojiModal] = useState(false);
  const [hasScrollbar, setHasScrollbar] = useState(false);
  const destinationRef = useRef(null);

  // Détecter si scrollbar nécessaire au chargement et changements
  useEffect(() => {
    if (destinationRef.current) {
      const needsScrollbar = destinationRef.current.scrollWidth > destinationRef.current.clientWidth;
      setHasScrollbar(needsScrollbar);
    }
  }, [selectedPages, selectedPage, multiSelectMode]);

  const [contentType, setContentType] = useState('paragraph');
  const [pageTitle, setPageTitle] = useState('');
  const [tags, setTags] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [pageIcon, setPageIcon] = useState('');
  const [iconModified, setIconModified] = useState(false);
  const [pageCover, setPageCover] = useState('');
  const [isDatabasePage, setIsDatabasePage] = useState(false);
  const [forceContentType, setForceContentType] = useState(null);
  const [propertyTab, setPropertyTab] = useState('format');

  const currentClipboard = editedClipboard || clipboard;

  useEffect(() => {
    const properties = {
      contentType: contentType || 'paragraph',
      parseAsMarkdown: true,
      ...(iconModified && pageIcon && { icon: pageIcon }),
      ...(pageCover && { cover: pageCover }),
    };
    onUpdateProperties(properties);
  }, [contentType, pageIcon, pageCover, iconModified]);

  useEffect(() => {
    if (selectedPage) {
      setIsDatabasePage(selectedPage.parent?.type === 'database_id');
    }
  }, [selectedPage]);

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

  const handleIconChange = (newIcon) => {
    setPageIcon(newIcon);
    setIconModified(true);
    onUpdateProperties({
      ...contentProperties,
      icon: newIcon
    });
  };

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
                                    onEditContent(null);
                                    setWasTextTruncated(false);
                                    if (showNotification) showNotification('Modifications annulées', 'info');
                                  }}
                                  className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-50 transition-all"
                                >
                                  <X size={12} />
                                  Annuler les modifications
                                </button>
                              )}
                            </div>

                            {(() => {
                              const contentText = typeof (editedClipboard?.content ?? currentClipboard.content) === 'string' 
                                ? (editedClipboard?.content ?? currentClipboard.content) 
                                : '';
                              
                              // Calculer la hauteur dynamique basée sur le nombre de lignes
                              const lineCount = contentText.split('\n').length;
                              const charPerLine = 100; // Estimation moyenne
                              const estimatedLines = Math.max(lineCount, Math.ceil(contentText.length / charPerLine));
                              const lineHeight = 20; // pixels par ligne
                              const padding = 32; // padding top + bottom
                              const minHeight = 120; // hauteur minimale (~5 lignes)
                              const maxHeight = 256; // hauteur maximale (h-64)
                              const dynamicHeight = Math.min(maxHeight, Math.max(minHeight, (estimatedLines * lineHeight) + padding));
                              
                              return (
                                <>
                                  <textarea
                                    value={contentText}
                                    onChange={(e) => {
                                      let newContent = e.target.value;
                                      
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
                                      
                                      const edited = {
                                        ...currentClipboard,
                                        content: newContent,
                                        originalLength: newContent.length,
                                        type: forceContentType || contentType || 'text'
                                      };
                                      onEditContent(edited);
                                      
                                      if (window.lastClipboardContent !== newContent) {
                                        window.lastClipboardContent = newContent;
                                        window.lastContentType = forceContentType || contentType || 'text';
                                        window.dispatchEvent(new CustomEvent('clipboard-content-changed', { 
                                          detail: { content: newContent, type: forceContentType || contentType || 'text' }
                                        }));
                                      }
                                    }}
                                    style={{ height: `${dynamicHeight}px` }}
                                    className="w-full p-4 border border-gray-200 rounded-xl font-mono text-sm text-gray-700 bg-gray-50/50 resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all notion-scrollbar-vertical"
                                    placeholder="Éditez votre contenu ici..."
                                    maxLength={MAX_CLIPBOARD_LENGTH}
                                  />
                                  
                                  <div className="flex items-center justify-between">
                                    <span className={`text-xs transition-colors ${
                                      contentText.length >= MAX_CLIPBOARD_LENGTH 
                                        ? 'text-red-600 font-semibold' 
                                        : contentText.length > MAX_CLIPBOARD_LENGTH * 0.9
                                        ? 'text-orange-600 font-medium'
                                        : 'text-gray-500'
                                    }`}>
                                      {contentText.length.toLocaleString()} / {MAX_CLIPBOARD_LENGTH.toLocaleString()} caractères
                                    </span>
                                    {contentText.length >= MAX_CLIPBOARD_LENGTH && (
                                      <span className="text-red-600 text-xs font-medium flex items-center gap-1">
                                        <AlertCircle size={12} />
                                        Limite atteinte
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                      className={`h-full transition-colors ${
                                        contentText.length >= MAX_CLIPBOARD_LENGTH 
                                          ? 'bg-gradient-to-r from-red-500 to-red-600' 
                                          : contentText.length > MAX_CLIPBOARD_LENGTH * 0.9
                                          ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                                          : 'bg-gradient-to-r from-gray-700 to-gray-900'
                                      }`}
                                      initial={{ width: 0 }}
                                      animate={{ 
                                        width: `${Math.min(100, ((contentText.length / MAX_CLIPBOARD_LENGTH) * 100))}%` 
                                      }}
                                      transition={{ duration: 0.3 }}
                                    />
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
                    <p className="text-xs text-gray-500 mt-0.5">Formatage et propriétés avancées</p>
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
                      <div className="flex gap-1 mb-6 p-1 bg-gray-50 rounded-xl">
                        <button
                          onClick={() => setPropertyTab('format')}
                          className={`flex-1 px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                            propertyTab === 'format' 
                              ? 'bg-white text-gray-900 shadow-sm' 
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <AlignLeft size={12} className="inline-block mr-1.5" />
                          Formatage
                        </button>
                        <button
                          onClick={() => setPropertyTab('properties')}
                          className={`flex-1 px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                            propertyTab === 'properties' 
                              ? 'bg-white text-gray-900 shadow-sm' 
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <Palette size={12} className="inline-block mr-1.5" />
                          Propriétés
                        </button>
                      </div>

                      <AnimatePresence mode="wait">
                        {propertyTab === 'format' && (
                          <motion.div key="format" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                            <div>
                              <label className="text-xs font-medium text-gray-700 mb-4 block">Type de bloc Notion</label>
                              <div className="grid grid-cols-3 gap-3">
                                {[
                                  { value: 'paragraph', label: 'Paragraphe', icon: '¶', color: 'gray' },
                                  { value: 'heading_1', label: 'Titre 1', icon: 'H1', color: 'blue' },
                                  { value: 'heading_2', label: 'Titre 2', icon: 'H2', color: 'indigo' },
                                  { value: 'heading_3', label: 'Titre 3', icon: 'H3', color: 'purple' },
                                  { value: 'quote', label: 'Citation', icon: '❝', color: 'gray' },
                                  { value: 'callout', label: 'Encadré', icon: '💡', color: 'yellow' },
                                  { value: 'code', label: 'Code', icon: '</>', color: 'gray' },
                                  { value: 'toggle', label: 'Dépliable', icon: '▸', color: 'gray' },
                                  { value: 'bulleted_list_item', label: 'Liste', icon: '•', color: 'gray' },
                                  { value: 'numbered_list_item', label: 'Numéroté', icon: '1.', color: 'gray' },
                                  { value: 'to_do', label: 'À faire', icon: '☐', color: 'green' },
                                  { value: 'divider', label: 'Ligne', icon: '─', color: 'gray' },
                                ].map(type => (
                                  <button
                                    key={type.value}
                                    onClick={() => {
                                      setContentType(type.value);
                                      onUpdateProperties({ ...contentProperties, contentType: type.value });
                                    }}
                                    className={`group p-3 rounded-xl border-2 transition-all ${
                                      contentType === type.value
                                        ? 'border-gray-900 bg-gray-50'
                                        : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50/50'
                                    }`}
                                  >
                                    <span className={`block text-center mb-2 text-lg ${
                                      contentType === type.value ? 'scale-110' : 'group-hover:scale-105'
                                    } transition-transform`}>{type.icon}</span>
                                    <span className={`block text-center text-xs ${
                                      contentType === type.value ? 'font-semibold text-gray-900' : 'text-gray-600'
                                    }`}>{type.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {propertyTab === 'properties' && (
                          <motion.div key="properties" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                            <div className="space-y-4">
                              <h4 className="text-xs font-medium text-gray-700">Personnalisation de la page</h4>
                              
                              <div className="p-4 bg-gray-50/50 rounded-xl space-y-4">
                                <div>
                                  <label className="text-xs text-gray-600 mb-2 block flex items-center gap-1.5">
                                    <Sparkles size={12} />
                                    Icône de page
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setShowEmojiModal(true)}
                                      className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2.5"
                                    >
                                      <span className="text-xl">{pageIcon || '➕'}</span>
                                      <span className="text-xs font-medium text-gray-700">{pageIcon ? 'Modifier' : 'Ajouter un emoji'}</span>
                                    </button>
                                    {pageIcon && (
                                      <button
                                        onClick={() => {
                                          setPageIcon('');
                                          setIconModified(true);
                                          onUpdateProperties({...contentProperties, icon: ''});
                                        }}
                                        className="px-3 py-2.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                                      >
                                        Supprimer
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs text-gray-600 mb-2 block flex items-center gap-1.5">
                                    <Image size={12} />
                                    Image de couverture
                                  </label>
                                  <input
                                    type="url"
                                    value={pageCover}
                                    onChange={(e) => setPageCover(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                                    placeholder="https://example.com/image.jpg"
                                  />
                                </div>
                              </div>
                            </div>

                            {isDatabasePage && selectedPage && (
                              <div>
                                <h4 className="text-xs font-medium text-gray-700 mb-3 flex items-center gap-1.5">
                                  <Database size={12} />
                                  Propriétés de base de données
                                </h4>
                                <div className="p-4 bg-gray-50/50 rounded-xl">
                                  <DynamicDatabaseProperties
                                    selectedPage={selectedPage}
                                    multiSelectMode={multiSelectMode}
                                    onUpdateProperties={(props) => {
                                      onUpdateProperties({
                                        ...contentProperties,
                                        ...props
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {(!selectedPage || selectedPage.parent?.type !== 'database_id') && (
                              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                <div className="flex items-start gap-2.5">
                                  <Info size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs font-medium text-blue-900 mb-1">Page simple détectée</p>
                                    <p className="text-xs text-blue-700">
                                      Pour accéder aux propriétés avancées, créez une base de données dans Notion et partagez-la avec votre intégration.
                                    </p>
                                  </div>
                                </div>
                              </div>
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
              
              <div className={`relative w-full transition-all duration-200 ${
                hasScrollbar ? 'h-14' : 'h-11'
              }`}>
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
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-white/95 backdrop-blur-sm border-t border-gray-100">
        <motion.button
          className={`w-full py-3 px-6 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2.5 shadow-lg ${
            !canSend 
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
          onSubmit={emoji => {
            handleIconChange(emoji);
            setShowEmojiModal(false);
          }}
        />
      )}

      <style>{`
        /* Scrollbar horizontale pour carousel */
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
        
        /* Scrollbar verticale pour le contenu principal */
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
        
        /* Firefox */
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