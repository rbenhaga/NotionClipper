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
   * Formate une date
   */
  export function formatDate(date) {
    if (!date) return '';
    
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  /**
   * Formate une taille de fichier
   */
  export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Vérifie si une URL est valide
   */
  export function isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
  
  /**
   * Détecte si le contenu est du Markdown
   */
  export function isMarkdown(content) {
    return /^#{1,6}\s|^\*\s|^\d+\.\s|```|^>/.test(content);
  }
  
  /**
   * Détecte si le contenu contient une URL YouTube
   */
  export function hasYouTubeUrl(content) {
    return /(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/.test(content);
  }
  
  /**
   * Extrait l'URL YouTube du contenu
   */
  export function extractYouTubeUrl(content) {
    const match = content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    return match ? `https://www.youtube.com/watch?v=${match[1]}` : content;
  }
  
  /**
   * Extrait l'ID YouTube d'une URL
   */
  export function extractYouTubeId(url) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    return match ? match[1] : '';
  }