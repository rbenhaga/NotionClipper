// src/react/src/App.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Send, Star, Clock, Zap,
  Minus, Square, X, Copy,
  TrendingUp,
  CheckCircle, AlertCircle, FileText, Database,
  Calendar, Settings, Hash,
  CheckSquare, Code, Quote, Wifi,
  WifiOff, RotateCcw, Loader,
  Info, Save, Edit3, Eye,
  PanelLeftClose, PanelLeftOpen, RefreshCw,
  Bell, Sparkles, Trash2, Key, Shield, ChevronRight, ChevronDown,
  Bookmark, ArrowUp, ArrowDown, Smile,
  Image as ImageIcon,
  Folder, Globe
} from 'lucide-react';
import axios from 'axios';

// Components importés
import Onboarding from './OnBoarding';
import ContentEditor from './components/editor/ContentEditor';
import PageItem from './components/pages/PageItem';
import TextEditor from './components/editor/TextEditor';
import ConnectivityStatus from './components/common/ConnectivityStatus';
import Notification from './components/common/Notification';
import ConfigPanel from './components/settings/ConfigPanel';
import Tooltip from './components/common/Tooltip';
import TabIcon from './components/common/TabIcon';
import PageSelectorModal from './components/modals/PageSelectorModal';

const API_URL = 'http://localhost:5000/api';
const CLIPBOARD_CHECK_INTERVAL = 2000;
const PAGE_REFRESH_INTERVAL = 30000;
const UPDATE_CHECK_INTERVAL = 20000;
const MAX_CLIPBOARD_LENGTH = 10000;

// Fonctions utilitaires
const isYouTubeUrl = (content) => {
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

export default function App() {
  // États principaux
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
  
  // États pour les propriétés Notion
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

  // États avancés Notion
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
  const [showPreview, setShowPreview] = useState(false);
  const [clipboardContent, setClipboardContent] = useState('');
  const [manuallyEdited, setManuallyEdited] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [contentHistory, setContentHistory] = useState([]);

  // Vérification de la configuration
  const isConfigured = !!config.notionToken;

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

  // Refs
  const searchRef = useRef(null);
  const updateCheckInterval = useRef(null);
  const clipboardInterval = useRef(null);
  const pageRefreshInterval = useRef(null);
  const [recentPages, setRecentPages] = useState([]);

  // Tabs configuration
  const tabs = [
    { id: 'suggested', label: 'Suggérées', icon: 'TrendingUp' },
    { id: 'all', label: 'Toutes', icon: 'Folder' },
    { id: 'favorites', label: 'Favoris', icon: 'Star' },
    { id: 'recent', label: 'Récentes', icon: 'Clock' }
  ];

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

  // Fonction pour obtenir le clipboard actuel
  const getCurrentClipboard = useCallback(() => {
    return editedClipboard || clipboard;
  }, [editedClipboard, clipboard]);

  // Fonction utilitaire pour vider le presse-papiers
  const clearClipboard = () => {
    setClipboard(null);
    setEditedClipboard(null);
    setRealClipboard(null);
    showNotification('Presse-papiers vidé', 'info');
  };

  // Gestion des notifications
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Chargement de la configuration
  const loadConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/config`);
      if (response.data && response.data.config) {
        setConfig(response.data.config);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
    }
  };

  // Sauvegarde de la configuration
  const saveConfig = async (newConfig) => {
    try {
      const response = await axios.post(`${API_URL}/config`, newConfig);
      if (response.data.success) {
        setConfig(newConfig);
        showNotification('Configuration sauvegardée', 'success');
        await loadPages();
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      showNotification('Erreur lors de la sauvegarde', 'error');
    }
  };

  // Chargement des pages
  const loadPages = async (silent = false) => {
    if (!config.notionToken) return;
    
    if (!silent) {
      setLoading(true);
      setLoadingProgress({ current: 0, total: 100, message: 'Chargement des pages...' });
    }

    try {
      const response = await axios.get(`${API_URL}/pages`);
      if (response.data.pages) {
        setPages(response.data.pages);
        
        // Vérifier s'il y a de nouvelles pages
        const savedPagesCount = localStorage.getItem('notion-clipper-pages-count');
        if (savedPagesCount && response.data.pages.length > parseInt(savedPagesCount)) {
          setHasNewPages(true);
        }
        localStorage.setItem('notion-clipper-pages-count', response.data.pages.length);
        
        if (!silent) {
          showNotification(`${response.data.pages.length} pages chargées`, 'success');
        }
      }
    } catch (error) {
      console.error('Erreur chargement pages:', error);
      if (!silent) {
        showNotification('Erreur lors du chargement des pages', 'error');
      }
    } finally {
      setLoading(false);
      setLoadingProgress({ current: 0, total: 0, message: '' });
    }
  };

  // Filtrage des pages
  useEffect(() => {
    let filtered = pages;

    if (searchQuery) {
      filtered = filtered.filter(page =>
        page.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.url?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    switch (activeTab) {
      case 'favorites':
        filtered = filtered.filter(page => favorites.includes(page.id));
        break;
      case 'recent':
        filtered = filtered.filter(page => recentPages.includes(page.id));
        break;
      case 'suggested':
        const suggestedIds = [...new Set([...favorites, ...recentPages])];
        filtered = filtered.filter(page => suggestedIds.includes(page.id));
        break;
    }

    setFilteredPages(filtered);
  }, [pages, searchQuery, activeTab, favorites, recentPages]);

  // Gestion du presse-papiers
  const loadClipboard = async (checkOnly = false) => {
    try {
      const response = await axios.get(`${API_URL}/clipboard`);
      let newClipboard = response.data.empty ? null : response.data;

      if (newClipboard) {
        // Détection d'image base64
        if (newClipboard.type === 'text' &&
            newClipboard.content.startsWith('data:image/')) {
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

  // Gestion des favoris
  const loadFavorites = () => {
    const saved = localStorage.getItem('notion-clipper-favorites');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  };

  const toggleFavorite = (pageId) => {
    const newFavorites = favorites.includes(pageId)
      ? favorites.filter(id => id !== pageId)
      : [...favorites, pageId];

    setFavorites(newFavorites);
    localStorage.setItem('notion-clipper-favorites', JSON.stringify(newFavorites));
  };

  // Gestion de la sélection des pages
  const togglePageSelection = (pageId) => {
    setSelectedPages(prev =>
      prev.includes(pageId)
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    );
  };

  // Fonction d'envoi
  const handleSend = useCallback(async () => {
    if (sending || (!selectedPage && !multiSelectMode)) return;

    const currentClipboard = getCurrentClipboard();
    if (!currentClipboard?.content) {
      showNotification('Aucun contenu à envoyer', 'error');
      return;
    }

    setSending(true);

    try {
      // Préparer les données avec le parser avancé
      const sendData = {
        content: currentClipboard.content,
        contentType: contentType,
        parseAsMarkdown: parseAsMarkdown,
        useEnhancedParser: true,

        // Métadonnées optionnelles
        tags: tags.length > 0 ? tags.split(',').map(t => t.trim()) : [],
        category: category || null,
        sourceUrl: sourceUrl || null,
        title: pageTitle || null,
        date: date || null,
        dueDate: dueDate || null,
        priority: priority || 'medium',
        isFavorite: markAsFavorite,
        addToReadingList: addToReadingList,
        hasReminder: addReminder,
        isPublic: isPublic,
        icon: pageIcon || '📄',
        color: pageColor || 'default',
        insertPosition: insertPosition || 'append',
        useTemplate: useTemplate,
        templateId: selectedTemplate || null
      };

      // Déterminer les pages cibles
      const targetPages = multiSelectMode ? selectedPages : [selectedPage.id];

      // Envoyer à chaque page
      const results = await Promise.all(
        targetPages.map(pageId =>
          axios.post(`${API_URL}/send-to-page/${pageId}`, sendData)
        )
      );

      // Vérifier les résultats
      const allSuccess = results.every(r => r.data.success);
      if (allSuccess) {
        showNotification(
          multiSelectMode
            ? `Envoyé à ${targetPages.length} pages`
            : 'Envoyé avec succès!',
          'success'
        );

        // Ajouter aux pages récentes
        if (!multiSelectMode && selectedPage) {
          const newRecent = [selectedPage.id, ...recentPages.filter(id => id !== selectedPage.id)].slice(0, 10);
          setRecentPages(newRecent);
          localStorage.setItem('notion-clipper-recent', JSON.stringify(newRecent));
        }

        // Vider le clipboard après envoi réussi
        clearClipboard();
      } else {
        showNotification('Erreur lors de l\'envoi', 'error');
      }
    } catch (error) {
      console.error('Erreur envoi:', error);
      showNotification(error.response?.data?.error || 'Erreur lors de l\'envoi', 'error');
    } finally {
      setSending(false);
    }
  }, [
    sending, selectedPage, multiSelectMode, getCurrentClipboard, contentType,
    parseAsMarkdown, tags, category, sourceUrl, pageTitle, date, dueDate,
    priority, markAsFavorite, addToReadingList, addReminder, isPublic,
    pageIcon, pageColor, insertPosition, useTemplate, selectedTemplate,
    selectedPages, recentPages
  ]);

  // Gestion des fenêtres
  const handleWindowControl = (action) => {
    if (window.electronAPI && typeof window.electronAPI[action] === 'function') {
      window.electronAPI[action]();
    }
  };

  // Vérification de la connectivité
  const checkBackendConnection = async () => {
    try {
      await axios.get(`${API_URL}/health`);
      setIsBackendConnected(true);
    } catch {
      setIsBackendConnected(false);
    }
  };

  const checkForUpdates = async () => {
    if (window.electronAPI?.checkForUpdates) {
      const hasUpdate = await window.electronAPI.checkForUpdates();
      if (hasUpdate) {
        showNotification('Mise à jour disponible!', 'info');
      }
    }
  };

  // Gestion de la page sélectionnée
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

  // Effet de chargement initial
  useEffect(() => {
    // Charger la configuration
    loadConfig();
    loadFavorites();
    loadSelectedPage();

    // Charger les pages récentes
    const savedRecent = localStorage.getItem('notion-clipper-recent');
    if (savedRecent) {
      setRecentPages(JSON.parse(savedRecent));
    }

    // Listeners réseau
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Effet pour charger les données après la config
  useEffect(() => {
    if (isConfigured && !loading) {
      loadPages();
      loadClipboard();
    }
  }, [isConfigured]);

  // Sauvegarder la page sélectionnée
  useEffect(() => {
    if (selectedPage) {
      localStorage.setItem('notion-clipper-selected-page', JSON.stringify(selectedPage));
    }
  }, [selectedPage]);

  // Polling et intervalles
  useEffect(() => {
    if (!isConfigured || !isBackendConnected) return;

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
      window.electronAPI.on('refresh-app', () => {
        window.location.reload();
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
        window.electronAPI.removeAllListeners?.('refresh-app');
      }
    };
  }, [isConfigured, isBackendConnected, autoRefresh]);

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Enter pour envoyer (sauf si on édite du texte)
      if (e.key === 'Enter' && !showTextEditor && !showConfig) {
        e.preventDefault();
        if (canSend()) {
          handleSend();
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
  }, [handleSend, showTextEditor, showConfig, showModificationWarning]);

  // Fonction helper pour vérifier si on peut envoyer
  const canSend = useCallback(() => {
    const hasTarget = multiSelectMode ? selectedPages.length > 0 : selectedPage !== null;
    const hasContent = getCurrentClipboard() !== null;
    return hasTarget && hasContent && !sending;
  }, [multiSelectMode, selectedPages, selectedPage, sending, getCurrentClipboard]);

  // Si l'onboarding n'est pas complété
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
            onClick={() => handleWindowControl('minimize')}
            className="w-8 h-8 flex items-center justify-center hover:bg-notion-gray-100 rounded transition-colors"
          >
            <Minus size={14} className="text-notion-gray-600" />
          </button>
          <button
            onClick={() => handleWindowControl('maximize')}
            className="w-8 h-8 flex items-center justify-center hover:bg-notion-gray-100 rounded transition-colors"
          >
            <Square size={12} className="text-notion-gray-600" />
          </button>
          <button
            onClick={() => handleWindowControl('close')}
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
                          ? 'bg-notion-gray-900 text-white'
                          : 'text-notion-gray-600 hover:bg-notion-gray-100'
                      }`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <TabIcon name={tab.icon} size={12} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pages List */}
              <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
                <AnimatePresence mode="popLayout">
                  {loading && !pages.length ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center py-8"
                    >
                      <div className="text-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader size={24} className="text-notion-gray-400 mx-auto mb-2" />
                        </motion.div>
                        <p className="text-sm text-notion-gray-500">Chargement des pages...</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div layout className="space-y-2">
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
                            <PageItem
                              page={page}
                              isSelected={multiSelectMode ? selectedPages.includes(page.id) : selectedPage?.id === page.id}
                              isFavorite={favorites.includes(page.id)}
                              multiSelectMode={multiSelectMode}
                              onClick={() => multiSelectMode ? togglePageSelection(page.id) : setSelectedPage(page)}
                              onToggleFavorite={() => toggleFavorite(page.id)}
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
          className="flex-1 flex flex-col bg-notion-gray-50 min-h-0 relative"
          animate={{ marginLeft: sidebarCollapsed ? 0 : 0 }}
        >
          <ContentEditor
            clipboard={clipboard}
            editedClipboard={editedClipboard}
            setEditedClipboard={setEditedClipboard}
            selectedPage={selectedPage}
            selectedPages={selectedPages}
            multiSelectMode={multiSelectMode}
            sending={sending}
            onSend={handleSend}
            showNotification={showNotification}
            contentType={contentType}
            setContentType={setContentType}
            notionProperties={notionProperties}
            setNotionProperties={setNotionProperties}
            tags={tags}
            setTags={setTags}
            sourceUrl={sourceUrl}
            setSourceUrl={setSourceUrl}
            markAsFavorite={markAsFavorite}
            setMarkAsFavorite={setMarkAsFavorite}
            category={category}
            setCategory={setCategory}
            dueDate={dueDate}
            setDueDate={setDueDate}
            addReminder={addReminder}
            setAddReminder={setAddReminder}
            parseAsMarkdown={parseAsMarkdown}
            setParseAsMarkdown={setParseAsMarkdown}
            pageTitle={pageTitle}
            setPageTitle={setPageTitle}
            date={date}
            setDate={setDate}
            priority={priority}
            setPriority={setPriority}
            addToReadingList={addToReadingList}
            setAddToReadingList={setAddToReadingList}
            isPublic={isPublic}
            setIsPublic={setIsPublic}
            pageIcon={pageIcon}
            setPageIcon={setPageIcon}
            pageColor={pageColor}
            setPageColor={setPageColor}
            insertPosition={insertPosition}
            setInsertPosition={setInsertPosition}
            useTemplate={useTemplate}
            setUseTemplate={setUseTemplate}
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            showPreview={showPreview}
            setShowPreview={setShowPreview}
            manuallyEdited={manuallyEdited}
            setManuallyEdited={setManuallyEdited}
            getCurrentClipboard={getCurrentClipboard}
            clearClipboard={clearClipboard}
            config={config}
          />
        </motion.main>
      </div>

      {/* Connectivity Status */}
      <ConnectivityStatus isOnline={isOnline} isBackendConnected={isBackendConnected} />

      {/* Settings Panel */}
      <ConfigPanel
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        onConfigUpdate={saveConfig}
        config={config}
        showNotification={showNotification}
      />

      {/* Notifications */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

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