import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Send, Star, Clock, Zap, 
  Minus, Square, X, Copy, Image as ImageIcon,
  Globe, BookOpen, Folder, TrendingUp, 
  CheckCircle, AlertCircle, FileText, Database,
  Calendar, User, Settings, Hash, List,
  CheckSquare, Code, Quote, Table, Wifi, 
  WifiOff, RotateCcw, Loader, Plus,
  Key, Eye, EyeOff, Save, Edit3, 
  ChevronLeft, ChevronRight, Maximize,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
const MAX_CLIPBOARD_LENGTH = 2000;

// Fonction pour obtenir l'icône appropriée avec emojis Notion
function getPageIcon(page) {
  // Si la page a un emoji ou une icône, l'utiliser en priorité
  if (page.icon) {
    if (typeof page.icon === 'string') {
      // Si c'est un emoji (caractère unique ou quelques caractères)
      if (page.icon.length <= 4 && /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F100}-\u{1F1FF}]/u.test(page.icon)) {
        return <span className="text-sm leading-none">{page.icon}</span>;
      }
      // Si c'est une URL d'image
      if (page.icon.startsWith('http')) {
        return <img src={page.icon} alt="" className="w-4 h-4 rounded object-cover" onError={(e) => e.target.style.display = 'none'} />;
      }
    }
    // Si c'est un objet icon de Notion
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
  
  // Sinon utiliser une icône basée sur le type ou titre
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
  if (title.includes('list') || title.includes('liste')) 
    return <List size={14} className="text-indigo-600" />;
  if (title.includes('user') || title.includes('profile') || title.includes('profil')) 
    return <User size={14} className="text-pink-600" />;
  if (title.includes('settings') || title.includes('config') || title.includes('paramètre')) 
    return <Settings size={14} className="text-gray-500" />;
  if (title.includes('tag') || title.includes('category') || title.includes('catégorie')) 
    return <Hash size={14} className="text-yellow-600" />;
  if (title.includes('document') || title.includes('doc') || title.includes('rapport')) 
    return <FileText size={14} className="text-blue-500" />;
  
  // Icône par défaut
  return <BookOpen size={14} className="text-notion-gray-600" />;
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
          {/* Token Notion */}
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
                placeholder="secret_..."
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

          {/* Clé ImgBB */}
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
          
          {/* Compteur de caractères */}
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
          
          {/* Barre de progression */}
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

// Composant de page avec sélection multiple
function PageCard({ page, onClick, isFavorite, onToggleFavorite, isSelected, onToggleSelect, multiSelectMode }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      className={`relative bg-white border rounded-notion p-3 cursor-pointer group ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-notion-gray-200'
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -4,
        scale: 1.02,
        boxShadow: "0 12px 30px rgba(15, 15, 15, 0.12)",
        borderColor: isSelected ? "rgb(59, 130, 246)" : "rgb(203, 213, 225)"
      }}
      whileTap={{ 
        scale: 0.995,
        y: -2
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => multiSelectMode ? onToggleSelect(page.id) : onClick(page)}
      layout
      transition={{ 
        type: "spring", 
        stiffness: 350, 
        damping: 25,
        duration: 0.15,
        layout: { duration: 0.2 }
      }}
    >
      {/* Checkbox pour sélection multiple */}
      {multiSelectMode && (
        <div className="absolute top-2 right-2">
          <motion.div
            className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
              isSelected ? 'bg-blue-500 border-blue-500' : 'border-notion-gray-300'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isSelected && <CheckCircle size={10} className="text-white" />}
          </motion.div>
        </div>
      )}

      <div className="flex items-start gap-3">
        <motion.div 
          className="w-5 h-5 flex items-center justify-center flex-shrink-0 relative"
          whileHover={{ 
            scale: 1.2,
            rotate: [0, -3, 3, 0]
          }}
          transition={{ 
            duration: 0.15,
            rotate: { duration: 0.4 }
          }}
        >
          {getPageIcon(page)}
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <motion.h3 
            className="font-medium text-sm text-notion-gray-900 truncate transition-colors duration-150"
            animate={{
              color: isHovered ? "#1f2937" : "#111827"
            }}
          >
            {page.title || 'Page sans titre'}
          </motion.h3>
          {page.parent_title && (
            <motion.p 
              className="text-xs text-notion-gray-500 truncate mt-0.5 transition-colors duration-150"
              animate={{
                color: isHovered ? "#6b7280" : "#9ca3af"
              }}
            >
              dans {page.parent_title}
            </motion.p>
          )}
        </div>
        
        {!multiSelectMode && (
          <motion.button
            className={`p-1 rounded transition-all duration-200 ${isFavorite ? 'text-yellow-500 bg-yellow-50' : 'text-notion-gray-400 hover:bg-notion-gray-100'}`}
            whileHover={{ 
              scale: 1.2, 
              rotate: [0, -10, 10, 0],
              backgroundColor: isFavorite ? "rgb(254, 240, 138)" : "rgb(243, 244, 246)"
            }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(page.id);
            }}
            transition={{ 
              duration: 0.15,
              rotate: { duration: 0.4 }
            }}
          >
            <Star size={12} fill={isFavorite ? 'currentColor' : 'none'} />
          </motion.button>
        )}
      </div>
      
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="mt-2 pt-2 border-t border-notion-gray-100"
            initial={{ opacity: 0, height: 0, y: -5 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -5 }}
            transition={{ 
              duration: 0.25, 
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
          >
            <p className="text-xs text-notion-gray-400">
              Modifié {new Date(page.last_edited).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Effet glow subtil */}
      <motion.div 
        className="absolute inset-0 rounded-notion pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: isHovered ? 1 : 0,
          background: isHovered 
            ? isSelected 
              ? "linear-gradient(135deg, rgba(59, 130, 246, 0.04) 0%, rgba(99, 102, 241, 0.04) 100%)"
              : "linear-gradient(135deg, rgba(99, 102, 241, 0.02) 0%, rgba(139, 92, 246, 0.02) 100%)"
            : "transparent"
        }}
        transition={{ duration: 0.2 }}
      />
    </motion.div>
  );
}

// Composant principal
function App() {
  const [pages, setPages] = useState([]);
  const [filteredPages, setFilteredPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [selectedPages, setSelectedPages] = useState([]); // Sélection multiple
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clipboard, setClipboard] = useState(null);
  const [editedClipboard, setEditedClipboard] = useState(null); // Contenu édité
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
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
  
  const searchRef = useRef(null);

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

  // Vérifier la connectivité backend
  const checkBackendConnection = async () => {
    try {
      await axios.get(`${API_URL}/health`, { timeout: 5000 });
      setIsBackendConnected(true);
    } catch (error) {
      setIsBackendConnected(false);
    }
  };

  // Charger les données
  useEffect(() => {
    loadPages();
    loadClipboard();
    loadFavorites();
    loadSelectedPage();
    loadConfig();
    
    // Vérifier la connectivité backend régulièrement
    const backendCheck = setInterval(checkBackendConnection, 10000);
    
    // Auto-refresh clipboard toutes les 3 secondes
    const clipboardInterval = setInterval(loadClipboard, 3000);
    
    // Auto-refresh pages toutes les 15 secondes (plus fréquent)
    const pagesInterval = setInterval(() => {
      loadPages(true); // true = silent refresh
    }, 15000);

    // Event listener pour le rafraîchissement via shortcut
    if (window.electronAPI) {
      window.electronAPI.onRefreshApp(() => {
        console.log('🔄 Rafraîchissement via shortcut...');
        loadPages(true);
        loadClipboard();
        showNotification('Application rafraîchie', 'success');
      });
    }
    
    return () => {
      clearInterval(clipboardInterval);
      clearInterval(pagesInterval);
      clearInterval(backendCheck);
      
      // Nettoyer les event listeners
      if (window.electronAPI) {
        window.electronAPI.removeRefreshListener();
      }
    };
  }, []);

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
      // Trier par pertinence puis par date
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
          // Mélange de pages récentes et fréquemment utilisées
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
      // Sauvegarder localement
      localStorage.setItem('notion-clipper-config', JSON.stringify(newConfig));
      setConfig(newConfig);
      
      // Envoyer au backend
      await axios.post(`${API_URL}/config`, newConfig);
      
      showNotification('Configuration sauvegardée', 'success');
      
      // Recharger les pages avec la nouvelle config
      setTimeout(() => {
        loadPages(true);
      }, 1000);
      
    } catch (error) {
      console.error('Erreur sauvegarde config:', error);
      showNotification('Erreur lors de la sauvegarde', 'error');
    }
  };

  const loadPages = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setLoadingProgress({ current: 0, total: 100 });
      }
      
      // Simuler le progrès de chargement
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => ({
          ...prev,
          current: Math.min(prev.current + Math.random() * 10, 85)
        }));
      }, 100);
      
      const response = await axios.get(`${API_URL}/pages?force_refresh=true`);
      const newPages = response.data.pages || [];
      
      clearInterval(progressInterval);
      setLoadingProgress({ current: 100, total: 100 });
      
      // Vérifier s'il y a de nouvelles pages
      if (pages.length > 0 && newPages.length > pages.length) {
        const newPagesCount = newPages.length - pages.length;
        showNotification(`${newPagesCount} nouvelle(s) page(s) détectée(s)`, 'success');
      }
      
      setPages(newPages);
      setIsBackendConnected(true);
      
      setTimeout(() => {
        setLoadingProgress({ current: 0, total: 0 });
      }, 500);
      
    } catch (error) {
      console.error('Erreur chargement pages:', error);
      setIsBackendConnected(false);
      if (!silent) {
        showNotification('Erreur de connexion au backend', 'error');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadClipboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/clipboard`);
      const newClipboard = response.data;
      
      // Limiter à 2000 caractères
      if (newClipboard && newClipboard.content && newClipboard.type === 'text') {
        if (newClipboard.content.length > MAX_CLIPBOARD_LENGTH) {
          newClipboard.originalLength = newClipboard.content.length;
          newClipboard.content = newClipboard.content.substring(0, MAX_CLIPBOARD_LENGTH);
          newClipboard.truncated = true;
        }
      }
      
      setClipboard(newClipboard);
      // Réinitialiser le contenu édité si nouveau clipboard
      setEditedClipboard(null);
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
    setEditedClipboard({
      ...clipboard,
      content: newContent,
      originalLength: newContent.length,
      truncated: newContent.length > MAX_CLIPBOARD_LENGTH
    });
    setShowTextEditor(false);
    showNotification('Texte modifié', 'success');
  };

  const sendToPage = async () => {
    const targetPages = multiSelectMode ? selectedPages : (selectedPage ? [selectedPage.id] : []);
    const contentToSend = editedClipboard || clipboard;
    
    if (targetPages.length === 0 || !contentToSend) return;
    
    try {
      setSending(true);
      
      // Préparer les données selon le type de contenu
      let payload = {
        page_ids: targetPages, // Envoyer vers plusieurs pages
        content_type: contentToSend.type
      };

      if (contentToSend.type === 'image') {
        payload.content = contentToSend.content;
        payload.is_image = true;
      } else {
        // Pour le texte, utiliser le contenu (potentiellement tronqué ou édité)
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
      
      // Réinitialiser le contenu édité après envoi
      setEditedClipboard(null);
      
      // Actualiser le clipboard après envoi réussi
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

  // Tabs configuration
  const tabs = [
    { id: 'suggested', label: 'Suggérées', icon: TrendingUp },
    { id: 'favorites', label: 'Favoris', icon: Star },
    { id: 'recent', label: 'Récents', icon: Clock },
    { id: 'all', label: 'Toutes', icon: Folder }
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
            <div className="w-2 h-2 bg-notion-gray-300 rounded-full"></div>
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
          
          {/* Progress de chargement */}
          {loading && loadingProgress.total > 0 && (
            <div className="flex items-center gap-2">
              <div className="text-xs text-notion-gray-500">
                Chargement {loadingProgress.current.toFixed(0)}/{loadingProgress.total}
              </div>
              <div className="w-16 h-1 bg-notion-gray-200 rounded-full overflow-hidden">
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
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.aside 
              className="w-80 bg-white border-r border-notion-gray-200 flex flex-col"
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ duration: 0.3 }}
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
                      <tab.icon size={12} />
                      {tab.label}
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
                      <p className="text-sm">Chargement des pages...</p>
                      {loadingProgress.total > 0 && (
                        <p className="text-xs text-notion-gray-400 mt-1">
                          {loadingProgress.current.toFixed(0)}/{loadingProgress.total}
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
                            transition={{ delay: index * 0.02 }}
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

        {/* Main area */}
        <motion.main 
          className="flex-1 flex flex-col bg-notion-gray-50"
          animate={{ 
            marginLeft: sidebarCollapsed ? 0 : 0 
          }}
          transition={{ duration: 0.3 }}
        >
          {/* Content panels */}
          <div className={`flex-1 grid gap-6 p-6 ${sidebarCollapsed ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {/* Clipboard panel */}
            <div className="bg-white rounded-notion border border-notion-gray-200 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Copy size={18} className="text-notion-gray-600" />
                  <h2 className="font-semibold text-notion-gray-900">Presse-papiers</h2>
                  {getCurrentClipboard()?.truncated && (
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
                
                {getCurrentClipboard()?.type === 'text' && (
                  <button
                    onClick={handleEditText}
                    className="p-2 hover:bg-notion-gray-100 rounded transition-colors"
                    title="Modifier le texte"
                  >
                    <Edit3 size={16} className="text-notion-gray-600" />
                  </button>
                )}
              </div>
              
              <div className="flex-1 flex items-center justify-center">
                {getCurrentClipboard() ? (
                  <div className="w-full">
                    {getCurrentClipboard().type === 'image' ? (
                      <div className="text-center">
                        <div className="w-16 h-16 bg-notion-gray-100 rounded-notion flex items-center justify-center mx-auto mb-3">
                          <ImageIcon size={24} className="text-notion-gray-500" />
                        </div>
                        <p className="text-sm text-notion-gray-600 font-medium">Image copiée</p>
                        <p className="text-xs text-notion-gray-400 mt-1">
                          {getCurrentClipboard().content ? `${(getCurrentClipboard().content.length / 1024).toFixed(1)} KB` : 'Prête à être envoyée'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-notion-gray-50 rounded-notion p-4 border border-notion-gray-200">
                          <p className="text-sm text-notion-gray-800 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">
                            {getCurrentClipboard().content}
                          </p>
                        </div>
                        
                        {/* Compteur de caractères visuel */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`font-medium ${
                              getCurrentClipboard().content.length > MAX_CLIPBOARD_LENGTH ? 'text-red-600' : 
                              getCurrentClipboard().content.length > MAX_CLIPBOARD_LENGTH * 0.9 ? 'text-orange-600' : 
                              'text-notion-gray-600'
                            }`}>
                              {getCurrentClipboard().content.length.toLocaleString()}/{MAX_CLIPBOARD_LENGTH.toLocaleString()}
                            </span>
                            
                            {getCurrentClipboard().truncated && getCurrentClipboard().originalLength && (
                              <span className="text-orange-600">
                                (original: {getCurrentClipboard().originalLength.toLocaleString()})
                              </span>
                            )}
                          </div>
                          
                          {/* Barre de progression visuelle */}
                          <div className="w-24 h-1 bg-notion-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-1 rounded-full transition-all duration-300 ${
                                getCurrentClipboard().content.length > MAX_CLIPBOARD_LENGTH ? 'bg-red-500' :
                                getCurrentClipboard().content.length > MAX_CLIPBOARD_LENGTH * 0.9 ? 'bg-orange-500' :
                                'bg-green-500'
                              }`}
                              style={{ 
                                width: `${Math.min(100, (getCurrentClipboard().content.length / MAX_CLIPBOARD_LENGTH) * 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-notion-gray-400">
                    <Copy size={32} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Aucun contenu copié</p>
                    <p className="text-xs mt-1">Le contenu se met à jour automatiquement</p>
                    <p className="text-xs mt-1 text-notion-gray-300">
                      Maximum {MAX_CLIPBOARD_LENGTH.toLocaleString()} caractères
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Selection panel - seulement si sidebar pas collapsed */}
            {!sidebarCollapsed && (
              <div className="bg-white rounded-notion border border-notion-gray-200 p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <Globe size={18} className="text-notion-gray-600" />
                  <h2 className="font-semibold text-notion-gray-900">
                    {multiSelectMode ? 'Destinations' : 'Destination'}
                  </h2>
                  {multiSelectMode && selectedPages.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {selectedPages.length} page{selectedPages.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 flex items-center justify-center">
                  {multiSelectMode ? (
                    selectedPages.length > 0 ? (
                      <div className="w-full space-y-2 max-h-48 overflow-y-auto">
                        {selectedPages.map(pageId => {
                          const page = pages.find(p => p.id === pageId);
                          return page ? (
                            <div key={pageId} className="bg-notion-gray-50 rounded-notion p-3 border border-notion-gray-200">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-white rounded border border-notion-gray-200 flex items-center justify-center">
                                  {getPageIcon(page)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-sm text-notion-gray-900 truncate">
                                    {page.title || 'Page sans titre'}
                                  </h3>
                                  {page.parent_title && (
                                    <p className="text-xs text-notion-gray-500 truncate">
                                      dans {page.parent_title}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <div className="text-center text-notion-gray-400">
                        <CheckSquare size={32} className="mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Sélectionnez des pages</p>
                        <p className="text-xs mt-1">Mode sélection multiple activé</p>
                      </div>
                    )
                  ) : (
                    selectedPage ? (
                      <motion.div 
                        className="w-full"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        <div className="bg-notion-gray-50 rounded-notion p-4 border border-notion-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white rounded border border-notion-gray-200 flex items-center justify-center">
                              {getPageIcon(selectedPage)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-notion-gray-900 truncate">
                                {selectedPage.title || 'Page sans titre'}
                              </h3>
                              {selectedPage.parent_title && (
                                <p className="text-sm text-notion-gray-500 truncate">
                                  dans {selectedPage.parent_title}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs text-green-600 font-medium">Page mémorisée</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="text-center text-notion-gray-400">
                        <BookOpen size={32} className="mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Sélectionnez une page</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="p-6 border-t border-notion-gray-200 bg-white">
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

      {/* Notifications - Position ajustée pour éviter les boutons */}
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