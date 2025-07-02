import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Send, Star, Clock, Zap, 
  Minus, Square, X, Copy, Image,
  Globe, Folder, TrendingUp,
  CheckCircle, AlertCircle, FileText, Database,
  Calendar, Settings, Hash,
  CheckSquare, Code, Quote, Wifi, 
  WifiOff, RotateCcw, Loader, 
  Info, Eye, EyeOff, Save, Edit3, 
  PanelLeftClose, PanelLeftOpen, RefreshCw,
  Bell, Sparkles, Trash2, Key, Shield, ChevronRight, ChevronDown,
  Bookmark, ArrowUp, ArrowDown, Smile
} from 'lucide-react';
import axios from 'axios';
import Onboarding from './OnBoarding';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_URL = 'http://localhost:5000/api';
const MAX_CLIPBOARD_LENGTH = 2000;
const CLIPBOARD_CHECK_INTERVAL = 2000; // 2 secondes au lieu de 3
const PAGE_REFRESH_INTERVAL = 30000; // 30 secondes
const UPDATE_CHECK_INTERVAL = 20000; // 20 secondes

// Fonction pour obtenir l'icône appropriée avec emojis Notion
function getPageIcon(page) {
  if (!page) return null;
  
  if (page.icon) {
    if (typeof page.icon === 'string') {
      // Emoji
      if (page.icon.length <= 4 && /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F100}-\u{1F1FF}]/u.test(page.icon)) {
        return <span className="text-sm leading-none">{page.icon}</span>;
      }
      // URL
      if (page.icon.startsWith('http')) {
        return <img src={page.icon} alt="" className="w-4 h-4 rounded object-cover" onError={(e) => e.target.style.display = 'none'} />;
      }
    }
    
    if (typeof page.icon === 'object') {
      if (page.icon.type === 'emoji' && page.icon.emoji) {
        return <span className="text-sm leading-none">{page.icon.emoji}</span>;
      }
      if (page.icon.type === 'external' && page.icon.external?.url) {
        return <img src={page.icon.external.url} alt="" className="w-4 h-4 rounded object-cover" onError={(e) => e.target.style.display = 'none'} />;
      }
      if (page.icon.type === 'file' && page.icon.file?.url) {
        return <img src={page.icon.file.url} alt="" className="w-4 h-4 rounded object-cover" onError={(e) => e.target.style.display = 'none'} />;
      }
    }
  }
  
  // Icônes par défaut basées sur le titre
  const title = page.title?.toLowerCase() || '';
  
  if (title.includes('database') || title.includes('table') || title.includes('bdd')) 
    return <Database size={14} className="text-blue-600" />;
  if (title.includes('calendar') || title.includes('calendrier')) 
    return <Calendar size={14} className="text-green-600" />;
  if (title.includes('kanban') || title.includes('task') || title.includes('todo') || title.includes('tâche')) 
    return <CheckSquare size={14} className="text-purple-600" />;
  if (title.includes('code') || title.includes('dev') || title.includes('programming')) 
    return <Code size={14} className="text-gray-600" />;
  if (title.includes('quote') || title.includes('citation')) 
    return <Quote size={14} className="text-orange-600" />;
  
  // Icône par défaut
  return <FileText size={14} className="text-notion-gray-400" />;
}

// Composant de vérification de connectivité
function ConnectivityStatus({ isOnline, isBackendConnected }) {
  if (isOnline && isBackendConnected) return null;
  
  return (
    <motion.div 
      className="fixed bottom-4 left-4 right-4 bg-red-50 border border-red-200 rounded-notion p-3 flex items-center gap-3 z-50"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
    >
      <WifiOff size={18} className="text-red-600" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800">
          {!isOnline ? 'Pas de connexion Internet' : 'Backend Notion déconnecté'}
        </p>
        <p className="text-xs text-red-600">
          {!isOnline ? 'Vérifiez votre connexion réseau' : 'Le serveur Python ne répond pas'}
        </p>
      </div>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <RotateCcw size={16} className="text-red-600" />
      </motion.div>
    </motion.div>
  );
}

// Remplacement de ConfigPanel par SettingsPanel
function SettingsPanel({ isOpen, onClose, onSave, config, showNotification }) {
  const [localConfig, setLocalConfig] = useState(config);
  const [showKeys, setShowKeys] = useState({ notion: false, imgbb: false });
  const [saving, setSaving] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const response = await axios.post(`${API_URL}/clear_cache`);
      if (response.data.success) {
        showNotification('Cache vidé avec succès', 'success');
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      showNotification('Erreur lors du vidage du cache', 'error');
    } finally {
      setClearingCache(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localConfig);
      onClose();
    } catch (error) {
      showNotification('Erreur sauvegarde config', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div className="bg-white rounded-notion p-6 w-[500px] max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-notion-gray-900">Paramètres</h2>
          <button onClick={onClose} className="p-1 hover:bg-notion-gray-100 rounded">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Token Notion avec affichage amélioré */}
          <div>
            <label className="block text-sm font-medium text-notion-gray-700 mb-2">
              Token d'intégration Notion *
            </label>
            <div className="relative">
              <Key size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-notion-gray-400" />
              <input
                type={showKeys.notion ? 'text' : 'password'}
                value={localConfig.notionToken || ''}
                onChange={(e) => setLocalConfig({ ...localConfig, notionToken: e.target.value })}
                className="w-full pl-10 pr-12 py-2 border border-notion-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="secret_..."
                style={{ 
                  letterSpacing: showKeys.notion ? 'normal' : '0.1em',
                  fontSize: showKeys.notion ? '13px' : '16px'
                }}
              />
              <button
                type="button"
                onClick={() => setShowKeys({ ...showKeys, notion: !showKeys.notion })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-notion-gray-100 rounded transition-colors"
              >
                {showKeys.notion ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-notion-gray-500 mt-1">
              Trouvez votre token sur notion.so/my-integrations
            </p>
          </div>

          {/* ImgBB Key */}
          <div>
            <label className="block text-sm font-medium text-notion-gray-700 mb-2">
              Clé API ImgBB (optionnel)
            </label>
            <div className="relative">
              <Image size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-notion-gray-400" />
              <input
                type={showKeys.imgbb ? 'text' : 'password'}
                value={localConfig.imgbbKey || ''}
                onChange={(e) => setLocalConfig({ ...localConfig, imgbbKey: e.target.value })}
                className="w-full pl-10 pr-12 py-2 border border-notion-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="Clé API..."
                style={{ 
                  letterSpacing: showKeys.imgbb ? 'normal' : '0.1em',
                  fontSize: showKeys.imgbb ? '13px' : '16px'
                }}
              />
              <button
                type="button"
                onClick={() => setShowKeys({ ...showKeys, imgbb: !showKeys.imgbb })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-notion-gray-100 rounded transition-colors"
              >
                {showKeys.imgbb ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Section Gestion du cache */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-notion-gray-900 mb-3">Gestion du cache</h3>
            
            <div className="space-y-3">
              <button
                onClick={handleClearCache}
                disabled={clearingCache}
                className="w-full flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-md transition-colors disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  {clearingCache ? (
                    <>
                      <Loader className="animate-spin" size={16} />
                      Vidage en cours...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Vider tout le cache
                    </>
                  )}
                </span>
                <span className="text-xs opacity-75">Libérer l'espace</span>
              </button>
              
              <div className="text-xs text-notion-gray-500 bg-notion-gray-50 rounded p-3">
                <p className="font-medium mb-1">À propos du cache :</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Stocke les pages Notion pour un accès rapide</li>
                  <li>Réduit les appels API et améliore les performances</li>
                  <li>Se reconstruit automatiquement après vidage</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Note sur la sécurité */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
            <p className="flex items-center gap-1">
              <Shield size={14} />
              <span className="font-medium">Sécurité :</span>
            </p>
            <p className="mt-1">
              Vos clés API sont chiffrées localement et ne sont jamais exposées dans le code source.
            </p>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-notion-gray-200 rounded-md text-sm font-medium hover:bg-notion-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !localConfig.notionToken}
            className="flex-1 px-4 py-2 bg-notion-gray-900 text-white rounded-md text-sm font-medium hover:bg-notion-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader size={14} className="animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save size={14} />
                Sauvegarder
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Composant d'édition de texte
function TextEditor({ content, onSave, onCancel }) {
  const [editedContent, setEditedContent] = useState(content);
  const [charCount, setCharCount] = useState(content.length);
  
  useEffect(() => {
    setCharCount(editedContent.length);
  }, [editedContent]);

  return (
    <motion.div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-notion p-6 w-[600px] max-h-[80vh] flex flex-col"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-notion-gray-900">Modifier le texte</h2>
          <button onClick={onCancel} className="p-1 hover:bg-notion-gray-100 rounded">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 mb-4">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-64 p-4 border border-notion-gray-200 rounded-notion text-sm focus:outline-none focus:ring-2 focus:ring-notion-gray-300 resize-none"
            placeholder="Saisissez votre texte..."
          />
          
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-notion-gray-500">
              Limite: {MAX_CLIPBOARD_LENGTH.toLocaleString()} caractères
            </div>
            <div className={`text-xs font-medium ${
              charCount > MAX_CLIPBOARD_LENGTH ? 'text-red-600' : 
              charCount > MAX_CLIPBOARD_LENGTH * 0.9 ? 'text-orange-600' : 
              'text-notion-gray-600'
            }`}>
              {charCount.toLocaleString()}/{MAX_CLIPBOARD_LENGTH.toLocaleString()}
            </div>
          </div>
          
          <div className="mt-1 w-full bg-notion-gray-200 rounded-full h-1">
            <div 
              className={`h-1 rounded-full transition-all duration-300 ${
                charCount > MAX_CLIPBOARD_LENGTH ? 'bg-red-500' :
                charCount > MAX_CLIPBOARD_LENGTH * 0.9 ? 'bg-orange-500' :
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, (charCount / MAX_CLIPBOARD_LENGTH) * 100)}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-notion-gray-200 rounded-notion text-sm font-medium text-notion-gray-700 hover:bg-notion-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={() => onSave(editedContent)}
            className="flex-1 px-4 py-2 bg-notion-gray-900 text-white rounded-notion text-sm font-medium hover:bg-notion-gray-800 flex items-center justify-center gap-2"
          >
            <Save size={14} />
            Sauvegarder
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Composant de page avec sélection multiple - amélioré pour la fluidité
function PageCard({ page, onClick, isFavorite, onToggleFavorite, isSelected, onToggleSelect, multiSelectMode }) {
  const handleClick = () => {
    if (multiSelectMode) {
      onToggleSelect(page.id);
    } else {
      onClick(page);
    }
  };
  
  return (
    <motion.div
      className={`relative p-3 rounded-notion transition-all cursor-pointer ${
        isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-notion-gray-50 border-notion-gray-200'
      } border`}
      onClick={handleClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center gap-3">
        {multiSelectMode && (
          <div className="flex-shrink-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}} // Géré par onClick du parent
              onClick={e => e.stopPropagation()} // Éviter double toggle
              className="rounded text-blue-600 focus:ring-blue-500 pointer-events-none"
            />
          </div>
        )}
        
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
          {getPageIcon(page)}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-notion-gray-900 truncate">
            {page.title || 'Sans titre'}
          </h3>
          {page.parent_title && (
            <p className="text-xs text-notion-gray-500 truncate">
              {page.parent_title}
            </p>
          )}
        </div>
        
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(page.id);
          }}
          className="p-1 rounded hover:bg-notion-gray-100"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Star 
            size={14} 
            className={isFavorite ? "text-yellow-500" : "text-notion-gray-300"} 
            fill={isFavorite ? 'currentColor' : 'none'} 
          />
        </motion.button>
      </div>
    </motion.div>
  );
}

// Composant pour rendre les tableaux
function RenderTable({ content }) {
  const rows = content.split('\n').map(row => row.split(/[\t,]/));
  
  return (
    <table className="min-w-full border-collapse">
      <thead>
        <tr>
          {rows[0]?.map((cell, idx) => (
            <th key={idx} className="border border-notion-gray-200 px-3 py-2 bg-notion-gray-50 text-left text-sm font-medium">
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.slice(1).map((row, rowIdx) => (
          <tr key={rowIdx}>
            {row.map((cell, cellIdx) => (
              <td key={cellIdx} className="border border-notion-gray-200 px-3 py-2 text-sm">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Composant pour rendre le markdown style Notion
const NotionMarkdownRenderer = ({ content, className = '' }) => {
  if (!content) return null;

  // Composants personnalisés pour react-markdown
  const components = {
    // Paragraphes - Fix pour l'erreur <pre> ou <div> dans <p>
    p: ({ children }) => {
      // Vérifier si les enfants contiennent un bloc (pre, div, code block, etc.)
      const blockTypes = ['pre', 'div', 'table', 'ul', 'ol', 'blockquote', 'figure'];
      const hasBlock = React.Children.toArray(children).some(child => {
        if (React.isValidElement(child)) {
          // Cas 1 : type string (HTML natif)
          if (blockTypes.includes(child.type)) return true;
          // Cas 2 : composant React dont le nom est 'figure'
          if (
            typeof child.type === 'function' &&
            (child.type.displayName === 'figure' || child.type.name === 'figure')
          ) {
            return true;
          }
          // Cas 3 : code block
          if (child.type === 'code' && !child.props?.inline) return true;
        }
        return false;
      });
      // Si on a un bloc, utiliser un fragment pour éviter tout <p>
      if (hasBlock) {
        return <>{children}</>;
      }
      // Sinon, paragraphe normal
      return <p className="mb-4 text-gray-700 leading-relaxed">{children}</p>;
    },

    // Code (inline et blocks)
    code: ({ inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      // Code inline
      if (inline) {
        return (
          <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono">
            {String(children).replace(/\n$/, '')}
          </code>
        );
      }

      // Code block - on utilise juste un fond simple pour éviter les problèmes
      return (
        <div className="mb-4">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code className={className}>
              {String(children).replace(/\n$/, '')}
            </code>
          </pre>
        </div>
      );
    },

    // Headers avec styles Notion
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold mb-4 text-gray-900">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-semibold mb-3 text-gray-800">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-semibold mb-2 text-gray-800">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-lg font-medium mb-2 text-gray-700">{children}</h4>
    ),
    h5: ({ children }) => (
      <h5 className="text-base font-medium mb-1 text-gray-700">{children}</h5>
    ),
    h6: ({ children }) => (
      <h6 className="text-sm font-medium mb-1 text-gray-600">{children}</h6>
    ),

    // Listes
    ul: ({ children }) => (
      <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="text-gray-700">{children}</li>
    ),

    // Blockquotes avec support des alertes
    blockquote: ({ children }) => {
      // Essayer de détecter le contenu pour les alertes GFM
      const firstChild = React.Children.toArray(children)[0];
      let textContent = '';
      
      if (typeof firstChild === 'string') {
        textContent = firstChild;
      } else if (React.isValidElement(firstChild) && firstChild.props?.children) {
        const grandChild = React.Children.toArray(firstChild.props.children)[0];
        if (typeof grandChild === 'string') {
          textContent = grandChild;
        }
      }

      // Détecter les alertes GFM
      const alertMatch = textContent.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/);
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

      // Blockquote normal
      return (
        <blockquote className="border-l-4 border-gray-300 pl-4 py-2 mb-4 text-gray-600 italic">
          {children}
        </blockquote>
      );
    },

    // Liens
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

    // Images
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

    // Tables
    table: ({ children }) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-gray-50">{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>
    ),
    tr: ({ children }) => <tr>{children}</tr>,
    th: ({ children }) => (
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-3 text-sm text-gray-700">
        {children}
      </td>
    ),

    // Ligne horizontale
    hr: () => <hr className="my-6 border-gray-300" />,

    // Formatage du texte
    strong: ({ children }) => (
      <strong className="font-semibold text-gray-900">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    del: ({ children }) => (
      <del className="line-through text-gray-500">{children}</del>
    ),

    // Checkbox pour les task lists
    input: ({ type, checked, ...props }) => {
      if (type === 'checkbox') {
        return (
          <input 
            type="checkbox"
            checked={checked}
            disabled
            className="mr-2 rounded border-gray-300"
            readOnly
          />
        );
      }
      return <input type={type} {...props} />;
    }
  };

  return (
    <div className={`notion-markdown-renderer ${className}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

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

function TabIcon({ name, ...props }) {
  switch(name) {
    case 'TrendingUp':
      return <TrendingUp {...props} />;
    case 'Star':
      return <Star {...props} />;
    case 'Clock':
      return <Clock {...props} />;
    case 'Folder':
      return <Folder {...props} />;
    default:
      return null;
  }
}

function StepIcon({ name, ...props }) {
  switch(name) {
    case 'Sparkles': return <Sparkles {...props} />;
    case 'Key': return <Key {...props} />;
    case 'Image': return <Image {...props} />;
    case 'CheckCircle': return <CheckCircle {...props} />;
    default: return null;
  }
}

// Composant principal avec toutes les améliorations
function App() {
  const [pages, setPages] = useState([]);
  const [filteredPages, setFilteredPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [selectedPages, setSelectedPages] = useState([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clipboard, setClipboard] = useState(null);
  const [editedClipboard, setEditedClipboard] = useState(null);
  const [realClipboard, setRealClipboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, message: '' });
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('suggested');
  const [favorites, setFavorites] = useState([]);
  const [notification, setNotification] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [config, setConfig] = useState({
    notionToken: '',
    imgbbKey: ''
  });
  const [hasNewPages, setHasNewPages] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showModificationWarning, setShowModificationWarning] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [contentType, setContentType] = useState('text');
  const [tags, setTags] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [markAsFavorite, setMarkAsFavorite] = useState(false);
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [addReminder, setAddReminder] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [sendMode, setSendMode] = useState('manual');
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);
  
  // Nouveaux états avancés Notion
  const [parseAsMarkdown, setParseAsMarkdown] = useState(true);
  const [pageTitle, setPageTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState('medium');
  const [addToReadingList, setAddToReadingList] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [pageIcon, setPageIcon] = useState('📄');
  const [pageColor, setPageColor] = useState('default');
  const [insertPosition, setInsertPosition] = useState('append');
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Objet consolidé pour toutes les propriétés Notion
  const [notionProperties, setNotionProperties] = useState({
    title: pageTitle,
    tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    category: category,
    source_url: sourceUrl,
    date: date,
    due_date: dueDate,
    priority: priority,
    is_favorite: markAsFavorite,
    add_to_reading_list: addToReadingList,
    has_reminder: addReminder,
    is_public: isPublic,
    icon: pageIcon,
    color: pageColor,
    insert_position: insertPosition,
    use_template: useTemplate,
    template_id: selectedTemplate,
    parse_markdown: parseAsMarkdown
  });

  // Synchronisation dynamique de notionProperties avec les champs
  useEffect(() => {
    setNotionProperties({
      title: pageTitle,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      category: category,
      source_url: sourceUrl,
      date: date,
      due_date: dueDate,
      priority: priority,
      is_favorite: markAsFavorite,
      add_to_reading_list: addToReadingList,
      has_reminder: addReminder,
      is_public: isPublic,
      icon: pageIcon,
      color: pageColor,
      insert_position: insertPosition,
      use_template: useTemplate,
      template_id: selectedTemplate,
      parse_markdown: parseAsMarkdown
    });
  }, [pageTitle, tags, category, sourceUrl, date, dueDate, priority, markAsFavorite, addToReadingList, addReminder, isPublic, pageIcon, pageColor, insertPosition, useTemplate, selectedTemplate, parseAsMarkdown]);

  const searchRef = useRef(null);
  const updateCheckInterval = useRef(null);
  const clipboardInterval = useRef(null);
  const pageRefreshInterval = useRef(null);
  const getCurrentClipboard = () => editedClipboard || clipboard;

  // Surveiller la connectivité
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Vérifier la connectivité backend avec timeout plus court
  const checkBackendConnection = async () => {
    try {
      await axios.get(`${API_URL}/health`, { timeout: 3000 }); // 3 secondes
      setIsBackendConnected(true);
    } catch (error) {
      console.error('Backend health check failed:', error);
      setIsBackendConnected(false);
    }
  };

  // Nouveau: Vérifier les mises à jour
  const checkForUpdates = async () => {
    if (!autoRefresh || !isBackendConnected) return;
    
    try {
      const response = await axios.get(`${API_URL}/pages/check_updates`);
      if (response.data.has_updates) {
        setHasNewPages(true);
        // Auto-refresh si activé
        if (autoRefresh) {
          await loadPages(true);
        }
      }
    } catch (error) {
      console.error('Erreur vérification updates:', error);
    }
  };

  // Charger les données avec gestion des erreurs améliorée
  useEffect(() => {
    // Vérification initiale immédiate
    checkBackendConnection().then(() => {
      loadPages();
      loadClipboard();
      loadFavorites();
      loadSelectedPage();
      loadConfig();
    });
    
    // Vérifier la connectivité backend toutes les 30 secondes
    const backendCheck = setInterval(checkBackendConnection, 30000);
    
    // Vérifier les mises à jour
    updateCheckInterval.current = setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL);
    
    // Auto-refresh clipboard plus intelligent
    clipboardInterval.current = setInterval(() => {
      if (isBackendConnected) {
        loadClipboard(true); // true = check only
      }
    }, CLIPBOARD_CHECK_INTERVAL);
    
    // Auto-refresh pages
    pageRefreshInterval.current = setInterval(() => {
      if (autoRefresh && isBackendConnected) {
        loadPages(true);
      }
    }, PAGE_REFRESH_INTERVAL);

    // Event listener pour le rafraîchissement via shortcut
    if (window.electronAPI) {
      window.electronAPI.onRefreshApp(() => {
        console.log('🔄 Rafraîchissement via shortcut...');
        loadPages(true);
        loadClipboard();
        showNotification('Application rafraîchie', 'success');
      });
    }
    
    // Vérifier si c'est la première utilisation
    const checkFirstRun = async () => {
      try {
        const response = await axios.get(`${API_URL}/health`);
        if (response.data.first_run && !response.data.onboarding_completed) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Erreur vérification first run:', error);
      }
    };
    
    checkFirstRun();
    
    return () => {
      clearInterval(backendCheck);
      if (updateCheckInterval.current) clearInterval(updateCheckInterval.current);
      if (clipboardInterval.current) clearInterval(clipboardInterval.current);
      if (pageRefreshInterval.current) clearInterval(pageRefreshInterval.current);
      
      if (window.electronAPI) {
        window.electronAPI.removeRefreshListener();
      }
    };
  }, [autoRefresh, isBackendConnected]); // Ajout de isBackendConnected dans les dépendances

  // Mémoriser la page sélectionnée
  useEffect(() => {
    if (selectedPage) {
      localStorage.setItem('notion-clipper-selected-page', JSON.stringify(selectedPage));
    }
  }, [selectedPage]);

  // Filtrage intelligent
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = pages.filter(page => 
        (page.title || '').toLowerCase().includes(query) ||
        (page.parent_title && page.parent_title.toLowerCase().includes(query))
      );
      filtered.sort((a, b) => new Date(b.last_edited) - new Date(a.last_edited));
      setFilteredPages(filtered);
    } else {
      switch (activeTab) {
        case 'favorites':
          const favPages = pages.filter(page => favorites.includes(page.id));
          favPages.sort((a, b) => new Date(b.last_edited) - new Date(a.last_edited));
          setFilteredPages(favPages);
          break;
        case 'recent':
          const recent = [...pages]
            .sort((a, b) => new Date(b.last_edited) - new Date(a.last_edited))
            .slice(0, 15);
          setFilteredPages(recent);
          break;
        case 'suggested':
          const suggested = [...pages]
            .sort((a, b) => new Date(b.last_edited) - new Date(a.last_edited))
            .slice(0, 10);
          setFilteredPages(suggested);
          break;
        default:
          const allPages = [...pages].sort((a, b) => new Date(b.last_edited) - new Date(a.last_edited));
          setFilteredPages(allPages);
      }
    }
  }, [searchQuery, pages, activeTab, favorites]);

  const loadConfig = () => {
    const saved = localStorage.getItem('notion-clipper-config');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (error) {
        console.error('Erreur parsing config:', error);
      }
    }
  };

  const saveConfig = async (newConfig) => {
    try {
      localStorage.setItem('notion-clipper-config', JSON.stringify(newConfig));
      setConfig(newConfig);
      
      await axios.post(`${API_URL}/config`, newConfig);
      
      showNotification('Configuration sauvegardée', 'success');
      
      setTimeout(() => {
        loadPages(true);
      }, 1000);
      
    } catch (error) {
      console.error('Erreur sauvegarde config:', error);
      showNotification('Erreur lors de la sauvegarde', 'error');
    }
  };

  // Chargement des pages avec gestion d'erreur améliorée
  const loadPages = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setLoadingProgress({ current: 0, total: 100, message: 'Connexion...' });
      }
      
      // Utiliser directement l'API normale avec timeout
      const response = await axios.get(`${API_URL}/pages?force_refresh=true`, {
        timeout: 30000 // 30 secondes de timeout
      });
      
      const newPages = response.data.pages || [];
      
      if (!silent && pages.length > 0 && newPages.length > pages.length) {
        const newPagesCount = newPages.length - pages.length;
        showNotification(`${newPagesCount} nouvelle(s) page(s) détectée(s)`, 'success');
      }
      
      setPages(newPages);
      setIsBackendConnected(true);
      setHasNewPages(false);
      
      if (!silent) {
        setLoadingProgress({ current: 100, total: 100, message: 'Chargement terminé' });
      }
      
    } catch (error) {
      console.error('Erreur chargement pages:', error);
      setIsBackendConnected(false);
      
      if (!silent) {
        if (error.code === 'ECONNABORTED') {
          showNotification('Timeout - Le chargement prend trop de temps', 'error');
        } else if (error.response) {
          showNotification(`Erreur serveur: ${error.response.data?.error || 'Erreur inconnue'}`, 'error');
        } else if (error.request) {
          showNotification('Le serveur Python ne répond pas', 'error');
        } else {
          showNotification('Erreur de connexion au backend', 'error');
        }
      }
    } finally {
      if (!silent) {
        setLoading(false);
        // Reset progress après un délai
        setTimeout(() => {
          setLoadingProgress({ current: 0, total: 0, message: '' });
        }, 500);
      }
    }
  };

  // Amélioration: Gestion intelligente du clipboard
  const loadClipboard = async (checkOnly = false) => {
    try {
      const response = await axios.get(`${API_URL}/clipboard`);
      let newClipboard = response.data;
      
      // Détection avancée du type
      if (newClipboard && newClipboard.content) {
        // Détection YouTube
        if (isYouTubeLink(newClipboard.content)) {
          newClipboard.type = 'video';
          newClipboard.videoUrl = extractYouTubeUrl(newClipboard.content);
        }
        // Détection image base64
        else if (newClipboard.content.startsWith('data:image/')) {
          newClipboard.type = 'image';
          newClipboard.imageData = newClipboard.content;
        }
        // Détection Markdown
        else if (newClipboard.type === 'text' && isMarkdown(newClipboard.content)) {
          newClipboard.isMarkdown = true;
        }
      }
      
      // Si checkOnly, vérifier si le clipboard a changé
      if (checkOnly && realClipboard) {
        const hasChanged = 
          newClipboard?.content !== realClipboard?.content ||
          newClipboard?.type !== realClipboard?.type;
        
        if (hasChanged && editedClipboard) {
          // Le vrai clipboard a changé alors qu'on a une version éditée
          setShowModificationWarning(true);
          return;
        }
      }
      
      setRealClipboard(newClipboard);
      
      // Si pas de version éditée, utiliser le nouveau clipboard
      if (!editedClipboard) {
        setClipboard(newClipboard);
      }
      
      setIsBackendConnected(true);
    } catch (error) {
      console.error('Erreur clipboard:', error);
      setIsBackendConnected(false);
    }
  };

  const loadFavorites = () => {
    const saved = localStorage.getItem('notion-clipper-favorites');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  };

  const loadSelectedPage = () => {
    const saved = localStorage.getItem('notion-clipper-selected-page');
    if (saved) {
      try {
        const parsedPage = JSON.parse(saved);
        setSelectedPage(parsedPage);
      } catch (error) {
        console.error('Erreur parsing selected page:', error);
      }
    }
  };

  const toggleFavorite = (pageId) => {
    const newFavorites = favorites.includes(pageId)
      ? favorites.filter(id => id !== pageId)
      : [...favorites, pageId];
    
    setFavorites(newFavorites);
    localStorage.setItem('notion-clipper-favorites', JSON.stringify(newFavorites));
  };

  const togglePageSelection = (pageId) => {
    setSelectedPages(prev => 
      prev.includes(pageId) 
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    );
  };

  const handleEditText = () => {
    if (clipboard && clipboard.type === 'text') {
      setShowTextEditor(true);
    }
  };

  const saveEditedText = (newContent) => {
    const edited = {
      ...clipboard,
      content: newContent,
      originalLength: newContent.length,
      truncated: newContent.length > MAX_CLIPBOARD_LENGTH
    };
    setEditedClipboard(edited);
    setClipboard(edited);
    setShowTextEditor(false);
    showNotification('Texte modifié', 'success');
  };

  const detectContentType = (clipboardData) => {
    try {
      // Détecter un tableau (format TSV/CSV)
      if (clipboardData.includes('\t') && clipboardData.includes('\n')) {
        const rows = clipboardData.split('\n');
        const firstRowCells = rows[0].split('\t').length;
        const isTable = rows.every(row => row.split('\t').length === firstRowCells);
        if (isTable) return 'table';
      }
      // Détecter JSON
      try {
        JSON.parse(clipboardData);
        return 'json';
      } catch {}
      // Détecter code
      const codePatterns = [/function\s*\(/, /const\s+\w+\s*=/, /class\s+\w+/, /import\s+.*from/];
      if (codePatterns.some(pattern => pattern.test(clipboardData))) {
        return 'code';
      }
      // Par défaut
      return 'text';
    } catch {
      return 'text';
    }
  };

  const sendToPage = useCallback(async () => {
    const targetPages = multiSelectMode ? selectedPages : (selectedPage ? [selectedPage.id] : []);
    const contentToSend = getCurrentClipboard();
    
    if (targetPages.length === 0 || !contentToSend) return;
    
    try {
      setSending(true);
      
      // Préparer toutes les propriétés Notion
      const payload = {
        page_ids: targetPages,
        content: contentToSend.content,
        content_type: contentToSend.type,
        block_type: contentType,
        parse_markdown: parseAsMarkdown,
        properties: {
          title: pageTitle || 'Nouveau clip',
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          category: category,
          source_url: sourceUrl,
          date: date,
          due_date: dueDate,
          priority: priority,
          is_favorite: markAsFavorite,
          add_to_reading_list: addToReadingList,
          has_reminder: addReminder,
          is_public: isPublic,
          icon: pageIcon,
          color: pageColor,
          insert_position: insertPosition,
          use_template: useTemplate,
          template_id: selectedTemplate
        }
      };

      const response = await axios.post(`${API_URL}/send_multiple`, payload);
      
      const successCount = response.data.success_count || targetPages.length;
      showNotification(
        `Contenu envoyé vers ${successCount} page${successCount > 1 ? 's' : ''} !`, 
        'success'
      );
      
      // Réinitialiser après envoi
      setEditedClipboard(null);
      setShowModificationWarning(false);
      
      setTimeout(() => {
        loadClipboard();
      }, 1000);
      
    } catch (error) {
      console.error('Erreur envoi:', error);
      const errorMessage = error.response?.data?.error || 'Erreur lors de l\'envoi';
      showNotification(errorMessage, 'error');
    } finally {
      setSending(false);
    }
  }, [multiSelectMode, selectedPages, selectedPage, contentType, tags, sourceUrl, markAsFavorite, category, dueDate, addReminder, getCurrentClipboard, parseAsMarkdown, pageTitle, date, priority, addToReadingList, isPublic, pageIcon, pageColor, insertPosition, useTemplate, selectedTemplate]);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleWindowControl = async (action) => {
    if (window.electronAPI) {
      await window.electronAPI[action]();
    }
  };

  // Déclaration des tabs avec des strings pour les icônes
  const tabs = [
    { id: 'suggested', label: 'Suggérées', icon: 'TrendingUp' },
    { id: 'favorites', label: 'Favoris', icon: 'Star' },
    { id: 'recent', label: 'Récents', icon: 'Clock' },
    { id: 'all', label: 'Toutes', icon: 'Folder' }
  ];

  const getTargetInfo = () => {
    if (multiSelectMode) {
      if (selectedPages.length === 0) return 'Sélectionnez des pages';
      if (selectedPages.length === 1) {
        const page = pages.find(p => p.id === selectedPages[0]);
        return `Envoyer vers "${page?.title || 'Page'}"`;
      }
      return `Envoyer vers ${selectedPages.length} pages`;
    } else {
      if (!selectedPage) return 'Sélectionnez une page';
      return `Envoyer vers "${selectedPage.title || 'Page'}"`;
    }
  };

  const handleUseNewClipboard = () => {
    setEditedClipboard(null);
    setClipboard(realClipboard);
    setShowModificationWarning(false);
    showNotification('Nouveau contenu du presse-papiers utilisé', 'info');
  };

  const handleKeepEditedContent = () => {
    setShowModificationWarning(false);
  };

  // Fonction utilitaire pour le pluriel
  const pluralize = (count, singular, plural) => count === 1 ? singular : plural;

  // Fonction utilitaire pour vider le presse-papiers
  const clearClipboard = () => {
    setClipboard(null);
    setEditedClipboard(null);
    setRealClipboard(null);
    showNotification('Presse-papiers vidé', 'info');
  };

  // Variable pour éviter les répétitions
  const currentClipboard = getCurrentClipboard();

  // Fonction helper pour vérifier si on peut envoyer
  const canSend = useCallback(() => {
    const hasTarget = multiSelectMode ? selectedPages.length > 0 : selectedPage !== null;
    const hasContent = getCurrentClipboard() !== null;
    return hasTarget && hasContent && !sending;
  }, [multiSelectMode, selectedPages, selectedPage, sending, getCurrentClipboard]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Enter pour envoyer (sauf si on édite du texte)
      if (e.key === 'Enter' && !showTextEditor && !showConfig) {
        e.preventDefault();
        if (canSend()) {
          sendToPage();
        }
      }
      // Escape pour fermer les modales
      if (e.key === 'Escape') {
        if (showTextEditor) setShowTextEditor(false);
        if (showConfig) setShowConfig(false);
        if (showModificationWarning) setShowModificationWarning(false);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [canSend, sendToPage, showTextEditor, showConfig, showModificationWarning]);

  if (showOnboarding && !onboardingCompleted) {
    return (
      <Onboarding
        onComplete={() => {
          setShowOnboarding(false);
          setOnboardingCompleted(true);
          loadPages();
        }}
        onSaveConfig={saveConfig}
      />
    );
  }

  return (
    <div className="h-screen bg-notion-gray-50 font-sans flex flex-col">
      {/* Titlebar Notion style */}
      <motion.div 
        className="h-11 bg-white border-b border-notion-gray-200 flex items-center justify-between px-4 flex-shrink-0 drag-region"
        initial={{ y: -44, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-500" />
            <span className="text-sm font-medium text-notion-gray-700">
              Notion Clipper Pro
            </span>
          </div>
          
          {/* Indicateur de connectivité */}
          <div className="flex items-center gap-2">
            {isOnline && isBackendConnected ? (
              <div className="flex items-center gap-1">
                <Wifi size={12} className="text-green-500" />
                <span className="text-xs text-green-600">Connecté</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <WifiOff size={12} className="text-red-500" />
                <span className="text-xs text-red-600">Déconnecté</span>
              </div>
            )}
          </div>
          
          {/* Indicateur de nouveautés */}
          {hasNewPages && (
            <motion.div 
              className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <Bell size={12} className="text-blue-600" />
              <span className="text-xs text-blue-600">Nouvelles pages</span>
            </motion.div>
          )}
          
          {/* Progress de chargement amélioré */}
          {loading && loadingProgress.total > 0 && (
            <div className="flex items-center gap-2">
              <div className="text-xs text-notion-gray-500">
                {loadingProgress.message}
              </div>
              <div className="w-20 h-1.5 bg-notion-gray-200 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-blue-500"
                  animate={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 no-drag">
          {/* Toggle auto-refresh */}
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
              autoRefresh ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}
            title={autoRefresh ? "Auto-refresh activé" : "Auto-refresh désactivé"}
          >
            {autoRefresh ? <RefreshCw size={14} /> : <RefreshCw size={14} />}
          </button>
          
          {/* Bouton toggle sidebar */}
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-8 h-8 flex items-center justify-center hover:bg-notion-gray-100 rounded transition-colors"
            title={sidebarCollapsed ? "Ouvrir panneau" : "Fermer panneau"}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
          
          {/* Bouton config */}
          <button 
            onClick={() => setShowConfig(true)}
            className="w-8 h-8 flex items-center justify-center hover:bg-notion-gray-100 rounded transition-colors"
            title="Configuration"
          >
            <Settings size={14} className="text-notion-gray-600" />
          </button>
          
          {/* Bouton sélection multiple */}
          <button 
            onClick={() => {
              setMultiSelectMode(!multiSelectMode);
              setSelectedPages([]);
            }}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
              multiSelectMode ? 'bg-blue-100 text-blue-600' : 'hover:bg-notion-gray-100 text-notion-gray-600'
            }`}
            title="Sélection multiple"
          >
            <CheckSquare size={14} />
          </button>
          
          <button 
            onClick={() => handleWindowControl('minimizeWindow')}
            className="w-8 h-8 flex items-center justify-center hover:bg-notion-gray-100 rounded transition-colors"
          >
            <Minus size={14} className="text-notion-gray-600" />
          </button>
          <button 
            onClick={() => handleWindowControl('maximizeWindow')}
            className="w-8 h-8 flex items-center justify-center hover:bg-notion-gray-100 rounded transition-colors"
          >
            <Square size={12} className="text-notion-gray-600" />
          </button>
          <button 
            onClick={() => handleWindowControl('closeWindow')}
            className="w-8 h-8 flex items-center justify-center hover:bg-red-100 hover:text-red-600 rounded transition-colors"
          >
            <X size={14} className="text-notion-gray-600" />
          </button>
          {process.env.NODE_ENV === 'development' && (
            <button 
              onClick={() => setShowOnboarding(true)}
              className="w-8 h-8 flex items-center justify-center hover:bg-notion-gray-100 rounded transition-colors"
              title="Test Onboarding"
            >
              <Sparkles size={14} className="text-purple-600" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {!sidebarCollapsed && (
            <motion.aside 
              className="w-80 bg-white border-r border-notion-gray-200 flex flex-col"
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {/* Search */}
              <div className="p-4 border-b border-notion-gray-100">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-notion-gray-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Rechercher des pages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-notion-gray-50 border border-notion-gray-200 rounded-notion text-sm focus:outline-none focus:ring-2 focus:ring-notion-gray-300 focus:border-transparent"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-notion-gray-200 rounded transition-colors"
                    >
                      <X size={12} className="text-notion-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="px-4 py-3 border-b border-notion-gray-100">
                <div className="grid grid-cols-2 gap-1">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                        activeTab === tab.id 
                          ? 'bg-notion-gray-100 text-notion-gray-900' 
                          : 'text-notion-gray-600 hover:bg-notion-gray-50'
                      }`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <TabIcon name={tab.icon} size={14} />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Affichage du nombre total de pages */}
              <div className="px-4 py-2 border-b border-notion-gray-100 bg-notion-gray-50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-notion-gray-600">Total pages</span>
                  <span className="font-medium text-notion-gray-900">{pages.length}</span>
                </div>
                {loading && (
                  <div className="mt-1 w-full h-1 bg-notion-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-pulse" />
                  </div>
                )}
              </div>

              {/* Mode sélection multiple indicator */}
              {multiSelectMode && (
                <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-800">
                      {selectedPages.length} page{selectedPages.length > 1 ? 's' : ''} sélectionnée{selectedPages.length > 1 ? 's' : ''}
                    </span>
                    {selectedPages.length > 0 && (
                      <button
                        onClick={() => setSelectedPages([])}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Désélectionner
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Pages list */}
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div 
                      className="flex flex-col items-center justify-center h-full text-notion-gray-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="w-6 h-6 border-2 border-notion-gray-300 border-t-notion-gray-600 rounded-full loading-spinner mb-3"></div>
                      <p className="text-sm">{loadingProgress.message || 'Chargement des pages...'}</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      className="p-4 space-y-2 h-full overflow-y-auto custom-scrollbar"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {filteredPages.length === 0 ? (
                        <div className="text-center text-notion-gray-500 py-8">
                          <p className="text-sm">Aucune page trouvée</p>
                          {!isBackendConnected && (
                            <button
                              onClick={() => loadPages()}
                              className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                            >
                              Réessayer
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredPages.map((page, index) => (
                          <motion.div
                            key={page.id}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: Math.min(index * 0.02, 0.3) }}
                          >
                            <PageCard
                              page={page}
                              onClick={setSelectedPage}
                              isFavorite={favorites.includes(page.id)}
                              onToggleFavorite={toggleFavorite}
                              isSelected={selectedPages.includes(page.id)}
                              onToggleSelect={togglePageSelection}
                              multiSelectMode={multiSelectMode}
                            />
                          </motion.div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main area - Amélioration: Layout responsive avec bouton toujours visible */}
        <motion.main 
          className="flex-1 flex flex-col bg-notion-gray-50 min-h-0 relative"
          animate={{ marginLeft: sidebarCollapsed ? 0 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Conteneur scrollable global */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
            {/* Zone presse-papiers avec panneau pliable */}
            <div className="p-6 pb-3">
              <div className="bg-white rounded-notion border border-notion-gray-200">
                {/* Header avec toggle */}
                <div className="px-6 py-4 border-b border-notion-gray-100 cursor-pointer hover:bg-notion-gray-50"
                     onClick={() => setPropertiesCollapsed(!propertiesCollapsed)}>
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
                      {currentClipboard?.type === 'text' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditText();
                          }}
                          className="p-2 hover:bg-notion-gray-100 rounded transition-colors"
                          aria-label="Modifier le texte"
                        >
                          <Edit3 size={16} className="text-notion-gray-600" />
                        </button>
                      )}
                      {currentClipboard && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setClipboard(null);
                            setEditedClipboard(null);
                            setRealClipboard(null);
                            showNotification('Presse-papiers vidé', 'info');
                          }}
                          className="p-2 hover:bg-notion-gray-100 rounded transition-colors"
                          aria-label="Vider le presse-papiers"
                        >
                          <Trash2 size={16} className="text-notion-gray-600" />
                        </button>
                      )}
                      <ChevronDown size={16} className={`transform transition-transform ${propertiesCollapsed ? '' : 'rotate-180'}`} />
                    </div>
                  </div>
                </div>
                {/* Contenu collapsible */}
                {!propertiesCollapsed && (
                  <div className="p-6">
                    {currentClipboard ? (
                      <div className="h-full flex flex-col">
                        {(() => {
                          switch (currentClipboard.type) {
                            case 'video':
                              return (
                                <div className="flex flex-col items-center gap-4">
                                  <div className="w-full max-w-md">
                                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                      {currentClipboard.videoUrl && (
                                        <iframe
                                          src={`https://www.youtube.com/embed/${extractYouTubeId(currentClipboard.videoUrl)}`}
                                          className="w-full h-full"
                                          allowFullScreen
                                          title={`notion-iframe-${currentClipboard.id || 'unique'}`}
                                        />
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-sm text-notion-gray-600">Vidéo YouTube prête à être intégrée</p>
                                </div>
                              );
                            case 'image':
                              return (
                                <div className="flex flex-col items-center gap-4">
                                  {currentClipboard.imageData && (
                                    <img 
                                      src={currentClipboard.imageData} 
                                      alt="" 
                                      className="max-w-full max-h-64 rounded-lg shadow-md"
                                    />
                                  )}
                                  <p className="text-sm text-notion-gray-600">Image prête à être uploadée</p>
                                </div>
                              );
                            case 'table':
                              return (
                                <div className="overflow-auto">
                                  <RenderTable content={currentClipboard.content} />
                                </div>
                              );
                            case 'text':
                              if (currentClipboard.isMarkdown) {
                                return <NotionMarkdownRenderer content={currentClipboard.content} />;
                              }
                              return <div className="whitespace-pre-wrap">{currentClipboard.content}</div>;
                            default:
                              return (
                                <div className="flex items-center justify-center h-full">
                                  <div className="text-center">
                                    <div className="w-16 h-16 bg-notion-gray-100 rounded-notion flex items-center justify-center mx-auto mb-3">
                                      <FileText size={24} className="text-notion-gray-500" />
                                    </div>
                                    <p className="text-sm text-notion-gray-600 font-medium">Contenu copié</p>
                                    <p className="text-xs text-notion-gray-400 mt-1">Type : {currentClipboard.type}</p>
                                  </div>
                                </div>
                              );
                          }
                        })()}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-center text-notion-gray-400">
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
            {/* Options d'envoi collapsibles */}
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
                        {Object.values(notionProperties).filter(Boolean).length} actives
                      </span>
                    </div>
                    <ChevronDown size={16} className={`transform transition-transform text-notion-gray-400 ${optionsExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Contenu des propriétés */}
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

                          {/* Catégorie */}
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm text-notion-gray-700">
                              <Folder size={12} />
                              Catégorie
                            </label>
                            <select
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full text-sm border border-notion-gray-200 rounded-notion px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Aucune catégorie</option>
                              <option value="work">💼 Travail</option>
                              <option value="personal">👤 Personnel</option>
                              <option value="ideas">💡 Idées</option>
                              <option value="resources">📚 Ressources</option>
                              <option value="archive">📦 Archive</option>
                            </select>
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
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-sm text-notion-gray-700">
                                <Clock size={12} />
                                Échéance
                              </label>
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
                            <div className="flex gap-2">
                              {['low', 'medium', 'high', 'urgent'].map((priority) => (
                                <button
                                  key={priority}
                                  onClick={() => setPriority(priority)}
                                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-notion transition-all ${
                                    notionProperties.priority === priority
                                      ? priority === 'urgent' ? 'bg-red-100 text-red-700 border-red-300' :
                                        priority === 'high' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                        priority === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                                        'bg-green-100 text-green-700 border-green-300'
                                      : 'bg-white text-notion-gray-600 border-notion-gray-200'
                                  } border`}
                                >
                                  {priority === 'urgent' ? '🔴 Urgent' :
                                  priority === 'high' ? '🟠 Haute' :
                                  priority === 'medium' ? '🟡 Moyenne' :
                                  '🟢 Basse'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Options booléennes */}
                          <div className="space-y-3 p-4 bg-notion-gray-50 rounded-notion">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={markAsFavorite}
                                onChange={(e) => setMarkAsFavorite(e.target.checked)}
                                className="w-4 h-4 rounded border-notion-gray-300 text-yellow-500 focus:ring-yellow-500"
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <Star size={16} className={markAsFavorite ? "text-yellow-500 fill-yellow-500" : "text-notion-gray-400"} />
                                <span className="text-sm font-medium text-notion-gray-700">Marquer comme favori</span>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={addToReadingList}
                                onChange={(e) => setAddToReadingList(e.target.checked)}
                                className="w-4 h-4 rounded border-notion-gray-300 text-blue-500 focus:ring-blue-500"
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <Bookmark size={16} className={addToReadingList ? "text-blue-500 fill-blue-500" : "text-notion-gray-400"} />
                                <span className="text-sm font-medium text-notion-gray-700">Ajouter à la liste de lecture</span>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={addReminder}
                                onChange={(e) => setAddReminder(e.target.checked)}
                                className="w-4 h-4 rounded border-notion-gray-300 text-purple-500 focus:ring-purple-500"
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <Bell size={16} className={addReminder ? "text-purple-500" : "text-notion-gray-400"} />
                                <span className="text-sm font-medium text-notion-gray-700">Ajouter un rappel</span>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                                className="w-4 h-4 rounded border-notion-gray-300 text-green-500 focus:ring-green-500"
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <Eye size={16} className={isPublic ? "text-green-500" : "text-notion-gray-400"} />
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
                                      color === 'green' ? '#d1fae5' :
                                      color === 'blue' ? '#dbeafe' :
                                      color === 'purple' ? '#e9d5ff' :
                                      color === 'pink' ? '#fce7f3' :
                                      '#fee2e2'
                                  }}
                                  title={color}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Position dans la page */}
                          <div className="space-y-2">
                            <label className="text-sm text-notion-gray-700">Position dans la page</label>
                            <select
                              value={insertPosition}
                              onChange={(e) => setInsertPosition(e.target.value)}
                              className="w-full text-sm border border-notion-gray-200 rounded-notion px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="append">🔽 À la fin de la page</option>
                              <option value="prepend">🔼 Au début de la page</option>
                              <option value="after_title">📍 Après le titre</option>
                              <option value="replace">🔄 Remplacer le contenu</option>
                            </select>
                          </div>

                          {/* Template */}
                          <div className="p-3 bg-blue-50 rounded-notion border border-blue-200">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={useTemplate}
                                onChange={(e) => setUseTemplate(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex items-center gap-2">
                                <FileText size={14} className="text-blue-600" />
                                <span className="text-sm font-medium text-blue-900">Utiliser un template</span>
                              </div>
                            </label>
                            {useTemplate && (
                              <select
                                value={selectedTemplate}
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                className="w-full mt-2 text-sm border border-blue-200 rounded px-2 py-1 bg-white"
                              >
                                <option value="">Sélectionner un template</option>
                                <option value="meeting">📝 Notes de réunion</option>
                                <option value="task">✅ Tâche</option>
                                <option value="idea">💡 Idée</option>
                                <option value="bookmark">🔖 Marque-page</option>
                              </select>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Carousel Destinations avec dimensions fixes et badge */}
            <div className="px-6 pb-6">
              <div className="bg-white rounded-notion border border-notion-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-notion-gray-700">
                    {multiSelectMode ? 'Destinations' : 'Destination'}
                  </h3>
                  {/* Badge nombre de pages sélectionnées */}
                  {multiSelectMode && selectedPages.length > 0 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {selectedPages.length} sélectionnée{selectedPages.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {/* Carousel avec dimensions fixes */}
                <div className="relative h-16 w-full">
                  <div className="absolute inset-0 flex gap-2 overflow-x-auto overflow-y-hidden custom-scrollbar-horizontal">
                    {multiSelectMode ? (
                      selectedPages.length > 0 ? (
                        selectedPages.map(pageId => {
                          const page = pages.find(p => p.id === pageId);
                          if (!page) return null;
                          
                          return (
                            <div
                              key={pageId}
                              className="flex-shrink-0 bg-notion-gray-50 rounded px-3 py-2 border border-notion-gray-200 flex items-center gap-2 h-fit"
                              style={{ minWidth: '180px', maxWidth: '220px' }}
                            >
                              {getPageIcon(page)}
                              <span className="text-sm text-notion-gray-900 truncate max-w-[120px]">
                                {page.title || 'Sans titre'}
                              </span>
                              <button
                                onClick={() => togglePageSelection(pageId)}
                                className="ml-1 text-notion-gray-400 hover:text-red-600 flex-shrink-0"
                              >
                                <X size={12} />
                              </button>
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
                          {getPageIcon(selectedPage)}
                          <span className="text-sm text-notion-gray-900 truncate max-w-[120px]">
                            {selectedPage.title || 'Sans titre'}
                          </span>
                          <button
                            onClick={() => setSelectedPage(null)}
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
          {/* Bouton d'action fixe en bas */}
          <div className="p-4 border-t border-notion-gray-200 bg-white">
            <motion.button
              className={`w-full py-3 px-6 rounded-notion font-medium transition-all duration-200 flex items-center justify-center gap-2 relative overflow-hidden ${
                (!selectedPage && !multiSelectMode) || (multiSelectMode && selectedPages.length === 0) || !getCurrentClipboard() || sending
                  ? 'bg-notion-gray-100 text-notion-gray-400 cursor-not-allowed'
                  : 'bg-notion-gray-900 text-white hover:bg-notion-gray-800 shadow-notion'
              }`}
              onClick={sendToPage}
              disabled={(!selectedPage && !multiSelectMode) || (multiSelectMode && selectedPages.length === 0) || !getCurrentClipboard() || sending}
              whileTap={{ scale: 0.98 }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
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
      </div>

      {/* Alert modification clipboard */}
      <AnimatePresence>
        {showModificationWarning && (
          <motion.div 
            className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-orange-50 border border-orange-200 rounded-notion p-4 shadow-lg z-50"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">
                  Le presse-papiers a changé
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Vous avez modifié le texte précédent. Que voulez-vous faire ?
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleKeepEditedContent}
                    className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded text-xs font-medium hover:bg-orange-200"
                  >
                    Garder le texte modifié
                  </button>
                  <button
                    onClick={handleUseNewClipboard}
                    className="px-3 py-1.5 bg-orange-600 text-white rounded text-xs font-medium hover:bg-orange-700"
                  >
                    Utiliser le nouveau contenu
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Configuration panel */}
      <AnimatePresence>
        {showConfig && (
          <SettingsPanel
            isOpen={showConfig}
            onClose={() => setShowConfig(false)}
            onSave={saveConfig}
            config={config}
            showNotification={showNotification}
          />
        )}
      </AnimatePresence>

      {/* Text editor */}
      <AnimatePresence>
        {showTextEditor && (
          <TextEditor
            content={getCurrentClipboard()?.content || ''}
            onSave={saveEditedText}
            onCancel={() => setShowTextEditor(false)}
          />
        )}
      </AnimatePresence>

      {/* Connectivity status */}
      <AnimatePresence>
        <ConnectivityStatus 
          isOnline={isOnline} 
          isBackendConnected={isBackendConnected} 
        />
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            className={`fixed top-16 right-4 px-4 py-3 rounded-notion shadow-notion-lg flex items-center gap-3 min-w-80 z-40 ${
              notification.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : notification.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
            initial={{ x: 400, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 400, opacity: 0, scale: 0.9 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300,
              duration: 0.3
            }}
          >
            <motion.div
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              {notification.type === 'success' ? (
                <CheckCircle size={18} />
              ) : notification.type === 'error' ? (
                <AlertCircle size={18} />
              ) : (
                <Zap size={18} />
              )}
            </motion.div>
            <span className="text-sm font-medium">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de sélection de page avec URL */}
      <AnimatePresence>
        {showPageSelector && (
          <PageSelectorModal
            isOpen={showPageSelector}
            onClose={() => setShowPageSelector(false)}
            onSelectPages={setSelectedPages}
            pages={pages}
            multiMode={multiSelectMode}
            sendMode={sendMode}
            setSendMode={setSendMode}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Modal de sélection de page avec URL
function PageSelectorModal({ isOpen, onClose, onSelectPages, pages, multiMode = false, sendMode, setSendMode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrls, setSelectedUrls] = useState([]);
  const [manualUrl, setManualUrl] = useState('');
  const [filteredPages, setFilteredPages] = useState(pages);

  useEffect(() => {
    if (searchQuery) {
      const filtered = pages.filter(page => 
        page.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.url?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPages(filtered);
    } else {
      setFilteredPages(pages);
    }
  }, [searchQuery, pages]);

  const handleAddManualUrl = () => {
    if (manualUrl && manualUrl.startsWith('https://www.notion.so/')) {
      setSelectedUrls([...selectedUrls, manualUrl]);
      setManualUrl('');
    }
  };

  const handleSelectPage = (page) => {
    if (multiMode) {
      if (selectedUrls.includes(page.url)) {
        setSelectedUrls(selectedUrls.filter(url => url !== page.url));
      } else {
        setSelectedUrls([...selectedUrls, page.url]);
      }
    } else {
      onSelectPages([page]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div className="bg-white rounded-notion p-6 w-[600px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Sélectionner la destination</h2>
          <button onClick={onClose} className="p-1 hover:bg-notion-gray-100 rounded">
            <X size={16} />
          </button>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-4">
          <button className="px-3 py-1.5 bg-notion-gray-100 rounded text-sm font-medium">
            Mes pages
          </button>
          <button className="px-3 py-1.5 hover:bg-notion-gray-50 rounded text-sm">
            Coller une URL
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-notion-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une page..."
            className="w-full pl-10 pr-4 py-2 border border-notion-gray-200 rounded-md text-sm"
          />
        </div>

        {/* Champ URL manuel */}
        <div className="flex gap-2 mb-4">
          <input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://www.notion.so/..."
            className="flex-1 px-3 py-2 border border-notion-gray-200 rounded-md text-sm"
          />
          <button
            onClick={handleAddManualUrl}
            disabled={!manualUrl || !manualUrl.startsWith('https://www.notion.so/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>

        {/* Liste des pages */}
        <div className="flex-1 overflow-y-auto border border-notion-gray-200 rounded-md">
          {filteredPages.map(page => (
            <div
              key={page.id}
              onClick={() => handleSelectPage(page)}
              className={`p-3 hover:bg-notion-gray-50 cursor-pointer border-b border-notion-gray-100 ${
                selectedUrls.includes(page.url) ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {multiMode && (
                  <input
                    type="checkbox"
                    checked={selectedUrls.includes(page.url)}
                    onChange={() => {}}
                    className="rounded text-blue-600"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getPageIcon(page)}
                    <span className="font-medium text-sm">{page.title || 'Sans titre'}</span>
                  </div>
                  <p className="text-xs text-notion-gray-500 truncate mt-1">{page.url}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Options d'envoi pour multi-sélection */}
        {multiMode && selectedUrls.length > 0 && (
          <div className="mt-4 p-3 bg-notion-gray-50 rounded">
            <p className="text-sm font-medium mb-2">Mode d'envoi :</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="manual"
                  checked={sendMode === 'manual'}
                  onChange={(e) => setSendMode(e.target.value)}
                  className="text-blue-600"
                />
                <span className="text-sm">Manuel (confirmer chaque envoi)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="auto"
                  checked={sendMode === 'auto'}
                  onChange={(e) => setSendMode(e.target.value)}
                  className="text-blue-600"
                />
                <span className="text-sm">Automatique (envoi en chaîne)</span>
              </label>
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-notion-gray-200 rounded-md text-sm"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              onSelectPages(selectedUrls.map(url => ({ url })));
              onClose();
            }}
            disabled={selectedUrls.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50"
          >
            Sélectionner ({selectedUrls.length})
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Fonctions helper pour la détection de médias et markdown
const isYouTubeLink = (content) => {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/.test(content);
};

const extractYouTubeUrl = (content) => {
  const match = content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return match ? `https://www.youtube.com/watch?v=${match[1]}` : content;
};

const extractYouTubeId = (url) => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return match ? match[1] : '';
};

const isMarkdown = (content) => {
  return /^#{1,6}\s|^\*\s|^\d+\.\s|```|^>/.test(content);
};

export default App;