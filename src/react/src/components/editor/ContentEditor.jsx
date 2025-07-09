import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Copy, Trash2, Edit3, X, ChevronDown, Settings, FileText,
  Database, Hash, Folder, Globe, Calendar, Clock, Star, Bookmark,
  Bell, Eye, Code, Info, Sparkles, AlertCircle
} from 'lucide-react';
import NotionPreviewEmbed from '../NotionPreviewEmbed';
import { getPageIcon } from '../../utils/helpers';

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
  pages // nouvelle prop
}) {
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [wasTextTruncated, setWasTextTruncated] = useState(false);

  // États des propriétés Notion
  const [contentType, setContentType] = useState('text');
  const [parseAsMarkdown, setParseAsMarkdown] = useState(true);
  const [pageTitle, setPageTitle] = useState('');
  const [tags, setTags] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [pageIcon, setPageIcon] = useState('📄');

  // Propriétés Notion simplifiées
  const notionProperties = {
    title: pageTitle,
    tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    source_url: sourceUrl,
    date: date,
    icon: pageIcon,
    parse_markdown: parseAsMarkdown
  };

  // Ajouter l'état pour le type forcé
  const [forceContentType, setForceContentType] = useState(null);

  const currentClipboard = editedClipboard || clipboard;

  useEffect(() => {
    // S'assurer que contentProperties est toujours défini
    if (!contentProperties) {
      onUpdateProperties({
        contentType: 'text',
        parseAsMarkdown: true
      });
    }
  }, []);

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
                    <div className="min-h-[400px]">
                      <NotionPreviewEmbed autoReload={true} />
                    </div>
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

        {/* Options d'envoi collapsibles - RESTE IDENTIQUE */}
        {currentClipboard && (
          <div className="px-6 pb-3">
            <div className="bg-white rounded-notion border border-notion-gray-200 shadow-sm">
              {/* Header avec toggle */}
              <button
                onClick={() => setOptionsExpanded(!optionsExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-notion-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Settings size={16} className="text-notion-gray-600" />
                  <h3 className="text-sm font-semibold text-notion-gray-900">Propriétés Notion</h3>
                  <span className="text-xs px-2 py-0.5 bg-notion-gray-100 text-notion-gray-600 rounded">
                    {/* Compteur des propriétés actives */}
                    {Object.values({
                      pageTitle, tags, sourceUrl, date, pageIcon, parseAsMarkdown
                    }).filter(Boolean).length} actives
                  </span>
                </div>
                <ChevronDown size={16} className={`transform transition-transform text-notion-gray-400 ${optionsExpanded ? 'rotate-180' : ''}`} />
              </button>

              {/* Contenu des propriétés - RESTE IDENTIQUE */}
              {optionsExpanded && (
                <div className="px-6 pb-6 border-t border-notion-gray-100">
                  <div className="grid grid-cols-1 gap-6 mt-6">

                    {/* Section 1: Type de bloc et formatage */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-notion-gray-600 uppercase tracking-wider">
                        <FileText size={12} />
                        Formatage du contenu
                      </div>

                      {/* Type de bloc principal */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-notion-gray-700">
                          Type de bloc
                          <Tooltip content="Comment le contenu sera affiché dans Notion">
                            <Info size={12} className="text-notion-gray-400" />
                          </Tooltip>
                        </label>
                        <select
                          value={contentType}
                          onChange={(e) => setContentType(e.target.value)}
                          className="w-full text-sm border border-notion-gray-200 rounded-notion px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:border-notion-gray-300"
                        >
                          <optgroup label="Texte">
                            <option value="paragraph">📝 Paragraphe</option>
                            <option value="heading_1">📌 Titre 1 (H1)</option>
                            <option value="heading_2">📍 Titre 2 (H2)</option>
                            <option value="heading_3">📎 Titre 3 (H3)</option>
                          </optgroup>
                          <optgroup label="Listes">
                            <option value="bulleted_list_item">• Liste à puces</option>
                            <option value="numbered_list_item">1. Liste numérotée</option>
                            <option value="to_do">☐ Case à cocher</option>
                          </optgroup>
                          <optgroup label="Blocs spéciaux">
                            <option value="toggle">▸ Bloc dépliable</option>
                            <option value="quote">💬 Citation</option>
                            <option value="callout">💡 Encadré (Callout)</option>
                            <option value="code">👨‍💻 Bloc de code</option>
                            <option value="equation">∑ Équation mathématique</option>
                            <option value="divider">─ Séparateur</option>
                          </optgroup>
                          <optgroup label="Médias">
                            <option value="image">🖼️ Image</option>
                            <option value="video">🎥 Vidéo</option>
                            <option value="audio">🎵 Audio</option>
                            <option value="file">📎 Fichier</option>
                            <option value="embed">🔗 Embed</option>
                          </optgroup>
                          <optgroup label="Avancé">
                            <option value="table">📊 Tableau</option>
                            <option value="synced_block">🔄 Bloc synchronisé</option>
                            <option value="template">📄 Modèle</option>
                          </optgroup>
                        </select>
                      </div>

                      {/* Options de formatage Markdown */}
                      <div className="p-3 bg-purple-50 rounded-notion border border-purple-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={parseAsMarkdown}
                            onChange={(e) => setParseAsMarkdown(e.target.checked)}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <div className="flex items-center gap-2">
                            <Code size={14} className="text-purple-600" />
                            <span className="text-sm font-medium text-purple-900">Parser comme Markdown</span>
                          </div>
                        </label>
                        <p className="text-xs text-purple-700 mt-1 ml-6">
                          Convertit automatiquement les titres, listes, **gras**, *italique*, `code`, etc.
                        </p>
                      </div>
                    </div>

                    {/* Section 2: Métadonnées */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-notion-gray-600 uppercase tracking-wider">
                        <Database size={12} />
                        Propriétés de base de données
                      </div>

                      {/* Titre de la page */}
                      <div className="space-y-2">
                        <label className="text-sm text-notion-gray-700">Titre de la page</label>
                        <input
                          type="text"
                          value={pageTitle}
                          onChange={(e) => setPageTitle(e.target.value)}
                          placeholder="Nouveau clip"
                          className="w-full text-sm border border-notion-gray-200 rounded-notion px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Tags */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-notion-gray-700">
                          <Hash size={12} />
                          Tags
                        </label>
                        <input
                          type="text"
                          value={tags}
                          onChange={(e) => setTags(e.target.value)}
                          placeholder="design, inspiration, référence..."
                          className="w-full text-sm border border-notion-gray-200 rounded-notion px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-notion-gray-500">Séparez par des virgules</p>
                      </div>

                      {/* URL Source */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-notion-gray-700">
                          <Globe size={12} />
                          Source
                        </label>
                        <input
                          type="url"
                          value={sourceUrl}
                          onChange={(e) => setSourceUrl(e.target.value)}
                          placeholder="https://example.com/article"
                          className="w-full text-sm border border-notion-gray-200 rounded-notion px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm text-notion-gray-700">
                            <Calendar size={12} />
                            Date
                          </label>
                          <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full text-sm border border-notion-gray-200 rounded-notion px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Icône de la page */}
                      <div className="space-y-2">
                        <label className="text-sm text-notion-gray-700">Icône de la page</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={pageIcon}
                            onChange={(e) => setPageIcon(e.target.value)}
                            placeholder="📄 ou URL d'image"
                            className="flex-1 text-sm border border-notion-gray-200 rounded-notion px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => setShowEmojiPicker(true)}
                            className="px-3 py-2 border border-notion-gray-200 rounded-notion hover:bg-notion-gray-50"
                          >
                            😀
                          </button>
                        </div>
                      </div>

                      {/* Type de contenu */}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-notion-gray-700">
                          <FileText size={14} />
                          Type de contenu
                        </label>
                        <select
                          value={forceContentType || contentProperties.contentType || 'auto'}
                          onChange={(e) => {
                            const value = e.target.value === 'auto' ? null : e.target.value;
                            setForceContentType(value);
                            if (value) {
                              onUpdateProperties({ ...contentProperties, contentType: value });
                            }
                          }}
                          className="px-2 py-1 text-sm border border-notion-gray-200 rounded"
                        >
                          <option value="auto">Détection auto</option>
                          <option value="text">Texte</option>
                          <option value="markdown">Markdown</option>
                          <option value="code">Code</option>
                          <option value="table">Tableau</option>
                          <option value="url">URL</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Carousel Destinations avec dimensions fixes et badge - RESTE IDENTIQUE */}
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
            <div className="relative h-16 w-full">
              <div className="absolute inset-0 flex gap-2 overflow-x-auto overflow-y-hidden custom-scrollbar-horizontal">
                {multiSelectMode ? (
                  selectedPages.length > 0 ? (
                    selectedPages.map((pageId) => {
                      const page = pages?.find(p => p.id === pageId);
                      const icon = page ? getPageIcon(page) : { type: 'default', value: null };
                      return (
                        <div
                          key={pageId}
                          className="flex-shrink-0 bg-notion-gray-50 rounded px-3 py-2 border border-notion-gray-200 flex items-center gap-2 h-fit"
                          style={{ minWidth: '180px', maxWidth: '220px' }}
                        >
                          {/* Affichage correct de l'icône */}
                          {icon.type === 'emoji' && (
                            <span className="text-sm leading-none">{icon.value}</span>
                          )}
                          {icon.type === 'url' && (
                            <img src={icon.value} alt="" className="w-4 h-4 rounded object-cover" onError={e => (e.target.style.display = 'none')} />
                          )}
                          {icon.type === 'default' && (
                            <FileText size={14} className="text-notion-gray-400" />
                          )}
                          <span className="text-sm text-notion-gray-900 truncate">
                            {page?.title || 'Sans titre'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-notion-gray-400 italic">Cliquez sur les pages pour les sélectionner</p>
                  )
                ) : (
                  selectedPage ? (
                    <div
                      className="flex-shrink-0 bg-notion-gray-50 rounded px-3 py-2 border border-notion-gray-200 flex items-center gap-2 h-fit"
                      style={{ minWidth: '180px', maxWidth: '220px' }}
                    >
                      <span className="text-sm text-notion-gray-900 truncate max-w-[120px]">
                        {selectedPage.title || 'Sans titre'}
                      </span>
                      <button
                        onClick={() => {}}
                        className="ml-1 text-notion-gray-400 hover:text-red-600 flex-shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-notion-gray-400 italic">Sélectionnez une page</p>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bouton d'action fixe en bas - RESTE IDENTIQUE */}
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
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
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
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
        </motion.button>
      </div>
    </motion.main>
  );
}