// src/react/src/utils/constants.js

// API Configuration
export const API_URL = 'http://localhost:5000/api';

// Limites
export const MAX_CLIPBOARD_LENGTH = 10000;

// Intervalles de mise à jour (en millisecondes)
export const CLIPBOARD_CHECK_INTERVAL = 2000; // 2 secondes
export const PAGE_REFRESH_INTERVAL = 30000; // 30 secondes
export const UPDATE_CHECK_INTERVAL = 20000; // 20 secondes

// Types de contenu
export const CONTENT_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  TABLE: 'table',
  CODE: 'code',
  JSON: 'json',
  MARKDOWN: 'markdown'
};

// Types de filtres pour les pages
export const FILTER_TYPES = {
  ALL: 'all',
  FAVORITES: 'favorites',
  RECENT: 'recent',
  DATABASES: 'databases',
  PAGES: 'pages'
};

// Types d'onglets
export const TAB_TYPES = {
  SUGGESTED: 'suggested',
  ALL: 'all',
  FAVORITES: 'favorites',
  RECENT: 'recent'
};

// Types de notifications
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Durées d'animation (en millisecondes)
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500
};

// Couleurs Notion
export const NOTION_COLORS = {
  default: '#ffffff',
  gray: '#f1f1ef',
  brown: '#f4eeee',
  orange: '#fbecdd',
  yellow: '#fef3c7',
  green: '#ddedea',
  blue: '#ddebf1',
  purple: '#e8deee',
  pink: '#f5e0e9',
  red: '#fbe4e4'
};

// Priorités
export const PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Messages d'erreur
export const ERROR_MESSAGES = {
  NO_CONTENT: 'Aucun contenu à envoyer',
  NO_PAGE_SELECTED: 'Aucune page sélectionnée',
  NETWORK_ERROR: 'Erreur réseau',
  INVALID_TOKEN: 'Token invalide',
  SEND_FAILED: 'Échec de l\'envoi',
  LOAD_FAILED: 'Échec du chargement'
};

// Messages de succès
export const SUCCESS_MESSAGES = {
  SENT: 'Contenu envoyé avec succès',
  SAVED: 'Sauvegardé avec succès',
  COPIED: 'Copié dans le presse-papiers',
  CACHE_CLEARED: 'Cache vidé avec succès'
};