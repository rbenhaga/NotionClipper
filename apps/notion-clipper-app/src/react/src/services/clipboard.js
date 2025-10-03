// src/react/src/services/clipboard.js
/**
 * Service pour la gestion du presse-papiers
 * Correspond à backend/api/clipboard_routes.py
 */

import api from './api';

class ClipboardService {
  async getContent() {
    const result = await window.electronAPI.getClipboard();
    return result.content || null;
  }

  async setContent(content, type = 'text') {
    return await window.electronAPI.setClipboard({ content, type });
  }

  async clear() {
    return await window.electronAPI.clearClipboard();
  }

  async getHistory() {
    const result = await window.electronAPI.getHistory();
    return result.history || [];
  }
}

export default new ClipboardService();