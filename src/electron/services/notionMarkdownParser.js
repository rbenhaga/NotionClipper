const contentDetector = require('./contentDetector');

class NotionMarkdownParser {
  constructor() {
    this.patterns = {
      h1: /^#\s+(.+)$/m,
      h2: /^##\s+(.+)$/m,
      h3: /^###\s+(.+)$/m,
      h4to6: /^#{4,6}\s+(.+)$/m,
      bold: /\*\*([^*]+)\*\*/g,
      italic: /(?<!\*)\*([^*]+)\*(?!\*)/g,
      boldItalic: /\*\*\*([^*]+)\*\*\*/g,
      strikethrough: /~([^~]+)~/g,
      code: /`([^`]+)`/g,
      bulletList: /^[\*\-\+]\s+(.+)$/m,
      numberedList: /^\d+\.\s+(.+)$/m,
      checkbox: /^-\s*\[([ x])\]\s+(.+)$/m,
      quote: /^"\s+(.+)$/m,
      toggle: /^>\s+(.+)$/m,
      divider: /^---+$/m,
      codeBlock: /```(\w*)\n([\s\S]*?)```/g,
      link: /\[([^\]]+)\]\(([^)]+)\)/g,
      image: /!\[([^\]]*)\]\(([^)]+)\)/g,
      inlineEquation: /\$\$([^$]+)\$\$/g,
      blockEquation: /^\$\$([\s\S]+?)\$\$$/m,
      table: /^\|(.+)\|$/m,
      tableDelimiter: /^\|[-:\s|]+\|$/m,
      url: /https?:\/\/[^\s<]+/g,
      email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    };
    this.limits = {
      maxRichTextLength: 2000,
      maxBlocksPerRequest: 100,
      maxEquationLength: 1000,
      maxUrlLength: 2000
    };
    this.handlers = {
      markdown: this.markdownToNotionBlocks.bind(this),
      text: this.textToNotionBlocks.bind(this),
      code: this.codeToNotionBlocks.bind(this),
      url: this.urlToNotionBlocks.bind(this),
      image: this.imageToNotionBlocks.bind(this),
      table: this.tableToNotionBlocks.bind(this),
      csv: this.csvToNotionBlocks.bind(this),
      json: this.jsonToNotionBlocks.bind(this),
      html: this.htmlToNotionBlocks.bind(this),
      xml: this.xmlToNotionBlocks.bind(this)
    };
  }

  async parse(content, options = {}) {
    const { type = 'auto', forceType = null } = options;
    const detection = forceType || (type === 'auto' ? contentDetector.detect(content) : { type, subtype: null });
    const handler = this.handlers[detection.type] || this.handlers['text'];
    return await handler(content, detection);
  }

  async contentToNotionBlocks(content, contentType) {
    const handler = this.handlers[contentType] || this.handlers['text'];
    return await handler(content);
  }

  markdownToNotionBlocks(markdown) {
    const blocks = [];
    const lines = markdown.split('\n');
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      const next = lines.slice(i);
      let consumed = 1;
      let block = null;
      
      if (line.startsWith('```')) {
        const { block: b, linesConsumed } = this.parseCodeBlock(next);
        block = b;
        consumed = linesConsumed || 1;
      } else if (line.startsWith('$$') && !line.endsWith('$$')) {
        const { block: b, linesConsumed } = this.parseBlockEquation(next);
        block = b;
        consumed = linesConsumed || 1;
      } else if (this.patterns.table.test(line) && i + 1 < lines.length && this.patterns.tableDelimiter.test(lines[i + 1])) {
        const { block: b, linesConsumed } = this.parseTable(next);
        block = b;
        consumed = linesConsumed || 1;
      } else {
        block = this.parseSingleLine(line);
        consumed = 1;
      }
      
      if (block) blocks.push(block);
      i += consumed;
    }
    
    return this.optimizeBlocks(blocks);
  }

  parseSingleLine(line) {
    if (!line.trim()) return null;
    if (this.patterns.divider.test(line)) return { type: 'divider', divider: {} };
    
    let m;
    if (m = line.match(this.patterns.h1)) return { type: 'heading_1', heading_1: { rich_text: this.parseRichText(m[1]) } };
    if (m = line.match(this.patterns.h2)) return { type: 'heading_2', heading_2: { rich_text: this.parseRichText(m[1]) } };
    if (m = line.match(this.patterns.h3) || line.match(this.patterns.h4to6)) return { type: 'heading_3', heading_3: { rich_text: this.parseRichText((m && m[1]) || '') } };
    if (m = line.match(this.patterns.checkbox)) return { type: 'to_do', to_do: { rich_text: this.parseRichText(m[2]), checked: m[1] === 'x' } };
    if (m = line.match(this.patterns.bulletList)) return { type: 'bulleted_list_item', bulleted_list_item: { rich_text: this.parseRichText(m[1]) } };
    if (m = line.match(this.patterns.numberedList)) return { type: 'numbered_list_item', numbered_list_item: { rich_text: this.parseRichText(m[1]) } };
    if (m = line.match(this.patterns.quote)) return { type: 'quote', quote: { rich_text: this.parseRichText(m[1]) } };
    if (m = line.match(this.patterns.toggle)) return { type: 'toggle', toggle: { rich_text: this.parseRichText(m[1]) } };
    
    return { type: 'paragraph', paragraph: { rich_text: this.parseRichText(line) } };
  }

  parseRichText(text) {
    if (!text) return [];
    if (text.length > this.limits.maxRichTextLength) {
      text = text.substring(0, this.limits.maxRichTextLength);
    }
    return [{ type: 'text', text: { content: text } }];
  }

  parseCodeBlock(lines) {
    if (!lines[0].startsWith('```')) return { block: null, linesConsumed: 0 };
    
    const language = lines[0].replace('```', '').trim();
    let body = [];
    let consumed = 1;
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '```') {
        consumed = i + 1;
        break;
      }
      body.push(lines[i]);
    }
    
    return {
      block: {
        type: 'code',
        code: {
          rich_text: [{ type: 'text', text: { content: body.join('\n').substring(0, this.limits.maxRichTextLength) } }],
          language: this.normalizeLanguage(language) || 'plain text'
        }
      },
      linesConsumed: consumed
    };
  }

  parseTable(lines) {
    if (!lines || lines.length < 2) return { block: null, linesConsumed: 0 };
    if (!this.patterns.table.test(lines[0]) || !this.patterns.tableDelimiter.test(lines[1])) {
      return { block: null, linesConsumed: 0 };
    }

    const collected = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!this.patterns.table.test(line)) break;
      collected.push(line);
    }

    const markdown = collected.join('\n');
    const cleanedLines = markdown.trim().split('\n').filter(line => line.trim());
    if (cleanedLines.length < 2) return { block: null, linesConsumed: 0 };

    const parseRow = (line) => line.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0);

    const headers = parseRow(cleanedLines[0]);
    const tableWidth = headers.length;
    const rows = [];
    for (let i = 2; i < cleanedLines.length; i++) {
      const cells = parseRow(cleanedLines[i]);
      while (cells.length < tableWidth) cells.push('');
      if (cells.length > tableWidth) cells.length = tableWidth;
      rows.push(cells);
    }

    const tableData = { headers, rows, tableWidth };
    const blocks = this.tableToNotionBlocks(tableData);
    return { block: blocks[0], linesConsumed: collected.length };
  }

  parseBlockEquation(lines) {
    if (!lines[0].startsWith('$$')) return { block: null, linesConsumed: 0 };
    
    let eq = [];
    let consumed = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (i > 0 && l.endsWith('$$')) {
        eq.push(l.replace(/\$\$$/, ''));
        consumed = i + 1;
        break;
      }
      eq.push(i === 0 ? l.replace(/^\$\$/, '') : l);
    }
    
    const expression = eq.join('\n').trim();
    return {
      block: {
        type: 'equation',
        equation: {
          expression: expression.substring(0, this.limits.maxEquationLength)
        }
      },
      linesConsumed: consumed
    };
  }

  textToNotionBlocks(text) {
    if (this.hasMarkdownElements(text)) return this.markdownToNotionBlocks(text);
    const chunks = this.splitIntoChunks(text, this.limits.maxRichTextLength);
    return chunks.map(chunk => ({ type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: chunk } }] } }));
  }

  codeToNotionBlocks(content, detection) {
    const language = this.normalizeLanguage(detection?.subtype || 'plain text');
    if (content.startsWith('```')) {
      const lines = content.split('\n');
      const lang = this.normalizeLanguage(lines[0].replace('```', '').trim() || language);
      const code = lines.slice(1, -1).join('\n');
      return [{ type: 'code', code: { rich_text: [{ type: 'text', text: { content: code.substring(0, this.limits.maxRichTextLength) } }], language: lang } }];
    }
    return [{ type: 'code', code: { rich_text: [{ type: 'text', text: { content: content.substring(0, this.limits.maxRichTextLength) } }], language } }];
  }

  urlToNotionBlocks(url, detection) {
    const blocks = [];
    if (detection?.subtype === 'youtube') {
      blocks.push({ type: 'callout', callout: { rich_text: [{ type: 'text', text: { content: '📹 Vidéo YouTube' } }], icon: { emoji: '📹' }, color: 'red_background' } });
    }
    blocks.push({ type: 'bookmark', bookmark: { url: url.substring(0, this.limits.maxUrlLength), caption: [] } });
    return blocks;
  }

  async imageToNotionBlocks(content) {
    console.log('🖼️ imageToNotionBlocks appelé');
    console.log('   Type:', typeof content);
    console.log('   Est Buffer?', Buffer.isBuffer(content));
    console.log('   Taille:', Buffer.isBuffer(content) ? `${(content.length / 1024).toFixed(2)} KB` : 'N/A');
    
    // 1. URL externe (http/https)
    if (typeof content === 'string' && content.startsWith('http')) {
      console.log('✅ Image externe URL');
      return [{
        type: 'image',
        image: {
          type: 'external',
          external: { url: content }
        }
      }];
    }

    // 2. Data URL (data:image/...) - à convertir en Buffer
    if (typeof content === 'string' && content.startsWith('data:image')) {
      console.log('🔄 Conversion data URL → Buffer pour upload...');
      
      try {
        // Extraire le base64
        const parts = content.split(',');
        if (parts.length !== 2) {
          throw new Error('Data URL malformé');
        }
        
        const base64Data = parts[1];
        const imageBuffer = Buffer.from(base64Data, 'base64');
        console.log(`📊 Buffer créé: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
        
        // Upload via Notion API
        const imageService = require('./image.service');
        const fileUploadId = await imageService.uploadToNotion(imageBuffer, 'screenshot.png');
        
        console.log('✅ Image uploadée avec succès, ID:', fileUploadId);
        
        return [{
          type: 'image',
          image: {
            type: 'file_upload',
            file_upload: {
              id: fileUploadId
            }
          }
        }];
      } catch (error) {
        console.error('❌ Erreur conversion data URL:', error);
        throw new Error(`Échec conversion image: ${error.message}`);
      }
    }

    // 3. Buffer direct (cas idéal)
    if (Buffer.isBuffer(content)) {
      console.log(`📊 Buffer détecté: ${(content.length / 1024).toFixed(2)} KB`);
      
      try {
        const imageService = require('./image.service');
        const fileUploadId = await imageService.uploadToNotion(content, 'image.png');
        
        console.log('✅ Image uploadée avec succès, ID:', fileUploadId);
        
        return [{
          type: 'image',
          image: {
            type: 'file_upload',
            file_upload: {
              id: fileUploadId
            }
          }
        }];
      } catch (error) {
        console.error('❌ Erreur upload Buffer:', error);
        throw new Error(`Échec upload image: ${error.message}`);
      }
    }

    // 4. Format non reconnu
    console.warn('⚠️ Format d\'image non reconnu:', typeof content);
    return [];
  }

  tableToNotionBlocks(tableDataOrContent, detection) {
    // Backward compatibility for CSV path
    if (detection || typeof tableDataOrContent === 'string') {
      const content = String(tableDataOrContent);
      const delimiter = detection?.subtype === 'csv' ? ',' : '\t';
      const lines = content.split('\n').filter(l => l.trim());
      if (lines.length < 2) return this.textToNotionBlocks(content);
      const rows = lines.map(line => line.split(delimiter).map(cell => cell.trim()));
      const headers = rows[0];
      const tableWidth = headers.length;
      const body = rows.slice(1).map(r => {
        const normalized = [...r];
        while (normalized.length < tableWidth) normalized.push('');
        if (normalized.length > tableWidth) normalized.length = tableWidth;
        return normalized;
      });
      return this.tableToNotionBlocks({ headers, rows: body, tableWidth });
    }

    const { headers, rows, tableWidth } = tableDataOrContent;
    const blocks = [{
      type: 'table',
      table: {
        table_width: tableWidth,
        has_column_header: true,
        has_row_header: false,
        children: []
      }
    }];

    const headerCells = headers.map(header => ([{
      type: 'text',
      text: { content: header }
    }]));

    blocks[0].table.children.push({
      type: 'table_row',
      table_row: { cells: headerCells }
    });

    for (const row of rows) {
      const normalizedRow = [...row];
      while (normalizedRow.length < tableWidth) normalizedRow.push('');
      if (normalizedRow.length > tableWidth) normalizedRow.length = tableWidth;
      const cells = normalizedRow.map(cell => ([{
        type: 'text',
        text: { content: cell || '' }
      }]));
      blocks[0].table.children.push({
        type: 'table_row',
        table_row: { cells }
      });
    }

    return blocks;
  }

  csvToNotionBlocks(content) {
    return this.tableToNotionBlocks(content, { subtype: 'csv' });
  }

  jsonToNotionBlocks(content) {
    try {
      const json = JSON.parse(content);
      const formatted = JSON.stringify(json, null, 2);
      return [{ type: 'code', code: { rich_text: [{ type: 'text', text: { content: formatted.substring(0, this.limits.maxRichTextLength) } }], language: 'json' } }];
    } catch {
      return this.textToNotionBlocks(content);
    }
  }

  htmlToNotionBlocks(html) {
    const text = html.replace(/<br\s*\/?>(?=\n)?/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<\/div>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    return this.hasMarkdownElements(text) ? this.markdownToNotionBlocks(text) : this.textToNotionBlocks(text);
  }

  xmlToNotionBlocks(xml) {
    return [{ type: 'code', code: { rich_text: [{ type: 'text', text: { content: xml.substring(0, this.limits.maxRichTextLength) } }], language: 'xml' } }];
  }

  hasMarkdownElements(text) {
    const patterns = [/^#{1,6}\s/m, /\*\*[^*]+\*\*/, /\[[^\]]+\]\([^)]+\)/, /^[\*\-\+]\s/m, /```/];
    return patterns.some(p => p.test(text));
  }

  splitIntoChunks(text, maxLength) {
    const chunks = [];
    let current = '';
    const words = text.split(/\s+/);
    
    for (const word of words) {
      if ((current + ' ' + word).length > maxLength) {
        if (current) chunks.push(current.trim());
        current = word;
      } else {
        current += (current ? ' ' : '') + word;
      }
    }
    
    if (current) chunks.push(current.trim());
    return chunks;
  }

  normalizeLanguage(lang) {
    const map = {
      js: 'javascript',
      ts: 'typescript',
      py: 'python',
      rb: 'ruby',
      sh: 'shell',
      bash: 'shell',
      yml: 'yaml',
      json: 'json',
      html: 'html',
      css: 'css',
      sql: 'sql',
      md: 'markdown',
      'c++': 'c++',
      'c#': 'c#',
      'objective-c': 'objective-c',
      php: 'php',
      go: 'go',
      rust: 'rust',
      kotlin: 'kotlin',
      swift: 'swift'
    };
    const n = lang?.toLowerCase();
    return map[n] || n || 'plain text';
  }

  optimizeBlocks(blocks) {
    if (blocks.length > this.limits.maxBlocksPerRequest) {
      blocks = blocks.slice(0, this.limits.maxBlocksPerRequest);
    }
    return blocks.filter(Boolean);
  }
}

module.exports = new NotionMarkdownParser();
