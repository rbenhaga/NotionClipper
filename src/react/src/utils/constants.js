// src/react/src/utils/constants.js

export const API_URL = 'http://localhost:5000/api';
export const CLIPBOARD_CHECK_INTERVAL = 2000; // 2 secondes
export const PAGE_REFRESH_INTERVAL = 30000; // 30 secondes
export const UPDATE_CHECK_INTERVAL = 20000; // 20 secondes

export const CONTENT_TYPES = {
  TEXT: 'text',
  MARKDOWN: 'markdown',
  CODE: 'code',
  URL: 'url',
  IMAGE: 'image',
  TABLE: 'table',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document'
};

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

export const KEYBOARD_SHORTCUTS = {
  SEND: 'ctrl+enter, cmd+enter',
  MULTI_SELECT: 'ctrl+shift+m, cmd+shift+m',
  REFRESH: 'ctrl+r, cmd+r',
  SEARCH: 'ctrl+f, cmd+f',
  CLOSE: 'escape'
};

export const THEME = {
  LIGHT: 'light',
  DARK: 'dark'
};

export const TAB_TYPES = {
  SUGGESTED: 'suggested',
  ALL: 'all',
  FAVORITES: 'favorites',
  RECENT: 'recent',
  DATABASES: 'databases'
};