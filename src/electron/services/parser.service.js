const hljs = require('highlight.js');
const { Worker } = require('worker_threads');
const path = require('path');

class ParserService {
  constructor() {
    // TOUS les patterns du backend Python
    this.patterns = {
      youtube: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/,
      vimeo: /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/,
      twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
      github_gist: /(?:https?:\/\/)?gist\.github\.com\/[\w-]+\/([\w]+)/,
      codepen: /(?:https?:\/\/)?codepen\.io\/[\w-]+\/pen\/([\w]+)/,
      spotify: /(?:https?:\/\/)?open\.spotify\.com\/(track|album|playlist)\/([\w]+)/,
      soundcloud: /(?:https?:\/\/)?soundcloud\.com\/[\w-]+\/[\w-]+/,
      google_docs: /(?:https?:\/\/)?docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([\w-]+)/,
      figma: /(?:https?:\/\/)?(?:www\.)?figma\.com\/file\/([\w]+)/,
      miro: /(?:https?:\/\/)?miro\.com\/app\/board\/([\w=]+)/,
      loom: /(?:https?:\/\/)?(?:www\.)?loom\.com\/share\/([\w]+)/,
      notion: /(?:https?:\/\/)?(?:www\.)?notion\.(?:so|site)\/([\w-]+)\/([\w-]+)/,
      dropbox: /(?:https?:\/\/)?(?:www\.)?dropbox\.com\/s\/([\w]+)/,
      google_drive: /(?:https?:\/\/)?drive\.google\.com\/file\/d\/([\w-]+)/,
      imgur: /(?:https?:\/\/)?(?:i\.)?imgur\.com\/([\w]+)(?:\.[\w]+)?/,
      instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/p\/([\w-]+)/,
      linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/posts?\/([\w-]+)/,
      medium: /(?:https?:\/\/)?(?:[\w-]+\.)?medium\.com\/([\w@-]+)\/([\w-]+)/,
      reddit: /(?:https?:\/\/)?(?:www\.)?reddit\.com\/r\/[\w]+\/comments\/([\w]+)/,
      tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.]+\/video\/([\d]+)/
    };

    // Pool de workers pour parsing intensif
    this.workerPool = [];
    this.maxWorkers = 4;
    this.initWorkerPool();

    // Détecteurs de format (comme Python)
    this.formatDetectors = {
      image: (content) => this.isImage(content),
      video: (content) => this.isVideo(content),
      audio: (content) => this.isAudio(content),
      table: (content) => this.isTable(content),
      code: (content) => this.isCode(content),
      url: (content) => this.isUrl(content),
      markdown: (content) => this.isMarkdown(content),
      json: (content) => this.isJson(content),
      csv: (content) => this.isCsv(content),
      xml: (content) => this.isXml(content),
      html: (content) => this.isHtml(content)
    };

    this.embedHandlers = {
      youtube: (url) => this.createYouTubeEmbed(url),
      twitter: (url) => this.createTwitterEmbed(url),
      github_gist: (url) => this.createGistEmbed(url),
      // ... autres handlers à ajouter
    };
  }

  // Parser principal (comme Python parse_content)
  async parseContent(content, options = {}) {
    const { type = 'auto', parseAsMarkdown = true, maxBlocks = 100 } = options;
    // Détection du type si auto
    const contentType = type === 'auto' ? this.detectContentType(content) : type;
    // Parser selon le type
    switch (contentType) {
      case 'markdown':
        return this.parseMarkdown(content);
      case 'code':
        return this.parseCode(content);
      case 'table':
        return this.parseTable(content);
      case 'url':
        return this.parseUrl(content);
      case 'image':
        return this.parseImage(content);
      default:
        return this.parseText(content);
    }
  }

  // Détection du type de contenu (comme Python)
  detectContentType(content) {
    if (!content || typeof content !== 'string') return 'text';
    
    const trimmed = content.trim();

    // Parcourir tous les détecteurs
    for (const [type, detector] of Object.entries(this.formatDetectors)) {
      if (detector(trimmed)) {
        return type;
      }
    }

    return 'text';
  }

  // Détecteurs de format (comme Python)
  isImage(content) {
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff?)$/i;
    const imageDataUrl = /^data:image\//;
    
    return imageExtensions.test(content) || imageDataUrl.test(content);
  }

  isVideo(content) {
    const videoPatterns = [
      this.patterns.youtube,
      this.patterns.vimeo,
      /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)$/i
    ];
    
    return videoPatterns.some(pattern => pattern.test(content));
  }

  isAudio(content) {
    const audioPatterns = [
      this.patterns.spotify,
      this.patterns.soundcloud,
      /\.(mp3|wav|ogg|m4a|flac|aac|wma)$/i
    ];
    
    return audioPatterns.some(pattern => pattern.test(content));
  }

  isTable(content) {
    const lines = content.split('\n');
    
    // Détecter tables avec séparateurs
    if (lines.length > 1) {
      // TSV
      const tabCounts = lines.map(line => (line.match(/\t/g) || []).length);
      if (tabCounts.length > 1 && tabCounts.every(count => count === tabCounts[0] && count > 0)) {
        return true;
      }
      
      // Markdown table
      if (lines.some(line => /^\|.*\|$/.test(line.trim()))) {
        return true;
      }
    }
    
    return false;
  }

  isCode(content) {
    // Patterns de détection de code (comme Python)
    const codePatterns = [
      /^```[\s\S]*```$/m,  // Code blocks
      /^(function|const|let|var|class|import|export)\s/m,  // JS
      /^(def|class|import|from|if|for|while)\s/m,  // Python
      /^(public|private|protected|static)\s/m,  // Java/C#
      /^#include\s|^using\s/m,  // C/C++
      /^package\s|^func\s/m,  // Go
      /^fn\s|^let\s+mut\s/m,  // Rust
      /\{[\s\S]*\}/,  // Bloc de code
      /\[[\s\S]*\]/  // Array/List
    ];
    
    return codePatterns.some(pattern => pattern.test(content));
  }

  isUrl(content) {
    return /^https?:\/\/[^\s]+$/i.test(content);
  }

  isMarkdown(content) {
    const markdownPatterns = [
      /^#{1,6}\s/m,  // Headers
      /^\*\s|^-\s|^\+\s|^\d+\.\s/m,  // Lists
      /\*\*[^*]+\*\*/,  // Bold
      /\*[^*]+\*/,  // Italic
      /\[[^\]]+\]\([^)]+\)/,  // Links
      /!\[[^\]]*\]\([^)]+\)/,  // Images
      /^>\s/m,  // Quotes
      /```[\s\S]*```/,  // Code blocks
      /^\|.*\|$/m  // Tables
    ];
    
    return markdownPatterns.some(pattern => pattern.test(content));
  }

  isCsv(content) {
    return /^[^,\n]+,[^,\n]+/.test(content) && content.includes('\n');
  }

  isXml(content) {
    return /^<\?xml/.test(content) || /^<[^>]+>.*<\/[^^>]+>$/s.test(content);
  }

  isHtml(content) {
    return /<html|<body|<div|<p|<span|<h[1-6]/.test(content);
  }

  isJson(content) {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }

  parseTable(content) {
    const rows = content.trim().split('\n').map(row => 
      row.split(/\s*\|\s*/).filter(cell => cell)
    );
    if (rows.length < 2) return this.parseText(content);
    return [{
      type: 'table',
      table: {
        table_width: rows[0].length,
        has_column_header: true,
        has_row_header: false,
        children: rows.map((row, i) => ({
          type: 'table_row',
          table_row: {
            cells: row.map(cell => [{
              type: 'text',
              text: { content: cell },
              plain_text: cell
            }])
          }
        }))
      }
    }];
  }

  parseImage(content) {
    const url = content.trim();
    return [{
      type: 'image',
      image: {
        type: 'external',
        external: { url }
      }
    }];
  }

  // Méthode pour détecter les éléments Markdown
  hasMarkdownElements(content) {
    return this.isMarkdown(content);
  }

  // Parsers spécifiques (comme Python)
  async parseMarkdown(content) {
    const marked = require('marked');
    const blocks = [];
    // Configurer marked
    const renderer = new marked.Renderer();
    const tokens = marked.lexer(content);
    for (const token of tokens) {
      switch (token.type) {
        case 'heading':
          blocks.push({
            type: `heading_${token.depth}`,
            [`heading_${token.depth}`]: {
              rich_text: [{ type: 'text', text: { content: token.text } }]
            }
          });
          break;
        case 'paragraph':
          blocks.push({
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: token.text } }]
            }
          });
          break;
        case 'code':
          blocks.push({
            type: 'code',
            code: {
              caption: [],
              rich_text: [{ type: 'text', text: { content: token.text } }],
              language: token.lang || 'plain text'
            }
          });
          break;
        case 'list':
          for (const item of token.items) {
            blocks.push({
              type: token.ordered ? 'numbered_list_item' : 'bulleted_list_item',
              [token.ordered ? 'numbered_list_item' : 'bulleted_list_item']: {
                rich_text: [{ type: 'text', text: { content: item.text } }]
              }
            });
          }
          break;
        case 'blockquote':
          blocks.push({
            type: 'quote',
            quote: {
              rich_text: [{ type: 'text', text: { content: token.text } }]
            }
          });
          break;
        case 'table':
          blocks.push(this.createTableBlock(token));
          break;
      }
    }
    return blocks;
  }

  parseCode(content, language) {
    // Limiter la taille du code (comme Python)
    const MAX_CODE_LENGTH = 2000;
    const truncatedCode = content.length > MAX_CODE_LENGTH 
      ? content.substring(0, MAX_CODE_LENGTH) + '...' 
      : content;

    // Détecter le langage si non fourni
    if (!language) {
      language = this.detectCodeLanguage(content);
    }

    return [{
      type: 'code',
      code: {
        rich_text: [{
          type: 'text',
          text: { content: truncatedCode }
        }],
        language: this.normalizeLanguage(language)
      }
    }];
  }

  parseCsv(content) {
    // Similaire à parseTable mais avec détection CSV spécifique
    const lines = content.split('\n').filter(line => line.trim());
    if (!lines.length) return [];
    
    // Parser CSV (gérer les quotes, etc.)
    const rows = lines.map(line => this.parseCsvLine(line));
    
    // Convertir en table Notion
    return this.createTableFromRows(rows);
  }

  parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result.map(cell => cell.trim());
  }

  parseVideo(content) {
    // Vérifier YouTube
    const youtubeMatch = content.match(this.patterns.youtube);
    if (youtubeMatch) {
      return [{
        type: 'video',
        video: {
          type: 'external',
          external: { url: `https://www.youtube.com/watch?v=${youtubeMatch[1]}` }
        }
      }];
    }
    
    // Vimeo
    const vimeoMatch = content.match(this.patterns.vimeo);
    if (vimeoMatch) {
      return [{
        type: 'video',
        video: {
          type: 'external',
          external: { url: `https://vimeo.com/${vimeoMatch[1]}` }
        }
      }];
    }
    
    // Vidéo directe
    return [{
      type: 'video',
      video: {
        type: 'external',
        external: { url: content.trim() }
      }
    }];
  }

  parseJson(content) {
    try {
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);
      
      return this.parseCode(formatted, 'json');
    } catch {
      return this.parseText(content);
    }
  }

  parseHtml(content) {
    // Extraire le texte du HTML
    const textContent = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return this.parseText(textContent);
  }

  parseText(content, preserveFormatting = true) {
    if (!preserveFormatting) {
      return [{
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: content.trim() }
          }]
        }
      }];
    }

    // Préserver les sauts de ligne
    const paragraphs = content.split(/\n\n+/);
    return paragraphs.filter(p => p.trim()).map(para => ({
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          type: 'text',
          text: { content: para.trim() }
        }]
      }
    }));
  }

  // Méthodes utilitaires
  detectTableSeparator(firstLine) {
    const separators = ['\t', '|', ',', ';'];
    
    for (const sep of separators) {
      if (firstLine.includes(sep)) {
        const count = (firstLine.match(new RegExp(sep, 'g')) || []).length;
        if (count > 0) return sep;
      }
    }
    
    return null;
  }

  detectCodeLanguage(code) {
    // Détection de langage (comme Python)
    const patterns = {
      javascript: [/function\s+\w+\s*\(/, /const\s+\w+\s*=/, /=>\s*{/, /console\.log/],
      python: [/def\s+\w+\s*\(/, /import\s+\w+/, /if\s+__name__\s*==/, /print\s*\(/],
      java: [/public\s+class/, /private\s+\w+/, /System\.out\.println/, /import\s+java\./],
      csharp: [/public\s+class/, /namespace\s+\w+/, /Console\.WriteLine/, /using\s+System/],
      cpp: [/#include\s*</, /std::/, /cout\s*<</, /int\s+main\s*\(/],
      html: [/<html/, /<body/, /<div/, /<\/\w+>/],
      css: [/\.\w+\s*{/, /#\w+\s*{/, /:\s*\w+;/],
      sql: [/SELECT\s+/i, /FROM\s+/i, /WHERE\s+/i, /INSERT\s+INTO/i],
      go: [/package\s+\w+/, /func\s+\w+\s*\(/, /import\s+"/],
      rust: [/fn\s+\w+\s*\(/, /let\s+mut\s+/, /impl\s+/],
      typescript: [/interface\s+\w+/, /type\s+\w+\s*=/, /:\s*\w+\[\]/, /export\s+/]
    };
    
    for (const [lang, langPatterns] of Object.entries(patterns)) {
      for (const pattern of langPatterns) {
        if (pattern.test(code)) {
          return lang;
        }
      }
    }
    
    return 'plain text';
  }

  normalizeLanguage(lang) {
    const languageMap = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'sh': 'shell',
      'yml': 'yaml',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'sql': 'sql',
      'md': 'markdown',
      'c++': 'cpp',
      'c#': 'csharp',
      'objective-c': 'objc',
      'r': 'r',
      'kt': 'kotlin',
      'swift': 'swift',
      'php': 'php',
      'perl': 'perl',
      'lua': 'lua',
      'dart': 'dart',
      'scala': 'scala',
      'haskell': 'haskell',
      'clojure': 'clojure',
      'elixir': 'elixir'
    };

    return languageMap[lang] || lang || 'plain text';
  }

  // Convertir un token Markdown en bloc Notion
  tokenToNotionBlock(token) {
    switch (token.type) {
      case 'heading':
        return this.createHeadingBlock(token.text, token.depth);
      
      case 'paragraph':
        return this.createParagraphBlock(token.text);
      
      case 'list':
        return this.createListBlocks(token.items, token.ordered);
      
      case 'blockquote':
        return this.createQuoteBlock(token.text);
      
      case 'code':
        return this.createCodeBlock(token.text, token.lang);
      
      case 'table':
        return this.createTableBlock(token);
      
      case 'hr':
        return this.createDividerBlock();
      
      case 'image':
        return this.createImageBlock(token.href, token.text);
        
      case 'link':
        return this.createLinkBlock(token.href, token.text);
      
      default:
        return null;
    }
  }

  // Créer les différents types de blocs
  createHeadingBlock(text, level) {
    const type = level === 1 ? 'heading_1' : level === 2 ? 'heading_2' : 'heading_3';
    
    return {
      type,
      [type]: {
        rich_text: this.parseInlineContent(text),
        color: 'default'
      }
    };
  }

  createParagraphBlock(text) {
    return {
      type: 'paragraph',
      paragraph: {
        rich_text: this.parseInlineContent(text),
        color: 'default'
      }
    };
  }

  createListBlocks(items, ordered) {
    return items.map(item => ({
      type: ordered ? 'numbered_list_item' : 'bulleted_list_item',
      [ordered ? 'numbered_list_item' : 'bulleted_list_item']: {
        rich_text: this.parseInlineContent(item.text),
        color: 'default'
      }
    }));
  }

  createQuoteBlock(text) {
    return {
      type: 'quote',
      quote: {
        rich_text: this.parseInlineContent(text),
        color: 'default'
      }
    };
  }

  createCodeBlock(code, language = 'plain text') {
    const MAX_CODE_LENGTH = 2000;
    const truncatedCode = code.length > MAX_CODE_LENGTH 
      ? code.substring(0, MAX_CODE_LENGTH) + '...' 
      : code;

    return {
      type: 'code',
      code: {
        rich_text: [{
          type: 'text',
          text: { content: truncatedCode }
        }],
        language: this.normalizeLanguage(language)
      }
    };
  }

  createTableBlock(tableToken) {
    const rows = [];
    // Header
    if (tableToken.header) {
      rows.push(tableToken.header.map(cell => [{
        type: 'text',
        text: { content: cell }
      }]));
    }
    // Body
    for (const row of tableToken.rows) {
      rows.push(row.map(cell => [{
        type: 'text',
        text: { content: cell }
      }]));
    }
    return {
      type: 'table',
      table: {
        table_width: tableToken.header ? tableToken.header.length : 0,
        has_column_header: true,
        has_row_header: false,
        children: rows.map(row => ({
          type: 'table_row',
          table_row: { cells: row }
        }))
      }
    };
  }

  createDividerBlock() {
    return {
      type: 'divider',
      divider: {}
    };
  }

  createImageBlock(url, alt) {
    return {
      type: 'image',
      image: {
        type: 'external',
        external: { url },
        caption: alt ? [{
          type: 'text',
          text: { content: alt }
        }] : []
      }
    };
  }

  createLinkBlock(url, text) {
    return {
      type: 'bookmark',
      bookmark: { 
        url,
        caption: text ? [{
          type: 'text',
          text: { content: text }
        }] : []
      }
    };
  }

  createTableFromRows(rows) {
    if (!rows.length) return [];
    
    const maxCols = Math.max(...rows.map(row => row.length));
    
    // Normaliser et limiter
    const normalizedRows = rows
      .map(row => {
        while (row.length < maxCols) {
          row.push('');
        }
        return row.slice(0, maxCols);
      })
      .slice(0, 100); // Limite Notion
    
    return [{
      type: 'table',
      table: {
        table_width: maxCols,
        has_column_header: true,
        has_row_header: false,
        children: normalizedRows.map((row, rowIndex) => ({
          type: 'table_row',
          table_row: {
            cells: row.map(cell => [{
              type: 'text',
              text: { content: cell },
              annotations: rowIndex === 0 ? { bold: true } : {}
            }])
          }
        }))
      }
    }];
  }

  // Parser le contenu inline (gras, italique, liens, etc.)
  parseInlineContent(text) {
    // Pour l'instant, version simplifiée
    // TODO: Implémenter le parsing complet des annotations inline
    return [{
      type: 'text',
      text: { content: text }
    }];
  }

  // Worker pool pour parsing lourd
  initWorkerPool() {
    for (let i = 0; i < this.maxWorkers; i++) {
      this.createWorker();
    }
  }

  createWorker() {
    const worker = new Worker(
      path.join(__dirname, '../workers/parser.worker.js')
    );
    
    worker.busy = false;
    this.workerPool.push(worker);
    
    worker.on('error', (error) => {
      console.error('Worker error:', error);
      const index = this.workerPool.indexOf(worker);
      if (index > -1) {
        this.workerPool.splice(index, 1);
        this.createWorker();
      }
    });
  }

  async parseHeavyContent(content, type, options = {}) {
    const worker = this.workerPool.find(w => !w.busy);
    
    if (!worker) {
      console.warn('No worker available, using main thread');
      return this.parseContent(content, options);
    }

    return new Promise((resolve, reject) => {
      worker.busy = true;
      
      const timeout = setTimeout(() => {
        worker.busy = false;
        reject(new Error('Worker timeout'));
      }, 30000);

      worker.once('message', (result) => {
        clearTimeout(timeout);
        worker.busy = false;
        
        if (result.success) {
          resolve(result.result);
        } else {
          reject(new Error(result.error));
        }
      });

      worker.postMessage({ content, type, options });
    });
  }

  async generateUrlPreview(url) {
    try {
      const response = await fetch(url);
      const html = await response.text();
      // Extraire les meta tags
      const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
      const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
      const imageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i);
      return {
        url,
        title: titleMatch ? titleMatch[1] : url,
        description: descMatch ? descMatch[1] : '',
        image: imageMatch ? imageMatch[1] : null,
        domain: new URL(url).hostname
      };
    } catch (error) {
      throw new Error(`Failed to preview URL: ${error.message}`);
    }
  }

  // Exemples de handlers d'embed (à compléter)
  createYouTubeEmbed(url) {
    return [{
      type: 'embed',
      embed: { url }
    }];
  }
  createTwitterEmbed(url) {
    return [{
      type: 'embed',
      embed: { url }
    }];
  }
  createGistEmbed(url) {
    return [{
      type: 'embed',
      embed: { url }
    }];
  }

  // Cleanup
  destroy() {
    this.workerPool.forEach(worker => {
      worker.terminate();
    });
    this.workerPool = [];
  }
}

module.exports = new ParserService();