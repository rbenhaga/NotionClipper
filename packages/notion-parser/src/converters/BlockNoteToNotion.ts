/**
 * BlockNoteToNotion - Convertit les blocs BlockNote en blocs Notion API
 * 
 * CRITIQUE: Ce convertisseur permet d'exporter le contenu de l'éditeur
 * vers Notion API SANS passer par Markdown (qui est lossy).
 * 
 * @module converters/BlockNoteToNotion
 */

import type { NotionBlock, NotionRichText, NotionColor } from '../types/notion';
import type { BlockNoteBlock, BlockNoteInlineContent, BlockNoteStyles } from './NotionToBlockNote';

// ============================================================================
// TYPES
// ============================================================================

export interface BlockNoteToNotionOptions {
  /** Préserver les IDs BlockNote dans les métadonnées */
  preserveIds?: boolean;
  /** Convertir les custom blocks en blocs Notion natifs */
  convertCustomBlocks?: boolean;
}

// ============================================================================
// CONVERTISSEUR PRINCIPAL
// ============================================================================

/**
 * Convertit des blocs BlockNote en blocs Notion API
 * 
 * @param blocknoteBlocks - Blocs BlockNote (editor.document)
 * @param options - Options de conversion
 * @returns Blocs Notion API prêts pour l'envoi
 * 
 * @example
 * ```typescript
 * const notionBlocks = blockNoteToNotion(editor.document);
 * await notionApi.appendBlocks(pageId, notionBlocks);
 * ```
 */
export function blockNoteToNotion(
  blocknoteBlocks: BlockNoteBlock[],
  options: BlockNoteToNotionOptions = {}
): NotionBlock[] {
  const converter = new BlockNoteToNotionConverter(options);
  return converter.convert(blocknoteBlocks);
}

export class BlockNoteToNotionConverter {
  private options: Required<BlockNoteToNotionOptions>;

  constructor(options: BlockNoteToNotionOptions = {}) {
    this.options = {
      preserveIds: options.preserveIds ?? false,
      convertCustomBlocks: options.convertCustomBlocks ?? true,
    };
  }


  /**
   * Convertit un tableau de blocs BlockNote en blocs Notion
   */
  convert(blocknoteBlocks: BlockNoteBlock[]): NotionBlock[] {
    return blocknoteBlocks
      .map(block => this.convertBlock(block))
      .filter((block): block is NotionBlock => block !== null);
  }

  /**
   * Convertit un bloc BlockNote individuel
   */
  private convertBlock(block: BlockNoteBlock): NotionBlock | null {
    switch (block.type) {
      case 'paragraph':
        return this.convertParagraph(block);
      case 'heading':
        return this.convertHeading(block);
      case 'bulletListItem':
        return this.convertBulletListItem(block);
      case 'numberedListItem':
        return this.convertNumberedListItem(block);
      case 'checkListItem':
        return this.convertCheckListItem(block);
      case 'toggle':
        return this.convertToggle(block);
      case 'quote':
        return this.convertQuote(block);
      case 'callout':
        return this.convertCallout(block);
      case 'codeBlock':
        return this.convertCodeBlock(block);
      case 'divider':
        return this.convertDivider();
      case 'image':
        return this.convertImage(block);
      case 'video':
        return this.convertVideo(block);
      case 'audio':
        return this.convertAudio(block);
      case 'file':
        return this.convertFile(block);
      case 'bookmark':
        return this.convertBookmark(block);
      case 'equation':
        return this.convertEquation(block);
      case 'table':
        return this.convertTable(block);
      case 'columnList':
        return this.convertColumnList(block);
      case 'column':
        return this.convertColumn(block);
      case 'syncedBlock':
        return this.convertSyncedBlock(block);
      default:
        console.warn(`[BlockNoteToNotion] Unknown block type: ${block.type}`);
        return this.convertUnknownBlock(block);
    }
  }


  // ==========================================================================
  // CONVERTISSEURS PAR TYPE
  // ==========================================================================

  private convertParagraph(block: BlockNoteBlock): NotionBlock {
    return {
      type: 'paragraph',
      paragraph: {
        rich_text: this.convertInlineContent(block.content),
        color: this.getNotionColor(block.props),
      },
    };
  }

  private convertHeading(block: BlockNoteBlock): NotionBlock {
    const level = block.props.level || 1;
    const type = `heading_${level}` as 'heading_1' | 'heading_2' | 'heading_3';
    const isToggleable = block.props.isToggleable || false;

    const headingData: any = {
      rich_text: this.convertInlineContent(block.content),
      color: this.getNotionColor(block.props),
    };

    if (isToggleable) {
      headingData.is_toggleable = true;
    }

    const result: any = { type, [type]: headingData };

    // Ajouter les enfants si toggle heading
    if (isToggleable && block.children.length > 0) {
      result[type].children = this.convert(block.children);
    }

    return result;
  }

  private convertBulletListItem(block: BlockNoteBlock): NotionBlock {
    const result: any = {
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: this.convertInlineContent(block.content),
        color: this.getNotionColor(block.props),
      },
    };

    if (block.children.length > 0) {
      result.bulleted_list_item.children = this.convert(block.children);
    }

    return result;
  }

  private convertNumberedListItem(block: BlockNoteBlock): NotionBlock {
    const result: any = {
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: this.convertInlineContent(block.content),
        color: this.getNotionColor(block.props),
      },
    };

    if (block.children.length > 0) {
      result.numbered_list_item.children = this.convert(block.children);
    }

    return result;
  }

  private convertCheckListItem(block: BlockNoteBlock): NotionBlock {
    const result: any = {
      type: 'to_do',
      to_do: {
        rich_text: this.convertInlineContent(block.content),
        checked: block.props.checked || false,
        color: this.getNotionColor(block.props),
      },
    };

    if (block.children.length > 0) {
      result.to_do.children = this.convert(block.children);
    }

    return result;
  }

  private convertToggle(block: BlockNoteBlock): NotionBlock {
    const result: any = {
      type: 'toggle',
      toggle: {
        rich_text: this.convertInlineContent(block.content),
        color: this.getNotionColor(block.props),
      },
    };

    if (block.children.length > 0) {
      result.toggle.children = this.convert(block.children);
    }

    return result;
  }

  private convertQuote(block: BlockNoteBlock): NotionBlock {
    const result: any = {
      type: 'quote',
      quote: {
        rich_text: this.convertInlineContent(block.content),
        color: this.getNotionColor(block.props),
      },
    };

    if (block.children.length > 0) {
      result.quote.children = this.convert(block.children);
    }

    return result;
  }

  private convertCallout(block: BlockNoteBlock): NotionBlock {
    const icon = block.props.icon || '💡';
    const result: any = {
      type: 'callout',
      callout: {
        rich_text: this.convertInlineContent(block.content),
        icon: { type: 'emoji', emoji: icon },
        color: this.getNotionColor(block.props),
      },
    };

    if (block.children.length > 0) {
      result.callout.children = this.convert(block.children);
    }

    return result;
  }

  private convertCodeBlock(block: BlockNoteBlock): NotionBlock {
    const codeText = this.inlineContentToPlainText(block.content);
    return {
      type: 'code',
      code: {
        rich_text: [{ type: 'text', text: { content: codeText } }],
        language: block.props.language || 'plain text',
        caption: [],
      },
    };
  }

  private convertDivider(): NotionBlock {
    return { type: 'divider', divider: {} };
  }

  private convertImage(block: BlockNoteBlock): NotionBlock {
    const url = block.props.url || '';
    const caption = block.props.caption || '';
    return {
      type: 'image',
      image: {
        type: 'external',
        external: { url },
        caption: caption ? [{ type: 'text', text: { content: caption } }] : [],
      },
    };
  }

  private convertVideo(block: BlockNoteBlock): NotionBlock {
    const url = block.props.url || '';
    return {
      type: 'video',
      video: {
        type: 'external',
        external: { url },
      },
    };
  }

  private convertAudio(block: BlockNoteBlock): NotionBlock {
    const url = block.props.url || '';
    const caption = block.props.caption || '';
    return {
      type: 'audio',
      audio: {
        type: 'external',
        external: { url },
        caption: caption ? [{ type: 'text', text: { content: caption } }] : [],
      },
    };
  }

  private convertFile(block: BlockNoteBlock): NotionBlock {
    const url = block.props.url || '';
    const name = block.props.name || 'file';
    return {
      type: 'file',
      file: {
        type: 'external',
        external: { url },
        name,
      },
    };
  }

  private convertBookmark(block: BlockNoteBlock): NotionBlock {
    const url = block.props.url || '';
    const caption = block.props.caption || '';
    return {
      type: 'bookmark',
      bookmark: {
        url,
        caption: caption ? [{ type: 'text', text: { content: caption } }] : [],
      },
    };
  }

  private convertEquation(block: BlockNoteBlock): NotionBlock {
    return {
      type: 'equation',
      equation: {
        expression: block.props.expression || '',
      },
    };
  }

  private convertTable(block: BlockNoteBlock): NotionBlock {
    const tableContent = block.content as any;
    const rows = tableContent?.rows || [];
    
    const tableRows = rows.map((row: any) => ({
      type: 'table_row',
      table_row: {
        cells: row.cells.map((cell: BlockNoteInlineContent[]) => 
          this.convertInlineContent(cell)
        ),
      },
    }));

    return {
      type: 'table',
      table: {
        table_width: rows[0]?.cells?.length || 1,
        has_column_header: true,
        has_row_header: false,
        children: tableRows,
      },
    };
  }

  private convertColumnList(block: BlockNoteBlock): NotionBlock {
    return {
      type: 'column_list',
      column_list: {
        children: this.convert(block.children),
      },
    } as any;
  }

  private convertColumn(block: BlockNoteBlock): NotionBlock {
    return {
      type: 'column',
      column: {
        children: this.convert(block.children),
      },
    } as any;
  }

  private convertSyncedBlock(block: BlockNoteBlock): NotionBlock {
    const syncedFrom = block.props.syncedFrom;
    
    if (syncedFrom) {
      // Référence vers un bloc synchronisé existant
      return {
        type: 'synced_block',
        synced_block: {
          synced_from: { block_id: syncedFrom },
        },
      } as any;
    }

    // Bloc synchronisé original
    return {
      type: 'synced_block',
      synced_block: {
        synced_from: null,
        children: this.convert(block.children),
      },
    } as any;
  }

  private convertUnknownBlock(block: BlockNoteBlock): NotionBlock {
    // Fallback: convertir en paragraphe
    return {
      type: 'paragraph',
      paragraph: {
        rich_text: block.content 
          ? this.convertInlineContent(block.content)
          : [{ type: 'text', text: { content: `[${block.type}]` } }],
        color: 'default',
      },
    };
  }


  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Convertit le inline content BlockNote en rich_text Notion
   */
  private convertInlineContent(content: BlockNoteInlineContent[] | undefined): NotionRichText[] {
    if (!content || content.length === 0) {
      return [];
    }

    const result: NotionRichText[] = [];

    for (const item of content) {
      if (item.type === 'link') {
        // Lien avec contenu
        const linkContent = item.content || [];
        for (const linkItem of linkContent) {
          if (linkItem.type === 'text') {
            result.push({
              type: 'text',
              text: {
                content: linkItem.text || '',
                link: { url: item.href || '' },
              },
              annotations: this.convertStyles(linkItem.styles),
            });
          }
        }
      } else if (item.type === 'text') {
        // Texte simple
        result.push({
          type: 'text',
          text: { content: item.text || '' },
          annotations: this.convertStyles(item.styles),
        });
      }
    }

    return result;
  }

  /**
   * Convertit les styles BlockNote en annotations Notion
   */
  private convertStyles(styles?: BlockNoteStyles): NotionRichText['annotations'] {
    if (!styles) {
      return {};
    }

    const annotations: NotionRichText['annotations'] = {};

    if (styles.bold) annotations.bold = true;
    if (styles.italic) annotations.italic = true;
    if (styles.underline) annotations.underline = true;
    if (styles.strikethrough) annotations.strikethrough = true;
    if (styles.code) annotations.code = true;

    // Convertir les couleurs
    if (styles.textColor && styles.textColor !== 'default') {
      annotations.color = styles.textColor as NotionColor;
    } else if (styles.backgroundColor && styles.backgroundColor !== 'default') {
      annotations.color = `${styles.backgroundColor}_background` as NotionColor;
    }

    return annotations;
  }

  /**
   * Obtient la couleur Notion depuis les props BlockNote
   */
  private getNotionColor(props: Record<string, any>): NotionColor {
    if (props.backgroundColor && props.backgroundColor !== 'default') {
      return `${props.backgroundColor}_background` as NotionColor;
    }
    if (props.textColor && props.textColor !== 'default') {
      return props.textColor as NotionColor;
    }
    return 'default';
  }

  /**
   * Convertit inline content en texte brut
   */
  private inlineContentToPlainText(content: BlockNoteInlineContent[] | undefined): string {
    if (!content || content.length === 0) {
      return '';
    }

    return content.map(item => {
      if (item.type === 'link') {
        return item.content?.map(c => c.type === 'text' ? c.text : '').join('') || '';
      }
      return item.text || '';
    }).join('');
  }
}

// La classe est déjà exportée avec 'export class'
