import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Send, Star, Clock, Zap, 
  Minus, Square, X, Copy, Image,
  Globe, Folder, TrendingUp,
  CheckCircle, AlertCircle, FileText, Database,
  Calendar, Settings, Hash,
  CheckSquare, Code, Quote, Wifi, 
  WifiOff, RotateCcw, Loader, Video, 
  Music, Info, Eye, EyeOff, Save, Edit3, 
  PanelLeftClose, PanelLeftOpen, RefreshCw,
  Bell, Sparkles, Trash2, Key
} from 'lucide-react';
import axios from 'axios';
import Onboarding from './OnBoarding.jsx';
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
    return <Quote size={14} className="text-orange-600" />; // Correction ici
  
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

// Composant de configuration
function ConfigPanel({ isOpen, onClose, onSave, config }) {
  const [localConfig, setLocalConfig] = useState(config);
  const [showKeys, setShowKeys] = useState({ notion: false, imgbb: false });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localConfig);
      onClose();
    } catch (error) {
      console.error('Erreur sauvegarde config:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-notion p-6 w-96 max-h-96 overflow-y-auto"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-notion-gray-900">Configuration</h2>
          <button onClick={onClose} className="p-1 hover:bg-notion-gray-100 rounded">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-notion-gray-700 mb-2">
              Token Notion *
            </label>
            <div className="relative">
              <input
                type={showKeys.notion ? 'text' : 'password'}
                value={localConfig.notionToken || ''}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, notionToken: e.target.value }))}
                className="w-full px-3 py-2 border border-notion-gray-200 rounded-notion text-sm focus:outline-none focus:ring-2 focus:ring-notion-gray-300"
                placeholder="ntn_..."
              />
              <button
                type="button"
                onClick={() => setShowKeys(prev => ({ ...prev, notion: !prev.notion }))}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-notion-gray-100 rounded"
              >
                {showKeys.notion ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-xs text-notion-gray-500 mt-1">
              Obtenez votre token sur notion.so/my-integrations
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-notion-gray-700 mb-2">
              Clé ImgBB (optionnel)
            </label>
            <div className="relative">
              <input
                type={showKeys.imgbb ? 'text' : 'password'}
                value={localConfig.imgbbKey || ''}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, imgbbKey: e.target.value }))}
                className="w-full px-3 py-2 border border-notion-gray-200 rounded-notion text-sm focus:outline-none focus:ring-2 focus:ring-notion-gray-300"
                placeholder="Clé API ImgBB..."
              />
              <button
                type="button"
                onClick={() => setShowKeys(prev => ({ ...prev, imgbb: !prev.imgbb }))}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-notion-gray-100 rounded"
              >
                {showKeys.imgbb ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-xs text-notion-gray-500 mt-1">
              Pour envoyer des vraies images (api.imgbb.com)
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-notion-gray-200 rounded-notion text-sm font-medium text-notion-gray-700 hover:bg-notion-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !localConfig.notionToken}
            className="flex-1 px-4 py-2 bg-notion-gray-900 text-white rounded-notion text-sm font-medium hover:bg-notion-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      className={`relative p-3 rounded-notion transition-all cursor-pointer ${
        isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-notion-gray-50 border-notion-gray-200'
      } border`}
      onClick={() => !multiSelectMode && onClick(page)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center gap-3">
        {multiSelectMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(page.id)}
            onClick={e => e.stopPropagation()}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
        )}
        
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
          {React.isValidElement(getPageIcon(page)) ? getPageIcon(page) : null}
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
      
      <motion.div 
        className="absolute inset-0 rounded-notion pointer-events-none border"
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: isHovered ? 1 : 0,
          borderColor: isSelected ? "rgb(59, 130, 246)" : "rgb(209, 213, 219)"
        }}
        transition={{ duration: 0.15 }}
      />
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
function NotionMarkdownRenderer({ content }) {
  return (
    <div className="notion-content prose prose-notion max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
      <div className="mt-4 text-xs text-notion-gray-400 border-t pt-3">
        <p>✓ Markdown supporté : titres, listes, code, citations, tableaux, liens</p>
        <p>⚠️ Non supporté : toggles, bases de données, embeds Notion spécifiques</p>
      </div>
    </div>
  );
}

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
  const [realClipboard, setRealClipboard] = useState(null); // Nouveau: stocke le vrai clipboard
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
  
  const searchRef = useRef(null);
  const updateCheckInterval = useRef(null);
  const clipboardInterval = useRef(null);
  const pageRefreshInterval = useRef(null);

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
      const newClipboard = response.data;
      
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

  const sendToPage = async () => {
    const targetPages = multiSelectMode ? selectedPages : (selectedPage ? [selectedPage.id] : []);
    const contentToSend = getCurrentClipboard();
    
    if (targetPages.length === 0 || !contentToSend) return;
    
    try {
      setSending(true);
      
      let payload = {
        page_ids: targetPages,
        content_type: contentToSend.type,
        block_type: contentType,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        source_url: sourceUrl,
        is_favorite: markAsFavorite
      };

      if (contentToSend.type === 'image') {
        payload.content = contentToSend.content;
        payload.is_image = true;
      } else {
        payload.content = contentToSend.content;
        payload.is_image = false;
        payload.truncated = contentToSend.truncated;
        payload.original_length = contentToSend.originalLength;
      }

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
  };

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

  const getCurrentClipboard = () => editedClipboard || clipboard;

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
  const canSend = () => {
    const hasTarget = multiSelectMode ? selectedPages.length > 0 : selectedPage !== null;
    const hasContent = getCurrentClipboard() !== null;
    return hasTarget && hasContent && !sending;
  };

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
                      {loadingProgress.total > 0 && (
                        <p className="text-xs text-notion-gray-400 mt-1">
                          {loadingProgress.current}/{loadingProgress.total}
                        </p>
                      )}
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
          className="flex-1 flex flex-col bg-notion-gray-50 min-h-0"
          animate={{ marginLeft: sidebarCollapsed ? 0 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Zone principale pour le presse-papiers */}
          <div className="flex-1 p-6 pb-2 min-h-0">
            <div className="bg-white rounded-notion border border-notion-gray-200 h-full flex flex-col">
              {/* Header du presse-papiers */}
              <div className="px-6 py-4 border-b border-notion-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Copy size={18} className="text-notion-gray-600" />
                    <h2 className="font-semibold text-notion-gray-900">Presse-papiers</h2>
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
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {currentClipboard?.type === 'text' && (
                      <button
                        onClick={handleEditText}
                        className="p-2 hover:bg-notion-gray-100 rounded transition-colors"
                        aria-label="Modifier le texte"
                      >
                        <Edit3 size={16} className="text-notion-gray-600" />
                      </button>
                    )}
                    
                    {currentClipboard && (
                      <button
                        onClick={() => {
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
                  </div>
                </div>
              </div>
              {/* Contenu principal avec plus d'espace */}
              <div className="flex-1 p-6 overflow-y-auto min-h-0">
                <div className="max-h-full">
                  {currentClipboard ? (
                    <div className="h-full flex flex-col">
                      {currentClipboard.type === 'text' ? (
                        <div className="whitespace-pre-wrap">{currentClipboard.content}</div>
                      ) : currentClipboard.type === 'image' ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-notion-gray-100 rounded-notion flex items-center justify-center mx-auto mb-3">
                              <Image size={24} className="text-notion-gray-500" />
                            </div>
                            <p className="text-sm text-notion-gray-600 font-medium">Image copiée</p>
                            <p className="text-xs text-notion-gray-400 mt-1">
                              {currentClipboard.content ? `${(currentClipboard.content.length / 1024).toFixed(1)} KB` : 'Prête'}
                            </p>
                          </div>
                        </div>
                      ) : currentClipboard.type === 'video' ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-purple-100 rounded-notion flex items-center justify-center mx-auto mb-3">
                              <Video size={24} className="text-purple-600" />
                            </div>
                            <p className="text-sm text-notion-gray-600 font-medium">Vidéo détectée</p>
                            <p className="text-xs text-notion-gray-400 mt-1 max-w-xs mx-auto truncate">
                              {currentClipboard.content}
                            </p>
                          </div>
                        </div>
                      ) : currentClipboard.type === 'audio' ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-notion flex items-center justify-center mx-auto mb-3">
                              <Music size={24} className="text-green-600" />
                            </div>
                            <p className="text-sm text-notion-gray-600 font-medium">Audio détecté</p>
                            <p className="text-xs text-notion-gray-400 mt-1 max-w-xs mx-auto truncate">
                              {currentClipboard.content}
                            </p>
                          </div>
                        </div>
                      ) : currentClipboard.type === 'table' ? (
                        <div className="overflow-auto h-full">
                          <RenderTable content={currentClipboard.content} />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-notion-gray-100 rounded-notion flex items-center justify-center mx-auto mb-3">
                              <FileText size={24} className="text-notion-gray-500" />
                            </div>
                            <p className="text-sm text-notion-gray-600 font-medium">Contenu copié</p>
                            <p className="text-xs text-notion-gray-400 mt-1">Type : {currentClipboard.type}</p>
                          </div>
                        </div>
                      )}
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
              </div>
            </div>
          </div>
          {/* Options d'envoi */}
          {currentClipboard && (
            <div className="px-6 pb-3">
              <div className="bg-white rounded-notion border border-notion-gray-200 p-4">
                <h3 className="text-sm font-medium text-notion-gray-700 mb-3">Options d'envoi</h3>
                <div className="mt-3 space-y-2 p-3 bg-notion-gray-50 rounded-md">
                  {/* Type de contenu */}
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-notion-gray-500" />
                    <select
                      value={contentType}
                      onChange={(e) => setContentType(e.target.value)}
                      className="flex-1 text-sm border border-notion-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="text">📝 Texte</option>
                      <option value="heading_1">📌 Titre 1</option>
                      <option value="heading_2">📍 Titre 2</option>
                      <option value="bulleted_list">• Liste</option>
                      <option value="numbered_list">1. Liste numérotée</option>
                      <option value="toggle">▸ Toggle</option>
                      <option value="quote">💬 Citation</option>
                      <option value="callout">💡 Callout</option>
                      <option value="code">👨‍💻 Code</option>
                    </select>
                    <Tooltip content="Type de bloc Notion à créer">
                      <Info size={14} className="text-notion-gray-400 cursor-help" />
                    </Tooltip>
                  </div>
                  {/* Tags */}
                  <div className="flex items-center gap-2">
                    <Hash size={14} className="text-notion-gray-500" />
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="tag1, tag2..."
                      className="flex-1 text-sm border border-notion-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <Tooltip content="Tags séparés par des virgules">
                      <Info size={14} className="text-notion-gray-400 cursor-help" />
                    </Tooltip>
                  </div>
                  {/* URL */}
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-notion-gray-500" />
                    <input
                      type="url"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 text-sm border border-notion-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <Tooltip content="URL de la source (optionnel)">
                      <Info size={14} className="text-notion-gray-400 cursor-help" />
                    </Tooltip>
                  </div>
                  {/* Favori */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={markAsFavorite}
                      onChange={(e) => setMarkAsFavorite(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-notion-gray-700 flex items-center gap-1">
                      <Star size={14} className={markAsFavorite ? "text-yellow-500 fill-yellow-500" : "text-notion-gray-400"} />
                      Marquer comme favori
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
          {/* Carousel de pages en bas */}
          <div className="px-6 pb-3">
            <div className="bg-white rounded-notion border border-notion-gray-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-notion-gray-700">
                  {multiSelectMode ? 'Destinations' : 'Destination'}
                </h3>
                {multiSelectMode && selectedPages.length > 0 && (
                  <button
                    onClick={() => setSelectedPages([])}
                    className="text-xs text-notion-gray-500 hover:text-notion-gray-700"
                  >
                    Tout désélectionner
                  </button>
                )}
              </div>
              {/* Carousel horizontal */}
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar-horizontal">
                {multiSelectMode ? (
                  selectedPages.length > 0 ? (
                    selectedPages.map(pageId => {
                      const page = pages.find(p => p.id === pageId);
                      return page ? (
                        <div
                          key={pageId}
                          className="flex-shrink-0 bg-notion-gray-50 rounded px-3 py-2 border border-notion-gray-200"
                        >
                          <div className="flex items-center gap-2">
                            {React.isValidElement(getPageIcon(page)) ? getPageIcon(page) : null}
                            <span className="text-sm text-notion-gray-900 truncate max-w-[150px]">
                              {page.title || 'Sans titre'}
                            </span>
                          </div>
                        </div>
                      ) : null;
                    })
                  ) : (
                    <p className="text-sm text-notion-gray-400">Sélectionnez des pages dans la liste</p>
                  )
                ) : (
                  selectedPage ? (
                    <div className="bg-notion-gray-50 rounded px-3 py-2 border border-notion-gray-200">
                      <div className="flex items-center gap-2">
                        {React.isValidElement(getPageIcon(selectedPage)) ? getPageIcon(selectedPage) : null}
                        <span className="text-sm text-notion-gray-900">
                          {selectedPage.title || 'Sans titre'}
                        </span>
                        <span className="text-xs text-green-600">●</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-notion-gray-400">Sélectionnez une page</p>
                  )
                )}
              </div>
            </div>
          </div>
          {/* Action button */}
          <div className="p-6 pt-0">
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
          <ConfigPanel
            isOpen={showConfig}
            onClose={() => setShowConfig(false)}
            onSave={saveConfig}
            config={config}
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
    </div>
  );
}

export default App;