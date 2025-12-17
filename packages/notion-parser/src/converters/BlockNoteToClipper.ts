/**
 * BlockNoteToClipper - Convertit les blocs BlockNote en ClipperDoc
 * 
 * Ce convertisseur capture les modifications faites dans l'éditeur BlockNote
 * et les applique au ClipperDoc (source de vérité).
 * 
 * Direction: BlockNote → ClipperDoc (après édition)
 * 
 * @module converters/BlockNoteToClipper
 */

import type {
  ClipperDocument,
  ClipperBlock,
  ClipperBlockType,
  ClipperBlockProps,
  ClipperInlineContent,
  ClipperText,
  ClipperLink,
  ClipperTextStyles,
  ClipperColor,
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
  ClipperTableCell,
} from '../types/clipper';

import {
  generateClipperId,
  computeBlockHash,
  computeDocumentStats,
} from '../types/clipper';

import type {
  BlockNoteBlock,
  BlockNoteInlineContent,
  BlockNoteStyles,
} from './NotionToBlockNote';

// ============================================================================
// TYPES
// ============================================================================

export interface BlockNoteToClipperOptions {
  /** Document Clipper existant (pour préserver les métadonnées) */
  existingDocument?: ClipperDocument;
  /** Mapping blockNoteId → clipperId (pour préserver les IDs) */
  idMapping?: Map<string, string>;
}

export interface BlockNoteToClipperResult {
  document: ClipperDocument;
  /** Blocs modifiés (pour diff) */
  modifiedBlockIds: string[];
  /** Nouveaux blocs */
  newBlockIds: string[];
  /** Blocs supprimés */
  deletedBlockIds: string[];
}

// ============================================================================
// CONVERTISSEUR PRINCIPAL
// ============================================================================

/**
 * Convertit des blocs BlockNote en ClipperDocument
 */
export function blockNoteToClipper(
  blockNoteBlocks: BlockNoteBlock[],
  options?: BlockNoteToClipperOptions
): BlockNoteToClipperResult {
  const converter = new BlockNoteToClipperConverter(options);
  return converter.convert(blockNoteBlocks);
}

/**
 * Met à jour un ClipperDocument existant avec les modifications BlockNote
 */
export function updateClipperFromBlockNote(
  existingDocument: ClipperDocument,
  blockNoteBlocks: BlockNoteBlock[],
  idMapping: Map<string, string>
): BlockNoteToClipperResult {
  return blockNoteToClipper(blockNoteBlocks, {
    existingDocument,
    idMapping,
  });
}

export class BlockNoteToClipperConverter {
  private options: BlockNoteToClipperOptions;
  private reverseIdMapping = new Map<string, string>(); // blockNoteId → clipperId
  private existingBlocksById = new Map<string, ClipperBlock>();
  private modifiedBlockIds: string[] = [];
  private newBlockIds: string[] = [];

  constructor(options?: BlockNoteToClipperOptions) {
    this.options = options || {};
    
    // Construire le mapping inverse
    if (options?.idMapping) {
      options.idMapping.forEach((blockNoteId, clipperId) => {
        this.reverseIdMapping.set(blockNoteId, clipperId);
      });
    }
    
    // Indexer les blocs existants
    if (options?.existingDocument) {
      this.indexExistingBlocks(options.existingDocument.content);
    }
  }

  private indexExistingBlocks(blocks: ClipperBlock[]): void {
    for (const block of blocks) {
      this.existingBlocksById.set(block.id, block);
      this.indexExistingBlocks(block.children);
    }
  }

  convert(blockNoteBlocks: BlockNoteBlock[]): BlockNoteToClipperResult {
    this.modifiedBlockIds = [];
    this.newBlockIds = [];

    const content = blockNoteBlocks.map(block => this.convertBlock(block));
    const stats = computeDocumentStats(content);
    const now = new Date().toISOString();

    // Détecter les blocs supprimés
    const currentBlockIds = new Set<string>();
    this.collectBlockIds(content, currentBlockIds);
    
    const deletedBlockIds: string[] = [];
    this.existingBlocksById.forEach((_, id) => {
      if (!currentBlockIds.has(id)) {
        deletedBlockIds.push(id);
      }
    });

    // Créer ou mettre à jour le document
    const document: ClipperDocument = this.options.existingDocument
      ? {
          ...this.options.existingDocument,
          metadata: {
            ...this.options.existingDocument.metadata,
            updatedAt: now,
            stats,
          },
          content,
        }
      : {
          schemaVersion: '1.0',
          id: generateClipperId(),
          metadata: {
            title: 'Edited Document',
            createdAt: now,
            updatedAt: now,
            source: { type: 'manual' },
            stats,
          },
          content,
          notionMapping: {
            pageId: null,
            workspaceId: null,
            lastSyncedAt: null,
            syncStatus: 'pending',
            blockMappings: [],
          },
        };

    return {
      document,
      modifiedBlockIds: this.modifiedBlockIds,
      newBlockIds: this.newBlockIds,
      deletedBlockIds,
    };
  }

  private collectBlockIds(blocks: ClipperBlock[], ids: Set<string>): void {
    for (const block of blocks) {
      ids.add(block.id);
      this.collectBlockIds(block.children, ids);
    }
  }

  private convertBlock(blockNoteBlock: BlockNoteBlock): ClipperBlock {
    // Essayer de récupérer l'ID Clipper existant
    const existingClipperId = this.reverseIdMapping.get(blockNoteBlock.id);
    const existingBlock = existingClipperId 
      ? this.existingBlocksById.get(existingClipperId)
      : undefined;

    let clipperBlock: ClipperBlock;

    switch (blockNoteBlock.type) {
      case 'paragraph':
        clipperBlock = this.convertParagraph(blockNoteBlock, existingBlock);
        break;
      case 'heading':
        clipperBlock = this.convertHeading(blockNoteBlock, existingBlock);
        break;
      case 'bulletListItem':
        clipperBlock = this.convertBulletList(blockNoteBlock, existingBlock);
        break;
      case 'numberedListItem':
        clipperBlock = this.convertNumberedList(blockNoteBlock, existingBlock);
        break;
      case 'checkListItem':
        clipperBlock = this.convertCheckList(blockNoteBlock, existingBlock);
        break;
      case 'toggle':
        clipperBlock = this.convertToggle(blockNoteBlock, existingBlock);
        break;
      case 'quote':
        clipperBlock = this.convertQuote(blockNoteBlock, existingBlock);
        break;
      case 'callout':
        clipperBlock = this.convertCallout(blockNoteBlock, existingBlock);
        break;
      case 'codeBlock':
        clipperBlock = this.convertCode(blockNoteBlock, existingBlock);
        break;
      case 'divider':
        clipperBlock = this.convertDivider(existingBlock);
        break;
      case 'image':
        clipperBlock = this.convertImage(blockNoteBlock, existingBlock);
        break;
      case 'video':
        clipperBlock = this.convertVideo(blockNoteBlock, existingBlock);
        break;
      case 'audio':
        clipperBlock = this.convertAudio(blockNoteBlock, existingBlock);
        break;
      case 'file':
        clipperBlock = this.convertFile(blockNoteBlock, existingBlock);
        break;
      case 'bookmark':
        clipperBlock = this.convertBookmark(blockNoteBlock, existingBlock);
        break;
      case 'equation':
        clipperBlock = this.convertEquation(blockNoteBlock, existingBlock);
        break;
      case 'table':
        clipperBlock = this.convertTable(blockNoteBlock, existingBlock);
        break;
      case 'columnList':
        clipperBlock = this.convertColumnList(blockNoteBlock, existingBlock);
        break;
      case 'column':
        clipperBlock = this.convertColumn(blockNoteBlock, existingBlock);
        break;
      case 'syncedBlock':
        clipperBlock = this.convertSyncedBlock(blockNoteBlock, existingBlock);
        break;
      default:
        clipperBlock = this.convertFallback(blockNoteBlock, existingBlock);
    }

    // Détecter si le bloc a été modifié
    if (existingBlock) {
      const oldHash = existingBlock._meta.contentHash;
      const newHash = clipperBlock._meta.contentHash;
      if (oldHash !== newHash) {
        this.modifiedBlockIds.push(clipperBlock.id);
      }
    } else {
      this.newBlockIds.push(clipperBlock.id);
    }

    return clipperBlock;
  }

  // ==========================================================================
  // CONVERTISSEURS PAR TYPE
  // ==========================================================================

  private convertParagraph(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    const props: ParagraphProps = {
      textColor: this.convertColor(block.props?.textColor),
      backgroundColor: this.convertBackgroundColor(block.props?.backgroundColor),
    };

    return this.createBlock('paragraph', props, block, existing);
  }

  private convertHeading(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    const level = (block.props?.level || 1) as 1 | 2 | 3;
    const props: HeadingProps = {
      level,
      isToggleable: block.props?.isToggleable || false,
      textColor: this.convertColor(block.props?.textColor),
      backgroundColor: this.convertBackgroundColor(block.props?.backgroundColor),
    };

    return this.createBlock(`heading${level}` as ClipperBlockType, props, block, existing);
  }

  private convertBulletList(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    const props: ListItemProps = {
      textColor: this.convertColor(block.props?.textColor),
      backgroundColor: this.convertBackgroundColor(block.props?.backgroundColor),
    };

    return this.createBlock('bulletList', props, block, existing);
  }

  private convertNumberedList(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    const props: ListItemProps = {
      textColor: this.convertColor(block.props?.textColor),
      backgroundColor: this.convertBackgroundColor(block.props?.backgroundColor),
    };

    return this.createBlock('numberedList', props, block, existing);
  }

  private convertCheckList(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    const props: ListItemProps = {
      checked: block.props?.checked || false,
      textColor: this.convertColor(block.props?.textColor),
      backgroundColor: this.convertBackgroundColor(block.props?.backgroundColor),
    };

    return this.createBlock('todoList', props, block, existing);
  }

  private convertToggle(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    const props: ToggleProps = {
      textColor: this.convertColor(block.props?.textColor),
      backgroundColor: this.convertBackgroundColor(block.props?.backgroundColor),
    };

    return this.createBlock('toggle', props, block, existing);
  }

  private convertQuote(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    const props: QuoteProps = {
      textColor: this.convertColor(block.props?.textColor),
      backgroundColor: this.convertBackgroundColor(block.props?.backgroundColor),
    };

    return this.createBlock('quote', props, block, existing);
  }

  private convertCallout(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    const props: CalloutProps = {
      icon: block.props?.icon || '💡',
      iconType: 'emoji',
      backgroundColor: this.convertBackgroundColor(block.props?.backgroundColor) || 'grayBackground',
    };

    return this.createBlock('callout', props, block, existing);
  }

  private convertCode(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    const props: CodeProps = {
      language: block.props?.language || 'plain text',
    };

    return this.createBlock('code', props, block, existing);
  }

  private convertDivider(existing?: ClipperBlock): ClipperBlock {
    const props: DividerProps = {};
    return this.createBlock('divider', props, { children: [] } as any, existing);
  }

  private convertImage(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    const props: ImageProps = {
      url: block.props?.url || '',
      caption: block.props?.caption,
      width: block.props?.previewWidth,
      isNotionHosted: existing ? (existing.props as ImageProps).isNotionHosted : false,
      expiresAt: existing ? (existing.props as ImageProps).expiresAt : undefined,
    };

    return this.createBlock('image', props, block, existing);
  }

  private convertVideo(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    const props: VideoProps = {
      url: block.props?.url || '',
      caption: block.props?.caption,
      provider: existing ? (existing.props as VideoProps).provider : undefined,
    };

    return this.createBlock('video', props, block, existing);
  }

  private convertAudio(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    const props: AudioProps = {
      url: block.props?.url || '',
      caption: block.props?.caption,
    };

    return this.createBlock('audio', props, block, existing);
  }

  private convertFile(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    const props: FileProps = {
      url: block.props?.url || '',
      name: block.props?.name || 'file',
      caption: block.props?.caption,
    };

    return this.createBlock('file', props, block, existing);
  }

  private convertBookmark(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    const props: BookmarkProps = {
      url: block.props?.url || '',
      title: block.props?.title,
      description: block.props?.description,
    };

    return this.createBlock('bookmark', props, block, existing);
  }

  private convertEquation(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    const props: EquationProps = {
      expression: block.props?.expression || '',
    };

    return this.createBlock('equation', props, block, existing);
  }

  private convertTable(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    // Extraire les rows du content BlockNote
    const tableContent = block.content as any;
    const rows = tableContent?.rows || [];

    const children: ClipperBlock[] = rows.map((row: any) => {
      const cells: ClipperTableCell[] = (row.cells || []).map((cell: BlockNoteInlineContent[]) => ({
        content: this.convertInlineContent(cell),
      }));

      const rowProps: TableRowProps = { cells };
      return this.createBlock('tableRow', rowProps, { children: [] } as any, undefined);
    });

    const props: TableProps = {
      hasColumnHeader: existing ? (existing.props as TableProps).hasColumnHeader : false,
      hasRowHeader: existing ? (existing.props as TableProps).hasRowHeader : false,
      columnCount: rows[0]?.cells?.length || 0,
    };

    const tableBlock = this.createBlock('table', props, block, existing);
    tableBlock.children = children;
    return tableBlock;
  }

  private convertColumnList(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    const props: ColumnListProps = {
      columnCount: block.children?.length || 0,
    };

    return this.createBlock('columnList', props, block, existing);
  }

  private convertColumn(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    const props: ColumnProps = {};
    return this.createBlock('column', props, block, existing);
  }

  private convertSyncedBlock(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    const props: SyncedBlockProps = {
      syncedFromId: block.props?.syncedFrom || undefined,
      isOriginal: block.props?.isOriginal || !block.props?.syncedFrom,
    };

    return this.createBlock('syncedBlock', props, block, existing);
  }

  private convertFallback(block: BlockNoteBlock, existing?: ClipperBlock): ClipperBlock {
    const props: UnsupportedProps = {
      originalType: block.type,
    };

    return this.createBlock('unsupported', props, block, existing);
  }

  // ==========================================================================
  // INLINE CONTENT
  // ==========================================================================

  private convertInlineContent(content?: BlockNoteInlineContent[]): ClipperInlineContent[] {
    if (!content || content.length === 0) {
      return [];
    }

    return content.map(item => this.convertInlineItem(item));
  }

  private convertInlineItem(item: BlockNoteInlineContent): ClipperInlineContent {
    if (item.type === 'link') {
      const link: ClipperLink = {
        type: 'link',
        url: item.href,
        content: item.content.map(text => ({
          type: 'text' as const,
          text: (text as any).text || '',
          styles: this.convertStyles((text as any).styles),
        })),
      };
      return link;
    }

    const text: ClipperText = {
      type: 'text',
      text: item.text,
      styles: this.convertStyles(item.styles),
    };
    return text;
  }

  private convertStyles(styles?: BlockNoteStyles): ClipperTextStyles {
    if (!styles) {
      return {};
    }

    const result: ClipperTextStyles = {};
    
    if (styles.bold) result.bold = true;
    if (styles.italic) result.italic = true;
    if (styles.underline) result.underline = true;
    if (styles.strikethrough) result.strikethrough = true;
    if (styles.code) result.code = true;
    if (styles.textColor) result.textColor = this.convertColor(styles.textColor);
    if (styles.backgroundColor) result.backgroundColor = this.convertBackgroundColor(styles.backgroundColor);
    
    return result;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private createBlock(
    type: ClipperBlockType,
    props: ClipperBlockProps,
    blockNoteBlock: BlockNoteBlock,
    existing?: ClipperBlock
  ): ClipperBlock {
    const now = new Date().toISOString();
    
    const block: ClipperBlock = {
      id: existing?.id || generateClipperId(),
      type,
      props,
      content: this.convertInlineContent(blockNoteBlock.content as BlockNoteInlineContent[]),
      children: (blockNoteBlock.children || []).map(child => this.convertBlock(child)),
      _meta: {
        contentHash: '',
        modifiedAt: now,
        notionBlockId: existing?._meta.notionBlockId,
        notionBlockType: existing?._meta.notionBlockType,
      },
    };

    block._meta.contentHash = computeBlockHash(block);
    return block;
  }

  private convertColor(color?: string): ClipperColor {
    if (!color || color === 'default') {
      return 'default';
    }
    
    const validColors: ClipperColor[] = [
      'gray', 'brown', 'orange', 'yellow', 'green',
      'blue', 'purple', 'pink', 'red',
    ];
    
    if (validColors.includes(color as ClipperColor)) {
      return color as ClipperColor;
    }
    
    return 'default';
  }

  private convertBackgroundColor(color?: string): ClipperColor {
    if (!color || color === 'default') {
      return 'default';
    }
    
    // BlockNote utilise des noms simples, on les convertit en format Clipper
    const colorMap: Record<string, ClipperColor> = {
      'gray': 'grayBackground',
      'brown': 'brownBackground',
      'orange': 'orangeBackground',
      'yellow': 'yellowBackground',
      'green': 'greenBackground',
      'blue': 'blueBackground',
      'purple': 'purpleBackground',
      'pink': 'pinkBackground',
      'red': 'redBackground',
    };
    
    return colorMap[color] || 'default';
  }
}
