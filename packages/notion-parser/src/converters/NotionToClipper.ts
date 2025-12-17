/**
 * NotionToClipper - Convertit les blocs Notion API en ClipperDoc
 * 
 * Ce convertisseur est la PREMIÈRE étape du pipeline:
 * Notion API → ClipperDoc (source de vérité)
 * 
 * Il préserve:
 * - Tout le texte (100%)
 * - La structure hiérarchique
 * - Les IDs Notion pour le mapping
 * - Le formatage (bold, italic, etc.)
 * - Les couleurs
 * 
 * Il dégrade (voir LOSS_BUDGET.md):
 * - Columns → séquence linéaire
 * - Synced blocks → placeholder
 * - Mentions → texte formaté
 * 
 * @module converters/NotionToClipper
 */

import type { NotionBlock, NotionRichText, NotionColor } from '../types/notion';
import type {
  ClipperDocument,
  ClipperBlock,
  ClipperBlockType,
  ClipperBlockProps,
  ClipperInlineContent,
  ClipperText,
  ClipperLink,
  ClipperMention,
  ClipperTextStyles,
  ClipperColor,
  ClipperBlockMapping,
  ClipperNotionMapping,
  ParagraphProps,
  HeadingProps,
  ListItemProps,
  ToggleProps,
  QuoteProps,
  CalloutProps,
  CodeProps,
  ImageProps,
  VideoProps,
  AudioProps,
  FileProps,
  BookmarkProps,
  DividerProps,
  EquationProps,
  TableProps,
  TableRowProps,
  ColumnListProps,
  ColumnProps,
  SyncedBlockProps,
  UnsupportedProps,
} from '../types/clipper';
import {
  generateClipperId,
  computeBlockHash,
  computeDocumentStats,
} from '../types/clipper';

// ============================================================================
// TYPES
// ============================================================================

export interface NotionToClipperOptions {
  /** ID de la page Notion source */
  pageId?: string;
  /** ID du workspace Notion */
  workspaceId?: string;
  /** Titre du document */
  title?: string;
}

export interface NotionToClipperResult {
  document: ClipperDocument;
  warnings: ConversionWarning[];
}

export interface ConversionWarning {
  blockId: string;
  blockType: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

// ============================================================================
// CONVERTISSEUR PRINCIPAL
// ============================================================================

/**
 * Convertit des blocs Notion API en ClipperDocument
 */
export function notionToClipper(
  notionBlocks: NotionBlock[],
  options?: NotionToClipperOptions
): NotionToClipperResult {
  const converter = new NotionToClipperConverter(options);
  return converter.convert(notionBlocks);
}

export class NotionToClipperConverter {
  private options: NotionToClipperOptions;
  private warnings: ConversionWarning[] = [];
  private blockMappings: ClipperBlockMapping[] = [];
  private orderIndex = 0;

  constructor(options?: NotionToClipperOptions) {
    this.options = options || {};
  }

  convert(notionBlocks: NotionBlock[]): NotionToClipperResult {
    this.warnings = [];
    this.blockMappings = [];
    this.orderIndex = 0;

    const now = new Date().toISOString();
    const content = this.convertBlocks(notionBlocks, null);
    const stats = computeDocumentStats(content);

    const document: ClipperDocument = {
      schemaVersion: '1.0',
      id: generateClipperId(),
      metadata: {
        title: this.options.title || 'Imported from Notion',
        createdAt: now,
        updatedAt: now,
        source: {
          type: 'notion',
          notionPageId: this.options.pageId,
          notionWorkspaceId: this.options.workspaceId,
        },
        stats,
      },
      content,
      notionMapping: this.createMapping(),
    };

    return {
      document,
      warnings: this.warnings,
    };
  }

  private createMapping(): ClipperNotionMapping {
    return {
      pageId: this.options.pageId || null,
      workspaceId: this.options.workspaceId || null,
      lastSyncedAt: new Date().toISOString(),
      syncStatus: 'synced',
      blockMappings: this.blockMappings,
    };
  }

  private convertBlocks(
    notionBlocks: NotionBlock[],
    parentClipperId: string | null
  ): ClipperBlock[] {
    return notionBlocks
      .map(block => this.convertBlock(block, parentClipperId))
      .filter((block): block is ClipperBlock => block !== null);
  }

  private convertBlock(
    notionBlock: NotionBlock,
    parentClipperId: string | null
  ): ClipperBlock | null {
    const notionBlockId = (notionBlock as any).id || '';
    const blockType = notionBlock.type;

    let result: ClipperBlock | null = null;

    switch (blockType) {
      case 'paragraph':
        result = this.convertParagraph(notionBlock);
        break;
      case 'heading_1':
        result = this.convertHeading(notionBlock, 1);
        break;
      case 'heading_2':
        result = this.convertHeading(notionBlock, 2);
        break;
      case 'heading_3':
        result = this.convertHeading(notionBlock, 3);
        break;
      case 'bulleted_list_item':
        result = this.convertListItem(notionBlock, 'bulletList');
        break;
      case 'numbered_list_item':
        result = this.convertListItem(notionBlock, 'numberedList');
        break;
      case 'to_do':
        result = this.convertTodo(notionBlock);
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
      case 'table_row':
        result = this.convertTableRow(notionBlock);
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
      // Blocs non supportés
      case 'child_page':
      case 'child_database':
      case 'template':
      case 'breadcrumb':
      case 'table_of_contents':
        result = this.convertUnsupported(notionBlock);
        break;
      default:
        this.addWarning(notionBlockId, blockType, `Unknown block type: ${blockType}`, 'warning');
        result = this.convertUnsupported(notionBlock);
    }

    // Ajouter au mapping
    if (result && notionBlockId) {
      this.blockMappings.push({
        clipperId: result.id,
        notionBlockId,
        notionBlockType: blockType,
        syncedContentHash: result._meta.contentHash,
        syncedOrderIndex: this.orderIndex++,
        syncedParentId: parentClipperId,
        status: 'synced',
      });

      // Mettre à jour les métadonnées du bloc
      result._meta.notionBlockId = notionBlockId;
      result._meta.notionBlockType = blockType;
    }

    return result;
  }

  // ==========================================================================
  // CONVERTISSEURS PAR TYPE
  // ==========================================================================

  private convertParagraph(block: NotionBlock): ClipperBlock {
    const data = (block as any).paragraph;
    const props: ParagraphProps = {
      textColor: this.convertColor(data?.color),
      backgroundColor: this.convertBackgroundColor(data?.color),
    };

    return this.createBlock('paragraph', props, {
      content: this.convertRichText(data?.rich_text || []),
      children: this.convertChildren(block),
    });
  }

  private convertHeading(block: NotionBlock, level: 1 | 2 | 3): ClipperBlock {
    const key = `heading_${level}` as const;
    const data = (block as any)[key];
    const isToggleable = data?.is_toggleable || false;

    const props: HeadingProps = {
      level,
      isToggleable,
      textColor: this.convertColor(data?.color),
      backgroundColor: this.convertBackgroundColor(data?.color),
    };

    return this.createBlock(`heading${level}` as ClipperBlockType, props, {
      content: this.convertRichText(data?.rich_text || []),
      children: isToggleable ? this.convertChildren(block) : [],
    });
  }

  private convertListItem(
    block: NotionBlock,
    listType: 'bulletList' | 'numberedList'
  ): ClipperBlock {
    const key = listType === 'bulletList' ? 'bulleted_list_item' : 'numbered_list_item';
    const data = (block as any)[key];

    const props: ListItemProps = {
      textColor: this.convertColor(data?.color),
      backgroundColor: this.convertBackgroundColor(data?.color),
    };

    return this.createBlock(listType, props, {
      content: this.convertRichText(data?.rich_text || []),
      children: this.convertChildren(block),
    });
  }

  private convertTodo(block: NotionBlock): ClipperBlock {
    const data = (block as any).to_do;

    const props: ListItemProps = {
      checked: data?.checked || false,
      textColor: this.convertColor(data?.color),
      backgroundColor: this.convertBackgroundColor(data?.color),
    };

    return this.createBlock('todoList', props, {
      content: this.convertRichText(data?.rich_text || []),
      children: this.convertChildren(block),
    });
  }

  private convertToggle(block: NotionBlock): ClipperBlock {
    const data = (block as any).toggle;

    const props: ToggleProps = {
      textColor: this.convertColor(data?.color),
      backgroundColor: this.convertBackgroundColor(data?.color),
    };

    return this.createBlock('toggle', props, {
      content: this.convertRichText(data?.rich_text || []),
      children: this.convertChildren(block),
    });
  }

  private convertQuote(block: NotionBlock): ClipperBlock {
    const data = (block as any).quote;

    const props: QuoteProps = {
      textColor: this.convertColor(data?.color),
      backgroundColor: this.convertBackgroundColor(data?.color),
    };

    return this.createBlock('quote', props, {
      content: this.convertRichText(data?.rich_text || []),
      children: this.convertChildren(block),
    });
  }

  private convertCallout(block: NotionBlock): ClipperBlock {
    const data = (block as any).callout;
    const icon = data?.icon;

    const props: CalloutProps = {
      icon: icon?.emoji || icon?.external?.url || '💡',
      iconType: icon?.type === 'external' ? 'url' : 'emoji',
      backgroundColor: this.convertBackgroundColor(data?.color) || 'grayBackground',
    };

    return this.createBlock('callout', props, {
      content: this.convertRichText(data?.rich_text || []),
      children: this.convertChildren(block),
    });
  }

  private convertCode(block: NotionBlock): ClipperBlock {
    const data = (block as any).code;
    const codeText = this.richTextToPlainText(data?.rich_text || []);

    const props: CodeProps = {
      language: data?.language || 'plain text',
      caption: this.richTextToPlainText(data?.caption || []) || undefined,
    };

    return this.createBlock('code', props, {
      content: [{ type: 'text', text: codeText, styles: {} }],
    });
  }

  private convertDivider(): ClipperBlock {
    const props: DividerProps = {};
    return this.createBlock('divider', props, {});
  }

  private convertImage(block: NotionBlock): ClipperBlock {
    const data = (block as any).image;
    const isFile = data?.type === 'file';

    const props: ImageProps = {
      url: data?.external?.url || data?.file?.url || '',
      caption: this.richTextToPlainText(data?.caption || []) || undefined,
      isNotionHosted: isFile,
      expiresAt: isFile ? data?.file?.expiry_time : undefined,
    };

    if (isFile) {
      this.addWarning(
        (block as any).id || '',
        'image',
        'Notion-hosted image URL will expire. Consider re-uploading.',
        'info'
      );
    }

    return this.createBlock('image', props, {});
  }

  private convertVideo(block: NotionBlock): ClipperBlock {
    const data = (block as any).video;
    const url = data?.external?.url || data?.file?.url || '';

    const props: VideoProps = {
      url,
      caption: this.richTextToPlainText(data?.caption || []) || undefined,
      provider: this.detectVideoProvider(url),
    };

    return this.createBlock('video', props, {});
  }

  private convertAudio(block: NotionBlock): ClipperBlock {
    const data = (block as any).audio;

    const props: AudioProps = {
      url: data?.external?.url || data?.file?.url || '',
      caption: this.richTextToPlainText(data?.caption || []) || undefined,
    };

    return this.createBlock('audio', props, {});
  }

  private convertFile(block: NotionBlock): ClipperBlock {
    const data = (block as any).file;

    const props: FileProps = {
      url: data?.external?.url || data?.file?.url || '',
      name: data?.name || 'file',
      caption: this.richTextToPlainText(data?.caption || []) || undefined,
    };

    return this.createBlock('file', props, {});
  }

  private convertBookmark(block: NotionBlock): ClipperBlock {
    const data = (block as any).bookmark;

    const props: BookmarkProps = {
      url: data?.url || '',
    };

    return this.createBlock('bookmark', props, {});
  }

  private convertEquation(block: NotionBlock): ClipperBlock {
    const data = (block as any).equation;

    const props: EquationProps = {
      expression: data?.expression || '',
    };

    return this.createBlock('equation', props, {});
  }

  private convertTable(block: NotionBlock): ClipperBlock {
    const data = (block as any).table;
    const children = (block as any).children || [];

    const props: TableProps = {
      hasColumnHeader: data?.has_column_header || false,
      hasRowHeader: data?.has_row_header || false,
      columnCount: data?.table_width || 0,
    };

    return this.createBlock('table', props, {
      children: this.convertBlocks(children, null),
    });
  }

  private convertTableRow(block: NotionBlock): ClipperBlock {
    const data = (block as any).table_row;
    const cells = (data?.cells || []).map((cell: NotionRichText[]) => ({
      content: this.convertRichText(cell),
    }));

    const props: TableRowProps = { cells };

    return this.createBlock('tableRow', props, {});
  }

  private convertColumnList(block: NotionBlock): ClipperBlock {
    const children = (block as any).children || [];

    // DÉGRADATION: Les colonnes sont converties en séquence linéaire
    this.addWarning(
      (block as any).id || '',
      'column_list',
      'Column layout will be converted to linear sequence (60% fidelity)',
      'warning'
    );

    const props: ColumnListProps = {
      columnCount: children.length,
    };

    return this.createBlock('columnList', props, {
      children: this.convertBlocks(children, null),
    });
  }

  private convertColumn(block: NotionBlock): ClipperBlock {
    const children = (block as any).children || [];

    const props: ColumnProps = {};

    return this.createBlock('column', props, {
      children: this.convertBlocks(children, null),
    });
  }

  private convertSyncedBlock(block: NotionBlock): ClipperBlock {
    const data = (block as any).synced_block;
    const syncedFrom = data?.synced_from?.block_id || null;
    const children = (block as any).children || [];

    // DÉGRADATION: Les synced blocks perdent leur synchronisation
    if (syncedFrom) {
      this.addWarning(
        (block as any).id || '',
        'synced_block',
        'Synced block reference will be converted to static content (50% fidelity)',
        'warning'
      );
    }

    const props: SyncedBlockProps = {
      syncedFromId: syncedFrom || undefined,
      isOriginal: !syncedFrom,
    };

    return this.createBlock('syncedBlock', props, {
      children: this.convertBlocks(children, null),
    });
  }

  private convertUnsupported(block: NotionBlock): ClipperBlock {
    const blockType = block.type;

    this.addWarning(
      (block as any).id || '',
      blockType,
      `Block type "${blockType}" is not supported and will be dropped`,
      'error'
    );

    const props: UnsupportedProps = {
      originalType: blockType,
      originalData: block,
    };

    return this.createBlock('unsupported', props, {
      content: [{ type: 'text', text: `[Unsupported: ${blockType}]`, styles: {} }],
    });
  }

  // ==========================================================================
  // RICH TEXT
  // ==========================================================================

  private convertRichText(richText: NotionRichText[]): ClipperInlineContent[] {
    if (!richText || richText.length === 0) {
      return [];
    }

    return richText.map(rt => this.convertRichTextItem(rt));
  }

  private convertRichTextItem(rt: NotionRichText): ClipperInlineContent {
    const text = rt.plain_text || rt.text?.content || '';
    const styles = this.convertAnnotations(rt.annotations);
    const href = rt.href || rt.text?.link?.url || null;

    // Lien
    if (href) {
      const link: ClipperLink = {
        type: 'link',
        url: href,
        content: [{ type: 'text', text, styles }],
      };
      return link;
    }

    // Mention
    if (rt.type === 'mention' && rt.mention) {
      return this.convertMention(rt, text, styles);
    }

    // Équation inline
    if (rt.type === 'equation' && rt.equation) {
      return {
        type: 'equation',
        expression: rt.equation.expression,
      };
    }

    // Texte simple
    const clipperText: ClipperText = {
      type: 'text',
      text,
      styles,
    };
    return clipperText;
  }

  private convertMention(
    rt: NotionRichText,
    displayText: string,
    styles: ClipperTextStyles
  ): ClipperMention {
    const mention = rt.mention!;
    const mentionType = mention.type as 'user' | 'page' | 'date' | 'database';

    const clipperMention: ClipperMention = {
      type: 'mention',
      mentionType,
      displayText,
      originalData: {},
    };

    switch (mentionType) {
      case 'user':
        clipperMention.originalData.userId = mention.user?.id;
        clipperMention.originalData.userName = mention.user?.name;
        clipperMention.displayText = `@${mention.user?.name || 'user'}`;
        break;
      case 'page':
        clipperMention.originalData.pageId = mention.page?.id;
        break;
      case 'date':
        clipperMention.originalData.date = {
          start: mention.date?.start || '',
          end: mention.date?.end,
        };
        break;
      case 'database':
        clipperMention.originalData.databaseId = mention.database?.id;
        break;
    }

    return clipperMention;
  }

  private convertAnnotations(annotations?: NotionRichText['annotations']): ClipperTextStyles {
    if (!annotations) {
      return {};
    }

    const styles: ClipperTextStyles = {};

    if (annotations.bold) styles.bold = true;
    if (annotations.italic) styles.italic = true;
    if (annotations.underline) styles.underline = true;
    if (annotations.strikethrough) styles.strikethrough = true;
    if (annotations.code) styles.code = true;

    if (annotations.color && annotations.color !== 'default') {
      if (annotations.color.endsWith('_background')) {
        styles.backgroundColor = this.notionColorToClipper(annotations.color);
      } else {
        styles.textColor = this.notionColorToClipper(annotations.color);
      }
    }

    return styles;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private createBlock(
    type: ClipperBlockType,
    props: ClipperBlockProps,
    options: {
      content?: ClipperInlineContent[];
      children?: ClipperBlock[];
    }
  ): ClipperBlock {
    const now = new Date().toISOString();
    const block: ClipperBlock = {
      id: generateClipperId(),
      type,
      props,
      content: options.content,
      children: options.children || [],
      _meta: {
        contentHash: '',
        modifiedAt: now,
      },
    };
    block._meta.contentHash = computeBlockHash(block);
    return block;
  }

  private convertChildren(block: NotionBlock): ClipperBlock[] {
    const children = (block as any).children;
    if (!children || !Array.isArray(children)) {
      return [];
    }
    return this.convertBlocks(children, null);
  }

  private richTextToPlainText(richText: NotionRichText[]): string {
    if (!richText || richText.length === 0) {
      return '';
    }
    return richText.map(rt => rt.plain_text || rt.text?.content || '').join('');
  }

  private convertColor(notionColor?: NotionColor | string): ClipperColor {
    if (!notionColor || notionColor === 'default') {
      return 'default';
    }
    if (notionColor.endsWith('_background')) {
      return 'default';
    }
    return this.notionColorToClipper(notionColor);
  }

  private convertBackgroundColor(notionColor?: NotionColor | string): ClipperColor {
    if (!notionColor || notionColor === 'default') {
      return 'default';
    }
    if (notionColor.endsWith('_background')) {
      return this.notionColorToClipper(notionColor);
    }
    return 'default';
  }

  private notionColorToClipper(notionColor: NotionColor | string): ClipperColor {
    const colorMap: Record<string, ClipperColor> = {
      'gray': 'gray',
      'brown': 'brown',
      'orange': 'orange',
      'yellow': 'yellow',
      'green': 'green',
      'blue': 'blue',
      'purple': 'purple',
      'pink': 'pink',
      'red': 'red',
      'gray_background': 'grayBackground',
      'brown_background': 'brownBackground',
      'orange_background': 'orangeBackground',
      'yellow_background': 'yellowBackground',
      'green_background': 'greenBackground',
      'blue_background': 'blueBackground',
      'purple_background': 'purpleBackground',
      'pink_background': 'pinkBackground',
      'red_background': 'redBackground',
    };
    return colorMap[notionColor] || 'default';
  }

  private detectVideoProvider(url: string): 'youtube' | 'vimeo' | 'loom' | 'other' {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.includes('vimeo.com')) {
      return 'vimeo';
    }
    if (url.includes('loom.com')) {
      return 'loom';
    }
    return 'other';
  }

  private addWarning(
    blockId: string,
    blockType: string,
    message: string,
    severity: 'info' | 'warning' | 'error'
  ): void {
    this.warnings.push({ blockId, blockType, message, severity });
  }
}
