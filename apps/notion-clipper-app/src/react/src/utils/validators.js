// src/react/src/utils/validators.js

/**
 * Valide un token Notion
 */
export function isValidNotionToken(token) {
    if (!token || typeof token !== 'string') return false;
    
    // Les tokens Notion commencent par "ntn"
    return token.startsWith('ntn') && token.length > 10;
  }
  
  // isValidImgBBKey supprimé
  
  /**
   * Valide une URL
   */
  export function isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Valide une adresse email
   */
  export function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Valide le contenu avant envoi
   */
  export function validateContent(content, contentType) {
    if (!content || content.trim() === '') {
      return { valid: false, error: 'Le contenu ne peut pas être vide' };
    }
  
    switch (contentType) {
      case 'image':
        if (!content.startsWith('data:image/')) {
          return { valid: false, error: 'Format d\'image invalide' };
        }
        break;
        
      case 'url':
        if (!isValidUrl(content)) {
          return { valid: false, error: 'URL invalide' };
        }
        break;
        
      case 'table':
        const lines = content.trim().split('\n');
        if (lines.length < 2) {
          return { valid: false, error: 'Une table doit avoir au moins 2 lignes' };
        }
        break;
    }
  
    return { valid: true };
  }
  
  /**
   * Valide les métadonnées
   */
  export function validateMetadata(metadata) {
    const errors = {};
  
    if (metadata.sourceUrl && !isValidUrl(metadata.sourceUrl)) {
      errors.sourceUrl = 'URL source invalide';
    }
  
    if (metadata.date) {
      const date = new Date(metadata.date);
      if (isNaN(date.getTime())) {
        errors.date = 'Date invalide';
      }
    }
  
    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
  
  /**
   * Valide un ID de page Notion
   */
  export function isValidPageId(pageId) {
    if (!pageId || typeof pageId !== 'string') return false;
    
    // Les IDs Notion sont des UUIDs sans tirets
    return /^[a-f0-9]{32}$/i.test(pageId.replace(/-/g, ''));
  }
  
  /**
   * Valide les préférences utilisateur
   */
  export function validatePreferences(preferences) {
    const validThemes = ['light', 'dark', 'auto'];
    const validLanguages = ['fr', 'en'];
    
    const errors = {};
  
    if (preferences.theme && !validThemes.includes(preferences.theme)) {
      errors.theme = 'Thème invalide';
    }
  
    if (preferences.language && !validLanguages.includes(preferences.language)) {
      errors.language = 'Langue invalide';
    }
  
    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }