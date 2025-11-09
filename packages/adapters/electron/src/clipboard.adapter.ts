import type { IClipboard, ClipboardContent } from '@notion-clipper/core-shared';
import { clipboard, nativeImage } from 'electron';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';

/**
 * Electron Clipboard Adapter with native watching capability
 * Implements IClipboard interface with optimizations from memory
 */
export class ElectronClipboardAdapter extends EventEmitter implements IClipboard {
  private watchInterval: NodeJS.Timeout | null = null;
  private isWatching = false;
  private lastHash: string | null = null;
  private lastLoggedHash: string | null = null; // Anti-spam logs from memory

  constructor() {
    super();
  }

  async read(): Promise<ClipboardContent | null> {
    try {
      // Check available formats
      const formats = clipboard.availableFormats();

      // 🔍 DEBUG: Log all available formats to diagnose file detection
      console.log('[CLIPBOARD] 🔍 Available formats:', formats);

      // 🔥 NOUVEAU: Priority: Files > Image > HTML > Text
      // Détecter les fichiers copiés (Windows: FileNameW, Mac: public.file-url)
      const hasFiles = formats.some(f =>
        f.includes('FileNameW') ||
        f.includes('public.file-url') ||
        f.includes('text/uri-list')
      );

      console.log('[CLIPBOARD] 📎 Has files:', hasFiles);

      if (hasFiles) {
        const fileContent = this.readFiles();
        if (fileContent) return fileContent;
      }

      if (formats.includes('image/png') || formats.includes('image/jpeg')) {
        return this.readImage();
      }

      if (formats.includes('text/html')) {
        return this.readHTML();
      }

      if (formats.includes('text/plain')) {
        return this.readText();
      }

      return null;
    } catch (error) {
      console.error('❌ Error reading clipboard:', error);
      return null;
    }
  }

  async write(content: ClipboardContent): Promise<void> {
    try {
      switch (content.type) {
        case 'image':
          if (Buffer.isBuffer(content.data)) {
            const image = nativeImage.createFromBuffer(content.data);
            clipboard.writeImage(image);
          }
          break;
        case 'html':
          clipboard.writeHTML(content.data as string);
          break;
        case 'text':
        default:
          clipboard.writeText(content.data as string);
          break;
      }
    } catch (error) {
      console.error('❌ Error writing to clipboard:', error);
      throw error;
    }
  }

  async hasContent(): Promise<boolean> {
    try {
      const formats = clipboard.availableFormats();
      return formats.length > 0;
    } catch (error) {
      console.error('❌ Error checking clipboard content:', error);
      return false;
    }
  }

  async getAvailableFormats(): Promise<string[]> {
    try {
      return clipboard.availableFormats();
    } catch (error) {
      console.error('❌ Error getting available formats:', error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      // Ne pas vider le clipboard système, juste émettre un événement
      // pour que l'application sache que le contenu a été "traité"
      // clipboard.clear(); // ❌ Commenté pour ne pas vider le clipboard système
    } catch (error) {
      console.error('❌ Error clearing clipboard:', error);
      throw error;
    }
  }

  /**
   * Watch for clipboard changes with native surveillance (from memory optimization)
   */
  watch(callback: (content: ClipboardContent) => void): () => void {
    if (this.isWatching) {
      console.warn('⚠️ Clipboard watching already active');
      return () => { };
    }

    console.log('📋 Starting clipboard surveillance (500ms)');
    this.isWatching = true;

    this.watchInterval = setInterval(async () => {
      if (await this.hasChanged()) {
        const content = await this.read();
        if (content) {
          // Hash-based logging from memory to prevent spam
          if (content.hash !== this.lastLoggedHash) {
            if (content.type === 'image') {
              console.log('📸 Image detected in clipboard');
              console.log(`📊 Image: ${((content.metadata?.bufferSize || 0) / 1024).toFixed(2)} KB`);
            } else if (content.type === 'html') {
              console.log('📋 HTML detected (from cache)');
            }
            // No logging for text (too frequent from memory)
            this.lastLoggedHash = content.hash ?? null;
          }

          callback(content);
          this.emit('changed', content);
        }
      }
    }, 500); // 500ms interval from memory optimization

    // Return unsubscribe function
    return () => {
      this.stopWatching();
    };
  }

  /**
   * Stop watching clipboard changes
   */
  private stopWatching(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
      this.isWatching = false;
      console.log('📋 Stopped clipboard surveillance');
    }
  }

  /**
   * Check if clipboard content has changed (from memory optimization)
   */
  private async hasChanged(): Promise<boolean> {
    try {
      const content = await this.readRaw();
      if (!content) return false;

      const currentHash = this.calculateHash(content);
      const hasChanged = currentHash !== this.lastHash;
      this.lastHash = currentHash;

      return hasChanged;
    } catch (error) {
      console.error('❌ Error checking clipboard changes:', error);
      return false;
    }
  }

  /**
   * Read raw clipboard content for change detection
   */
  private async readRaw(): Promise<string | Buffer | null> {
    try {
      const formats = clipboard.availableFormats();

      if (formats.includes('image/png')) {
        const image = clipboard.readImage();
        return image.toPNG();
      }

      if (formats.includes('text/html')) {
        return clipboard.readHTML();
      }

      if (formats.includes('text/plain')) {
        return clipboard.readText();
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Read image from clipboard
   */
  private async readImage(): Promise<ClipboardContent | null> {
    try {
      const image = clipboard.readImage();
      
      if (image.isEmpty()) {
        return null;
      }

      const buffer = image.toPNG();
      const size = image.getSize();
      const dataURL = image.toDataURL();

      const content: ClipboardContent = {
        type: 'image',
        data: buffer,
        preview: dataURL, // Data URL for IPC from memory
        metadata: {
          dimensions: size,
          format: 'png',
          mimeType: 'image/png',
          bufferSize: buffer.length
        },
        timestamp: Date.now(),
        hash: this.calculateHash(buffer)
      };

      return content;
    } catch (error) {
      console.error('❌ Error reading image from clipboard:', error);
      return null;
    }
  }

  /**
   * Read HTML from clipboard
   */
  private async readHTML(): Promise<ClipboardContent | null> {
    try {
      const html = clipboard.readHTML();
      if (!html || !html.trim()) return null;

      const textContent = clipboard.readText();

      const content: ClipboardContent = {
        type: 'html',
        data: html,
        metadata: {
          textContent: textContent,
          length: html.length
        },
        timestamp: Date.now(),
        hash: this.calculateHash(html)
      };

      return content;
    } catch (error) {
      console.error('❌ Error reading HTML from clipboard:', error);
      return null;
    }
  }

  /**
   * Read text from clipboard
   */
  private async readText(): Promise<ClipboardContent | null> {
    try {
      const text = clipboard.readText();

      if (!text) {
        return null;
      }

      if (!text.trim()) {
        // Ne pas rejeter le texte qui contient seulement des espaces
        // L'utilisateur a peut-être copié des espaces intentionnellement
      }

      const content: ClipboardContent = {
        type: 'text',
        data: text,
        metadata: {
          length: text.length
        },
        timestamp: Date.now(),
        hash: this.calculateHash(text)
      };

      return content;
    } catch (error) {
      console.error('❌ Error reading text from clipboard:', error);
      return null;
    }
  }

  /**
   * 🔥 NOUVEAU: Read files from clipboard
   */
  private readFiles(): ClipboardContent | null {
    try {
      const formats = clipboard.availableFormats();
      let filePaths: string[] = [];

      console.log('[CLIPBOARD] 🔍 Attempting to read files from clipboard...');
      console.log('[CLIPBOARD] 🔍 Formats containing "File":', formats.filter(f => f.toLowerCase().includes('file')));

      // Méthode 1: Windows - FileNameW (UTF-16LE)
      if (formats.includes('FileNameW')) {
        console.log('[CLIPBOARD] 📝 Trying FileNameW format...');
        try {
          const buffer = clipboard.readBuffer('FileNameW');
          if (buffer && buffer.length > 0) {
            console.log('[CLIPBOARD] 📦 FileNameW buffer size:', buffer.length);
            // Parse le buffer pour extraire les paths (UTF-16LE)
            // Les chemins sont séparés par des null bytes
            const pathsString = buffer.toString('utf16le');
            console.log('[CLIPBOARD] 📄 Raw pathsString:', pathsString.substring(0, 200));

            // Séparer par les null bytes et nettoyer
            filePaths = pathsString
              .split('\0')
              .filter(p => p.trim().length > 0)
              .filter(p => !p.includes('\n')); // Supprimer les lignes corrompues

            console.log('[CLIPBOARD] ✅ FileNameW paths:', filePaths);
          }
        } catch (err) {
          console.warn('[CLIPBOARD] ⚠️ Error reading FileNameW:', err);
        }
      }

      // Méthode 2: Try other Windows formats
      if (filePaths.length === 0) {
        const windowsFormats = formats.filter(f =>
          f.toLowerCase().includes('filename') ||
          f.toLowerCase().includes('file')
        );

        for (const format of windowsFormats) {
          if (format === 'FileNameW') continue; // Déjà essayé

          console.log(`[CLIPBOARD] 📝 Trying format: ${format}`);
          try {
            const buffer = clipboard.readBuffer(format);
            if (buffer && buffer.length > 0) {
              console.log(`[CLIPBOARD] 📦 ${format} buffer size:`, buffer.length);

              // Essayer différents encodings
              const asUtf16 = buffer.toString('utf16le').split('\0').filter(p => p.trim().length > 0);
              const asUtf8 = buffer.toString('utf8').split('\0').filter(p => p.trim().length > 0);

              if (asUtf16.length > 0 && asUtf16[0].includes(':')) {
                filePaths = asUtf16;
                console.log(`[CLIPBOARD] ✅ Found paths in ${format} (UTF-16):`, filePaths);
                break;
              } else if (asUtf8.length > 0 && asUtf8[0].includes(':')) {
                filePaths = asUtf8;
                console.log(`[CLIPBOARD] ✅ Found paths in ${format} (UTF-8):`, filePaths);
                break;
              }
            }
          } catch (err) {
            console.warn(`[CLIPBOARD] ⚠️ Error reading ${format}:`, err);
          }
        }
      }

      // Méthode 3: Mac/Linux - text/uri-list
      if (filePaths.length === 0 && formats.includes('text/uri-list')) {
        console.log('[CLIPBOARD] 📝 Trying text/uri-list format...');
        try {
          const uriList = clipboard.read('text/uri-list');
          if (uriList) {
            console.log('[CLIPBOARD] 📄 URI list:', uriList);
            filePaths = uriList
              .split('\n')
              .filter(uri => uri.trim().startsWith('file://'))
              .map(uri => {
                const decoded = decodeURIComponent(uri.replace('file://', ''));
                return decoded;
              });

            console.log('[CLIPBOARD] ✅ text/uri-list paths:', filePaths);
          }
        } catch (err) {
          console.warn('[CLIPBOARD] ⚠️ Error reading text/uri-list:', err);
        }
      }

      // Méthode 4: Fallback - essayer de lire le texte brut qui pourrait contenir un chemin
      if (filePaths.length === 0 && formats.includes('text/plain')) {
        console.log('[CLIPBOARD] 📝 Trying text/plain as fallback...');
        try {
          const text = clipboard.readText();
          if (text && text.trim()) {
            // Vérifier si c'est un chemin de fichier valide (contient : ou / ou \)
            const trimmed = text.trim();
            if ((trimmed.includes(':') || trimmed.includes('/') || trimmed.includes('\\')) &&
                !trimmed.includes('\n') &&
                trimmed.length < 500) { // Pas trop long pour être un chemin
              console.log('[CLIPBOARD] 📄 Potential file path in text:', trimmed);
              filePaths = [trimmed];
            }
          }
        } catch (err) {
          console.warn('[CLIPBOARD] ⚠️ Error reading text/plain:', err);
        }
      }

      if (filePaths.length === 0) {
        console.log('[CLIPBOARD] ❌ No file paths found in clipboard');
        return null;
      }

      console.log('[CLIPBOARD] ✅ Files detected in clipboard:', filePaths);

      const content: ClipboardContent = {
        type: 'file', // 🔥 FIX: 'file' singulier pour correspondre au type ClipboardContent
        data: filePaths,
        metadata: {
          count: filePaths.length,
          files: filePaths.map(p => ({
            path: p,
            name: require('path').basename(p)
          }))
        },
        timestamp: Date.now(),
        hash: this.calculateHash(filePaths.join('|'))
      };

      return content;
    } catch (error) {
      console.error('[CLIPBOARD] ❌ Error reading files from clipboard:', error);
      return null;
    }
  }

  /**
   * Calculate hash for content (from memory optimization)
   */
  private calculateHash(content: string | Buffer): string {
    try {
      if (Buffer.isBuffer(content)) {
        // For buffers, use first 1KB for performance
        const sample = content.subarray(0, 1024);
        return crypto.createHash('md5').update(sample).digest('hex');
      } else {
        // For strings, use first 5000 chars (from memory)
        const sample = content.substring(0, 5000);
        return crypto.createHash('md5').update(sample).digest('hex');
      }
    } catch (error) {
      console.error('❌ Error calculating hash:', error);
      return Date.now().toString();
    }
  }
}
