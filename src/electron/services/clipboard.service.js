const { clipboard, nativeImage } = require('electron');
const crypto = require('crypto');
const EventEmitter = require('events');

class ClipboardService extends EventEmitter {
  constructor() {
    super();
    this.lastContent = null;
    this.lastHash = null;
    this.pollInterval = null;
    this.history = [];
    this.maxHistorySize = 50;
    this.isWatching = false;
    this.watchInterval = 500;
    // Détection centralisée via contentDetector + lecteurs natifs clipboard
  }

  async detectImage() {
    try {
      const image = clipboard.readImage();
      if (!image.isEmpty()) {
        const size = image.getSize();
        const buffer = image.toPNG();
        return {
          type: 'image',
          subtype: 'png',
          data: buffer,
          dataUrl: `data:image/png;base64,${buffer.toString('base64')}`,
          size: { width: size.width, height: size.height, bytes: buffer.length }
        };
      }
    } catch (error) {
      console.error('Image detection error:', error);
    }
    return null;
  }

  // Supprimé: détecteurs locaux text/html/rtf/files (centralisé)

  // Supprimé: analyse locale, remplacée par contentDetector

  async getContent() {
    try {
      // Image
      const image = clipboard.readImage();
      if (!image.isEmpty()) {
        const size = image.getSize();
        const buffer = image.toPNG();
        const enriched = {
          type: 'image',
          subtype: 'png',
          data: buffer,
          dataUrl: `data:image/png;base64,${buffer.toString('base64')}`,
          size: { width: size.width, height: size.height, bytes: buffer.length },
          timestamp: Date.now()
        };
        enriched.hash = this.calculateHash(enriched);
        return enriched;
      }
      // HTML
      const html = clipboard.readHTML();
      if (html && html.trim()) {
        const detection = require('./contentDetector').detect(html);
        const enriched = { type: detection.type, subtype: detection.subtype, data: html, text: clipboard.readText(), timestamp: Date.now() };
        enriched.hash = this.calculateHash(enriched);
        return enriched;
      }
      // Text
      const text = clipboard.readText();
      if (text && text.trim()) {
        const detection = require('./contentDetector').detect(text);
        const enriched = { type: detection.type, subtype: detection.subtype, data: text, length: text.length, confidence: detection.confidence, metadata: detection.metadata, timestamp: Date.now() };
        enriched.hash = this.calculateHash(enriched);
        return enriched;
      }
      return null;
    } catch (error) {
      console.error('Get content error:', error);
      return null;
    }
  }

  setContent(content, type = 'text') {
    try {
      switch (type) {
        case 'text':
        case 'markdown':
        case 'code':
        case 'url':
          clipboard.writeText(content);
          break;
        case 'image':
          if (typeof content === 'string' && content.startsWith('data:image')) {
            const base64Data = content.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const image = nativeImage.createFromBuffer(buffer);
            clipboard.writeImage(image);
          } else if (Buffer.isBuffer(content)) {
            const image = nativeImage.createFromBuffer(content);
            clipboard.writeImage(image);
          }
          break;
        case 'html':
          clipboard.writeHTML(content);
          break;
        default:
          clipboard.writeText(content);
      }
      setTimeout(() => this.checkForChanges(), 100);
      return true;
    } catch (error) {
      console.error('Set content error:', error);
      return false;
    }
  }

  clear() {
    clipboard.clear();
    this.lastContent = null;
    this.lastHash = null;
    this.emit('cleared');
    return true;
  }

  startWatching(interval = null) {
    if (this.isWatching) {
      console.log('⚠️ Clipboard watching already started');
      return;
    }
    this.watchInterval = interval || this.watchInterval;
    this.isWatching = true;
    console.log(`👁️ Starting clipboard watch (interval: ${this.watchInterval}ms)`);
    this.checkForChanges();
    this.pollInterval = setInterval(() => { this.checkForChanges(); }, this.watchInterval);
  }

  stopWatching() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      this.isWatching = false;
      console.log('⏹️ Clipboard watching stopped');
    }
  }

  async checkForChanges() {
    try {
      const current = await this.getContent();
      if (!current) {
        if (this.lastContent) {
          this.lastContent = null;
          this.lastHash = null;
          this.emit('cleared');
        }
        return false;
      }
      const currentHash = current.hash || this.calculateHash(current);
      const changed = currentHash !== this.lastHash;
      if (changed) {
        console.log(`📋 Clipboard changed: ${current.type}/${current.subtype || 'default'}`);
        const previous = this.lastContent;
        this.lastContent = current;
        this.lastHash = currentHash;
        this.addToHistory(current);
        this.emit('content-changed', { current, previous, timestamp: Date.now() });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Check for changes error:', error);
      this.emit('error', error);
      return false;
    }
  }

  calculateHash(content) {
    try {
      let dataToHash = '';
      if (content.type === 'image' && content.data) {
        dataToHash = `image:${content.data.length}`;
      } else if (content.data) {
        dataToHash = `${content.type}:${content.data}`;
      } else {
        dataToHash = JSON.stringify(content);
      }
      return crypto.createHash('sha256').update(dataToHash).digest('hex');
    } catch (error) {
      return Date.now().toString();
    }
  }

  addToHistory(content) {
    const historyItem = { ...content, id: Date.now().toString(), addedAt: new Date().toISOString() };
    this.history.unshift(historyItem);
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }
    this.emit('history-updated', this.history);
  }

  getHistory() { return this.history; }
  clearHistory() { this.history = []; this.emit('history-cleared'); }

  getStats() {
    return {
      isWatching: this.isWatching,
      watchInterval: this.watchInterval,
      historySize: this.history.length,
      lastContent: this.lastContent ? {
        type: this.lastContent.type,
        subtype: this.lastContent.subtype,
        timestamp: this.lastContent.timestamp
      } : null
    };
  }
}

module.exports = new ClipboardService();