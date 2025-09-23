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
    this.limits = { maxRichTextLength: 2000, maxBlocksPerRequest: 100, maxEquationLength: 1000, maxUrlLength: 2000 };
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
        block = b; consumed = linesConsumed || 1;
      } else if (line.startsWith('$$') && !line.endsWith('$$')) {
        const { block: b, linesConsumed } = this.parseBlockEquation(next);
        block = b; consumed = linesConsumed || 1;
      } else if (this.patterns.table.test(line) && i + 1 < lines.length && this.patterns.tableDelimiter.test(lines[i + 1])) {
        const { block: b, linesConsumed } = this.parseTable(next);
        block = b; consumed = linesConsumed || 1;
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
    if (text.length > this.limits.maxRichTextLength) text = text.substring(0, this.limits.maxRichTextLength);
    const segments = [];
    const matches = [];
    const formats = [
      { pattern: this.patterns.boldItalic, type: 'bold_italic' },
      { pattern: this.patterns.bold, type: 'bold' },
      { pattern: this.patterns.italic, type: 'italic' },
      { pattern: this.patterns.strikethrough, type: 'strikethrough' },
      { pattern: this.patterns.code, type: 'code' },
      { pattern: this.patterns.inlineEquation, type: 'equation' },
      { pattern: this.patterns.link, type: 'link' },
      { pattern: this.patterns.url, type: 'url' }
    ];
    for (const fmt of formats) {
      const regex = new RegExp(fmt.pattern);
      let m;
      while ((m = regex.exec(text)) !== null) {
        matches.push({ start: m.index, end: m.index + m[0].length, type: fmt.type, content: m[1] || m[0], url: m[2] });
      }
    }
    matches.sort((a, b) => a.start - b.start);
    let pos = 0;
    for (const m of matches) {
      if (m.start > pos) {
        const plain = text.substring(pos, m.start);
        if (plain) segments.push(this.createTextSegment(plain));
      }
      segments.push(this.createFormattedSegment(m));
      pos = m.end;
    }
    if (pos < text.length) segments.push(this.createTextSegment(text.substring(pos)));
    return segments.length > 0 ? segments : [this.createTextSegment(text)];
  }

  createFormattedSegment(match) {
    const segment = { type: 'text', text: { content: match.content }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } };
    switch (match.type) {
      case 'bold_italic': segment.annotations.bold = true; segment.annotations.italic = true; break;
      case 'bold': segment.annotations.bold = true; break;
      case 'italic': segment.annotations.italic = true; break;
      case 'strikethrough': segment.annotations.strikethrough = true; break;
      case 'code': segment.annotations.code = true; break;
      case 'equation': return { type: 'equation', equation: { expression: match.content.substring(0, this.limits.maxEquationLength) } };
      case 'link': segment.text.link = { url: (match.url || '').substring(0, this.limits.maxUrlLength) }; break;
      case 'url': segment.text.link = { url: match.content.substring(0, this.limits.maxUrlLength) }; break;
    }
    return segment;
  }

  createTextSegment(text) { return { type: 'text', text: { content: text }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }; }

  parseCodeBlock(lines) {
    if (!lines[0].startsWith('```')) return { block: null, linesConsumed: 0 };
    const language = lines[0].replace('```', '').trim();
    let body = [];
    let consumed = 1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '```') { consumed = i + 1; break; }
      body.push(lines[i]);
    }
    return { block: { type: 'code', code: { rich_text: [{ type: 'text', text: { content: body.join('\n').substring(0, this.limits.maxRichTextLength) } }], language: this.normalizeLanguage(language) || 'plain text' } }, linesConsumed: consumed };
  }

  // === Unified handlers ===
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

  imageToNotionBlocks(content) {
    if (typeof content === 'string' && content.startsWith('http')) {
      return [{ type: 'image', image: { type: 'external', external: { url: content } } }];
    }
    if (typeof content === 'string' && content.startsWith('data:image')) {
      return [{ type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: '🖼️ [Image à uploader]' } }] } }];
    }
    return [];
  }

  tableToNotionBlocks(content, detection) {
    const delimiter = detection?.subtype === 'csv' ? ',' : '\t';
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) return this.textToNotionBlocks(content);
    const rows = lines.map(line => line.split(delimiter).map(cell => cell.trim()));
    const maxCols = Math.min(rows[0].length, 100);
    const maxRows = Math.min(rows.length, 100);
    return [{ type: 'table', table: { table_width: maxCols, has_column_header: true, has_row_header: false, children: rows.slice(0, maxRows).map(row => ({ type: 'table_row', table_row: { cells: row.slice(0, maxCols).map(cell => this.parseRichText(cell).slice(0, 100)) } })) } }];
  }

  csvToNotionBlocks(content) { return this.tableToNotionBlocks(content, { subtype: 'csv' }); }

  jsonToNotionBlocks(content) {
    try { const json = JSON.parse(content); const formatted = JSON.stringify(json, null, 2);
      return [{ type: 'code', code: { rich_text: [{ type: 'text', text: { content: formatted.substring(0, this.limits.maxRichTextLength) } }], language: 'json' } }];
    } catch { return this.textToNotionBlocks(content); }
  }

  htmlToNotionBlocks(html) {
    const text = html.replace(/<br\s*\/?>(?=\n)?/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<\/div>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    return this.hasMarkdownElements(text) ? this.markdownToNotionBlocks(text) : this.textToNotionBlocks(text);
  }

  xmlToNotionBlocks(xml) { return [{ type: 'code', code: { rich_text: [{ type: 'text', text: { content: xml.substring(0, this.limits.maxRichTextLength) } }], language: 'xml' } }]; }

  // utils
  hasMarkdownElements(text) {
    const patterns = [/^#{1,6}\s/m, /\*\*[^*]+\*\*/, /\[[^\]]+\]\([^)]+\)/, /^[\*\-\+]\s/m, /```/];
    return patterns.some(p => p.test(text));
  }
  splitIntoChunks(text, maxLength) {
    const chunks = []; let current = ''; const words = text.split(/\s+/);
    for (const word of words) { if ((current + ' ' + word).length > maxLength) { if (current) chunks.push(current.trim()); current = word; } else { current += (current ? ' ' : '') + word; } }
    if (current) chunks.push(current.trim()); return chunks;
  }
  parseTable(lines) {
    if (!this.patterns.table.test(lines[0]) || !this.patterns.tableDelimiter.test(lines[1])) return { block: null, linesConsumed: 0 };
    const rows = [];
    let consumed = 0;
    for (const line of lines) {
      if (!this.patterns.table.test(line)) break;
      if (!this.patterns.tableDelimiter.test(line)) {
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        rows.push(cells);
      }
      consumed++;
    }
    if (rows.length === 0) return { block: null, linesConsumed: 0 };
    return { block: { type: 'table', table: { table_width: rows[0].length, has_column_header: true, has_row_header: false, children: rows.map(row => ({ type: 'table_row', table_row: { cells: row.map(cell => this.parseRichText(cell)) } })) } }, linesConsumed: consumed };
  }

  parseBlockEquation(lines) {
    if (!lines[0].startsWith('$$')) return { block: null, linesConsumed: 0 };
    let eq = []; let consumed = 0;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (i > 0 && l.endsWith('$$')) { eq.push(l.replace(/\$\$$/, '')); consumed = i + 1; break; }
      eq.push(i === 0 ? l.replace(/^\$\$/, '') : l);
    }
    const expression = eq.join('\n').trim();
    return { block: { type: 'equation', equation: { expression: expression.substring(0, this.limits.maxEquationLength) } }, linesConsumed: consumed };
  }

  normalizeLanguage(lang) {
    const map = { js: 'javascript', ts: 'typescript', py: 'python', rb: 'ruby', sh: 'shell', bash: 'shell', yml: 'yaml', json: 'json', html: 'html', css: 'css', sql: 'sql', md: 'markdown', 'c++': 'c++', 'c#': 'c#', 'objective-c': 'objective-c', php: 'php', go: 'go', rust: 'rust', kotlin: 'kotlin', swift: 'swift' };
    const n = lang?.toLowerCase();
    return map[n] || n || 'plain text';
  }

  optimizeBlocks(blocks) {
    if (blocks.length > this.limits.maxBlocksPerRequest) blocks = blocks.slice(0, this.limits.maxBlocksPerRequest);
    return blocks.filter(Boolean);
  }
}

module.exports = new NotionMarkdownParser();