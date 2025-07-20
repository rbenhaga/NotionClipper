const { clipboard, nativeImage } = require('electron');
const crypto = require('crypto');
const EventEmitter = require('events');

class ClipboardService extends EventEmitter {
  constructor() {
    super();
    this.lastContent = null;
    this.lastHash = null;
    this.pollInterval = null;
    this.history = []; // Historique limité
    this.maxHistorySize = 50;
  }

  // Obtenir le contenu actuel
  getContent() {
    try {
      // Vérifier d'abord les images
      const image = clipboard.readImage();
      if (!image.isEmpty()) {
        const size = image.getSize();
        const buffer = image.toPNG();
        
        return {
          type: 'image',
          format: 'png',
          data: buffer,
          dataUrl: `data:image/png;base64,${buffer.toString('base64')}`,
          size: {
            width: size.width,
            height: size.height,
            bytes: buffer.length
          },
          timestamp: Date.now()
        };
      }

      // Puis le texte
      const text = clipboard.readText();
      if (text) {
        const type = this.detectContentType(text);
        return {
          type,
          data: text,
          length: text.length,
          timestamp: Date.now()
        };
      }

      // HTML si disponible
      const html = clipboard.readHTML();
      if (html) {
        return {
          type: 'html',
          data: html,
          text: clipboard.readText(), // Fallback text
          timestamp: Date.now()
        };
      }

      return null;
    } catch (error) {
      console.error('Clipboard read error:', error);
      return null;
    }
  }

  // Détecter le type de contenu texte
  detectContentType(text) {
    if (!text || typeof text !== 'string') return 'text';
    
    const trimmed = text.trim();

    // URL
    if (/^https?:\/\/[^\s]+$/i.test(trimmed)) {
      return 'url';
    }

    // JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch {}
    }

    // Code (détection basique)
    const codePatterns = [
      /^(function|const|let|var|class|import|export)\s/m,
      /^(def|class|import|from|if|for|while)\s/m,
      /^(public|private|protected|static)\s/m,
      /^#include\s|^using\s/m
    ];
    if (codePatterns.some(pattern => pattern.test(trimmed))) {
      return 'code';
    }

    // Markdown
    const markdownPatterns = [
      /^#{1,6}\s/m,           // Headers
      /^\*\s|^-\s|^\+\s/m,    // Lists
      /\*\*[^*]+\*\*/,        // Bold
      /\[[^\]]+\]\([^)]+\)/,  // Links
      /^>\s/m,                // Quotes
      /```[\s\S]*```/         // Code blocks
    ];
    if (markdownPatterns.some(pattern => pattern.test(trimmed))) {
      return 'markdown';
    }

    // Table (TSV/CSV)
    const lines = trimmed.split('\n');
    if (lines.length > 1) {
      const firstLineTabs = (lines[0].match(/\t/g) || []).length;
      const firstLineCommas = (lines[0].match(/,/g) || []).length;
      
      if (firstLineTabs > 0 && lines.every(line => 
        (line.match(/\t/g) || []).length === firstLineTabs)) {
        return 'table';
      }
      if (firstLineCommas > 0 && lines.every(line => 
        (line.match(/,/g) || []).length === firstLineCommas)) {
        return 'csv';
      }
    }

    return 'text';
  }

  // Définir le contenu
  setContent(content, type = 'text') {
    try {
      if (type === 'text' || type === 'markdown' || type === 'code') {
        clipboard.writeText(content);
        return true;
      } else if (type === 'image' && content) {
        const image = nativeImage.createFromBuffer(content);
        clipboard.writeImage(image);
        return true;
      } else if (type === 'html') {
        clipboard.writeHTML(content);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Clipboard write error:', error);
      return false;
    }
  }

  // Vider le clipboard
  clear() {
    clipboard.clear();
    return true;
  }

  // Vérifier si le contenu a changé
  hasChanged() {
    const current = this.getContent();
    if (!current) return false;

    const currentHash = this.calculateHash(current);
    const changed = currentHash !== this.lastHash;

    if (changed) {
      this.lastContent = current;
      this.lastHash = currentHash;
      this.addToHistory(current);
      this.emit('content-changed', current);
    }

    return changed;
  }

  // Calculer un hash du contenu
  calculateHash(content) {
    const data = content.type === 'image' 
      ? content.data.toString('base64')
      : content.data;
    
    return crypto
      .createHash('md5')
      .update(`${content.type}:${data}`)
      .digest('hex');
  }

  // Historique
  addToHistory(content) {
    this.history.unshift({
      ...content,
      id: Date.now().toString()
    });

    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }
  }

  getHistory() {
    return this.history;
  }

  clearHistory() {
    this.history = [];
  }

  // Surveillance du clipboard
  startWatching(interval = 1000) {
    if (this.pollInterval) return;

    this.pollInterval = setInterval(() => {
      this.hasChanged();
    }, interval);
  }

  stopWatching() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}

module.exports = new ClipboardService();