/**
 * NotionToBlockNote - Convertit les blocs Notion API en blocs BlockNote
 * 
 * CRITIQUE: Ce convertisseur est la pièce manquante pour le round-trip non-lossy.
 * Il permet d'importer du contenu Notion existant directement dans BlockNote
 * SANS passer par Markdown (qui est lossy).
 * 
 * @module converters/NotionToBlockNote
 */

import type { NotionBlock, NotionRichText, NotionColor } from '../types/notion';

// ============================================================================
// TYPES BLOCKNOTE
// ============================================================================

/**
 * Types BlockNote (basés sur la spec officielle)
 * @see https://www.blocknotejs.org/docs/editor-basics/document-structure
 */

export type BlockNoteInlineContent = 
  | {
      type: 'text';
      text: string;
      styles?: BlockNoteStyles;
    }
  | {
      type: 'link';
      href: string;
      content: BlockNoteInlineContent[];
    };

export interface BlockNoteStyles {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  textColor?: string;
  backgroundColor?: string;
}

export interface BlockNoteBlock {
  id: string;
  type: string;
  props: Record<string, any>;
  content: BlockNoteInlineContent[] | undefined;
  children: BlockNoteBlock[];
}

export interface NotionBlockMapping {
  blocknoteBlockId: string;
  notionBlockId: string;
  notionBlockType: string;
  hash: string;
}

export interface ConversionResult {
  blocks: BlockNoteBlock[];
  mapping: NotionBlockMapping[];
}


// ============================================================================
// CONVERTISSEUR PRINCIPAL
// ============================================================================

/**
 * Convertit des blocs Notion API en blocs BlockNote
 * 
 * @param notionBlocks - Blocs Notion API (depuis GET /blocks/{block_id}/children)
 * @returns Blocs BlockNote + mapping pour sync
 * 
 * @example
 * ```typescript
 * const notionBlocks = await notionApi.getBlocks(pageId);
 * const { blocks, mapping } = notionToBlockNote(notionBlocks);
 * editor.replaceBlocks(editor.document, blocks);
 * ```
 */
export function notionToBlockNote(notionBlocks: NotionBlock[]): ConversionResult {
  const converter = new NotionToBlockNoteConverter();
  return converter.convert(notionBlocks);
}

export class NotionToBlockNoteConverter {
  private mapping: NotionBlockMapping[] = [];
  private idCounter = 0;

  /**
   * Convertit un tableau de blocs Notion en blocs BlockNote
   */
  convert(notionBlocks: NotionBlock[]): ConversionResult {
    this.mapping = [];
    this.idCounter = 0;

    const blocks = notionBlocks
      .map(block => this.convertBlock(block))
      .filter((block): block is BlockNoteBlock => block !== null);

    return {
      blocks,
      mapping: this.mapping,
    };
  }

  /**
   * Convertit un bloc Notion individuel
   */
  private convertBlock(notionBlock: NotionBlock): BlockNoteBlock | null {
    const notionBlockId = (notionBlock as any).id || '';
    const blockType = notionBlock.type;

    let result: BlockNoteBlock | null = null;

    switch (blockType) {
      case 'paragraph':
        result = this.convertParagraph(notionBlock);
        break;
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        result = this.convertHeading(notionBlock);
        break;
      case 'bulleted_list_item':
        result = this.convertBulletedListItem(notionBlock);
        break;
      case 'numbered_list_item':
        result = this.convertNumberedListItem(notionBlock);
        break;
      case 'to_do':
        result = this.convertToDo(notionBlock);
        break;
      case 'toggle':
        result = this.convertToggle(notionBlock);
        break;
      case 'quote':
        result = this.convertQuote(notionBlock);
        break;
      case 'callout':
        result = this.convertCallout(notionBlock);
        break;
      case 'code':
        result = this.convertCode(notionBlock);
        break;
      case 'divider':
        result = this.convertDivider();
        break;
      case 'image':
        result = this.convertImage(notionBlock);
        break;
      case 'video':
        result = this.convertVideo(notionBlock);
        break;
      case 'audio':
        result = this.convertAudio(notionBlock);
        break;
      case 'file':
        result = this.convertFile(notionBlock);
        break;
      case 'bookmark':
        result = this.convertBookmark(notionBlock);
        break;
      case 'equation':
        result = this.convertEquation(notionBlock);
        break;
      case 'table':
        result = this.convertTable(notionBlock);
        break;
      case 'column_list':
        result = this.convertColumnList(notionBlock);
        break;
      case 'column':
        result = this.convertColumn(notionBlock);
        break;
      case 'synced_block':
        result = this.convertSyncedBlock(notionBlock);
        break;
      default:
        console.warn(`[NotionToBlockNote] Unknown block type: ${blockType}`);
        // Fallback: convertir en paragraphe
        result = this.convertUnknownBlock(notionBlock);
    }

    // Ajouter au mapping si conversion réussie
    if (result && notionBlockId) {
      this.mapping.push({
        blocknoteBlockId: result.id,
        notionBlockId,
        notionBlockType: blockType,
        hash: this.computeHash(notionBlock),
      });
    }

    return result;
  }

  // ==========================================================================
  // CONVERTISSEURS PAR TYPE
  // ==========================================================================

  private convertParagraph(block: NotionBlock): BlockNoteBlock {
    const data = (block as any).paragraph;
    return {
      id: this.generateId(),
      type: 'paragraph',
      props: {
        textColor: this.convertColor(data?.color),
        backgroundColor: this.convertBackgroundColor(data?.color),
      },
      content: this.convertRichText(data?.rich_text || []),
      children: this.convertChildren(block),
    };
  }

  private convertHeading(block: NotionBlock): BlockNoteBlock {
    const level = block.type === 'heading_1' ? 1 : block.type === 'heading_2' ? 2 : 3;
    const data = (block as any)[block.type];
    const isToggleable = data?.is_toggleable || false;

    return {
      id: this.generateId(),
      type: 'heading',
      props: {
        level,
        textColor: this.convertColor(data?.color),
        backgroundColor: this.convertBackgroundColor(data?.color),
        // Custom prop pour toggle heading (sera géré par custom block)
        isToggleable,
      },
      content: this.convertRichText(data?.rich_text || []),
      children: isToggleable ? this.convertChildren(block) : [],
    };
  }

  private convertBulletedListItem(block: NotionBlock): BlockNoteBlock {
    const data = (block as any).bulleted_list_item;
    return {
      id: this.generateId(),
      type: 'bulletListItem',
      props: {
        textColor: this.convertColor(data?.color),
        backgroundColor: this.convertBackgroundColor(data?.color),
      },
      content: this.convertRichText(data?.rich_text || []),
      children: this.convertChildren(block),
    };
  }

  private convertNumberedListItem(block: NotionBlock): BlockNoteBlock {
    const data = (block as any).numbered_list_item;
    return {
      id: this.generateId(),
      type: 'numberedListItem',
      props: {
        textColor: this.convertColor(data?.color),
        backgroundColor: this.convertBackgroundColor(data?.color),
      },
      content: this.convertRichText(data?.rich_text || []),
      children: this.convertChildren(block),
    };
  }

  private convertToDo(block: NotionBlock): BlockNoteBlock {
    const data = (block as any).to_do;
    return {
      id: this.generateId(),
      type: 'checkListItem',
      props: {
        checked: data?.checked || false,
        textColor: this.convertColor(data?.color),
        backgroundColor: this.convertBackgroundColor(data?.color),
      },
      content: this.convertRichText(data?.rich_text || []),
      children: this.convertChildren(block),
    };
  }

  private convertToggle(block: NotionBlock): BlockNoteBlock {
    const data = (block as any).toggle;
    return {
      id: this.generateId(),
      type: 'toggle', // Custom block
      props: {
        textColor: this.convertColor(data?.color),
        backgroundColor: this.convertBackgroundColor(data?.color),
      },
      content: this.convertRichText(data?.rich_text || []),
      children: this.convertChildren(block),
    };
  }

  private convertQuote(block: NotionBlock): BlockNoteBlock {
    const data = (block as any).quote;
    return {
      id: this.generateId(),
      type: 'quote', // Custom block
      props: {
        textColor: this.convertColor(data?.color),
        backgroundColor: this.convertBackgroundColor(data?.color),
      },
      content: this.convertRichText(data?.rich_text || []),
      children: this.convertChildren(block),
    };
  }

  private convertCallout(block: NotionBlock): BlockNoteBlock {
    const data = (block as any).callout;
    const icon = data?.icon?.emoji || data?.icon?.external?.url || '💡';
    
    return {
      id: this.generateId(),
      type: 'callout', // Custom block
      props: {
        icon,
        textColor: this.convertColor(data?.color),
        backgroundColor: this.convertBackgroundColor(data?.color),
      },
      content: this.convertRichText(data?.rich_text || []),
      children: this.convertChildren(block),
    };
  }

  private convertCode(block: NotionBlock): BlockNoteBlock {
    const data = (block as any).code;
    const codeText = data?.rich_text?.map((rt: NotionRichText) => rt.plain_text || rt.text?.content || '').join('') || '';
    
    return {
      id: this.generateId(),
      type: 'codeBlock',
      props: {
        language: data?.language || 'plain text',
      },
      content: [{
        type: 'text',
        text: codeText,
        styles: {},
      }],
      children: [],
    };
  }

  private convertDivider(): BlockNoteBlock {
    return {
      id: this.generateId(),
      type: 'divider', // Custom block ou natif selon BlockNote version
      props: {},
      content: undefined,
      children: [],
    };
  }

  private convertImage(block: NotionBlock): BlockNoteBlock {
    const data = (block as any).image;
    const url = data?.external?.url || data?.file?.url || '';
    const caption = this.richTextToPlainText(data?.caption || []);

    return {
      id: this.generateId(),
      type: 'image',
      props: {
        url,
        caption,
        previewWidth: 512,
      },
      content: undefined,
      children: [],
    };
  }

  private convertVideo(block: NotionBlock): BlockNoteBlock {
    const data = (block as any).video;
    const url = data?.external?.url || data?.file?.url || '';
    const caption = this.richTextToPlainText(data?.caption || []);

    return {
      id: this.generateId(),
      type: 'video',
      props: {
        url,
        caption,
        previewWidth: 512,
      },
      content: undefined,
      children: [],
    };
  }

  private convertAudio(block: NotionBlock): BlockNoteBlock {
    const data = (block as any).audio;
    const url = data?.external?.url || data?.file?.url || '';
    const caption = this.richTextToPlainText(data?.caption || []);

    return {
      id: this.generateId(),
      type: 'audio',
      props: {
        url,
        caption,
      },
      content: undefined,
      children: [],
    };
  }

  private convertFile(block: NotionBlock): BlockNoteBlock {
    const data = (block as any).file;
    const url = data?.external?.url || data?.file?.url || '';
    const name = data?.name || data?.external?.name || 'file';
    const caption = this.richTextToPlainText(data?.caption || []);

    return {
      id: this.generateId(),
      type: 'file',
      props: {
        url,
        name,
        caption,
      },
      content: undefined,
      children: [],
    };
  }

  private convertBookmark(block: NotionBlock): BlockNoteBlock {
    const data = (block as any).bookmark;
    const url = data?.url || '';
    const caption = this.richTextToPlainText(data?.caption || []);

    return {
      id: this.generateId(),
      type: 'bookmark', // Custom block
      props: {
        url,
        caption,
      },
      content: undefined,
      children: [],
    };
  }

  private convertEquation(block: NotionBlock): BlockNoteBlock {
    const data = (block as any).equation;
    
    return {
      id: this.generateId(),
      type: 'equation', // Custom block
      props: {
        expression: data?.expression || '',
      },
      content: undefined,
      children: [],
    };
  }

  private convertTable(block: NotionBlock): BlockNoteBlock {
    const data = (block as any).table;
    const children = (block as any).children || [];
    
    // Convertir les rows
    const rows = children
      .filter((child: any) => child.type === 'table_row')
      .map((row: any) => {
        const cells = row.table_row?.cells || [];
        return cells.map((cell: NotionRichText[]) => this.convertRichText(cell));
      });

    return {
      id: this.generateId(),
      type: 'table',
      props: {
        textColor: 'default',
      },
      content: {
        type: 'tableContent',
        rows: rows.map((row: any, rowIndex: number) => ({
          cells: row.map((cell: any) => cell),
        })),
      } as any,
      children: [],
    };
  }

  private convertColumnList(block: NotionBlock): BlockNoteBlock {
    const children = (block as any).children || [];
    
    return {
      id: this.generateId(),
      type: 'columnList', // Custom block
      props: {},
      content: undefined,
      children: children.map((child: NotionBlock) => this.convertBlock(child)).filter(Boolean) as BlockNoteBlock[],
    };
  }

  private convertColumn(block: NotionBlock): BlockNoteBlock {
    const children = (block as any).children || [];
    
    return {
      id: this.generateId(),
      type: 'column', // Custom block
      props: {},
      content: undefined,
      children: children.map((child: NotionBlock) => this.convertBlock(child)).filter(Boolean) as BlockNoteBlock[],
    };
  }

  private convertSyncedBlock(block: NotionBlock): BlockNoteBlock {
    const data = (block as any).synced_block;
    const syncedFrom = data?.synced_from?.block_id || null;
    const children = (block as any).children || [];

    return {
      id: this.generateId(),
      type: 'syncedBlock', // Custom block
      props: {
        syncedFrom,
        isOriginal: !syncedFrom,
      },
      content: undefined,
      children: children.map((child: NotionBlock) => this.convertBlock(child)).filter(Boolean) as BlockNoteBlock[],
    };
  }

  private convertUnknownBlock(block: NotionBlock): BlockNoteBlock {
    // Essayer d'extraire du texte si possible
    const data = (block as any)[block.type];
    const richText = data?.rich_text || [];
    
    return {
      id: this.generateId(),
      type: 'paragraph',
      props: {
        textColor: 'default',
        backgroundColor: 'default',
      },
      content: richText.length > 0 
        ? this.convertRichText(richText)
        : [{ type: 'text', text: `[Unsupported: ${block.type}]`, styles: {} }],
      children: [],
    };
  }


  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Convertit le rich_text Notion en inline content BlockNote
   */
  private convertRichText(richText: NotionRichText[]): BlockNoteInlineContent[] {
    if (!richText || richText.length === 0) {
      return [];
    }

    return richText.map(rt => {
      const text = rt.plain_text || rt.text?.content || '';
      const styles = this.convertAnnotations(rt.annotations);
      const href = rt.href || rt.text?.link?.url || null;

      if (href) {
        return {
          type: 'link' as const,
          href,
          content: [{
            type: 'text' as const,
            text,
            styles,
          }],
        };
      }

      // Gestion des mentions
      if (rt.type === 'mention') {
        const mentionType = rt.mention?.type;
        let mentionText = text;
        
        if (mentionType === 'date') {
          mentionText = rt.mention?.date?.start || text;
        } else if (mentionType === 'user') {
          mentionText = `@${rt.mention?.user?.name || 'user'}`;
        } else if (mentionType === 'page') {
          mentionText = `📄 ${text}`;
        }

        return {
          type: 'text' as const,
          text: mentionText,
          styles: { ...styles, backgroundColor: 'gray' },
        };
      }

      // Gestion des équations inline
      if (rt.type === 'equation') {
        return {
          type: 'text' as const,
          text: `$${rt.equation?.expression || ''}$`,
          styles: { ...styles, code: true },
        };
      }

      return {
        type: 'text' as const,
        text,
        styles,
      };
    });
  }

  /**
   * Convertit les annotations Notion en styles BlockNote
   */
  private convertAnnotations(annotations?: NotionRichText['annotations']): BlockNoteStyles {
    if (!annotations) {
      return {};
    }

    const styles: BlockNoteStyles = {};

    if (annotations.bold) styles.bold = true;
    if (annotations.italic) styles.italic = true;
    if (annotations.underline) styles.underline = true;
    if (annotations.strikethrough) styles.strikethrough = true;
    if (annotations.code) styles.code = true;

    // Convertir les couleurs Notion en couleurs BlockNote
    if (annotations.color && annotations.color !== 'default') {
      if (annotations.color.endsWith('_background')) {
        styles.backgroundColor = this.notionColorToBlockNote(annotations.color);
      } else {
        styles.textColor = this.notionColorToBlockNote(annotations.color);
      }
    }

    return styles;
  }

  /**
   * Convertit une couleur Notion en couleur BlockNote
   */
  private notionColorToBlockNote(notionColor: NotionColor | string): string {
    const colorMap: Record<string, string> = {
      'gray': 'gray',
      'brown': 'brown',
      'orange': 'orange',
      'yellow': 'yellow',
      'green': 'green',
      'blue': 'blue',
      'purple': 'purple',
      'pink': 'pink',
      'red': 'red',
      'gray_background': 'gray',
      'brown_background': 'brown',
      'orange_background': 'orange',
      'yellow_background': 'yellow',
      'green_background': 'green',
      'blue_background': 'blue',
      'purple_background': 'purple',
      'pink_background': 'pink',
      'red_background': 'red',
    };

    return colorMap[notionColor] || 'default';
  }

  /**
   * Convertit la couleur de texte Notion
   */
  private convertColor(notionColor?: NotionColor | string): string {
    if (!notionColor || notionColor === 'default') {
      return 'default';
    }
    if (notionColor.endsWith('_background')) {
      return 'default';
    }
    return this.notionColorToBlockNote(notionColor);
  }

  /**
   * Convertit la couleur de fond Notion
   */
  private convertBackgroundColor(notionColor?: NotionColor | string): string {
    if (!notionColor || notionColor === 'default') {
      return 'default';
    }
    if (notionColor.endsWith('_background')) {
      return this.notionColorToBlockNote(notionColor);
    }
    return 'default';
  }

  /**
   * Convertit les enfants d'un bloc Notion
   */
  private convertChildren(block: NotionBlock): BlockNoteBlock[] {
    const children = (block as any).children;
    if (!children || !Array.isArray(children)) {
      return [];
    }

    return children
      .map(child => this.convertBlock(child))
      .filter((b): b is BlockNoteBlock => b !== null);
  }

  /**
   * Convertit rich_text en texte brut
   */
  private richTextToPlainText(richText: NotionRichText[]): string {
    if (!richText || richText.length === 0) {
      return '';
    }
    return richText.map(rt => rt.plain_text || rt.text?.content || '').join('');
  }

  /**
   * Génère un ID unique pour BlockNote
   */
  private generateId(): string {
    this.idCounter++;
    return `bn-${Date.now()}-${this.idCounter}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calcule un hash pour détecter les changements
   */
  private computeHash(block: NotionBlock): string {
    const content = JSON.stringify(block);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

// La classe est déjà exportée avec 'export class'
