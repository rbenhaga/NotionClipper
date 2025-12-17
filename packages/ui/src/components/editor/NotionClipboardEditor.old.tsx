/**
 * NotionClipboardEditor - Éditeur style page Notion
 * Une seule zone d'édition fluide et continue, pas de blocs séparés
 * Design: fond blanc, typographie Notion, placeholder élégant
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { parseContent, type NotionBlock } from '@notion-clipper/notion-parser';

export interface NotionClipboardEditorProps {
  content: string;
  onChange: (content: string) => void;
  onBlocksChange?: (blocks: NotionBlock[]) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

export function NotionClipboardEditor({
  content,
  onChange,
  onBlocksChange,
  placeholder = "Start writing, or press '/' for commands...",
  readOnly = false,
  className = ''
}: NotionClipboardEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const lastContentRef = useRef<string>('');

  // Sync content from props
  useEffect(() => {
    if (!editorRef.current) return;
    if (content === lastContentRef.current) return;
    
    lastContentRef.current = content;
    
    // Convertir le markdown en HTML pour l'affichage
    const html = markdownToHtml(content);
    if (editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html || '';
    }
  }, [content]);

  // Handle input
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    
    const text = htmlToMarkdown(editorRef.current);
    lastContentRef.current = text;
    onChange(text);

    // Parse pour les blocs Notion
    if (onBlocksChange) {
      try {
        const result = parseContent(text);
        if (result.success) {
          onBlocksChange(result.blocks);
        }
      } catch {}
    }
  }, [onChange, onBlocksChange]);

  // Handle paste - clean HTML
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  // Handle key commands
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Tab pour indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '    ');
    }
  }, []);

  const isEmpty = !content || content.trim() === '';

  return (
    <div className={`notion-editor-wrapper relative ${className}`}>
      {/* Placeholder */}
      {isEmpty && !isFocused && (
        <div className="absolute top-0 left-0 pointer-events-none text-[#9b9a97] dark:text-[#5a5a5a] text-[16px] leading-[1.5]">
          {placeholder}
        </div>
      )}

      {/* Zone d'édition */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="notion-editor outline-none min-h-[200px] text-[16px] leading-[1.5] text-[#37352f] dark:text-[#e3e3e3]"
        style={{
          fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
          WebkitFontSmoothing: 'antialiased',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
        }}
      />

      <style>{`
        .notion-editor:empty:before {
          content: attr(data-placeholder);
          color: #9b9a97;
        }
        .notion-editor:focus {
          outline: none;
        }

        /* Paragraphs */
        .notion-editor p {
          margin: 0;
          padding: 3px 0;
          min-height: 1em;
        }

        /* Headings */
        .notion-editor h1 {
          font-size: 30px;
          font-weight: 700;
          line-height: 1.2;
          margin: 24px 0 4px 0;
          padding: 3px 0;
        }
        .notion-editor h2 {
          font-size: 24px;
          font-weight: 600;
          line-height: 1.25;
          margin: 20px 0 4px 0;
          padding: 3px 0;
        }
        .notion-editor h3 {
          font-size: 20px;
          font-weight: 600;
          line-height: 1.3;
          margin: 16px 0 4px 0;
          padding: 3px 0;
        }

        /* Lists */
        .notion-editor ul.notion-list,
        .notion-editor ol.notion-list {
          margin: 2px 0;
          padding-left: 24px;
        }
        .notion-editor li.notion-bullet-list,
        .notion-editor li.notion-numbered-list {
          padding: 2px 0;
          line-height: 1.5;
        }

        /* To-do / Checkboxes */
        .notion-editor .notion-todo {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 2px 0;
          margin: 1px 0;
        }
        .notion-editor .notion-todo input[type="checkbox"] {
          margin-top: 3px;
          cursor: not-allowed;
          width: 16px;
          height: 16px;
        }
        .notion-editor .notion-todo span {
          flex: 1;
        }

        /* Callouts */
        .notion-editor .notion-callout {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          margin: 4px 0;
          border-radius: 4px;
          background: rgba(241, 241, 239, 0.6);
          border-left: 3px solid #9b9a97;
        }
        .dark .notion-editor .notion-callout {
          background: rgba(47, 47, 47, 0.6);
        }
        .notion-editor .notion-callout-note {
          background: rgba(219, 237, 255, 0.3);
          border-left-color: #0b6bcb;
        }
        .dark .notion-editor .notion-callout-note {
          background: rgba(11, 107, 203, 0.15);
        }
        .notion-editor .notion-callout-info {
          background: rgba(219, 237, 255, 0.3);
          border-left-color: #0b6bcb;
        }
        .dark .notion-editor .notion-callout-info {
          background: rgba(11, 107, 203, 0.15);
        }
        .notion-editor .notion-callout-tip {
          background: rgba(219, 255, 219, 0.3);
          border-left-color: #0b6b0b;
        }
        .dark .notion-editor .notion-callout-tip {
          background: rgba(11, 107, 11, 0.15);
        }
        .notion-editor .notion-callout-warning {
          background: rgba(255, 245, 219, 0.3);
          border-left-color: #cb6b0b;
        }
        .dark .notion-editor .notion-callout-warning {
          background: rgba(203, 107, 11, 0.15);
        }
        .notion-editor .notion-callout-danger {
          background: rgba(255, 219, 219, 0.3);
          border-left-color: #cb0b0b;
        }
        .dark .notion-editor .notion-callout-danger {
          background: rgba(203, 11, 11, 0.15);
        }
        .notion-editor .notion-callout-success {
          background: rgba(219, 255, 219, 0.3);
          border-left-color: #0b6b0b;
        }
        .dark .notion-editor .notion-callout-success {
          background: rgba(11, 107, 11, 0.15);
        }
        .notion-editor .callout-icon {
          font-size: 20px;
          line-height: 1.5;
        }
        .notion-editor .callout-content {
          flex: 1;
          line-height: 1.5;
        }

        /* Toggle lists */
        .notion-editor details.notion-toggle {
          margin: 2px 0;
          padding: 3px 0;
        }
        .notion-editor details.notion-toggle summary {
          cursor: pointer;
          list-style: none;
          padding-left: 24px;
          position: relative;
        }
        .notion-editor details.notion-toggle summary::-webkit-details-marker {
          display: none;
        }
        .notion-editor details.notion-toggle summary::before {
          content: '▶';
          position: absolute;
          left: 0;
          transition: transform 0.2s;
        }
        .notion-editor details.notion-toggle[open] summary::before {
          transform: rotate(90deg);
        }

        /* Toggle headings */
        .notion-editor details.notion-toggle-heading {
          margin: 8px 0;
        }
        .notion-editor details.notion-toggle-heading summary {
          cursor: pointer;
          list-style: none;
          padding-left: 28px;
          position: relative;
          font-weight: 600;
        }
        .notion-editor details.notion-toggle-heading summary::-webkit-details-marker {
          display: none;
        }
        .notion-editor details.notion-toggle-heading summary::before {
          content: '▶';
          position: absolute;
          left: 0;
          transition: transform 0.2s;
        }
        .notion-editor details.notion-toggle-heading[open] summary::before {
          transform: rotate(90deg);
        }
        .notion-editor details.notion-toggle-heading summary.toggle-heading-1 {
          font-size: 30px;
          font-weight: 700;
        }
        .notion-editor details.notion-toggle-heading summary.toggle-heading-2 {
          font-size: 24px;
        }
        .notion-editor details.notion-toggle-heading summary.toggle-heading-3 {
          font-size: 20px;
        }

        /* Quotes */
        .notion-editor blockquote.notion-quote {
          margin: 4px 0;
          padding: 3px 0 3px 14px;
          border-left: 3px solid #37352f;
        }
        .dark .notion-editor blockquote.notion-quote {
          border-left-color: #e3e3e3;
        }

        /* Code blocks */
        .notion-editor pre {
          background: #f7f6f3;
          padding: 16px;
          border-radius: 4px;
          font-family: "SFMono-Regular", Menlo, Consolas, monospace;
          font-size: 14px;
          overflow-x: auto;
          margin: 8px 0;
        }
        .dark .notion-editor pre {
          background: #2f2f2f;
        }
        .notion-editor pre code {
          background: none;
          padding: 0;
        }

        /* Inline code */
        .notion-editor code {
          background: rgba(135, 131, 120, 0.15);
          color: #eb5757;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: "SFMono-Regular", Menlo, Consolas, monospace;
          font-size: 85%;
        }
        .dark .notion-editor code {
          background: rgba(135, 131, 120, 0.25);
          color: #ff6b6b;
        }

        /* Equations */
        .notion-editor .notion-equation {
          background: rgba(241, 241, 239, 0.6);
          padding: 12px 16px;
          margin: 8px 0;
          border-radius: 4px;
          font-family: "KaTeX_Main", "Times New Roman", serif;
          overflow-x: auto;
        }
        .dark .notion-editor .notion-equation {
          background: rgba(47, 47, 47, 0.6);
        }
        .notion-editor .notion-equation-inline {
          background: rgba(241, 241, 239, 0.6);
          padding: 2px 6px;
          border-radius: 3px;
          font-family: "KaTeX_Main", "Times New Roman", serif;
        }
        .dark .notion-editor .notion-equation-inline {
          background: rgba(47, 47, 47, 0.6);
        }

        /* Tables */
        .notion-editor table.notion-table {
          border-collapse: collapse;
          width: 100%;
          margin: 8px 0;
          border: 1px solid #e3e2e0;
        }
        .dark .notion-editor table.notion-table {
          border-color: #373737;
        }
        .notion-editor table.notion-table th {
          background: #f7f6f3;
          font-weight: 600;
          padding: 8px 12px;
          text-align: left;
          border: 1px solid #e3e2e0;
        }
        .dark .notion-editor table.notion-table th {
          background: #2f2f2f;
          border-color: #373737;
        }
        .notion-editor table.notion-table td {
          padding: 8px 12px;
          border: 1px solid #e3e2e0;
        }
        .dark .notion-editor table.notion-table td {
          border-color: #373737;
        }

        /* Dividers */
        .notion-editor hr.notion-divider {
          border: none;
          border-top: 1px solid #e3e2e0;
          margin: 12px 0;
        }
        .dark .notion-editor hr.notion-divider {
          border-top-color: #373737;
        }

        /* Images */
        .notion-editor img.notion-image {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 8px 0;
        }

        /* Embeds & Bookmarks */
        .notion-editor .notion-embed,
        .notion-editor .notion-bookmark {
          padding: 12px 16px;
          margin: 8px 0;
          border-radius: 4px;
          border: 1px solid #e3e2e0;
          background: #f7f6f3;
        }
        .dark .notion-editor .notion-embed,
        .dark .notion-editor .notion-bookmark {
          border-color: #373737;
          background: #2f2f2f;
        }
        .notion-editor .notion-embed a,
        .notion-editor .notion-bookmark a {
          color: #0b6bcb;
          text-decoration: none;
          word-break: break-all;
        }
        .dark .notion-editor .notion-embed a,
        .dark .notion-editor .notion-bookmark a {
          color: #5b9dd9;
        }

        /* Links */
        .notion-editor a {
          color: inherit;
          text-decoration: underline;
          text-decoration-color: rgba(55, 53, 47, 0.4);
        }
        .dark .notion-editor a {
          text-decoration-color: rgba(227, 227, 227, 0.4);
        }

        /* Text formatting */
        .notion-editor strong {
          font-weight: 600;
        }
        .notion-editor em {
          font-style: italic;
        }
        .notion-editor u {
          text-decoration: underline;
        }
        .notion-editor s {
          text-decoration: line-through;
        }
      `}</style>
    </div>
  );
}


// ============================================
// HELPERS - Conversion Markdown <-> HTML
// ============================================

function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  // Process line by line for better control
  const lines = markdown.split('\n');
  const htmlLines: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent = '';
  let codeBlockLanguage = '';
  let inTable = false;
  let tableRows: string[] = [];

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
        const langAttr = codeBlockLanguage ? ` data-language="${escapeHtml(codeBlockLanguage)}"` : '';
        htmlLines.push(`<pre${langAttr}><code>${escapeHtml(codeBlockContent)}</code></pre>`);
        codeBlockContent = '';
        codeBlockLanguage = '';
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockContent += (codeBlockContent ? '\n' : '') + line;
      continue;
    }

    // Handle tables
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(line);
      continue;
    } else if (inTable) {
      // End of table
      htmlLines.push(convertTableToHtml(tableRows));
      tableRows = [];
      inTable = false;
    }

    // Handle CSV tables (lines with commas)
    if (line.includes(',') && !line.startsWith('-') && !line.startsWith('>')) {
      const nextLine = lines[i + 1];
      if (nextLine && nextLine.includes(',')) {
        // Likely a CSV table
        const csvLines = [line];
        i++;
        while (i < lines.length && lines[i].includes(',')) {
          csvLines.push(lines[i]);
          i++;
        }
        i--; // Back one line
        htmlLines.push(convertCsvToHtml(csvLines));
        continue;
      }
    }

    // Process inline markdown
    line = processInlineMarkdown(line);

    // Handle different block types
    if (line.startsWith('### ')) {
      htmlLines.push(`<h3>${line.substring(4)}</h3>`);
    } else if (line.startsWith('## ')) {
      htmlLines.push(`<h2>${line.substring(3)}</h2>`);
    } else if (line.startsWith('# ')) {
      htmlLines.push(`<h1>${line.substring(2)}</h1>`);
    } else if (line.startsWith('> [!')) {
      // Callout blocks
      const calloutMatch = line.match(/^> \[!(note|info|tip|warning|danger|success)\]\s*(.*)$/);
      if (calloutMatch) {
        const [, type, content] = calloutMatch;
        const icon = getCalloutIcon(type);
        htmlLines.push(`<div class="notion-callout notion-callout-${type}"><span class="callout-icon">${icon}</span><div class="callout-content">${content}</div></div>`);
      }
    } else if (line.startsWith('>> ')) {
      // Quote (double >)
      htmlLines.push(`<blockquote class="notion-quote">${line.substring(3)}</blockquote>`);
    } else if (line.startsWith('> ### ') || line.startsWith('> ## ') || line.startsWith('> # ')) {
      // Toggle heading
      const level = line.match(/^> (#{1,3})/)?.[1].length || 1;
      const content = line.replace(/^> #{1,3}\s*/, '');
      htmlLines.push(`<details class="notion-toggle-heading"><summary class="toggle-heading-${level}">${content}</summary></details>`);
    } else if (line.startsWith('> ')) {
      // Toggle list
      htmlLines.push(`<details class="notion-toggle"><summary>${line.substring(2)}</summary></details>`);
    } else if (line.match(/^- \[[ x]\]/)) {
      // Checkbox
      const checked = line.includes('[x]');
      const content = line.replace(/^- \[[ x]\]\s*/, '');
      htmlLines.push(`<div class="notion-todo"><input type="checkbox" ${checked ? 'checked' : ''} disabled><span>${content}</span></div>`);
    } else if (line.match(/^\d+\.\s/)) {
      // Numbered list
      const content = line.replace(/^\d+\.\s*/, '');
      htmlLines.push(`<li class="notion-numbered-list">${content}</li>`);
    } else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('+ ')) {
      // Bullet list
      const content = line.substring(2);
      htmlLines.push(`<li class="notion-bullet-list">${content}</li>`);
    } else if (line === '---' || line === '___' || line === '***') {
      // Divider
      htmlLines.push('<hr class="notion-divider">');
    } else if (line.startsWith('$$') && line.endsWith('$$')) {
      // Inline equation
      const equation = line.substring(2, line.length - 2);
      htmlLines.push(`<div class="notion-equation">${escapeHtml(equation)}</div>`);
    } else if (line.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      // Image URL
      htmlLines.push(`<img src="${escapeHtml(line)}" alt="Image" class="notion-image">`);
    } else if (line.match(/^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)/)) {
      // Video embed
      htmlLines.push(`<div class="notion-embed notion-video"><a href="${escapeHtml(line)}" target="_blank">🎥 ${escapeHtml(line)}</a></div>`);
    } else if (line.match(/^https?:\/\/.+\.pdf$/i)) {
      // PDF
      htmlLines.push(`<div class="notion-embed notion-pdf"><a href="${escapeHtml(line)}" target="_blank">📄 PDF: ${escapeHtml(line)}</a></div>`);
    } else if (line.match(/^https?:\/\//)) {
      // Bookmark/Link
      htmlLines.push(`<div class="notion-bookmark"><a href="${escapeHtml(line)}" target="_blank">🔗 ${escapeHtml(line)}</a></div>`);
    } else if (line.trim() === '') {
      htmlLines.push('<p><br></p>');
    } else {
      htmlLines.push(`<p>${line}</p>`);
    }
  }

  // Close any remaining table
  if (inTable) {
    htmlLines.push(convertTableToHtml(tableRows));
  }

  // Wrap consecutive list items
  let result = htmlLines.join('\n');
  result = result.replace(/(<li class="notion-numbered-list">.*?<\/li>\n?)+/g, (match) => `<ol class="notion-list">${match}</ol>`);
  result = result.replace(/(<li class="notion-bullet-list">.*?<\/li>\n?)+/g, (match) => `<ul class="notion-list">${match}</ul>`);

  return result;
}

function processInlineMarkdown(text: string): string {
  return text
    // Escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold & Italic (must be done in order)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<u>$1</u>') // Underline
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>') // Strikethrough
    // Inline code (before links)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Inline equations
    .replace(/\$\$([^$]+)\$\$/g, '<span class="notion-equation-inline">$1</span>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    // Images in markdown format
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="notion-image">');
}

function getCalloutIcon(type: string): string {
  const icons: Record<string, string> = {
    note: '📝',
    info: 'ℹ️',
    tip: '💡',
    warning: '⚠️',
    danger: '🚨',
    success: '✅'
  };
  return icons[type] || '📌';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function convertTableToHtml(rows: string[]): string {
  if (rows.length === 0) return '';

  const cells = rows.map(row =>
    row.split('|').map(cell => cell.trim()).filter(cell => cell !== '')
  );

  // Skip separator row if present (contains only dashes and pipes)
  const dataCells = cells.filter(row => !row.every(cell => /^[-:]+$/.test(cell)));

  if (dataCells.length === 0) return '';

  const headers = dataCells[0];
  const dataRows = dataCells.slice(1);

  let html = '<table class="notion-table"><thead><tr>';
  headers.forEach(header => {
    html += `<th>${processInlineMarkdown(header)}</th>`;
  });
  html += '</tr></thead><tbody>';

  dataRows.forEach(row => {
    html += '<tr>';
    row.forEach(cell => {
      html += `<td>${processInlineMarkdown(cell)}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  return html;
}

function convertCsvToHtml(lines: string[]): string {
  if (lines.length === 0) return '';

  const rows = lines.map(line => line.split(',').map(cell => cell.trim()));
  const headers = rows[0];
  const dataRows = rows.slice(1);

  let html = '<table class="notion-table"><thead><tr>';
  headers.forEach(header => {
    html += `<th>${escapeHtml(header)}</th>`;
  });
  html += '</tr></thead><tbody>';

  dataRows.forEach(row => {
    html += '<tr>';
    row.forEach(cell => {
      html += `<td>${escapeHtml(cell)}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  return html;
}

function htmlToMarkdown(element: HTMLElement): string {
  const lines: string[] = [];
  
  const processNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const childContent = Array.from(el.childNodes).map(processNode).join('');
    
    switch (tag) {
      case 'h1': return `# ${childContent}`;
      case 'h2': return `## ${childContent}`;
      case 'h3': return `### ${childContent}`;
      case 'strong': case 'b': return `**${childContent}**`;
      case 'em': case 'i': return `*${childContent}*`;
      case 'code': return `\`${childContent}\``;
      case 'pre': return `\`\`\`\n${el.textContent}\n\`\`\``;
      case 'blockquote': return `> ${childContent}`;
      case 'a': return `[${childContent}](${el.getAttribute('href') || ''})`;
      case 'hr': return '---';
      case 'li': return `- ${childContent}`;
      case 'ul': case 'ol': return childContent;
      case 'br': return '\n';
      case 'p': case 'div': return childContent;
      default: return childContent;
    }
  };

  Array.from(element.childNodes).forEach(node => {
    const text = processNode(node);
    if (text) lines.push(text);
  });

  return lines.join('\n');
}
