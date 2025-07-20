module.exports = {
    // Limites API Notion
    NOTION_MAX_CHARS_PER_BLOCK: 2000,
    NOTION_MAX_BLOCKS_PER_REQUEST: 100,
    NOTION_API_TIMEOUT: 60000,
    
    // Cache
    CACHE_MAX_SIZE: 2000,
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    
    // Polling
    DEFAULT_POLLING_INTERVAL: 30000, // 30 secondes
    
    // Stats
    MAX_ERROR_LOG_SIZE: 100,
    STATS_AUTOSAVE_INTERVAL: 5 * 60 * 1000, // 5 minutes
    
    // Clipboard
    CLIPBOARD_POLL_INTERVAL: 1000, // 1 seconde
    CLIPBOARD_HISTORY_SIZE: 50,
    
    // Parser
    MAX_WORKER_POOL_SIZE: 4,
    WORKER_TIMEOUT: 30000, // 30 secondes
    
    // Fichiers
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50 MB
    
    // Types de contenu supportés
    SUPPORTED_CONTENT_TYPES: [
      'text',
      'markdown', 
      'code',
      'url',
      'image',
      'table',
      'csv',
      'json',
      'html'
    ]
  };