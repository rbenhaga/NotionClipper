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
exports.ClipboardService = void 0;
const index_1 = require("../parsers/index");
const index_2 = require("../converters/index");
const events_1 = require("events");
const crypto = __importStar(require("crypto"));
/**
 * Core Clipboard Service with platform-agnostic business logic
 * Uses dependency injection for platform-specific implementations
 */
class ClipboardService extends events_1.EventEmitter {
    clipboard;
    storage;
    lastContent = null;
    lastHash = null;
    lastLoggedHash = null; // Anti-spam logs from memory
    conversionCache = new Map(); // HTML conversion cache from memory
    CACHE_MAX_SIZE = 10;
    constructor(clipboard, storage) {
        super();
        this.clipboard = clipboard;
        this.storage = storage;
    }
    /**
     * Get current clipboard content with enhanced detection and caching
     */
    async getContent() {
        try {
            const rawContent = await this.clipboard.read();
            if (!rawContent)
                return null;
            // Detect content type
            const detection = index_1.contentDetector.detect(rawContent.data);
            // Enhance content with detection results
            const enrichedContent = {
                ...rawContent,
                type: detection.type,
                subtype: detection.subtype || undefined,
                confidence: detection.confidence,
                metadata: {
                    ...rawContent.metadata,
                    ...detection.metadata
                }
            };
            // Handle HTML conversion with caching (from memory optimization)
            if (detection.type === 'html' && typeof rawContent.data === 'string') {
                const htmlHash = this.hashHTML(rawContent.data);
                let markdownText;
                if (this.conversionCache.has(htmlHash)) {
                    // Use cached version (50-200x faster from memory)
                    markdownText = this.conversionCache.get(htmlHash);
                }
                else {
                    // Convert only if not cached
                    markdownText = index_2.htmlToMarkdownConverter.convert(rawContent.data);
                    // Cache the result
                    this.conversionCache.set(htmlHash, markdownText);
                    // Limit cache size (LRU simple from memory)
                    if (this.conversionCache.size > this.CACHE_MAX_SIZE) {
                        const firstKey = this.conversionCache.keys().next().value;
                        if (firstKey !== undefined) {
                            this.conversionCache.delete(firstKey);
                        }
                    }
                }
                enrichedContent.data = markdownText;
                enrichedContent.content = markdownText;
            }
            // Table detection with delimiter detection (from memory)
            if (detection.type === 'text' && typeof rawContent.data === 'string') {
                const tableDelimiter = this.detectTableDelimiter(rawContent.data);
                if (tableDelimiter) {
                    const format = tableDelimiter === '\t' ? 'TSV (Excel/Sheets)' :
                        tableDelimiter === ',' ? 'CSV (virgules)' :
                            tableDelimiter === ';' ? 'CSV (point-virgules)' : 'Tableau';
                    enrichedContent.type = 'table';
                    enrichedContent.subtype = tableDelimiter === '\t' ? 'tsv' : 'csv';
                    enrichedContent.confidence = 0.95;
                    enrichedContent.metadata = {
                        ...enrichedContent.metadata,
                        format,
                        delimiter: tableDelimiter,
                        delimiterCode: tableDelimiter.charCodeAt(0),
                        source: 'Excel/Sheets/CSV'
                    };
                }
            }
            // Calculate hash for change detection
            enrichedContent.hash = this.calculateHash(enrichedContent.data);
            // Hash-based logging from memory (prevent spam)
            if (enrichedContent.hash !== this.lastLoggedHash) {
                if (enrichedContent.type === 'image') {
                    console.log('📸 Image detected in clipboard');
                    console.log(`📊 Image: ${(enrichedContent.bufferSize / 1024).toFixed(2)} KB`);
                }
                else if (enrichedContent.type === 'html') {
                    console.log('📋 HTML detected (from cache)');
                }
                else if (enrichedContent.type === 'table') {
                    console.log(`📊 ${enrichedContent.metadata?.format} detected`);
                }
                // No logging for text (too frequent from memory)
                this.lastLoggedHash = enrichedContent.hash;
            }
            this.lastContent = enrichedContent;
            return enrichedContent;
        }
        catch (error) {
            console.error('❌ Error getting clipboard content:', error);
            return null;
        }
    }
    /**
     * Set clipboard content
     */
    async setContent(content) {
        try {
            await this.clipboard.write(content);
            this.lastContent = content;
            this.lastHash = content.hash;
        }
        catch (error) {
            console.error('❌ Error setting clipboard content:', error);
            throw error;
        }
    }
    /**
     * Check if clipboard content has changed
     */
    async hasChanged() {
        try {
            const current = await this.getContent();
            if (!current)
                return false;
            const hasChanged = current.hash !== this.lastHash;
            this.lastHash = current.hash;
            return hasChanged;
        }
        catch (error) {
            console.error('❌ Error checking clipboard changes:', error);
            return false;
        }
    }
    /**
     * Start watching clipboard changes
     */
    startWatching(interval = 500) {
        console.log(`📋 Starting clipboard surveillance (${interval}ms)`);
        return this.clipboard.watch((content) => {
            this.emit('changed', content);
        });
    }
    /**
     * Clear clipboard
     */
    async clear() {
        try {
            await this.clipboard.clear();
            this.lastContent = null;
            this.lastHash = null;
            this.emit('cleared');
        }
        catch (error) {
            console.error('❌ Error clearing clipboard:', error);
            throw error;
        }
    }
    /**
     * Get clipboard history from storage
     */
    async getHistory(limit = 50) {
        try {
            const history = await this.storage.get('clipboard.history') || [];
            return history.slice(0, limit);
        }
        catch (error) {
            console.error('❌ Error getting clipboard history:', error);
            return [];
        }
    }
    /**
     * Save content to history
     */
    async saveToHistory(content) {
        try {
            const history = await this.getHistory();
            // Don't save duplicates
            if (history.some(item => item.hash === content.hash)) {
                return;
            }
            // Add to beginning and limit size
            history.unshift(content);
            const limitedHistory = history.slice(0, 100); // Keep last 100 items
            await this.storage.set('clipboard.history', limitedHistory);
        }
        catch (error) {
            console.error('❌ Error saving to clipboard history:', error);
        }
    }
    /**
     * Clear clipboard history
     */
    async clearHistory() {
        try {
            await this.storage.remove('clipboard.history');
        }
        catch (error) {
            console.error('❌ Error clearing clipboard history:', error);
            throw error;
        }
    }
    /**
     * Detect table delimiter (from memory optimization)
     */
    detectTableDelimiter(text) {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2)
            return null;
        // Count occurrences of each possible delimiter
        const delimiters = {
            '\t': [], // TSV (Excel/Sheets)
            ',': [], // CSV
            ';': [] // CSV European (Excel FR/DE)
        };
        // Analyze first 3 lines for consistency
        const sampleLines = lines.slice(0, Math.min(3, lines.length));
        for (const delimiter of Object.keys(delimiters)) {
            for (const line of sampleLines) {
                const count = (line.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
                delimiters[delimiter].push(count);
            }
        }
        // Find most consistent delimiter
        let bestDelimiter = null;
        let bestScore = 0;
        for (const [delimiter, counts] of Object.entries(delimiters)) {
            // Good delimiter has:
            // 1. At least 1 occurrence per line
            // 2. Same number of occurrences on all lines
            const minCount = Math.min(...counts);
            const maxCount = Math.max(...counts);
            if (minCount > 0 && minCount === maxCount) {
                // Score = number of detected columns
                const score = minCount + 1;
                if (score > bestScore) {
                    bestScore = score;
                    bestDelimiter = delimiter;
                }
            }
        }
        // Require at least 2 columns (score >= 2)
        return bestScore >= 2 ? bestDelimiter : null;
    }
    /**
     * Calculate hash for HTML content (from memory optimization)
     */
    hashHTML(html) {
        return crypto.createHash('md5')
            .update(html.substring(0, 5000)) // First 5000 chars sufficient
            .digest('hex');
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
                // For strings, use first 5000 chars
                const sample = content.substring(0, 5000);
                return crypto.createHash('md5').update(sample).digest('hex');
            }
        }
        catch (error) {
            console.error('❌ Error calculating hash:', error);
            return Date.now().toString();
        }
    }
    /**
     * Clear conversion cache
     */
    clearConversionCache() {
        this.conversionCache.clear();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.conversionCache.size,
            maxSize: this.CACHE_MAX_SIZE
        };
    }
}
exports.ClipboardService = ClipboardService;
//# sourceMappingURL=clipboard.service.js.map