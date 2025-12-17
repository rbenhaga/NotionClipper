/**
 * MarkdownToHtmlConverter - Converts Markdown content to HTML format
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 * - 5.1: Produce correct h1/h2/h3 tags for headings
 * - 5.2: Produce correct ul/ol/li structure for lists
 * - 5.3: Include language attribute for code blocks
 * - 5.4: Produce correct strong/em/code/s tags for inline formatting
 * - 5.5: Wrap equations in MathJax-compatible elements
 */

export interface MarkdownToHtmlOptions {
  /** Maximum consecutive empty lines to preserve (default: 1) */
  maxConsecutiveEmptyLines?: number;
  /** Enable media URL detection and embedding (default: true) */
  enableMediaEmbeds?: boolean;
}

export class MarkdownToHtmlConverter {
  private options: Required<MarkdownToHtmlOptions>;

  constructor(options: MarkdownToHtmlOptions = {}) {
    this.options = {
      maxConsecutiveEmptyLines: options.maxConsecutiveEmptyLines ?? 1,
      enableMediaEmbeds: options.enableMediaEmbeds ?? true,
    };
  }

  /**
   * Convert Markdown string to HTML
   * @param markdown - Markdown string to convert
   * @returns HTML string
   */
  convert(markdown: string): string {
    if (!markdown) return '';

    const lines = markdown.split('\n');
    const htmlLines: string[] = [];
    let inCodeBlock = false;
    let codeBlockContent = '';
    let codeBlockLanguage = '';
    let inTable = false;
    let tableRows: string[] = [];
    let consecutiveEmptyLines = 0;
    let inBlockEquation = false;
    let blockEquationContent = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Handle code blocks
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockLanguage = line.substring(3).trim();
          codeBlockContent = '';
          continue;
        } else {
          inCodeBlock = false;
          const langAttr = codeBlockLanguage ? ` data-language="${this.escapeHtml(codeBlockLanguage)}"` : '';
          const langClass = codeBlockLanguage ? ` class="language-${this.escapeHtml(codeBlockLanguage)}"` : '';
          htmlLines.push(`<pre${langAttr}><code${langClass}>${this.escapeHtml(codeBlockContent)}</code></pre>`);
          codeBlockContent = '';
          codeBlockLanguage = '';
          continue;
        }
      }

      if (inCodeBlock) {
        codeBlockContent += (codeBlockContent ? '\n' : '') + line;
        continue;
      }


      // Handle block equations ($...$)
      if (line.trim() === '$') {
        if (!inBlockEquation) {
          inBlockEquation = true;
          blockEquationContent = '';
          continue;
        } else {
          inBlockEquation = false;
          htmlLines.push(`<div class="notion-equation">$${this.escapeHtml(blockEquationContent)}$</div>`);
          blockEquationContent = '';
          continue;
        }
      }

      if (inBlockEquation) {
        blockEquationContent += (blockEquationContent ? '\n' : '') + line;
        continue;
      }

      // Handle tables (markdown format)
      if (line.includes('|') && line.trim().startsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        tableRows.push(line);
        continue;
      } else if (inTable) {
        htmlLines.push(this.convertTable(tableRows));
        tableRows = [];
        inTable = false;
      }

      // Handle empty lines - limit consecutive empty lines
      if (line.trim() === '') {
        consecutiveEmptyLines++;
        if (consecutiveEmptyLines <= this.options.maxConsecutiveEmptyLines) {
          htmlLines.push('<p><br></p>');
        }
        continue;
      }
      consecutiveEmptyLines = 0;

      // Process inline markdown first
      line = this.processInlineMarkdown(line);

      // Block types - Requirements: 5.1 (headings)
      if (line.startsWith('### ')) {
        htmlLines.push(`<h3>${line.substring(4)}</h3>`);
      } else if (line.startsWith('## ')) {
        htmlLines.push(`<h2>${line.substring(3)}</h2>`);
      } else if (line.startsWith('# ')) {
        htmlLines.push(`<h1>${line.substring(2)}</h1>`);
      } else if (line.startsWith('> [!')) {
        // Callout blocks
        const calloutMatch = line.match(/^> \[!(note|info|tip|warning|danger|success|default)\]\s*(.*)$/i);
        if (calloutMatch) {
          const [, type, content] = calloutMatch;
          const icon = this.getCalloutIcon(type.toLowerCase());
          const colorClass = this.getCalloutColorClass(type.toLowerCase());
          htmlLines.push(`<div class="notion-callout ${colorClass}"><span class="callout-icon">${icon}</span><div class="callout-content">${content}</div></div>`);
        } else {
          htmlLines.push(`<blockquote>${line.substring(2)}</blockquote>`);
        }
      } else if (line.startsWith('>> ')) {
        // Quote block (double >)
        const content = this.processInlineMarkdown(line.substring(3));
        htmlLines.push(`<blockquote>${content}</blockquote>`);
      } else if (line.startsWith('> ')) {
        // Toggle list (single >)
        const content = this.processInlineMarkdown(line.substring(2));
        htmlLines.push(`<details class="notion-toggle"><summary>${content}</summary><div></div></details>`);
      } else if (line.match(/^- \[[ xX]\]/)) {
        // Checkbox - Requirements: 5.2 (lists)
        const checked = line.toLowerCase().includes('[x]');
        const content = line.replace(/^- \[[ xX]\]\s*/, '');
        htmlLines.push(`<div class="notion-todo"><input type="checkbox" ${checked ? 'checked' : ''}><span>${content}</span></div>`);
      } else if (line.match(/^\d+\.\s/)) {
        // Numbered list - Requirements: 5.2
        const content = line.replace(/^\d+\.\s*/, '');
        htmlLines.push(`<li class="notion-numbered-list">${content}</li>`);
      } else if (line.match(/^[-*+]\s/)) {
        // Bullet list - Requirements: 5.2
        const content = line.substring(2);
        htmlLines.push(`<li class="notion-bullet-list">${content}</li>`);
      } else if (line === '---' || line === '___' || line === '***') {
        // Divider
        htmlLines.push('<hr class="notion-divider">');
      } else if (line.startsWith('$') && line.endsWith('$') && line.length > 4) {
        // Single-line block equation - Requirements: 5.5
        const equation = line.substring(2, line.length - 2);
        htmlLines.push(`<div class="notion-equation">$${this.escapeHtml(equation)}$</div>`);
      } else if (line.match(/^!\[.*?\]\(.*?\)$/)) {
        // Image - markdown syntax
        const match = line.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (match) {
          const [, alt, src] = match;
          htmlLines.push(`<img src="${this.escapeHtml(src)}" alt="${this.escapeHtml(alt)}" class="notion-image">`);
        }
      } else if (line.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) {
        // Direct image URL
        htmlLines.push(`<img src="${this.escapeHtml(line)}" alt="Image" class="notion-image">`);
      } else if (this.options.enableMediaEmbeds && this.isMediaUrl(line)) {
        // Media embeds (YouTube, Vimeo, Spotify, etc.)
        htmlLines.push(this.convertMediaUrl(line));
      } else if (line.match(/^https?:\/\//)) {
        // Bookmark/Link
        const domain = this.extractDomain(line);
        htmlLines.push(`<div class="notion-bookmark-block">
          <a href="${this.escapeHtml(line)}" class="notion-bookmark-link" target="_blank">
            <div class="notion-bookmark-content">
              <div class="notion-bookmark-title">${this.escapeHtml(domain)}</div>
              <div class="notion-bookmark-description">${this.escapeHtml(line)}</div>
            </div>
            <div class="notion-bookmark-icon">🔗</div>
          </a>
        </div>`);
      } else if (line.match(/^\[\[(.+?)\]\]$/)) {
        // Page block - link to sub-page
        const pageMatch = line.match(/^\[\[(.+?)(?:\|(.+?))?\]\]$/);
        if (pageMatch) {
          const [, pageTitle, pageId] = pageMatch;
          const href = pageId ? `#page-${this.escapeHtml(pageId)}` : '#';
          htmlLines.push(`<a href="${href}" class="notion-page-link" data-page-id="${this.escapeHtml(pageId || '')}">📄 ${this.escapeHtml(pageTitle)}</a>`);
        } else {
          htmlLines.push(`<p>${line}</p>`);
        }
      } else {
        htmlLines.push(`<p>${line}</p>`);
      }
    }

    // Close any remaining table
    if (inTable && tableRows.length > 0) {
      htmlLines.push(this.convertTable(tableRows));
    }

    let result = htmlLines.join('\n');

    // Wrap consecutive list items - Requirements: 5.2
    result = result.replace(/(<li class="notion-numbered-list">.*?<\/li>\n?)+/g, (match) => `<ol>${match}</ol>`);
    result = result.replace(/(<li class="notion-bullet-list">.*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

    // Clean up excessive whitespace
    result = result.replace(/\n{3,}/g, '\n\n');
    result = result.replace(/(<p><br><\/p>\n?){2,}/g, '<p><br></p>\n');

    return result;
  }


  /**
   * Process inline markdown formatting
   * Requirements: 5.4 - Produce correct strong/em/code/s tags
   */
  private processInlineMarkdown(text: string): string {
    // Don't escape HTML if it's already processed
    if (text.includes('<') && text.includes('>')) {
      return text;
    }

    return text
      // Escape HTML entities
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Bold & Italic combinations
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Underline (using __)
      .replace(/__(.+?)__/g, '<u>$1</u>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      // Strikethrough
      .replace(/~~(.+?)~~/g, '<s>$1</s>')
      // Inline code (before links to avoid conflicts)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Inline equations - Requirements: 5.5
      .replace(/\$([^$\n]+)\$/g, '<span class="notion-equation-inline">$$1$</span>')
      // Inline images ![alt](url)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="notion-image-inline">')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  }

  /**
   * Convert markdown table rows to HTML table
   */
  private convertTable(rows: string[]): string {
    if (rows.length === 0) return '';

    const cells = rows.map(row =>
      row.split('|').map(cell => cell.trim()).filter((cell, idx, arr) => {
        return !(idx === 0 && cell === '') && !(idx === arr.length - 1 && cell === '');
      })
    );

    // Skip separator row if present (contains only dashes and colons)
    const dataCells = cells.filter(row => !row.every(cell => /^:?-+:?$/.test(cell)));

    if (dataCells.length === 0) return '';

    const headers = dataCells[0];
    const dataRows = dataCells.slice(1);

    let html = '<table><thead><tr>';
    headers.forEach(header => {
      html += `<th>${this.processInlineMarkdown(header)}</th>`;
    });
    html += '</tr></thead>';

    if (dataRows.length > 0) {
      html += '<tbody>';
      dataRows.forEach(row => {
        html += '<tr>';
        for (let i = 0; i < headers.length; i++) {
          const cell = row[i] || '';
          html += `<td>${this.processInlineMarkdown(cell)}</td>`;
        }
        html += '</tr>';
      });
      html += '</tbody>';
    }

    html += '</table>';
    return html;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  /**
   * Get callout icon based on type
   */
  private getCalloutIcon(type: string): string {
    const icons: Record<string, string> = {
      note: '📝',
      info: 'ℹ️',
      tip: '💡',
      warning: '⚠️',
      danger: '🚨',
      success: '✅',
      default: '💡'
    };
    return icons[type] || '💡';
  }

  /**
   * Get callout color class based on type
   */
  private getCalloutColorClass(type: string): string {
    const colors: Record<string, string> = {
      note: 'notion-callout-blue',
      info: 'notion-callout-blue',
      tip: 'notion-callout-green',
      warning: 'notion-callout-yellow',
      danger: 'notion-callout-red',
      success: 'notion-callout-green',
      default: 'notion-callout-default'
    };
    return colors[type] || 'notion-callout-default';
  }


  /**
   * Check if URL is a media URL (YouTube, Vimeo, Spotify, etc.)
   */
  private isMediaUrl(url: string): boolean {
    return (
      this.isYouTubeUrl(url) ||
      this.isVimeoUrl(url) ||
      this.isSpotifyUrl(url) ||
      this.isSoundCloudUrl(url) ||
      this.isGoogleDriveUrl(url) ||
      this.isFigmaUrl(url) ||
      this.isLoomUrl(url) ||
      this.isGitHubGistUrl(url) ||
      this.isGoogleMapsUrl(url) ||
      this.isPdfUrl(url)
    );
  }

  /**
   * Convert media URL to HTML embed
   */
  private convertMediaUrl(line: string): string {
    if (this.isYouTubeUrl(line)) {
      const videoId = this.extractYouTubeId(line);
      if (videoId) {
        return `<div class="notion-video-block" data-video-type="youtube" data-video-id="${this.escapeHtml(videoId)}">
          <div class="notion-video-preview">
            <img src="https://img.youtube.com/vi/${this.escapeHtml(videoId)}/maxresdefault.jpg" alt="YouTube Video" class="notion-video-thumbnail" onerror="this.src='https://img.youtube.com/vi/${this.escapeHtml(videoId)}/hqdefault.jpg'">
            <div class="notion-video-play-button">▶</div>
          </div>
          <div class="notion-video-info">
            <span class="notion-video-icon">📺</span>
            <span class="notion-video-label">YouTube Video</span>
          </div>
        </div>`;
      }
    }

    if (this.isVimeoUrl(line)) {
      const videoId = this.extractVimeoId(line);
      if (videoId) {
        return `<div class="notion-video-block" data-video-type="vimeo" data-video-id="${this.escapeHtml(videoId)}">
          <div class="notion-video-preview notion-vimeo-preview">
            <div class="notion-video-play-button">▶</div>
          </div>
          <div class="notion-video-info">
            <span class="notion-video-icon">🎬</span>
            <span class="notion-video-label">Vimeo Video</span>
          </div>
        </div>`;
      }
    }

    if (this.isSpotifyUrl(line)) {
      const spotifyData = this.extractSpotifyData(line);
      if (spotifyData) {
        return `<div class="notion-audio-block" data-audio-type="spotify" data-spotify-type="${this.escapeHtml(spotifyData.type)}" data-spotify-id="${this.escapeHtml(spotifyData.id)}">
          <div class="notion-audio-player notion-spotify-player">
            <iframe src="https://open.spotify.com/embed/${this.escapeHtml(spotifyData.type)}/${this.escapeHtml(spotifyData.id)}" width="100%" height="152" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>
          </div>
        </div>`;
      }
    }

    if (this.isSoundCloudUrl(line)) {
      return `<div class="notion-audio-block" data-audio-type="soundcloud" data-url="${this.escapeHtml(line)}">
        <div class="notion-audio-preview">
          <span class="notion-audio-icon">🎵</span>
          <span class="notion-audio-label">SoundCloud Audio</span>
          <a href="${this.escapeHtml(line)}" target="_blank" class="notion-audio-link">Open in SoundCloud</a>
        </div>
      </div>`;
    }

    if (this.isGoogleDriveUrl(line)) {
      const driveData = this.extractGoogleDriveData(line);
      if (driveData) {
        const embedUrl = this.getGoogleDriveEmbedUrl(driveData);
        const { icon, label } = this.getGoogleDriveTypeInfo(driveData.type);
        return `<div class="notion-embed-block notion-google-drive-embed" data-embed-type="google-drive" data-drive-type="${this.escapeHtml(driveData.type)}" data-file-id="${this.escapeHtml(driveData.fileId)}" data-url="${this.escapeHtml(line)}">
          <div class="notion-embed-container">
            <iframe src="${embedUrl}" width="100%" height="400" frameborder="0" allowfullscreen></iframe>
          </div>
          <div class="notion-embed-info">
            <span class="notion-embed-icon">${icon}</span>
            <span class="notion-embed-label">${label}</span>
            <a href="${this.escapeHtml(line)}" target="_blank" class="notion-embed-link">Open</a>
          </div>
        </div>`;
      }
    }

    if (this.isFigmaUrl(line)) {
      const figmaKey = this.extractFigmaKey(line);
      if (figmaKey) {
        const embedUrl = `https://www.figma.com/embed?embed_host=notion&url=${encodeURIComponent(line)}`;
        return `<div class="notion-embed-block notion-figma-embed" data-embed-type="figma" data-figma-key="${this.escapeHtml(figmaKey)}" data-url="${this.escapeHtml(line)}">
          <div class="notion-embed-container notion-figma-container">
            <iframe src="${embedUrl}" width="100%" height="450" frameborder="0" allowfullscreen></iframe>
          </div>
          <div class="notion-embed-info">
            <span class="notion-embed-icon">🎨</span>
            <span class="notion-embed-label">Figma</span>
            <a href="${this.escapeHtml(line)}" target="_blank" class="notion-embed-link">Open in Figma</a>
          </div>
        </div>`;
      }
    }

    if (this.isPdfUrl(line)) {
      return `<div class="notion-embed-block notion-pdf-embed" data-embed-type="pdf" data-url="${this.escapeHtml(line)}">
        <div class="notion-embed-container notion-pdf-container">
          <iframe src="${this.escapeHtml(line)}" width="100%" height="500" frameborder="0"></iframe>
        </div>
        <div class="notion-embed-info">
          <span class="notion-embed-icon">📕</span>
          <span class="notion-embed-label">PDF Document</span>
          <a href="${this.escapeHtml(line)}" target="_blank" class="notion-embed-link">Download</a>
        </div>
      </div>`;
    }

    if (this.isLoomUrl(line)) {
      const loomId = this.extractLoomId(line);
      if (loomId) {
        const embedUrl = `https://www.loom.com/embed/${this.escapeHtml(loomId)}`;
        return `<div class="notion-embed-block notion-loom-embed" data-embed-type="loom" data-loom-id="${this.escapeHtml(loomId)}" data-url="${this.escapeHtml(line)}">
          <div class="notion-embed-container notion-loom-container">
            <iframe src="${embedUrl}" width="100%" height="400" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
          </div>
          <div class="notion-embed-info">
            <span class="notion-embed-icon">🎥</span>
            <span class="notion-embed-label">Loom Video</span>
            <a href="${this.escapeHtml(line)}" target="_blank" class="notion-embed-link">Open in Loom</a>
          </div>
        </div>`;
      }
    }

    if (this.isGitHubGistUrl(line)) {
      const gistData = this.extractGistId(line);
      if (gistData) {
        return `<div class="notion-embed-block notion-gist-embed" data-embed-type="gist" data-gist-user="${this.escapeHtml(gistData.user)}" data-gist-id="${this.escapeHtml(gistData.gistId)}" data-url="${this.escapeHtml(line)}">
          <div class="notion-embed-container notion-gist-container">
            <script src="https://gist.github.com/${this.escapeHtml(gistData.user)}/${this.escapeHtml(gistData.gistId)}.js"></script>
          </div>
          <div class="notion-embed-info">
            <span class="notion-embed-icon">💻</span>
            <span class="notion-embed-label">GitHub Gist</span>
            <a href="${this.escapeHtml(line)}" target="_blank" class="notion-embed-link">View on GitHub</a>
          </div>
        </div>`;
      }
    }

    if (this.isGoogleMapsUrl(line)) {
      const embedUrl = this.extractGoogleMapsEmbedUrl(line);
      if (embedUrl) {
        return `<div class="notion-embed-block notion-maps-embed" data-embed-type="google-maps" data-url="${this.escapeHtml(line)}">
          <div class="notion-embed-container notion-maps-container">
            <iframe src="${embedUrl}" width="100%" height="350" frameborder="0" style="border:0" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          </div>
          <div class="notion-embed-info">
            <span class="notion-embed-icon">🗺️</span>
            <span class="notion-embed-label">Google Maps</span>
            <a href="${this.escapeHtml(line)}" target="_blank" class="notion-embed-link">Open in Maps</a>
          </div>
        </div>`;
      }
      // Fallback
      return `<div class="notion-embed-block notion-maps-embed notion-maps-preview" data-embed-type="google-maps" data-url="${this.escapeHtml(line)}">
        <a href="${this.escapeHtml(line)}" target="_blank" class="notion-maps-link">
          <div class="notion-maps-placeholder">
            <span class="notion-maps-icon">🗺️</span>
            <span class="notion-maps-text">View on Google Maps</span>
          </div>
        </a>
      </div>`;
    }

    // Fallback to bookmark
    const domain = this.extractDomain(line);
    return `<a href="${this.escapeHtml(line)}" class="notion-bookmark" target="_blank">🔗 ${this.escapeHtml(domain)}</a>`;
  }


  // URL detection helpers
  private isYouTubeUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)/.test(url);
  }

  private isVimeoUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?vimeo\.com\/\d+/.test(url);
  }

  private isSpotifyUrl(url: string): boolean {
    return /^https?:\/\/(open\.)?spotify\.com\/(track|album|playlist|artist|episode|show)\//.test(url);
  }

  private isSoundCloudUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?soundcloud\.com\//.test(url);
  }

  private isGoogleDriveUrl(url: string): boolean {
    return /^https?:\/\/(drive\.google\.com|docs\.google\.com)\//.test(url);
  }

  private isFigmaUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?figma\.com\/(file|design|proto)\//.test(url);
  }

  private isPdfUrl(url: string): boolean {
    return /\.pdf(\?.*)?$/i.test(url);
  }

  private isLoomUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?loom\.com\/(share|embed)\//.test(url);
  }

  private isGitHubGistUrl(url: string): boolean {
    return /^https?:\/\/gist\.github\.com\//.test(url);
  }

  private isGoogleMapsUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?(google\.com\/maps|maps\.google\.com|goo\.gl\/maps)/.test(url);
  }

  // URL extraction helpers
  private extractYouTubeId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  private extractVimeoId(url: string): string | null {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
  }

  private extractSpotifyData(url: string): { type: string; id: string } | null {
    const match = url.match(/spotify\.com\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/);
    if (match) {
      return { type: match[1], id: match[2] };
    }
    return null;
  }

  private extractGoogleDriveData(url: string): { type: string; fileId: string } | null {
    // Google Docs
    let match = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return { type: 'document', fileId: match[1] };

    // Google Sheets
    match = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return { type: 'spreadsheet', fileId: match[1] };

    // Google Slides
    match = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return { type: 'presentation', fileId: match[1] };

    // Google Forms
    match = url.match(/docs\.google\.com\/forms\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return { type: 'form', fileId: match[1] };

    // Google Drive file
    match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return { type: 'file', fileId: match[1] };

    return null;
  }

  private getGoogleDriveEmbedUrl(data: { type: string; fileId: string }): string {
    const embedUrls: Record<string, string> = {
      'file': `https://drive.google.com/file/d/${data.fileId}/preview`,
      'document': `https://docs.google.com/document/d/${data.fileId}/preview`,
      'spreadsheet': `https://docs.google.com/spreadsheets/d/${data.fileId}/preview`,
      'presentation': `https://docs.google.com/presentation/d/${data.fileId}/preview`,
      'form': `https://docs.google.com/forms/d/${data.fileId}/viewform?embedded=true`,
    };
    return embedUrls[data.type] || embedUrls['file'];
  }

  private getGoogleDriveTypeInfo(type: string): { icon: string; label: string } {
    const typeInfo: Record<string, { icon: string; label: string }> = {
      'document': { icon: '📄', label: 'Google Docs' },
      'spreadsheet': { icon: '📊', label: 'Google Sheets' },
      'presentation': { icon: '📽️', label: 'Google Slides' },
      'form': { icon: '📝', label: 'Google Forms' },
      'file': { icon: '📁', label: 'Google Drive' },
    };
    return typeInfo[type] || typeInfo['file'];
  }

  private extractFigmaKey(url: string): string | null {
    const match = url.match(/figma\.com\/(file|design|proto)\/([a-zA-Z0-9]+)/);
    return match ? match[2] : null;
  }

  private extractLoomId(url: string): string | null {
    const match = url.match(/loom\.com\/(share|embed)\/([a-zA-Z0-9]+)/);
    return match ? match[2] : null;
  }

  private extractGistId(url: string): { user: string; gistId: string } | null {
    const match = url.match(/gist\.github\.com\/([^\/]+)\/([a-zA-Z0-9]+)/);
    if (match) {
      return { user: match[1], gistId: match[2] };
    }
    return null;
  }

  private extractGoogleMapsEmbedUrl(url: string): string | null {
    if (url.includes('google.com/maps')) {
      const placeMatch = url.match(/place\/([^\/]+)/);
      const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

      if (coordMatch) {
        const lat = coordMatch[1];
        const lng = coordMatch[2];
        return `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1000!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1`;
      }

      if (placeMatch) {
        const place = encodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
        const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
        return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${place}`;
      }
    }
    return null;
  }
}

/**
 * Static helper function for quick conversion
 * @param markdown - Markdown string to convert
 * @param options - Conversion options
 * @returns HTML string
 */
export function markdownToHtml(markdown: string, options?: MarkdownToHtmlOptions): string {
  const converter = new MarkdownToHtmlConverter(options);
  return converter.convert(markdown);
}
