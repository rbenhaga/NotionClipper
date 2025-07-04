// src/react/src/services/clipboard.js
/**
 * Service pour la gestion du presse-papiers
 * Correspond à backend/api/clipboard_routes.py
 */

import api from './api';

class ClipboardService {
  constructor() {
    this.pollingInterval = null;
    this.lastContent = null;
    this.listeners = new Set();
  }

  /**
   * Récupère le contenu actuel du presse-papiers
   */
  async getContent() {
    return await api.get('/clipboard');
  }

  /**
   * Récupère l'URL de la page preview
   */
  async getPreviewUrl() {
    return await api.get('/preview/url');
  }

  /**
   * Démarre la surveillance du presse-papiers
   */
  startPolling(interval = 1000) {
    if (this.pollingInterval) return;

    this.pollingInterval = setInterval(async () => {
      try {
        const content = await this.getContent();
        
        // Vérifier si le contenu a changé
        if (this.hasContentChanged(content)) {
          this.lastContent = content;
          this.notifyListeners(content);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du presse-papiers:', error);
      }
    }, interval);
  }

  /**
   * Arrête la surveillance du presse-papiers
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Vérifie si le contenu a changé
   */
  hasContentChanged(newContent) {
    if (!this.lastContent && newContent.content) return true;
    if (!this.lastContent || !newContent) return false;
    
    return this.lastContent.content !== newContent.content ||
           this.lastContent.type !== newContent.type;
  }

  /**
   * Ajoute un listener pour les changements de presse-papiers
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notifie tous les listeners
   */
  notifyListeners(content) {
    this.listeners.forEach(callback => {
      try {
        callback(content);
      } catch (error) {
        console.error('Erreur dans le listener:', error);
      }
    });
  }

  /**
   * Copie du texte dans le presse-papiers (côté client)
   */
  async copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
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
        console.error('Erreur lors de la copie:', error);
        return false;
      } finally {
        textArea.remove();
      }
    }
  }

  /**
   * Lit le presse-papiers (côté client)
   */
  async readFromClipboard() {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        const text = await navigator.clipboard.readText();
        return { content: text, type: 'text' };
      } catch (error) {
        console.error('Erreur lors de la lecture du presse-papiers:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Formate le contenu pour l'affichage
   */
  formatContentForDisplay(content, type) {
    if (!content) return '';

    switch (type) {
      case 'image':
        return '[Image]';
      case 'url':
        return content.substring(0, 50) + (content.length > 50 ? '...' : '');
      case 'code':
        return content.split('\n').slice(0, 3).join('\n') + 
               (content.split('\n').length > 3 ? '\n...' : '');
      default:
        return content.substring(0, 100) + (content.length > 100 ? '...' : '');
    }
  }
}

const clipboardService = new ClipboardService();
export default clipboardService;