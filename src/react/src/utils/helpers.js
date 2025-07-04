// src/react/src/utils/helpers.js

/**
 * Debounce une fonction
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  /**
   * Throttle une fonction
   */
  export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  
  /**
   * Copie du texte dans le presse-papiers
   */
  export async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.error('Erreur lors de la copie:', error);
      }
    }
    
    // Fallback pour les contextes non sécurisés
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      return true;
    } catch (error) {
      console.error('Erreur lors de la copie (fallback):', error);
      return false;
    } finally {
      textArea.remove();
    }
  }
  
  /**
   * Obtient l'icône appropriée pour une page Notion
   */
  export function getPageIcon(page) {
    if (!page) return null;
  
    if (page.icon) {
      if (typeof page.icon === 'string') {
        // Emoji
        if (page.icon.length <= 4 && /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F100}-\u{1F1FF}]/u.test(page.icon)) {
          return { type: 'emoji', value: page.icon };
        }
        // URL
        if (page.icon.startsWith('http')) {
          return { type: 'url', value: page.icon };
        }
      }
  
      if (typeof page.icon === 'object') {
        if (page.icon.type === 'emoji' && page.icon.emoji) {
          return { type: 'emoji', value: page.icon.emoji };
        }
        if (page.icon.type === 'external' && page.icon.external?.url) {
          return { type: 'url', value: page.icon.external.url };
        }
        if (page.icon.type === 'file' && page.icon.file?.url) {
          return { type: 'url', value: page.icon.file.url };
        }
      }
    }
  
    return { type: 'default', value: null };
  }
  
  /**
   * Classe CSS conditionnelle
   */
  export function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
  }
  
  /**
   * Génère un ID unique
   */
  export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  /**
   * Vérifie si un objet est vide
   */
  export function isEmpty(obj) {
    if (!obj) return true;
    return Object.keys(obj).length === 0;
  }
  
  /**
   * Deep clone d'un objet
   */
  export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }
  
  /**
   * Attend un certain temps (pour les tests/démos)
   */
  export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Vérifie si on est dans Electron
   */
  export function isElectron() {
    return window.electronAPI !== undefined;
  }
  
  /**
   * Obtient la plateforme
   */
  export function getPlatform() {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('mac')) return 'mac';
    if (platform.includes('win')) return 'windows';
    return 'linux';
  }