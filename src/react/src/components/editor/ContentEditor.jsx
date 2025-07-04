// src/react/src/components/editor/ContentEditor.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Copy, Edit3, Eye, ChevronDown, Settings, Hash, Calendar,
  Globe, Star, Bell, Bookmark, ArrowUp, Smile, Image as ImageIcon,
  CheckCircle, Sparkles, Trash2, Save, X, Info, Loader
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import NotionPreviewEmbed from '../NotionPreviewEmbed';
import TextEditor from './TextEditor';

const MAX_CLIPBOARD_LENGTH = 10000;

export default function ContentEditor({
  clipboard,
  editedClipboard,
  setEditedClipboard,
  selectedPage,
  selectedPages = [],
  multiSelectMode,
  sending,
  onSend,
  showNotification,
  contentType,
  setContentType,
  notionProperties,
  setNotionProperties,
  tags,
  setTags,
  sourceUrl,
  setSourceUrl,
  markAsFavorite,
  setMarkAsFavorite,
  category,
  setCategory,
  dueDate,
  setDueDate,
  addReminder,
  setAddReminder,
  parseAsMarkdown,
  setParseAsMarkdown,
  pageTitle,
  setPageTitle,
  date,
  setDate,
  priority,
  setPriority,
  addToReadingList,
  setAddToReadingList,
  isPublic,
  setIsPublic,
  pageIcon,
  setPageIcon,
  pageColor,
  setPageColor,
  insertPosition,
  setInsertPosition,
  useTemplate,
  setUseTemplate,
  selectedTemplate,
  setSelectedTemplate,
  showEmojiPicker,
  setShowEmojiPicker,
  showPreview,
  setShowPreview,
  manuallyEdited,
  setManuallyEdited,
  getCurrentClipboard,
  clearClipboard,
  config
}) {
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);

  const currentClipboard = getCurrentClipboard();
  const clipboardEmpty = !currentClipboard || !currentClipboard.content;

  const handleEditText = () => {
    if (currentClipboard && currentClipboard.type === 'text') {
      setShowTextEditor(true);
    }
  };

  const saveEditedText = (newContent) => {
    const edited = {
      ...currentClipboard,
      content: newContent,
      originalLength: newContent.length,
      truncated: newContent.length > MAX_CLIPBOARD_LENGTH
    };
    setEditedClipboard(edited);
    setShowTextEditor(false);
    showNotification('Texte modifié', 'success');
  };

  const isYouTubeUrl = (content) => {
    return /(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/.test(content);
  };

  const extractYouTubeId = (url) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    return match ? match[1] : '';
  };

  const markdownComponents = {
    p: ({ children }) => {
      const blockTypes = ['pre', 'div', 'table', 'ul', 'ol', 'blockquote', 'figure'];
      const hasBlock = React.Children.toArray(children).some(child => {
        if (React.isValidElement(child)) {
          if (blockTypes.includes(child.type)) return true;
          if (
            typeof child.type === 'function' &&
            (child.type.displayName === 'figure' || child.type.name === 'figure')
          ) {
            return true;
          }
          if (child.type === 'code' && !child.props?.inline) return true;
        }
        return false;
      });
      if (hasBlock) {
        return <>{children}</>;
      }
      return <p className="mb-4 text-gray-700 leading-relaxed">{children}</p>;
    },
    code: ({ inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      if (!inline) {
        return (
          <div className="relative group mb-4">
            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto">
              <code className={`text-sm ${className}`} {...props}>
                {children}
              </code>
            </pre>
            {language && (
              <span className="absolute top-2 right-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {language}
              </span>
            )}
          </div>
        );
      }

      return (
        <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    },
    blockquote: ({ children }) => {
      const content = children?.toString() || '';
      const alertMatch = content.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/);
      if (alertMatch) {
        const alertType = alertMatch[1];
        const configs = {
          NOTE: { icon: '📘', bg: 'bg-blue-50', border: 'border-l-blue-500', text: 'text-blue-900' },
          TIP: { icon: '💡', bg: 'bg-green-50', border: 'border-l-green-500', text: 'text-green-900' },
          IMPORTANT: { icon: '☝️', bg: 'bg-purple-50', border: 'border-l-purple-500', text: 'text-purple-900' },
          WARNING: { icon: '⚠️', bg: 'bg-yellow-50', border: 'border-l-yellow-500', text: 'text-yellow-900' },
          CAUTION: { icon: '❗', bg: 'bg-red-50', border: 'border-l-red-500', text: 'text-red-900' }
        };

        const config = configs[alertType];

        return (
          <div className={`${config.bg} ${config.border} ${config.text} border-l-4 p-4 mb-4 rounded-r-lg`}>
            <div className="flex gap-2">
              <span className="text-xl">{config.icon}</span>
              <div>
                <div className="font-semibold mb-1">{alertType}</div>
                <div>{children}</div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <blockquote className="border-l-4 border-gray-300 pl-4 py-2 mb-4 text-gray-600 italic">
          {children}
        </blockquote>
      );
    },
    a: ({ href, children }) => (
      <a
        href={href}
        className="text-blue-600 hover:text-blue-800 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    img: ({ src, alt }) => (
      <figure className="mb-4">
        <img
          src={src}
          alt={alt || ''}
          className="max-w-full h-auto rounded-lg shadow-sm mx-auto"
        />
        {alt && (
          <figcaption className="text-sm text-gray-600 text-center mt-2">
            {alt}
          </figcaption>
        )}
      </figure>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full divide-y divide-gray-200">
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {children}
      </td>
    )
  };

  const canSend = useCallback(() => {
    const hasTarget = multiSelectMode ? selectedPages.length > 0 : selectedPage !== null;
    const hasContent = getCurrentClipboard() !== null;
    return hasTarget && hasContent && !sending;
  }, [multiSelectMode, selectedPages, selectedPage, sending, getCurrentClipboard]);

  return (
    <>
      <div className="flex-1 px-6 py-3 overflow-y-auto scrollbar-hide">
        {/* Zone de prévisualisation du contenu */}
        <div className="bg-white rounded-notion border border-notion-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-notion-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Copy size={18} className="text-notion-gray-600" />
                <h2 className="text-base font-semibold text-notion-gray-900">Contenu du presse-papiers</h2>
                {editedClipboard && (
                  <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">Modifié</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {currentClipboard && currentClipboard.type === 'text' && (
                  <button
                    onClick={handleEditText}
                    className="p-1.5 hover:bg-notion-gray-100 rounded transition-colors"
                    title="Modifier le texte"
                  >
                    <Edit3 size={14} className="text-notion-gray-600" />
                  </button>
                )}
                {currentClipboard && (
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="p-1.5 hover:bg-notion-gray-100 rounded transition-colors"
                    title="Aperçu Notion"
                  >
                    <Eye size={14} className={showPreview ? 'text-blue-600' : 'text-notion-gray-600'} />
                  </button>
                )}
                {currentClipboard && (
                  <button
                    onClick={clearClipboard}
                    className="p-1.5 hover:bg-notion-gray-100 rounded transition-colors"
                    title="Vider"
                  >
                    <Trash2 size={14} className="text-notion-gray-600" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            {showPreview ? (
              <div className="relative bg-notion-gray-50 rounded-notion border border-notion-gray-200 overflow-hidden">
                <div className="absolute top-2 right-2 z-10 flex gap-2">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-3 py-1.5 bg-white border border-notion-gray-200 rounded-md text-xs font-medium text-notion-gray-700 hover:bg-notion-gray-50 shadow-sm"
                  >
                    Fermer l'aperçu
                  </button>
                </div>
                <div className="min-h-[400px]">
                  <NotionPreviewEmbed autoReload={true} />
                </div>
              </div>
            ) : currentClipboard ? (
              <div className="relative">
                {currentClipboard.type === 'image' ? (
                  <div className="flex justify-center">
                    <img
                      src={currentClipboard.content}
                      alt="Clipboard"
                      className="max-w-full max-h-96 rounded-notion shadow-sm"
                    />
                  </div>
                ) : currentClipboard.type === 'text' && isYouTubeUrl(currentClipboard.content) ? (
                  <div className="aspect-video rounded-notion overflow-hidden shadow-sm">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${extractYouTubeId(currentClipboard.content)}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="rounded-notion"
                    />
                  </div>
                ) : currentClipboard.type === 'text' && parseAsMarkdown ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {currentClipboard.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-notion-gray-800 font-sans">
                      {currentClipboard.truncated
                        ? `${currentClipboard.content}... (tronqué)`
                        : currentClipboard.content
                      }
                    </pre>
                  </div>
                )}
                {currentClipboard.truncated && (
                  <div className="mt-3 text-xs text-orange-600 flex items-center gap-1">
                    <Info size={12} />
                    Contenu tronqué ({currentClipboard.originalLength?.toLocaleString()} caractères)
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
        </div>

        {/* Options d'envoi collapsibles */}
        {currentClipboard && (
          <div className="mt-4">
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
                    {Object.values(notionProperties).filter(Boolean).length} actives
                  </span>
                </div>
                <ChevronDown 
                  size={16} 
                  className={`transform transition-transform text-notion-gray-400 ${
                    optionsExpanded ? 'rotate-180' : ''
                  }`} 
                />
              </button>

              {/* Contenu collapsible */}
              <AnimatePresence>
                {optionsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4 space-y-6 border-t border-notion-gray-100 pt-4">
                      {/* Section 1: Propriétés de base */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-medium text-notion-gray-600 uppercase tracking-wider">
                          <Hash size={12} />
                          Propriétés de base
                        </div>

                        {/* Titre de la page */}
                        <div className="space-y-2">
                          <label className="text-sm text-notion-gray-700">Titre de la page</label>
                          <input
                            type="text"
                            value={pageTitle}
                            onChange={(e) => setPageTitle(e.target.value)}
                            placeholder="Titre personnalisé (optionnel)"
                            className="w-full text-sm border border-notion-gray-200 rounded-notion px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Tags et catégorie */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-sm text-notion-gray-700">Tags</label>
                            <input
                              type="text"
                              value={tags}
                              onChange={(e) => setTags(e.target.value)}
                              placeholder="tag1, tag2, tag3"
                              className="w-full text-sm border border-notion-gray-200 rounded-notion px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-notion-gray-700">Catégorie</label>
                            <input
                              type="text"
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              placeholder="Catégorie"
                              className="w-full text-sm border border-notion-gray-200 rounded-notion px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* URL source */}
                        <div className="space-y-2">
                          <label className="text-sm text-notion-gray-700">URL source</label>
                          <input
                            type="url"
                            value={sourceUrl}
                            onChange={(e) => setSourceUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full text-sm border border-notion-gray-200 rounded-notion px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Section 2: Dates et statuts */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-medium text-notion-gray-600 uppercase tracking-wider">
                          <Calendar size={12} />
                          Dates et statuts
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-sm text-notion-gray-700">Date</label>
                            <input
                              type="date"
                              value={date}
                              onChange={(e) => setDate(e.target.value)}
                              className="w-full text-sm border border-notion-gray-200 rounded-notion px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-notion-gray-700">Date d'échéance</label>
                            <input
                              type="date"
                              value={dueDate}
                              onChange={(e) => setDueDate(e.target.value)}
                              className="w-full text-sm border border-notion-gray-200 rounded-notion px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Priorité */}
                        <div className="space-y-2">
                          <label className="text-sm text-notion-gray-700">Priorité</label>
                          <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="w-full text-sm border border-notion-gray-200 rounded-notion px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="low">Basse</option>
                            <option value="medium">Moyenne</option>
                            <option value="high">Haute</option>
                            <option value="urgent">Urgente</option>
                          </select>
                        </div>

                        {/* Checkboxes */}
                        <div className="space-y-3">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={markAsFavorite}
                              onChange={(e) => setMarkAsFavorite(e.target.checked)}
                              className="rounded text-yellow-500 focus:ring-yellow-500"
                            />
                            <div className="flex items-center gap-2">
                              <Star size={14} className={markAsFavorite ? "text-yellow-500" : "text-notion-gray-400"} />
                              <span className="text-sm font-medium text-notion-gray-700">Marquer comme favori</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={addReminder}
                              onChange={(e) => setAddReminder(e.target.checked)}
                              className="rounded text-blue-500 focus:ring-blue-500"
                            />
                            <div className="flex items-center gap-2">
                              <Bell size={14} className={addReminder ? "text-blue-500" : "text-notion-gray-400"} />
                              <span className="text-sm font-medium text-notion-gray-700">Ajouter un rappel</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={addToReadingList}
                              onChange={(e) => setAddToReadingList(e.target.checked)}
                              className="rounded text-purple-500 focus:ring-purple-500"
                            />
                            <div className="flex items-center gap-2">
                              <Bookmark size={14} className={addToReadingList ? "text-purple-500" : "text-notion-gray-400"} />
                              <span className="text-sm font-medium text-notion-gray-700">Ajouter à la liste de lecture</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isPublic}
                              onChange={(e) => setIsPublic(e.target.checked)}
                              className="rounded text-green-500 focus:ring-green-500"
                            />
                            <div className="flex items-center gap-2">
                              <Globe size={14} className={isPublic ? "text-green-500" : "text-notion-gray-400"} />
                              <span className="text-sm font-medium text-notion-gray-700">Rendre public</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Section 3: Options avancées */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-medium text-notion-gray-600 uppercase tracking-wider">
                          <Sparkles size={12} />
                          Options avancées
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

                        {/* Couleur de fond */}
                        <div className="space-y-2">
                          <label className="text-sm text-notion-gray-700">Couleur de fond</label>
                          <div className="flex gap-2">
                            {['default', 'gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'].map((color) => (
                              <button
                                key={color}
                                onClick={() => setPageColor(color)}
                                className={`w-8 h-8 rounded border-2 ${
                                  pageColor === color ? 'border-notion-gray-900' : 'border-notion-gray-200'
                                }`}
                                style={{
                                  backgroundColor: color === 'default' ? '#ffffff' :
                                    color === 'gray' ? '#f1f1ef' :
                                    color === 'brown' ? '#f4eeee' :
                                    color === 'orange' ? '#fbecdd' :
                                    color === 'yellow' ? '#fef3c7' :
                                    color === 'green' ? '#ddedea' :
                                    color === 'blue' ? '#ddebf1' :
                                    color === 'purple' ? '#eae4f2' :
                                    color === 'pink' ? '#f4dfeb' :
                                    '#fbe4e4'
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Options de parsing */}
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={parseAsMarkdown}
                            onChange={(e) => setParseAsMarkdown(e.target.checked)}
                            className="rounded text-blue-500 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-notion-gray-700">
                            Parser comme Markdown
                          </span>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Zone des boutons d'action */}
      <div className="px-6 py-4 bg-white border-t border-notion-gray-200">
        {multiSelectMode ? (
          <div className="text-center mb-3">
            <p className="text-sm text-notion-gray-600">
              {selectedPages.length} page{selectedPages.length > 1 ? 's' : ''} sélectionnée{selectedPages.length > 1 ? 's' : ''}
            </p>
          </div>
        ) : selectedPage ? (
          <div className="flex items-center gap-3 mb-3 p-3 bg-notion-gray-50 rounded-notion">
            <CheckCircle size={16} className="text-green-600" />
            <span className="text-sm text-notion-gray-700">
              Destination: <span className="font-medium text-notion-gray-900">{selectedPage.title || 'Sans titre'}</span>
            </span>
          </div>
        ) : (
          <div className="text-center mb-3">
            <p className="text-sm text-notion-gray-500">Sélectionnez une page de destination</p>
          </div>
        )}

        <button
          onClick={onSend}
          disabled={!canSend()}
          className={`w-full px-4 py-3 rounded-notion font-medium transition-all flex items-center justify-center gap-2 ${
            canSend()
              ? 'bg-notion-gray-900 text-white hover:bg-notion-gray-800 btn-hover'
              : 'bg-notion-gray-100 text-notion-gray-400 cursor-not-allowed'
          }`}
        >
          {sending ? (
            <>
              <Loader size={16} className="animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Send size={16} />
              Envoyer vers Notion
            </>
          )}
        </button>
      </div>

      {/* Modal d'édition de texte */}
      {showTextEditor && (
        <TextEditor
          content={currentClipboard?.content || ''}
          onSave={saveEditedText}
          onCancel={() => setShowTextEditor(false)}
        />
      )}
    </>
  );
}