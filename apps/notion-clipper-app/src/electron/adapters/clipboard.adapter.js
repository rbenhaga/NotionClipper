// apps/notion-clipper-app/src/electron/adapters/clipboard.adapter.js
const { clipboard, nativeImage } = require('electron');
const { EventEmitter } = require('events');

class ElectronClipboardAdapter extends EventEmitter {
  constructor() {
    super();
    this.watchInterval = null;
    this.isWatching = false;
    this.lastHash = null;
  }
  async readText() {
    return clipboard.readText() || '';
  }

  async writeText(text) {
    clipboard.writeText(text);
    return true;
  }

  async readImage() {
    const image = clipboard.readImage();
    if (image.isEmpty()) return null;

    return {
      buffer: image.toPNG(),
      format: 'png',
      width: image.getSize().width,
      height: image.getSize().height
    };
  }

  async writeImage(imageData) {
    const image = nativeImage.createFromBuffer(imageData.buffer);
    clipboard.writeImage(image);
    return true;
  }

  async readHTML() {
    return clipboard.readHTML() || '';
  }

  async writeHTML(html) {
    clipboard.writeHTML(html);
    return true;
  }

  async clear() {
    clipboard.clear();
    return true;
  }

  async availableFormats() {
    return clipboard.availableFormats();
  }

  startWatching(interval = 1000, callback = null) {
    if (this.watchInterval) {
      console.log('[CLIPBOARD] Already watching');
      return;
    }

    console.log(`[CLIPBOARD] Starting clipboard surveillance (${interval}ms)`);

    this.watchInterval = setInterval(() => {
      if (this.hasChanged()) {
        const content = this.readText();
        this.emit('changed', content);
        if (callback) callback(content);
      }
    }, interval);
  }

  stopWatching() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
      this.isWatching = false;
      console.log('[CLIPBOARD] Arret surveillance clipboard');
    }
  }

  hasChanged() {
    // Simple check - dans un vrai adapter, on comparerait le hash
    const currentText = clipboard.readText();
    const currentHash = currentText ? currentText.length.toString() : 'empty';

    if (currentHash !== this.lastHash) {
      this.lastHash = currentHash;
      return true;
    }
    return false;
  }

  // Méthode watch pour le ClipboardService du core
  watch(callback, interval = 1000) {
    return this.startWatching(interval, callback);
  }
}

module.exports = ElectronClipboardAdapter;
