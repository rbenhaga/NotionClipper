// src/react/src/services/content.js
/**
 * Service pour l'envoi de contenu vers Notion
 * Correspond à backend/api/content_routes.py
 */

import api from './api';

class ContentService {
  /**
   * Envoie du contenu vers une page Notion
   */
  async sendContent(pageId, content, options = {}) {
    // Séparer les propriétés de base de données et de page
    const { databaseProperties = {}, pageProperties = {}, ...otherOptions } = options;
    
    const payload = {
      pageId,
      content,
      contentType: otherOptions.contentType || 'text',
      parseAsMarkdown: otherOptions.parseAsMarkdown !== false,
      properties: databaseProperties,  // Propriétés de la base de données
      pageProperties: pageProperties,   // Propriétés de page (icon, cover)
      sourceUrl: otherOptions.sourceUrl || '',
      tags: otherOptions.tags || []
    };

    return await api.post('/send', payload);
  }

  /**
   * Crée une page Notion avec du contenu
   */
  async createPage(data) {
    const {
      parentId,
      title,
      content,
      contentType = 'text',
      icon = '📄',
      cover = null,
      properties = {}
    } = data;

    return await api.post('/create_page', {
      parent_id: parentId,
      title,
      content,
      content_type: contentType,
      icon,
      cover,
      properties
    });
  }

  /**
   * Prévisualise le contenu formaté
   */
  async previewContent(content, contentType = 'text', parseMarkdown = true) {
    // Cette fonction simule le parsing côté client
    // Le vrai parsing se fait côté serveur
    return {
      preview: content,
      type: contentType,
      markdown: parseMarkdown
    };
  }

  /**
   * Détecte le type de contenu
   */
  detectContentType(content) {
    // URL
    if (/^https?:\/\/[^\s]+$/.test(content.trim())) {
      return 'url';
    }
    
    // Image base64
    if (content.startsWith('data:image/')) {
      return 'image';
    }
    
    // Code (heuristique simple)
    if (content.includes('function') || content.includes('const ') || 
        content.includes('import ') || content.includes('class ')) {
      return 'code';
    }
    
    // Table (détection basique)
    if (content.includes('|') && content.split('\n').some(line => 
        line.includes('|') && line.split('|').length > 2)) {
      return 'table';
    }
    
    // Markdown
    if (content.includes('**') || content.includes('##') || 
        content.includes('[') && content.includes('](')) {
      return 'markdown';
    }
    
    return 'text';
  }

  /**
   * Valide le contenu avant envoi
   */
  validateContent(content, contentType) {
    if (!content || content.trim() === '') {
      return { valid: false, error: 'Le contenu ne peut pas être vide' };
    }

    if (contentType === 'image' && !content.startsWith('data:image/')) {
      return { valid: false, error: 'Format d\'image invalide' };
    }

    if (contentType === 'url' && !content.match(/^https?:\/\//)) {
      return { valid: false, error: 'URL invalide' };
    }

    return { valid: true };
  }
}

const contentService = new ContentService();
export default contentService;