// src/react/src/utils/formatters.js

/**
 * Formate une date relative (ex: "Il y a 5 minutes")
 */
export function formatRelativeDate(date) {
    if (!date) return '';
    
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffSecs < 60) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return past.toLocaleDateString('fr-FR', { 
      day: 'numeric',
      month: 'short'
    });
  }
  
  /**
   * Formate la taille d'un fichier
   */
  export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Tronque un texte avec ellipsis
   */
  export function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
  
  /**
   * Formate un titre de page
   */
  export function formatPageTitle(page) {
    return page?.title || 'Sans titre';
  }
  
  /**
   * Formate le type de parent d'une page
   */
  export function formatParentType(type) {
    const types = {
      'workspace': 'Espace de travail',
      'database': 'Base de données',
      'page': 'Page'
    };
    return types[type] || type;
  }
  
  /**
   * Extrait et formate les tags depuis une chaîne
   */
  export function formatTags(tagsString) {
    if (!tagsString) return [];
    
    return tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }
  
  /**
   * Formate une URL pour l'affichage
   */
  export function formatUrl(url) {
    if (!url) return '';
    
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
    } catch {
      return url;
    }
  }
  
  /**
   * Détecte et formate le langage de programmation
   */
  export function detectLanguage(code) {
    const patterns = {
      javascript: [/const\s+\w+/, /function\s+\w+/, /=>\s*{/, /console\.log/],
      python: [/def\s+\w+/, /import\s+\w+/, /print\(/, /if\s+__name__/],
      java: [/public\s+class/, /public\s+static/, /System\.out/],
      html: [/<html/, /<div/, /<\/\w+>/],
      css: [/\.\w+\s*{/, /#\w+\s*{/, /:\s*\w+;/],
      sql: [/SELECT\s+/i, /FROM\s+/i, /WHERE\s+/i],
    };
    
    for (const [lang, langPatterns] of Object.entries(patterns)) {
      if (langPatterns.some(pattern => pattern.test(code))) {
        return lang;
      }
    }
    
    return 'plaintext';
  }