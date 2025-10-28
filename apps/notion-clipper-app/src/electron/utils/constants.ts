// Limites API Notion
export const NOTION_MAX_CHARS_PER_BLOCK = 2000;
export const NOTION_MAX_BLOCKS_PER_REQUEST = 100;
export const NOTION_API_TIMEOUT = 60000;

// Cache
export const CACHE_MAX_SIZE = 2000;
export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Polling
export const DEFAULT_POLLING_INTERVAL = 30000; // 30 secondes

// Stats
export const MAX_ERROR_LOG_SIZE = 100;
export const STATS_AUTOSAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Clipboard
export const CLIPBOARD_POLL_INTERVAL = 1000; // 1 seconde
export const CLIPBOARD_HISTORY_SIZE = 50;

// Parser
export const MAX_WORKER_POOL_SIZE = 4;
export const WORKER_TIMEOUT = 30000; // 30 secondes

// Fichiers
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

// Types de contenu supportés
export const SUPPORTED_CONTENT_TYPES = [
  'text',
  'markdown', 
  'code',
  'url',
  'image',
  'table',
  'csv',
  'json',
  'html'
] as const;

export type SupportedContentType = typeof SUPPORTED_CONTENT_TYPES[number];