"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectronClipboardAdapter = void 0;
const electron_1 = require("electron");
const events_1 = require("events");
const crypto = __importStar(require("crypto"));
/**
 * Electron Clipboard Adapter with native watching capability
 * Implements IClipboard interface with optimizations from memory
 */
class ElectronClipboardAdapter extends events_1.EventEmitter {
    watchInterval = null;
    isWatching = false;
    lastHash = null;
    lastLoggedHash = null; // Anti-spam logs from memory
    constructor() {
        super();
    }
    async read() {
        try {
            // Check available formats
            const formats = electron_1.clipboard.availableFormats();
            // Priority: Image > HTML > Text
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
        }
        catch (error) {
            console.error('❌ Error reading clipboard:', error);
            return null;
        }
    }
    async write(content) {
        try {
            switch (content.type) {
                case 'image':
                    if (Buffer.isBuffer(content.data)) {
                        const image = electron_1.nativeImage.createFromBuffer(content.data);
                        electron_1.clipboard.writeImage(image);
                    }
                    break;
                case 'html':
                    electron_1.clipboard.writeHTML(content.data);
                    break;
                case 'text':
                default:
                    electron_1.clipboard.writeText(content.data);
                    break;
            }
        }
        catch (error) {
            console.error('❌ Error writing to clipboard:', error);
            throw error;
        }
    }
    async hasContent() {
        try {
            const formats = electron_1.clipboard.availableFormats();
            return formats.length > 0;
        }
        catch (error) {
            console.error('❌ Error checking clipboard content:', error);
            return false;
        }
    }
    async getAvailableFormats() {
        try {
            return electron_1.clipboard.availableFormats();
        }
        catch (error) {
            console.error('❌ Error getting available formats:', error);
            return [];
        }
    }
    async clear() {
        try {
            electron_1.clipboard.clear();
        }
        catch (error) {
            console.error('❌ Error clearing clipboard:', error);
            throw error;
        }
    }
    /**
     * Watch for clipboard changes with native surveillance (from memory optimization)
     */
    watch(callback) {
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
                            console.log(`📊 Image: ${(content.bufferSize / 1024).toFixed(2)} KB`);
                        }
                        else if (content.type === 'html') {
                            console.log('📋 HTML detected (from cache)');
                        }
                        // No logging for text (too frequent from memory)
                        this.lastLoggedHash = content.hash;
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
    stopWatching() {
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
    async hasChanged() {
        try {
            const content = await this.readRaw();
            if (!content)
                return false;
            const currentHash = this.calculateHash(content);
            const hasChanged = currentHash !== this.lastHash;
            this.lastHash = currentHash;
            return hasChanged;
        }
        catch (error) {
            console.error('❌ Error checking clipboard changes:', error);
            return false;
        }
    }
    /**
     * Read raw clipboard content for change detection
     */
    async readRaw() {
        try {
            const formats = electron_1.clipboard.availableFormats();
            if (formats.includes('image/png')) {
                const image = electron_1.clipboard.readImage();
                return image.toPNG();
            }
            if (formats.includes('text/html')) {
                return electron_1.clipboard.readHTML();
            }
            if (formats.includes('text/plain')) {
                return electron_1.clipboard.readText();
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Read image from clipboard
     */
    async readImage() {
        try {
            const image = electron_1.clipboard.readImage();
            if (image.isEmpty())
                return null;
            const buffer = image.toPNG();
            const size = image.getSize();
            const content = {
                type: 'image',
                subtype: 'png',
                data: buffer,
                content: buffer,
                preview: image.toDataURL(), // Data URL for IPC from memory
                bufferSize: buffer.length,
                metadata: {
                    dimensions: size,
                    format: 'png',
                    mimeType: 'image/png'
                },
                timestamp: Date.now(),
                hash: this.calculateHash(buffer)
            };
            return content;
        }
        catch (error) {
            console.error('❌ Error reading image from clipboard:', error);
            return null;
        }
    }
    /**
     * Read HTML from clipboard
     */
    async readHTML() {
        try {
            const html = electron_1.clipboard.readHTML();
            if (!html || !html.trim())
                return null;
            const content = {
                type: 'html',
                data: html,
                content: html,
                text: electron_1.clipboard.readText(), // Also get plain text version
                length: html.length,
                timestamp: Date.now(),
                hash: this.calculateHash(html)
            };
            return content;
        }
        catch (error) {
            console.error('❌ Error reading HTML from clipboard:', error);
            return null;
        }
    }
    /**
     * Read text from clipboard
     */
    async readText() {
        try {
            const text = electron_1.clipboard.readText();
            if (!text || !text.trim())
                return null;
            const content = {
                type: 'text',
                data: text,
                content: text,
                text: text,
                length: text.length,
                timestamp: Date.now(),
                hash: this.calculateHash(text)
            };
            return content;
        }
        catch (error) {
            console.error('❌ Error reading text from clipboard:', error);
            return null;
        }
    }
    /**
     * Calculate hash for content (from memory optimization)
     */
    calculateHash(content) {
        try {
            if (Buffer.isBuffer(content)) {
                // For buffers, use first 1KB for performance
                const sample = content.subarray(0, 1024);
                return crypto.createHash('md5').update(sample).digest('hex');
            }
            else {
                // For strings, use first 5000 chars (from memory)
                const sample = content.substring(0, 5000);
                return crypto.createHash('md5').update(sample).digest('hex');
            }
        }
        catch (error) {
            console.error('❌ Error calculating hash:', error);
            return Date.now().toString();
        }
    }
}
exports.ElectronClipboardAdapter = ElectronClipboardAdapter;
//# sourceMappingURL=clipboard.adapter.js.map