const { Client } = require('@notionhq/client');
const NodeCache = require('node-cache');
const sharp = require('sharp');
const FormData = require('form-data');
const fetch = require('node-fetch');
const QueueManager = require('./queueManager');
const { app } = require('electron');

class NotionBackend {
  constructor() {
    this.notion = null;
    this.cache = new NodeCache({ stdTTL: 600 });
    this.imgbbKey = null;
    this.stats = {
      pagesLoaded: 0,
      contentsSent: 0,
      errors: []
    };
    this.queueManager = new QueueManager(app.getPath('userData'));
    this.isOnline = true;
    this.checkConnectivity();
  }

  initialize(token, imgbbKey = null) {
    this.notion = new Client({ auth: token });
    this.imgbbKey = imgbbKey;
    this.cache.flushAll();
    return { success: true };
  }

  async getAllPages(refresh = false) {
    const cacheKey = 'all_pages';
    if (!refresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }
    try {
      const pages = [];
      let hasMore = true;
      let startCursor = undefined;
      while (hasMore) {
        const response = await this.notion.search({
          filter: { value: 'page', property: 'object' },
          page_size: 100,
          start_cursor: startCursor
        });
        for (const page of response.results) {
          if (page.properties?.title) {
            const title = this.extractTitle(page.properties.title);
            pages.push({
              id: page.id,
              title: title || 'Sans titre',
              icon: page.icon?.emoji || '📄',
              url: page.url,
              lastEdited: page.last_edited_time,
              parentId: page.parent?.page_id || null
            });
          }
        }
        hasMore = response.has_more;
        startCursor = response.next_cursor;
      }
      this.cache.set(cacheKey, pages);
      this.stats.pagesLoaded = pages.length;
      return pages;
    } catch (error) {
      console.error('Erreur récupération pages:', error);
      throw error;
    }
  }

  async checkConnectivity() {
    setInterval(async () => {
      try {
        if (this.notion) {
          await this.notion.users.me();
          if (!this.isOnline) {
            this.isOnline = true;
            console.log("✅ Connexion restaurée, traitement de la file d'attente...");
            this.queueManager.processQueue(this);
          }
        }
      } catch (error) {
        if (this.isOnline) {
          this.isOnline = false;
          console.log('⚠️ Mode hors ligne activé');
        }
      }
    }, 30000);
  }

  async sendToNotion(pageId, content, contentType = 'text') {
    if (!this.isOnline) {
      const queueId = await this.queueManager.addToQueue({
        type: 'sendToNotion',
        pageId,
        content,
        contentType
      });
      console.log(`📋 Ajouté à la file d'attente (ID: ${queueId})`);
      return { success: true, queued: true, queueId, message: "Contenu ajouté à la file d'attente (mode hors ligne)" };
    }
    try {
      const blocks = await this.parseContent(content, contentType);
      await this.notion.blocks.children.append({ block_id: pageId, children: blocks });
      this.stats.contentsSent++;
      return { success: true, blocks: blocks.length };
    } catch (error) {
      if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
        this.isOnline = false;
        return this.sendToNotion(pageId, content, contentType);
      }
      this.stats.errors.push({ timestamp: new Date(), error: error.message });
      throw error;
    }
  }

  async parseContent(content, contentType) {
    if (contentType === 'markdown' || this.isMarkdown(content)) {
      return this.parseMarkdown(content);
    }
    const blocks = [];
    const chunks = this.splitTextIntoChunks(content, 2000);
    for (const chunk of chunks) {
      blocks.push({
        paragraph: {
          rich_text: [{ text: { content: chunk } }]
        }
      });
    }
    return blocks;
  }

  async detectAndProcessContent(content, forceType = null) {
    const type = forceType || this.detectContentType(content);
    switch (type) {
      case 'image':
        return await this.processImage(content);
      case 'csv':
      case 'table':
        return this.processTable(content);
      case 'code':
        return this.processCode(content);
      case 'url':
        return await this.processUrl(content);
      default:
        return this.parseContent(content, type);
    }
  }

  detectContentType(content) {
    if (content.startsWith('data:image') || /(\.jpg|\.jpeg|\.png|\.gif|\.webp)$/i.test(content)) {
      return 'image';
    }
    if (this.looksLikeCSV(content)) {
      return 'csv';
    }
    if (this.looksLikeCode(content)) {
      return 'code';
    }
    if (/^https?:\/\/[^\s]+$/i.test(content.trim())) {
      return 'url';
    }
    if (this.isMarkdown(content)) {
      return 'markdown';
    }
    return 'text';
  }

  looksLikeCSV(content) {
    const lines = content.split('\n').slice(0, 3);
    if (lines.length < 2) return false;
    const delimiter = this.detectDelimiter(lines[0]);
    if (!delimiter) return false;
    const columnCounts = lines.map(line => line.split(delimiter).length);
    return columnCounts.every(count => count === columnCounts[0]);
  }

  detectDelimiter(line) {
    const delimiters = [',', '\t', ';', '|'];
    return delimiters.find(d => line.includes(d));
  }

  looksLikeCode(content) {
    const codeIndicators = [
      /^(function|const|let|var|class|import|export)/m,
      /^(def|class|import|from|if __name__)/m,
      /^(public|private|class|interface|package)/m,
      /{[\s\S]*}/,
      /\(\s*\)\s*=>/
    ];
    return codeIndicators.some(pattern => pattern.test(content));
  }

  processTable(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const delimiter = this.detectDelimiter(lines[0]) || ',';
    const rows = lines.map(line => line.split(delimiter).map(cell => cell.trim()));
    return [{
      table: {
        table_width: rows[0].length,
        has_column_header: true,
        has_row_header: false,
        children: rows.map((row) => ({
          table_row: {
            cells: row.map(cell => [{ text: { content: cell } }])
          }
        }))
      }
    }];
  }

  processCode(content) {
    const language = this.detectLanguage(content);
    return [{
      code: {
        rich_text: [{ text: { content: content } }],
        language: language
      }
    }];
  }

  detectLanguage(code) {
    if (/^(const|let|var|function|=>)/m.test(code)) return 'javascript';
    if (/^(def|class|import|from)/m.test(code)) return 'python';
    if (/^(public|private|class|interface)/m.test(code)) return 'java';
    if (/^#include|int main\(/m.test(code)) return 'c';
    return 'plain text';
  }

  async processUrl(url) {
    try {
      const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
      const contentType = response.headers.get('content-type');
      return [{
        bookmark: {
          url: url,
          caption: [{ text: { content: `Source: ${new URL(url).hostname}` } }]
        }
      }];
    } catch (error) {
      return [{
        paragraph: {
          rich_text: [{ text: { content: url, link: { url } } }]
        }
      }];
    }
  }

  async processImage(content) {
    try {
      if (content.startsWith('http')) {
        return [{ image: { type: 'external', external: { url: content } } }];
      }
      if (content.startsWith('data:image')) {
        const result = await this.uploadImage(content);
        if (result.success) {
          return [{ image: { type: 'external', external: { url: result.url } } }];
        }
      }
      throw new Error("Format d'image non supporté");
    } catch (error) {
      console.error('Erreur traitement image:', error);
      throw error;
    }
  }
  parseMarkdown(content) {
    const blocks = [];
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)[0].length;
        const text = line.replace(/^#+\s*/, '');
        if (level === 1) {
          blocks.push({ heading_1: { rich_text: [{ text: { content: text } }] } });
        } else if (level === 2) {
          blocks.push({ heading_2: { rich_text: [{ text: { content: text } }] } });
        } else {
          blocks.push({ heading_3: { rich_text: [{ text: { content: text } }] } });
        }
      } else if (line.match(/^[\*\-]\s+/)) {
        const text = line.replace(/^[\*\-]\s+/, '');
        blocks.push({ bulleted_list_item: { rich_text: [{ text: { content: text } }] } });
      } else if (line.trim()) {
        blocks.push({ paragraph: { rich_text: [{ text: { content: line } }] } });
      }
    }
    return blocks;
  }

  async uploadImage(imageData) {
    if (!this.imgbbKey) {
      throw new Error('Clé ImgBB non configurée');
    }
    try {
      const formData = new FormData();
      formData.append('key', this.imgbbKey);
      if (imageData.startsWith('data:image')) {
        const base64Data = imageData.split(',')[1];
        formData.append('image', base64Data);
      } else {
        formData.append('image', imageData);
      }
      const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
      const result = await response.json();
      if (result.success) {
        return { success: true, url: result.data.url, deleteUrl: result.data.delete_url };
      } else {
        throw new Error('Upload échoué');
      }
    } catch (error) {
      console.error('Erreur upload image:', error);
      throw error;
    }
  }

  extractTitle(titleProperty) {
    if (!titleProperty?.title?.length) return '';
    return titleProperty.title[0]?.plain_text || '';
  }

  splitTextIntoChunks(text, maxLength) {
    const chunks = [];
    let currentChunk = '';
    const words = text.split(' ');
    for (const word of words) {
      if ((currentChunk + ' ' + word).length > maxLength) {
        chunks.push(currentChunk.trim());
        currentChunk = word;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + word;
      }
    }
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    return chunks;
  }

  isMarkdown(text) {
    const patterns = [
      /^#{1,6}\s+/m,
      /^\*{1,2}[^*]+\*{1,2}/m,
      /^\[\[.*\]\]/m,
      /^[\*\-]\s+/m
    ];
    return patterns.some(pattern => pattern.test(text));
  }

  getStats() {
    return { ...this.stats, cacheSize: this.cache.keys().length };
  }
}

module.exports = NotionBackend;


