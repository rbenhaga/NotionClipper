import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Copy, Trash2, Edit3, X, ChevronDown, Settings, FileText,
  Database, Hash, Folder, Globe, Calendar, Clock, Star, Bookmark,
  Bell, Eye, Code, Info, Sparkles, AlertCircle, Type, Tag, CheckCircle, ImageIcon, Link, Loader
} from 'lucide-react';
import NotionPreviewEmbed from '../NotionPreviewEmbed';
import { getPageIcon } from '../../utils/helpers';
import axios from 'axios';
import DynamicDatabaseProperties from './DynamicDatabaseProperties';
// SUPPRIMER cette importation
// import PropertiesEditor from './PropertiesEditor';

const MAX_CLIPBOARD_LENGTH = 200000;

// Composant Tooltip simple
function Tooltip({ children, content }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-notion-gray-900 text-white rounded whitespace-nowrap z-50">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-notion-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}

// Composant pour vérifier si c'est une base de données
function DatabaseCheckStatus({ selectedPage, onDatabaseStatusChange }) {
  const [checking, setChecking] = useState(false);
  const [isDatabase, setIsDatabase] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedPage) return;

    const checkDatabase = async () => {
      setChecking(true);
      setError(null);
      
      try {
        const response = await window.axios
          ? window.axios.get(`http://localhost:5000/api/pages/${selectedPage.id}/check-database`)
          : await import('axios').then(({ default: axios }) => axios.get(`http://localhost:5000/api/pages/${selectedPage.id}/check-database`));
        const data = response.data || response;
        const isDatabasePage = data.is_database || 
          selectedPage.parent?.type === 'database_id';
        setIsDatabase(isDatabasePage);
        onDatabaseStatusChange?.(isDatabasePage);
      } catch (err) {
        setError('Impossible de vérifier le type de page');
        console.error('Erreur vérification database:', err);
      } finally {
        setChecking(false);
      }
    };

    checkDatabase();
  }, [selectedPage, onDatabaseStatusChange]);

  if (!selectedPage) return null;

  return (
    <div className={`p-4 rounded-lg border ${
      isDatabase 
        ? 'bg-green-50 border-green-200' 
        : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-start gap-3">
        {checking ? (
          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
        ) : (
          <Database size={16} className={isDatabase ? 'text-green-600' : 'text-amber-600'} />
        )}
        <div className="flex-1">
          <p className={`text-sm font-medium ${
            isDatabase ? 'text-green-800' : 'text-amber-800'
          }`}>
            {checking ? 'Vérification...' : 
             isDatabase ? 'Page de base de données' : 'Page simple'}
          </p>
          <p className="text-xs mt-1 text-gray-600">
            {isDatabase 
              ? 'Cette page supporte toutes les propriétés avancées'
              : 'Seules l\'icône et la couverture peuvent être modifiées'}
          </p>
          {error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Ajout d'une modale simple pour saisir un emoji
function EmojiInputModal({ initial, onClose, onSubmit }) {
  const [value, setValue] = React.useState(initial || '📄');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg p-6 w-72 flex flex-col gap-4">
        <div className="text-lg font-medium mb-2">Choisir un emoji</div>
        <input
          type="text"
          className="text-3xl text-center border border-notion-gray-200 rounded-lg py-2"
          value={value}
          onChange={e => setValue(e.target.value)}
          maxLength={2}
          autoFocus
        />
        <div className="flex gap-2 justify-end mt-2">
          <button
            className="px-3 py-1 rounded bg-notion-gray-100 hover:bg-notion-gray-200 text-notion-gray-700"
            onClick={onClose}
          >Annuler</button>
          <button
            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => { if (value.trim()) onSubmit(value.trim()); }}
          >Valider</button>
        </div>
      </div>
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
  onDeselectPage, // Nouvelle prop
  showPreview,
  config
}) {
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [wasTextTruncated, setWasTextTruncated] = useState(false);
  const [showEmojiModal, setShowEmojiModal] = useState(false);

  // États des propriétés Notion
  const [contentType, setContentType] = useState('text');
  const [pageTitle, setPageTitle] = useState('');
  const [tags, setTags] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [pageIcon, setPageIcon] = useState(''); // Ne pas mettre de valeur par défaut
  const [iconModified, setIconModified] = useState(false); // Tracker si l'icône a été modifiée
  const [pageCover, setPageCover] = useState('');
  // Onglet actif pour les propriétés
  const [propertyTab, setPropertyTab] = useState('format');
  const [isDatabase, setIsDatabase] = useState(false);
  // Ajouter un état pour tracker si c'est une DB
  const [isDatabasePage, setIsDatabasePage] = useState(false);

  // Propriétés Notion simplifiées
  const notionProperties = {
    title: pageTitle,
    tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    source_url: sourceUrl,
    date: date,
    icon: pageIcon
  };

  // Ajouter l'état pour le type forcé
  const [forceContentType, setForceContentType] = useState(null);

  const currentClipboard = editedClipboard || clipboard;

  // Synchronisation simplifiée des propriétés
  useEffect(() => {
    const properties = {
      // Propriétés visuelles toujours disponibles
      contentType: contentType || 'text',
      parseAsMarkdown: true, // Toujours true
      // N'envoyer l'icône que si elle a été modifiée
      ...(iconModified && pageIcon && { icon: pageIcon }),
      ...(pageCover && { cover: pageCover }),
      // Les propriétés de DB sont gérées par DynamicDatabaseProperties
    };
    onUpdateProperties(properties);
  }, [contentType, pageIcon, pageCover, iconModified, onUpdateProperties]);

  // Fonction pour obtenir les infos de destination
  const getTargetInfo = () => {
    if (multiSelectMode) {
      if (selectedPages.length === 0) return 'Sélectionnez des pages';
      if (selectedPages.length === 1) {
        return `Envoyer vers 1 page`;
      }
      return `Envoyer vers ${selectedPages.length} pages`;
    } else {
      if (!selectedPage) return 'Sélectionnez une page';
      return `Envoyer vers "${selectedPage.title || 'Page'}"`;
    }
  };

  useEffect(() => {
    if (selectedPage) {
      setIsDatabasePage(selectedPage.parent?.type === 'database_id');
    }
  }, [selectedPage]);

  // Améliorer le useEffect pour réinitialiser TOUTES les propriétés
  useEffect(() => {
    if (multiSelectMode) {
      // Réinitialiser toutes les propriétés de base de données
      setPageTitle('');
      setTags('');
      setSourceUrl('');
      setDate(new Date().toISOString().split('T')[0]);
      // Réinitialiser aussi les propriétés visuelles
      setPageIcon('');
      setPageCover('');
      setIconModified(false);
      // Notifier le parent que toutes les propriétés sont effacées
      onUpdateProperties({
        contentType: contentType || 'text',
        parseAsMarkdown: true,
        databaseProperties: {},
        icon: '',
        cover: ''
      });
    }
  }, [multiSelectMode, contentType, onUpdateProperties]);

  // 1. Handler d'icône corrigé
  const handleIconChange = (newIcon) => {
    setPageIcon(newIcon);
    setIconModified(true);
    // Mettre à jour immédiatement dans les propriétés
    onUpdateProperties({
      ...contentProperties,
      icon: newIcon
    });
  };

  const [hasScrollbar, setHasScrollbar] = useState(false);
  const destinationRef = useRef(null);

  // Ajout de la fonction helper pour le message d'incompatibilité
  const getIncompatibilityMessage = () => {
    if (!selectedPages || selectedPages.length <= 1) return 'Envoyer';
    
    const pageInfos = selectedPages.map(pageId => {
      const page = pages?.find(p => p.id === pageId);
      return {
        id: pageId,
        isDatabase: page?.parent?.type === 'database_id',
        databaseId: page?.parent?.database_id
      };
    });
    
    const hasSimplePages = pageInfos.some(p => !p.isDatabase);
    const hasDatabasePages = pageInfos.some(p => p.isDatabase);
    
    if (hasSimplePages && hasDatabasePages) {
      return '❌ Types de pages incompatibles';
    }
    
    if (hasDatabasePages) {
      const databaseIds = new Set(pageInfos.filter(p => p.isDatabase).map(p => p.databaseId));
      if (databaseIds.size > 1) {
        return '❌ Bases de données différentes';
      }
    }
    
    return 'Envoyer';
  };

  return (
    <motion.main
      className="flex-1 flex flex-col bg-notion-gray-50 min-h-0 relative"
      animate={{ marginLeft: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Conteneur scrollable global */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        {/* Zone presse-papiers avec panneau pliable */}
        <div className="p-6 pb-3">
          <div className="bg-white rounded-notion border border-notion-gray-200">
            {/* Header avec toggle */}
            <div 
              className="px-6 py-4 border-b border-notion-gray-100 cursor-pointer hover:bg-notion-gray-50"
              onClick={() => setPropertiesCollapsed(!propertiesCollapsed)}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-notion-gray-900">Presse-papiers</h2>
                <div className="flex items-center gap-2">
                  {currentClipboard?.truncated && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                      Tronqué
                    </span>
                  )}
                  {editedClipboard && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Modifié
                    </span>
                  )}
                  <ChevronDown size={16} className={`transform transition-transform ${propertiesCollapsed ? '' : 'rotate-180'}`} />
                </div>
              </div>
            </div>

            {/* Contenu avec édition et prévisualisation */}
            {!propertiesCollapsed && (
              <div className="p-6">
                {currentClipboard ? (
                  <div className="space-y-4">
                    {/* Zone d'édition du contenu brut */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-notion-gray-700 flex items-center gap-2">
                          <Edit3 size={14} />
                          Contenu éditable :
                        </label>
                        {editedClipboard && (
                          <button
                            onClick={() => {
                              onEditContent(null);
                              setWasTextTruncated(false);
                              if (showNotification) showNotification('Modifications annulées', 'info');
                            }}
                            className="px-3 py-1 text-xs bg-notion-gray-100 hover:bg-notion-gray-200 text-notion-gray-700 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <X size={12} />
                            Annuler
                          </button>
                        )}
                      </div>
                      <textarea
                        value={editedClipboard?.content || currentClipboard.content}
                        onChange={(e) => {
                          let newContent = e.target.value;
                          let truncated = false;
                          
                          // Limiter à 200,000 caractères
                          if (newContent.length > MAX_CLIPBOARD_LENGTH) {
                            newContent = newContent.substring(0, MAX_CLIPBOARD_LENGTH);
                            truncated = true;
                            
                            // Afficher la notification seulement si c'est la première fois
                            if (!wasTextTruncated) {
                              setWasTextTruncated(true);
                              if (showNotification) {
                                showNotification(
                                  'Contenu limité à 200 000 caractères',
                                  'warning'
                                );
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
                          // Appeler directement onEditContent
                          onEditContent(edited);
                          // Mettre à jour les variables globales pour la preview
                          if (window.lastClipboardContent !== newContent) {
                            window.lastClipboardContent = newContent;
                            window.lastContentType = forceContentType || contentType || 'text';
                            window.dispatchEvent(new CustomEvent('clipboard-content-changed', { 
                              detail: { content: newContent, type: forceContentType || contentType || 'text' }
                            }));
                          }
                        }}
                        className="w-full h-48 p-3 border border-notion-gray-200 rounded-lg font-mono text-sm bg-notion-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Éditez votre contenu ici..."
                        maxLength={MAX_CLIPBOARD_LENGTH}
                      />
                      
                      {/* Barre de progression et compteur de caractères */}
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className={`font-medium transition-colors ${
                            (editedClipboard?.content || currentClipboard.content).length >= MAX_CLIPBOARD_LENGTH 
                              ? 'text-red-600' 
                              : (editedClipboard?.content || currentClipboard.content).length > MAX_CLIPBOARD_LENGTH * 0.9
                              ? 'text-orange-600'
                              : 'text-notion-gray-500'
                          }`}>
                            {(editedClipboard?.content || currentClipboard.content).length.toLocaleString()} / {MAX_CLIPBOARD_LENGTH.toLocaleString()} caractères
                          </span>
                          {(editedClipboard?.content || currentClipboard.content).length >= MAX_CLIPBOARD_LENGTH && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-red-600 flex items-center gap-1"
                            >
                              <AlertCircle size={10} />
                              Limite atteinte
                            </motion.span>
                          )}
                        </div>
                        {/* Petite barre de progression */}
                        <div className="w-full h-0.5 bg-notion-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full transition-colors duration-300 ${
                              (editedClipboard?.content || currentClipboard.content).length >= MAX_CLIPBOARD_LENGTH 
                                ? 'bg-red-500' 
                                : (editedClipboard?.content || currentClipboard.content).length > MAX_CLIPBOARD_LENGTH * 0.9
                                ? 'bg-orange-500'
                                : 'bg-blue-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ 
                              width: `${Math.min(100, ((editedClipboard?.content || currentClipboard.content).length / MAX_CLIPBOARD_LENGTH) * 100)}%` 
                            }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Prévisualisation Notion */}
                    {config?.previewPageId && showPreview && (
                      <div className="w-1/2 border-l border-gray-200">
                        <NotionPreviewEmbed autoReload={true} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-center text-notion-gray-400">
                    <div>
                      <Copy size={32} className="mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Aucun contenu copié</p>
                      <p className="text-xs mt-1 opacity-75">Copiez du texte, une image ou un tableau</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Options d'envoi avec propriétés améliorées */}
        {currentClipboard && (
          <div className="px-6 pb-3">
            <div className="bg-white rounded-notion border border-notion-gray-200 shadow-sm overflow-hidden">
              {/* Header avec toggle et indicateurs */}
              <button
                onClick={() => setOptionsExpanded(!optionsExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-notion-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                    <Settings size={16} className="text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-notion-gray-900">Propriétés & Formatage</h3>
                    <p className="text-xs text-notion-gray-500 mt-0.5">
                      Personnalisez l'envoi vers Notion
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AnimatePresence>
                    {(pageTitle || tags || sourceUrl || contentType !== 'paragraph') && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex gap-1"
                      >
                        {pageTitle && (
                          <span className="w-2 h-2 bg-green-500 rounded-full" title="Titre défini" />
                        )}
                        {tags && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full" title="Tags définis" />
                        )}
                        {sourceUrl && (
                          <span className="w-2 h-2 bg-purple-500 rounded-full" title="Source définie" />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <ChevronDown 
                    size={16} 
                    className={`transform transition-transform text-notion-gray-400 ${
                      optionsExpanded ? 'rotate-180' : ''
                    }`} 
                  />
                </div>
              </button>

              {/* Contenu des propriétés avec nouveau design */}
              <AnimatePresence>
                {optionsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-notion-gray-100"
                  >
                    <div className="p-6 space-y-6">
                      {/* Onglets pour organiser les propriétés */}
                      <div className="flex gap-1 p-1 bg-notion-gray-100 rounded-lg">
                        <button
                          onClick={() => setPropertyTab('format')}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            propertyTab === 'format'
                              ? 'bg-white text-notion-gray-900 shadow-sm'
                              : 'text-notion-gray-600 hover:text-notion-gray-900'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <FileText size={14} />
                            Formatage
                            {contentType && contentType !== 'paragraph' && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                        </button>
                        <button
                          onClick={() => setPropertyTab('properties')}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            propertyTab === 'properties'
                              ? 'bg-white text-notion-gray-900 shadow-sm'
                              : 'text-notion-gray-600 hover:text-notion-gray-900'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Sparkles size={14} />
                            Propriétés {isDatabasePage && '& DB'}
                            {(iconModified || pageCover || (isDatabasePage && (pageTitle || tags || sourceUrl || date))) && (
                              <span className="w-2 h-2 bg-green-500 rounded-full" />
                            )}
                          </div>
                        </button>
                      </div>

                      {/* Contenu des onglets */}
                      <AnimatePresence mode="wait">
                        {/* Onglet Formatage */}
                        {propertyTab === 'format' && (
                          <motion.div
                            key="format"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-4"
                          >
                            {/* Type de bloc avec preview */}
                            <div className="space-y-3">
                              <label className="flex items-center gap-2 text-sm font-medium text-notion-gray-700">
                                <Code size={14} />
                                Type de bloc Notion
                              </label>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {[
                                  { value: 'paragraph', icon: '📝', label: 'Paragraphe', desc: 'Texte classique' },
                                  { value: 'heading_1', icon: '🔠', label: 'Titre 1', desc: 'Grand titre' },
                                  { value: 'heading_2', icon: '🔡', label: 'Titre 2', desc: 'Sous-titre' },
                                  { value: 'heading_3', icon: '🔢', label: 'Titre 3', desc: 'Petit titre' },
                                  { value: 'quote', icon: '💬', label: 'Citation', desc: 'Bloc citation' },
                                  { value: 'callout', icon: '💡', label: 'Encadré', desc: 'Bloc d\'information' },
                                  { value: 'code', icon: '👨‍💻', label: 'Code', desc: 'Bloc code' },
                                  { value: 'toggle', icon: '▸', label: 'Dépliable', desc: 'Bloc repliable' },
                                  { value: 'bulleted_list_item', icon: '•', label: 'Liste à puces', desc: 'Liste non ordonnée' },
                                  { value: 'numbered_list_item', icon: '1.', label: 'Liste numérotée', desc: 'Liste ordonnée' },
                                  { value: 'to_do', icon: '☑️', label: 'À faire', desc: 'Case à cocher' },
                                  { value: 'divider', icon: '―', label: 'Séparateur', desc: 'Ligne de séparation' },
                                  { value: 'table', icon: '📊', label: 'Tableau', desc: 'Bloc tableau' },
                                  { value: 'image', icon: '🖼️', label: 'Image', desc: 'Bloc image' },
                                  { value: 'bookmark', icon: '🔖', label: 'Bookmark', desc: 'Lien enrichi' },
                                ].map(type => (
                                  <button
                                    key={type.value}
                                    onClick={() => {
                                      setContentType(type.value);
                                      onUpdateProperties({ ...contentProperties, contentType: type.value });
                                    }}
                                    className={`p-3 rounded-lg border-2 flex flex-col items-start transition-all h-full ${
                                      contentType === type.value
                                        ? 'border-blue-500 bg-blue-50 shadow'
                                        : 'border-notion-gray-200 hover:border-notion-gray-300'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-lg">{type.icon}</span>
                                      <span className="text-sm font-medium">{type.label}</span>
                                    </div>
                                    <span className="text-xs text-notion-gray-500">{type.desc}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                            {/* Note sur le parsing automatique */}
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                              <div className="flex items-start gap-2">
                                <Info size={14} className="text-blue-600 mt-0.5" />
                                <div className="text-xs text-blue-700">
                                  <p className="font-medium">Formatage intelligent activé</p>
                                  <p className="mt-1">Le contenu est automatiquement analysé pour détecter le Markdown, les liens, le <b>gras</b>, l'<i>italique</i> et autres formats.</p>
                                </div>
                              </div>
                            </div>
                            {/* Après la grille des types de blocs (dans l'onglet Formatage) */}
                            {(contentType === 'image' || contentType === 'bookmark') && (
                              <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                                <p className="text-xs text-amber-700">
                                  {contentType === 'image' && '💡 Pour le type Image, collez une URL d\'image (ex: https://example.com/image.jpg)'}
                                  {contentType === 'bookmark' && '💡 Pour le type Bookmark, collez une URL de site web (ex: https://example.com)'}
                                </p>
                              </div>
                            )}
                            {(contentType === 'bulleted_list_item' || 
                              contentType === 'numbered_list_item' || 
                              contentType === 'to_do' || 
                              contentType === 'toggle') && (
                              <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-xs text-blue-700">
                                  💡 Chaque ligne de votre texte créera un élément de liste séparé
                                </p>
                              </div>
                            )}
                          </motion.div>
                        )}

                        {/* Onglet Métadonnées */}
                        {propertyTab === 'properties' && (
                          <motion.div
                            key="properties"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                          >
                            {/* Section 1: Propriétés visuelles */}
                            <div>
                              <h4 className="text-xs font-semibold text-notion-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <Eye size={12} />
                                Apparence
                              </h4>
                              <div className="space-y-4 bg-notion-gray-50 rounded-lg p-4">
                                {/* Icône */}
                                <div className="space-y-2">
                                  <label className="flex items-center gap-2 text-sm font-medium text-notion-gray-700">
                                    <Sparkles size={14} />
                                    Icône de la page
                                    {iconModified && pageIcon && (
                                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                        Modifiée
                                      </span>
                                    )}
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setShowEmojiModal(true)}
                                      className="px-4 py-2 border border-notion-gray-200 rounded-lg hover:bg-white bg-white shadow-sm flex items-center gap-2 transition-all hover:shadow-md"
                                    >
                                      <span className="text-xl">
                                        {pageIcon || '➕'}
                                      </span>
                                      <span className="text-sm text-notion-gray-600">
                                        {pageIcon ? 'Modifier' : 'Ajouter'}
                                      </span>
                                    </button>
                                    {pageIcon && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPageIcon('');
                                          setIconModified(true);
                                          onUpdateProperties({
                                            ...contentProperties,
                                            icon: '' // Envoyer une chaîne vide pour supprimer
                                          });
                                        }}
                                        className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                                      >
                                        Supprimer
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-xs text-notion-gray-500">
                                    L'icône n'est modifiée que si vous en choisissez une
                                  </p>
                                </div>
                                {/* Modal d'emoji */}
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
                                {/* Cover */}
                                <div className="space-y-2">
                                  <label className="flex items-center gap-2 text-sm font-medium text-notion-gray-700">
                                    <ImageIcon size={14} />
                                    Image de couverture
                                  </label>
                                  <input
                                    type="url"
                                    value={pageCover}
                                    onChange={(e) => setPageCover(e.target.value)}
                                    className="w-full px-3 py-2 border border-notion-gray-200 rounded-lg text-sm bg-white"
                                    placeholder="https://example.com/image.jpg"
                                  />
                                </div>
                              </div>
                            </div>
                            {/* Séparateur */}
                            <div className="border-t border-notion-gray-200" />
                            {/* Section 2: Propriétés dynamiques de la base de données */}
                            <DynamicDatabaseProperties
                              selectedPage={selectedPage}
                              multiSelectMode={multiSelectMode}
                              onUpdateProperties={(props) => {
                                // Fusionner avec les propriétés existantes
                                onUpdateProperties({
                                  ...contentProperties,
                                  ...props
                                });
                              }}
                            />
                            {/* Message si page simple */}
                            {(!selectedPage || selectedPage.parent?.type !== 'database_id') && (
                              <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                                <div className="flex items-start gap-3">
                                  <Info size={16} className="text-amber-600 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-amber-900">
                                      Page simple détectée
                                    </p>
                                    <p className="text-xs text-amber-700 mt-1">
                                      Cette page n'est pas dans une base de données. Créez une base de données dans Notion pour accéder aux propriétés avancées.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}

                        {/* Onglet Page */}
                        {propertyTab === 'page' && (
                          <motion.div
                            key="page"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-4"
                          >
                            {/* Icône avec emoji picker natif */}
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-sm font-medium text-notion-gray-700">
                                <Sparkles size={14} />
                                Icône de la page
                              </label>
                              <div className="flex gap-2 items-center">
                                <div className="text-3xl w-12 h-12 flex items-center justify-center bg-notion-gray-100 rounded-lg">
                                  {pageIcon || '📄'}
                                </div>
                                <button
                                  onClick={() => setShowEmojiModal(true)}
                                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium text-sm transition-colors"
                                >
                                  Changer l'icône
                                </button>
                              </div>
                            </div>
                            {showEmojiModal && (
                              <EmojiInputModal
                                initial={pageIcon}
                                onClose={() => setShowEmojiModal(false)}
                                onSubmit={emoji => {
                                  handleIconChange(emoji); // Utiliser le nouveau handler
                                  setShowEmojiModal(false);
                                }}
                              />
                            )}
                            {/* Vérification page/database */}
                            <DatabaseCheckStatus 
                              selectedPage={selectedPage}
                              onDatabaseStatusChange={(isDb) => setIsDatabase(isDb)}
                            />
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

        {/* Carousel Destinations avec adaptation dynamique */}
        <div className="px-6 pb-6">
          <div className="bg-white rounded-notion border border-notion-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-notion-gray-700">
                {multiSelectMode ? 'Destinations' : 'Destination'}
              </h3>
              {multiSelectMode && selectedPages.length > 0 && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {selectedPages.length} sélectionnée{selectedPages.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className={`relative w-full transition-all duration-200 ${
              hasScrollbar ? 'h-20' : 'h-14'
            }`}>
              <div 
                ref={destinationRef}
                className="absolute inset-0 flex gap-2 overflow-x-auto overflow-y-hidden custom-scrollbar-horizontal"
                onScroll={(e) => setHasScrollbar(e.target.scrollWidth > e.target.clientWidth)}
              >
                {multiSelectMode ? (
                  selectedPages.length > 0 ? (
                    selectedPages.map((pageId) => {
                      const page = pages?.find(p => p.id === pageId);
                      const icon = page ? getPageIcon(page) : { type: 'default', value: null };
                      return (
                        <div
                          key={pageId}
                          className="flex-shrink-0 bg-notion-gray-50 rounded px-3 py-2 border border-notion-gray-200 flex items-center gap-2 h-fit"
                          style={{ minWidth: '160px', maxWidth: '200px' }}
                        >
                          {/* Affichage de l'icône */}
                          {icon.type === 'emoji' && (
                            <span className="text-base flex-shrink-0">{icon.value}</span>
                          )}
                          {icon.type === 'url' && (
                            <img 
                              src={icon.value} 
                              alt="" 
                              className="w-4 h-4 rounded object-cover flex-shrink-0" 
                              onError={e => (e.target.style.display = 'none')} 
                            />
                          )}
                          {icon.type === 'default' && (
                            <FileText size={14} className="text-notion-gray-400 flex-shrink-0" />
                          )}
                          <span className="text-sm text-notion-gray-900 truncate">
                            {page?.title || 'Sans titre'}
                          </span>
                          <button
                            onClick={() => onDeselectPage?.(pageId)}
                            className="ml-auto text-notion-gray-400 hover:text-red-600 flex-shrink-0"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-notion-gray-400 italic">
                      Cliquez sur les pages pour les sélectionner
                    </p>
                  )
                ) : (
                  selectedPage ? (
                    (() => {
                      const icon = getPageIcon(selectedPage);
                      return (
                        <div
                          className="flex-shrink-0 bg-notion-gray-50 rounded px-3 py-2 border border-notion-gray-200 flex items-center gap-2 h-fit"
                          style={{ minWidth: '160px', maxWidth: '200px' }}
                        >
                          {/* Affichage de l'icône */}
                          {icon.type === 'emoji' && (
                            <span className="text-base flex-shrink-0">{icon.value}</span>
                          )}
                          {icon.type === 'url' && (
                            <img 
                              src={icon.value} 
                              alt="" 
                              className="w-4 h-4 rounded object-cover flex-shrink-0" 
                              onError={e => (e.target.style.display = 'none')} 
                            />
                          )}
                          {icon.type === 'default' && (
                            <FileText size={14} className="text-notion-gray-400 flex-shrink-0" />
                          )}
                          <span className="text-sm text-notion-gray-900 truncate">
                            {selectedPage.title || 'Sans titre'}
                          </span>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-sm text-notion-gray-400 italic">
                      Sélectionnez une page
                    </p>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bouton d'action fixe en bas - STYLE EXACT UTILISATEUR */}
      <div className="p-4 border-t border-notion-gray-200 bg-white">
        <motion.button
          className={`w-full py-3 px-6 rounded-notion font-medium transition-all duration-200 flex items-center justify-center gap-2 relative overflow-hidden ${
            !canSend
              ? 'bg-notion-gray-100 text-notion-gray-400 cursor-not-allowed'
              : 'bg-notion-gray-900 text-white hover:bg-notion-gray-800 shadow-notion'
          }`}
          onClick={onSend}
          disabled={!canSend}
          whileTap={{ scale: 0.98 }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
          title="Envoyer (Enter)"
        >
          <AnimatePresence mode="wait">
            {sending ? (
              <motion.div
                key="sending"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2"
              >
                <motion.div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <span>Envoi en cours...</span>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2"
              >
                <Send size={16} />
                <span>{getTargetInfo()}</span>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Effet de progression */}
          {sending && (
            <motion.div
              className="absolute inset-0 bg-white bg-opacity-10 rounded-notion"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </motion.button>
      </div>
      {multiSelectMode && selectedPages.length > 1 && (
        <MultiSelectionCompatibilityCheck 
          selectedPages={selectedPages} 
          pages={pages}
        />
      )}
    </motion.main>
  );
}

// Composant pour vérifier la compatibilité en multi-sélection
function MultiSelectionCompatibilityCheck({ selectedPages, pages }) {
  const [compatibility, setCompatibility] = useState(null);
  const [checking, setChecking] = useState(false);
  
  useEffect(() => {
    if (!selectedPages || selectedPages.length <= 1) return;
    
    const checkCompatibility = async () => {
      setChecking(true);
      
      try {
        // Récupérer les infos complètes des pages
        const pageInfos = selectedPages.map(pageId => {
          const page = pages.find(p => p.id === pageId || p === pageId);
          return page || { id: pageId };
        });
        
        // Analyser les types
        const pageTypes = pageInfos.map(page => ({
          id: page.id,
          isDatabase: page.parent?.type === 'database_id',
          databaseId: page.parent?.database_id || null
        }));
        
        // Vérifier la compatibilité
        const allSimplePages = pageTypes.every(p => !p.isDatabase);
        const allDatabasePages = pageTypes.every(p => p.isDatabase);
        const sameDatabaseId = allDatabasePages && 
          new Set(pageTypes.map(p => p.databaseId)).size === 1;
        
        setCompatibility({
          compatible: allSimplePages || sameDatabaseId,
          allSimplePages,
          allDatabasePages,
          sameDatabaseId,
          mixedTypes: !allSimplePages && !allDatabasePages,
          multipleDatabases: allDatabasePages && !sameDatabaseId,
          pageCount: selectedPages.length
        });
      } catch (error) {
        console.error('Erreur vérification compatibilité:', error);
      } finally {
        setChecking(false);
      }
    };
    
    checkCompatibility();
  }, [selectedPages, pages]);
  
  if (!compatibility || checking) {
    return (
      <div className="flex items-center gap-2 text-sm text-notion-gray-600">
        <Loader className="animate-spin" size={14} />
        <span>Vérification de la compatibilité...</span>
      </div>
    );
  }
  
  // Afficher l'état de compatibilité
  if (compatibility.compatible) {
    if (compatibility.allSimplePages) {
      return (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
          <CheckCircle size={16} className="text-green-600" />
          <span className="text-sm text-green-800">
            {compatibility.pageCount} pages simples sélectionnées - Propriétés visuelles disponibles
          </span>
        </div>
      );
    } else if (compatibility.sameDatabaseId) {
      return (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
          <CheckCircle size={16} className="text-green-600" />
          <span className="text-sm text-green-800">
            {compatibility.pageCount} pages de la même base de données - Toutes les propriétés disponibles
          </span>
        </div>
      );
    }
  } else {
    // Cas non compatibles
    if (compatibility.mixedTypes) {
      return (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Types de pages mixtes détectés
              </p>
              <p className="text-xs text-red-700 mt-1">
                Vous avez sélectionné des pages simples et des pages de base de données. 
                Seules les propriétés visuelles (icône, couverture) seront appliquées à toutes les pages.
              </p>
            </div>
          </div>
        </div>
      );
    } else if (compatibility.multipleDatabases) {
      return (
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Pages de bases de données différentes
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Les pages sélectionnées appartiennent à des bases de données différentes. 
                Les propriétés de DB ne seront appliquées qu'aux pages dont la base contient les propriétés correspondantes.
              </p>
            </div>
          </div>
        </div>
      );
    }
  }
  
  return null;
}