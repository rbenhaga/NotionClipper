// src/react/src/services/content.js
/**
 * Service pour l'envoi de contenu vers Notion
 * Correspond à backend/api/content_routes.py
 */

import api from './api';

class ContentService {
  async sendToNotion(pageId, content, options = {}) {
    return await window.electronAPI.sendToNotion({
      pageId,
      content,
      options
    });
  }

  async parseContent(content, type = 'auto') {
    const result = await window.electronAPI.parseContent({
      content,
      type
    });
    return result.blocks || [];
  }

  async previewUrl(url) {
    return await window.electronAPI.previewUrl(url);
  }

  async uploadImage(imageData) {
    return await window.electronAPI.uploadImage(imageData);
  }
}

export default new ContentService();