import type { ASTNode, NotionBlock, NotionColor, ConversionOptions } from '../types';
import { RichTextConverter } from './RichTextConverter';

export class NotionConverter {
  private richTextConverter = new RichTextConverter();
  
  // Mapping des langages vers les noms acceptés par Notion API
  private languageMapping: { [key: string]: string } = {
    'csharp': 'c#',
    'cs': 'c#',
    'dotnet': 'c#',
    'fsharp': 'f#',
    'fs': 'f#',
    'cplusplus': 'c++',
    'cpp': 'c++',
    'cxx': 'c++',
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell',
    'ps1': 'powershell',
    'pwsh': 'powershell',
    'yml': 'yaml',
    'tex': 'latex',
    'md': 'markdown',
    'htm': 'html',
    'xhtml': 'html',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'vue': 'javascript',
    'svelte': 'javascript'
  };

  convert(nodes: ASTNode[], options: ConversionOptions = {}): NotionBlock[] {
    const blocks: NotionBlock[] = [];

    for (const node of nodes) {
      // ✅ ARCHITECTURE CORRIGÉE : Convertir et aplatir récursivement
      this.convertNodeFlat(node, options, blocks);
    }

    return blocks;
  }

  /**
   * Convertit un nœud et ajoute tous ses blocs (parent + enfants) à la liste de blocs
   * de manière plate, conforme à l'API Notion
   */
  private convertNodeFlat(node: ASTNode, options: ConversionOptions, blocks: NotionBlock[]): void {
    const block = this.convertNode(node, options);
    if (!block) return;

    // Ajouter le bloc parent
    blocks.push(block);

    // Si le nœud a des enfants, les convertir et les ajouter au même niveau
    if (node.children && node.children.length > 0) {
      // Marquer le parent comme ayant des enfants
      (block as any).has_children = true;
      
      // Convertir récursivement les enfants et les ajouter au même niveau
      for (const child of node.children) {
        this.convertNodeFlat(child, options, blocks);
      }
    }
  }

  private convertNode(node: ASTNode, options: ConversionOptions): NotionBlock | null {
    switch (node.type) {
      case 'text':
        return this.convertText(node, options);
      case 'heading':
        return this.convertHeading(node, options);
      case 'list_item':
        return this.convertListItem(node, options);
      case 'code':
        return this.convertCode(node, options);
      case 'table':
        return this.convertTable(node, options);
      case 'callout':
        return this.convertCallout(node, options);
      case 'image':
      case 'video':
      case 'audio':
      case 'file':
        return this.convertMedia(node, options);
      case 'equation':
        return this.convertEquation(node, options);
      case 'quote':
        return this.convertQuote(node, options);
      case 'divider':
        return this.convertDivider();
      case 'toggle':
        return this.convertToggle(node, options);
      case 'bookmark':
        return this.convertBookmark(node, options);
      default:
        return null;
    }
  }

  private normalizeLanguage(language: string): string {
    const normalized = language.toLowerCase().trim();
    return this.languageMapping[normalized] || normalized;
  }

  private convertText(node: ASTNode, options: ConversionOptions): NotionBlock {
    const richText = options.preserveFormatting 
      ? this.richTextConverter.parseRichText(node.content || '', { convertLinks: options.convertLinks })
      : [{ type: 'text' as const, text: { content: node.content || '' } }];

    return {
      type: 'paragraph',
      paragraph: {
        rich_text: richText,
        color: (node.metadata?.color as NotionColor) || 'default'
      }
    };
  }

  private convertHeading(node: ASTNode, options: ConversionOptions): NotionBlock {
    const level = node.metadata?.level || 1;
    const type = `heading_${level}` as const;
    const richText = options.preserveFormatting 
      ? this.richTextConverter.parseRichText(node.content || '', { convertLinks: options.convertLinks })
      : [{ type: 'text' as const, text: { content: node.content || '' } }];

    const block: any = {
      type,
      [type]: {
        rich_text: richText,
        color: (node.metadata?.color as NotionColor) || 'default',
        is_toggleable: node.metadata?.isToggleable || false
      }
    };

    // ✅ Children gérés par convertNodeFlat() - ne pas les ajouter ici
    return block;
  }

  private convertListItem(node: ASTNode, options: ConversionOptions): NotionBlock {
    const richText = options.preserveFormatting 
      ? this.richTextConverter.parseRichText(node.content || '', { convertLinks: options.convertLinks })
      : [{ type: 'text' as const, text: { content: node.content || '' } }];

    // Determine list type from metadata or parent
    const listType = node.metadata?.listType || 'bulleted';
    const checked = node.metadata?.checked;

    let block: NotionBlock;

    if (listType === 'todo') {
      block = {
        type: 'to_do',
        to_do: {
          rich_text: richText,
          checked: checked || false,
          color: (node.metadata?.color as NotionColor) || 'default'
        }
      };
    } else if (listType === 'numbered') {
      block = {
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: richText,
          color: (node.metadata?.color as NotionColor) || 'default'
        }
      };
    } else {
      block = {
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: richText,
          color: (node.metadata?.color as NotionColor) || 'default'
        }
      };
    }

    // ✅ Children gérés par convertNodeFlat() - ne pas les ajouter ici
    return block;
  }

  private convertCode(node: ASTNode, _options: ConversionOptions): NotionBlock {
    const rawLanguage = node.metadata?.language || 'plain text';
    const language = this.normalizeLanguage(rawLanguage);
    const isBlock = node.metadata?.isBlock !== false;

    if (isBlock) {
      return {
        type: 'code',
        code: {
          rich_text: [{
            type: 'text',
            text: { content: node.content || '' }
          }],
          language,
          caption: []
        }
      };
    } else {
      // Inline code - convert to paragraph with code formatting
      return {
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: node.content || '' },
            annotations: { code: true }
          }],
          color: 'default'
        }
      };
    }
  }

  private convertTable(node: ASTNode, _options: ConversionOptions): NotionBlock {
    const headers = node.metadata?.headers || [];
    const rows = node.metadata?.rows || [];
    const tableWidth = headers.length;

    const tableRows: any[] = [];

    // Header row
    if (headers.length > 0) {
      tableRows.push({
        type: 'table_row',
        table_row: {
          cells: headers.map((header: string) => [{
            type: 'text',
            text: { content: header }
          }])
        }
      });
    }

    // Data rows
    for (const row of rows) {
      const normalizedRow = [...row];
      while (normalizedRow.length < tableWidth) normalizedRow.push('');
      if (normalizedRow.length > tableWidth) normalizedRow.length = tableWidth;

      tableRows.push({
        type: 'table_row',
        table_row: {
          cells: normalizedRow.map(cell => [{
            type: 'text',
            text: { content: cell }
          }])
        }
      });
    }

    return {
      type: 'table',
      table: {
        table_width: tableWidth,
        has_column_header: node.metadata?.hasColumnHeader !== false,
        has_row_header: node.metadata?.hasRowHeader || false,
        children: tableRows
      }
    };
  }

  private convertCallout(node: ASTNode, options: ConversionOptions): NotionBlock {
    const richText = options.preserveFormatting 
      ? this.richTextConverter.parseRichText(node.content || '', { convertLinks: options.convertLinks })
      : [{ type: 'text' as const, text: { content: node.content || '' } }];

    return {
      type: 'callout',
      callout: {
        rich_text: richText,
        icon: {
          type: 'emoji',
          emoji: node.metadata?.icon || '💡'
        },
        color: (node.metadata?.color as NotionColor) || 'gray_background'
      }
    };
  }

  private convertMedia(node: ASTNode, options: ConversionOptions): NotionBlock {
    const url = node.metadata?.url;
    const caption = node.metadata?.caption;
    // const alt = node.metadata?.alt; // Not used in current implementation

    if (!url) {
      return this.convertText({ type: 'text', content: node.content || '' }, options);
    }

    // Check conversion options
    if (node.type === 'image' && options.convertImages === false) {
      // Convert to text instead of image block
      const imageText = caption ? `![${caption}](${url})` : `![image](${url})`;
      return this.convertText({ type: 'text', content: imageText }, options);
    }

    if (node.type === 'video' && options.convertVideos === false) {
      // Convert to text instead of video block
      const videoText = caption ? `[${caption}](${url})` : `[video](${url})`;
      return this.convertText({ type: 'text', content: videoText }, options);
    }

    const captionRichText = caption ? [{
      type: 'text' as const,
      text: { content: caption }
    }] : [];

    switch (node.type) {
      case 'image':
        return {
          type: 'image',
          image: {
            type: 'external',
            external: { url },
            caption: captionRichText
          }
        };

      case 'video':
        return {
          type: 'video',
          video: {
            type: 'external',
            external: { url }
          }
        };

      case 'audio':
        return {
          type: 'audio',
          audio: {
            type: 'external',
            external: { url },
            caption: captionRichText
          }
        };

      case 'file':
        if (url.toLowerCase().endsWith('.pdf')) {
          return {
            type: 'pdf',
            pdf: {
              type: 'external',
              external: { url },
              caption: captionRichText
            }
          };
        }
        // Fall through to bookmark for other files
        return {
          type: 'bookmark',
          bookmark: {
            url,
            caption: captionRichText
          }
        };

      default:
        return {
          type: 'bookmark',
          bookmark: {
            url,
            caption: captionRichText
          }
        };
    }
  }

  private convertEquation(node: ASTNode, _options: ConversionOptions): NotionBlock {
    const isBlock = node.metadata?.isBlock !== false;
    const expression = node.content || '';

    if (isBlock) {
      return {
        type: 'equation',
        equation: {
          expression
        }
      };
    } else {
      // Inline equation - convert to paragraph with equation
      return {
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'equation',
            equation: { expression }
          }],
          color: 'default'
        }
      };
    }
  }

  private convertQuote(node: ASTNode, options: ConversionOptions): NotionBlock {
    const richText = options.preserveFormatting 
      ? this.richTextConverter.parseRichText(node.content || '', { convertLinks: options.convertLinks })
      : [{ type: 'text' as const, text: { content: node.content || '' } }];

    return {
      type: 'quote',
      quote: {
        rich_text: richText,
        color: (node.metadata?.color as NotionColor) || 'default'
      }
    };
  }

  private convertDivider(): NotionBlock {
    return {
      type: 'divider',
      divider: {}
    };
  }

  private convertToggle(node: ASTNode, options: ConversionOptions): NotionBlock {
    const richText = options.preserveFormatting 
      ? this.richTextConverter.parseRichText(node.content || '', { convertLinks: options.convertLinks })
      : [{ type: 'text' as const, text: { content: node.content || '' } }];

    const block: NotionBlock = {
      type: 'toggle',
      toggle: {
        rich_text: richText,
        color: (node.metadata?.color as NotionColor) || 'default'
      }
    };

    // ✅ Children gérés par convertNodeFlat() - ne pas les ajouter ici
    return block;
  }

  private convertBookmark(node: ASTNode, options: ConversionOptions): NotionBlock {
    const url = node.metadata?.url;
    const caption = node.metadata?.title || node.metadata?.description;

    if (!url) {
      return this.convertText({ type: 'text', content: node.content || url || '' }, options);
    }

    return {
      type: 'bookmark',
      bookmark: {
        url,
        caption: caption ? [{
          type: 'text',
          text: { content: caption }
        }] : []
      }
    };
  }
}