/**
 * HtmlToMarkdownConverter - Converts HTML content to Markdown format
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 * - 4.1: Preserve nested list structure with correct indentation
 * - 4.2: Produce valid Markdown table syntax
 * - 4.3: Use correct Markdown syntax for formatting (strong, em, code, s)
 * - 4.4: Produce valid Markdown link syntax
 * - 4.5: Round-trip preservation of semantic structure
 */

export interface HtmlToMarkdownOptions {
  /** Maximum consecutive newlines allowed (default: 2) */
  maxConsecutiveNewlines?: number;
  /** Preserve data-* attributes as comments (default: false) */
  preserveDataAttributes?: boolean;
}

export class HtmlToMarkdownConverter {
  private options: Required<HtmlToMarkdownOptions>;

  constructor(options: HtmlToMarkdownOptions = {}) {
    this.options = {
      maxConsecutiveNewlines: options.maxConsecutiveNewlines ?? 2,
      preserveDataAttributes: options.preserveDataAttributes ?? false,
    };
  }

  /**
   * Convert HTML string to Markdown
   * @param html - HTML string to convert
   * @returns Markdown string
   */
  convert(html: string): string {
    if (!html || html.trim() === '') return '';

    // Create a temporary container to parse HTML
    const container = this.createContainer(html);
    const lines: string[] = [];

    Array.from(container.childNodes).forEach(node => {
      const text = this.processNode(node, 0);
      if (text) lines.push(text);
    });

    // Clean up result - limit consecutive newlines
    const maxNewlines = this.options.maxConsecutiveNewlines;
    const newlinePattern = new RegExp(`\\n{${maxNewlines + 1},}`, 'g');
    return lines.join('\n').replace(newlinePattern, '\n'.repeat(maxNewlines)).trim();
  }

  /**
   * Create a container element for parsing HTML
   * Works in both browser and Node.js environments
   */
  private createContainer(html: string): HTMLElement {
    if (typeof document !== 'undefined') {
      const container = document.createElement('div');
      container.innerHTML = html;
      return container;
    }
    // For Node.js environments, throw an error (should use jsdom or similar)
    throw new Error('HtmlToMarkdownConverter requires a DOM environment');
  }


  /**
   * Process a list element (ul/ol) with proper indentation for nested lists
   * Requirements: 4.1 - Preserve list structure with proper markers and indentation
   */
  private processList(listEl: HTMLElement, indentLevel: number = 0): string {
    const isOrdered = listEl.tagName.toLowerCase() === 'ol';
    const indent = '  '.repeat(indentLevel);
    const result: string[] = [];
    let itemIndex = 1;

    Array.from(listEl.children).forEach(child => {
      if (child.tagName.toLowerCase() === 'li') {
        const liEl = child as HTMLElement;
        let textContent = '';
        const nestedLists: HTMLElement[] = [];

        // Process child nodes - separate text/inline from nested lists
        Array.from(liEl.childNodes).forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            textContent += node.textContent || '';
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const nodeEl = node as HTMLElement;
            const nodeName = nodeEl.tagName.toLowerCase();
            if (nodeName === 'ul' || nodeName === 'ol') {
              nestedLists.push(nodeEl);
            } else if (nodeName === 'br') {
              // Handle <br> in list items - convert to newline with indent
              textContent += '\n' + indent + '  ';
            } else {
              textContent += this.processNode(node, indentLevel);
            }
          }
        });

        const marker = isOrdered ? `${itemIndex}.` : '-';
        const itemText = textContent.trim();

        if (itemText) {
          result.push(`${indent}${marker} ${itemText}`);
        }

        // Process nested lists with increased indentation
        nestedLists.forEach(nestedList => {
          const nestedMarkdown = this.processList(nestedList, indentLevel + 1);
          if (nestedMarkdown) {
            result.push(nestedMarkdown);
          }
        });

        itemIndex++;
      }
    });

    return result.join('\n');
  }

  /**
   * Convert HTML table to Markdown table syntax
   * Requirements: 4.2 - Produce valid Markdown table syntax
   */
  private convertTable(tableEl: HTMLElement): string {
    const rows: string[][] = [];
    let hasHeader = false;

    // Process thead
    const thead = tableEl.querySelector('thead');
    if (thead) {
      hasHeader = true;
      const headerRow = thead.querySelector('tr');
      if (headerRow) {
        const cells = Array.from(headerRow.querySelectorAll('th, td')).map(
          cell => this.processNode(cell, 0).trim()
        );
        rows.push(cells);
      }
    }

    // Process tbody
    const tbody = tableEl.querySelector('tbody');
    const bodyRows = tbody 
      ? tbody.querySelectorAll('tr')
      : tableEl.querySelectorAll('tr');

    bodyRows.forEach((row, index) => {
      // Skip first row if it was already processed as header
      if (!thead && index === 0 && row.querySelector('th')) {
        hasHeader = true;
        const cells = Array.from(row.querySelectorAll('th, td')).map(
          cell => this.processNode(cell, 0).trim()
        );
        rows.push(cells);
        return;
      }

      const cells = Array.from(row.querySelectorAll('td, th')).map(
        cell => this.processNode(cell, 0).trim()
      );
      if (cells.length > 0) {
        rows.push(cells);
      }
    });

    if (rows.length === 0) return '';

    // Build markdown table
    const lines: string[] = [];
    const columnCount = Math.max(...rows.map(r => r.length));

    // Header row
    const headerCells = rows[0] || [];
    const paddedHeader = Array(columnCount).fill('').map((_, i) => headerCells[i] || '');
    lines.push('| ' + paddedHeader.join(' | ') + ' |');

    // Separator row
    lines.push('| ' + Array(columnCount).fill('---').join(' | ') + ' |');

    // Data rows
    const dataRows = hasHeader ? rows.slice(1) : rows.slice(1);
    dataRows.forEach(row => {
      const paddedRow = Array(columnCount).fill('').map((_, i) => row[i] || '');
      lines.push('| ' + paddedRow.join(' | ') + ' |');
    });

    return lines.join('\n');
  }


  /**
   * Process a single DOM node and convert to Markdown
   * Requirements: 4.3, 4.4 - Convert formatting and links correctly
   */
  private processNode(node: Node, depth: number = 0): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // Handle lists specially to preserve structure and indentation
    if (tag === 'ul' || tag === 'ol') {
      return this.processList(el, depth);
    }

    // Get child content recursively
    const childContent = Array.from(el.childNodes)
      .map(n => this.processNode(n, depth))
      .join('');

    switch (tag) {
      // Headings
      case 'h1': return `# ${childContent}`;
      case 'h2': return `## ${childContent}`;
      case 'h3': return `### ${childContent}`;
      case 'h4': return `#### ${childContent}`;
      case 'h5': return `##### ${childContent}`;
      case 'h6': return `###### ${childContent}`;

      // Formatting - Requirements: 4.3
      case 'strong':
      case 'b':
        return `**${childContent}**`;
      case 'em':
      case 'i':
        return `*${childContent}*`;
      case 'u':
        return `__${childContent}__`;
      case 's':
      case 'del':
      case 'strike':
        return `~~${childContent}~~`;
      case 'code':
        // Don't wrap if inside pre
        if (el.parentElement?.tagName.toLowerCase() === 'pre') {
          return childContent;
        }
        return `\`${childContent}\``;

      // Code blocks
      case 'pre': {
        const lang = el.getAttribute('data-language') || '';
        const codeEl = el.querySelector('code');
        const code = codeEl ? codeEl.textContent : el.textContent || '';
        return `\`\`\`${lang}\n${code}\n\`\`\``;
      }

      // Blockquote
      case 'blockquote':
        return `> ${childContent}`;

      // Links - Requirements: 4.4
      case 'a': {
        const href = el.getAttribute('href') || '';
        return `[${childContent}](${href})`;
      }

      // Horizontal rule
      case 'hr':
        return '---';

      // List items (standalone, not in processList)
      case 'li': {
        const parent = el.parentElement;
        if (parent?.tagName.toLowerCase() === 'ol') {
          const index = Array.from(parent.children).indexOf(el) + 1;
          return `${index}. ${childContent}`;
        }
        return `- ${childContent}`;
      }

      // Line break
      case 'br':
        return '\n';

      // Paragraphs and divs
      case 'p':
      case 'div':
        return childContent;

      // Images
      case 'img': {
        const src = el.getAttribute('src') || '';
        const alt = el.getAttribute('alt') || '';
        return `![${alt}](${src})`;
      }

      // Tables
      case 'table':
        return this.convertTable(el);

      // Skip table structure elements (handled by convertTable)
      case 'thead':
      case 'tbody':
      case 'tfoot':
      case 'tr':
      case 'th':
      case 'td':
        return childContent;

      // Iframes (embeds)
      case 'iframe': {
        const src = el.getAttribute('src') || '';
        // Extract original URL from Spotify embeds
        if (src.includes('spotify.com')) {
          const match = src.match(/spotify\.com\/embed\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/);
          if (match) {
            return `https://open.spotify.com/${match[1]}/${match[2]}`;
          }
        }
        return src;
      }

      // Handle custom media blocks
      default:
        return this.processCustomBlock(el, childContent);
    }
  }


  /**
   * Process custom Notion-style blocks (video, audio, bookmark, embed)
   * Handles data-* attributes to extract original URLs
   */
  private processCustomBlock(el: HTMLElement, childContent: string): string {
    // Video blocks
    if (el.classList.contains('notion-video-block')) {
      const videoType = el.getAttribute('data-video-type');
      const videoId = el.getAttribute('data-video-id');
      if (videoType === 'youtube' && videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      } else if (videoType === 'vimeo' && videoId) {
        return `https://vimeo.com/${videoId}`;
      }
    }

    // Audio blocks
    if (el.classList.contains('notion-audio-block')) {
      const audioType = el.getAttribute('data-audio-type');
      if (audioType === 'spotify') {
        const spotifyType = el.getAttribute('data-spotify-type');
        const spotifyId = el.getAttribute('data-spotify-id');
        if (spotifyType && spotifyId) {
          return `https://open.spotify.com/${spotifyType}/${spotifyId}`;
        }
      } else if (audioType === 'soundcloud') {
        return el.getAttribute('data-url') || '';
      }
    }

    // Bookmark blocks
    if (el.classList.contains('notion-bookmark-block')) {
      const link = el.querySelector('a');
      if (link) {
        return link.getAttribute('href') || '';
      }
    }

    // Embed blocks (Google Drive, Figma, Loom, Gist, etc.)
    if (el.classList.contains('notion-embed-block')) {
      const url = el.getAttribute('data-url');
      if (url) return url;

      const embedType = el.getAttribute('data-embed-type');
      
      if (embedType === 'google-drive') {
        const fileId = el.getAttribute('data-file-id');
        const driveType = el.getAttribute('data-drive-type');
        if (fileId) {
          const typeUrls: Record<string, string> = {
            'file': `https://drive.google.com/file/d/${fileId}/view`,
            'document': `https://docs.google.com/document/d/${fileId}`,
            'spreadsheet': `https://docs.google.com/spreadsheets/d/${fileId}`,
            'presentation': `https://docs.google.com/presentation/d/${fileId}`,
            'form': `https://docs.google.com/forms/d/${fileId}`,
          };
          return typeUrls[driveType || 'file'] || typeUrls['file'];
        }
      }

      if (embedType === 'figma') {
        const figmaKey = el.getAttribute('data-figma-key');
        if (figmaKey) {
          return `https://www.figma.com/file/${figmaKey}`;
        }
      }

      if (embedType === 'loom') {
        const loomId = el.getAttribute('data-loom-id');
        if (loomId) {
          return `https://www.loom.com/share/${loomId}`;
        }
      }

      if (embedType === 'gist') {
        const gistUser = el.getAttribute('data-gist-user');
        const gistId = el.getAttribute('data-gist-id');
        if (gistUser && gistId) {
          return `https://gist.github.com/${gistUser}/${gistId}`;
        }
      }
    }

    // Default: return child content
    return childContent;
  }
}

/**
 * Static helper function for quick conversion
 * @param html - HTML string to convert
 * @param options - Conversion options
 * @returns Markdown string
 */
export function htmlToMarkdown(html: string, options?: HtmlToMarkdownOptions): string {
  const converter = new HtmlToMarkdownConverter(options);
  return converter.convert(html);
}
