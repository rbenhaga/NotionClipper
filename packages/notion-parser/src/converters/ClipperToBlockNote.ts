/**
 * ClipperToBlockNote - Convertit ClipperDoc en blocs BlockNote pour l'édition
 * 
 * Ce convertisseur permet d'afficher un ClipperDoc dans l'éditeur BlockNote.
 * 
 * Direction: ClipperDoc → BlockNote (pour affichage/édition)
 * 
 * @module converters/ClipperToBlockNote
 */

import type {
  ClipperDocument,
  ClipperBlock,
  ClipperBlockType,
  ClipperInlineContent,
  ClipperText,
  ClipperLink,
  ClipperMention,
  ClipperColor,
  ClipperTextStyles,
  HeadingProps,
  ListItemProps,
  CalloutProps,
  CodeProps,
  ImageProps,
  VideoProps,
  AudioProps,
  FileProps,
  BookmarkProps,
  EquationProps,
  TableProps,
  TableRowProps,
  SyncedBlockProps,
  UnsupportedProps,
} from '../types/clipper';

import type {
  BlockNoteBlock,
  BlockNoteInlineContent,
  BlockNoteStyles,
} from './NotionToBlockNote';

// ============================================================================
// TYPES
// ============================================================================

export interface ClipperToBlockNoteResult {
  blocks: BlockNoteBlock[];
  /** Mapping clipperId → blockNoteId pour synchronisation */
  idMapping: Map<string, string>;
}

// ============================================================================
// CONVERTISSEUR PRINCIPAL
// ============================================================================

/**
 * Convertit un ClipperDocument en blocs BlockNote
 */
export function clipperToBlockNote(document: ClipperDocument): ClipperToBlockNoteResult {
  const converter = new ClipperToBlockNoteConverter();
  return converter.convert(document);
}

/**
 * Convertit des blocs Clipper en blocs BlockNote
 */
export function clipperBlocksToBlockNote(blocks: ClipperBlock[]): ClipperToBlockNoteResult {
  const converter = new ClipperToBlockNoteConverter();
  return converter.convertBlocks(blocks);
}

export class ClipperToBlockNoteConverter {
  private idMapping = new Map<string, string>();
  private idCounter = 0;

  convert(document: ClipperDocument): ClipperToBlockNoteResult {
    this.idMapping.clear();
    this.idCounter = 0;
    
    const blocks = document.content.map(block => this.convertBlock(block));
    
    return {
      blocks,
      idMapping: this.idMapping,
    };
  }

  convertBlocks(clipperBlocks: ClipperBlock[]): ClipperToBlockNoteResult {
    this.idMapping.clear();
    this.idCounter = 0;
    
    const blocks = clipperBlocks.map(block => this.convertBlock(block));
    
    return {
      blocks,
      idMapping: this.idMapping,
    };
  }

  private convertBlock(clipperBlock: ClipperBlock): BlockNoteBlock {
    const blockNoteId = this.generateId();
    this.idMapping.set(clipperBlock.id, blockNoteId);

    switch (clipperBlock.type) {
      case 'paragraph':
        return this.convertParagraph(clipperBlock, blockNoteId);
      case 'heading1':
      case 'heading2':
      case 'heading3':
        return this.convertHeading(clipperBlock, blockNoteId);
      case 'bulletList':
        return this.convertBulletList(clipperBlock, blockNoteId);
      case 'numberedList':
        return this.convertNumberedList(clipperBlock, blockNoteId);
      case 'todoList':
        return this.convertTodoList(clipperBlock, blockNoteId);
      case 'toggle':
        return this.convertToggle(clipperBlock, blockNoteId);
      case 'quote':
        return this.convertQuote(clipperBlock, blockNoteId);
      case 'callout':
        return this.convertCallout(clipperBlock, blockNoteId);
      case 'code':
        return this.convertCode(clipperBlock, blockNoteId);
      case 'divider':
        return this.convertDivider(blockNoteId);
      case 'image':
        return this.convertImage(clipperBlock, blockNoteId);
      case 'video':
        return this.convertVideo(clipperBlock, blockNoteId);
      case 'audio':
        return this.convertAudio(clipperBlock, blockNoteId);
      case 'file':
        return this.convertFile(clipperBlock, blockNoteId);
      case 'bookmark':
        return this.convertBookmark(clipperBlock, blockNoteId);
      case 'equation':
        return this.convertEquation(clipperBlock, blockNoteId);
      case 'table':
        return this.convertTable(clipperBlock, blockNoteId);
      case 'tableRow':
        return this.convertTableRow(clipperBlock, blockNoteId);
      case 'columnList':
        return this.convertColumnList(clipperBlock, blockNoteId);
      case 'column':
        return this.convertColumn(clipperBlock, blockNoteId);
      case 'syncedBlock':
        return this.convertSyncedBlock(clipperBlock, blockNoteId);
      case 'unsupported':
        return this.convertUnsupported(clipperBlock, blockNoteId);
      default:
        return this.convertFallback(clipperBlock, blockNoteId);
    }
  }

  // ==========================================================================
  // CONVERTISSEURS PAR TYPE
  // ==========================================================================

  private convertParagraph(block: ClipperBlock, id: string): BlockNoteBlock {
    return {
      id,
      type: 'paragraph',
      props: {
        textColor: this.convertColor(block.props as any),
        backgroundColor: this.convertBackgroundColor(block.props as any),
      },
      content: this.convertInlineContent(block.content),
      children: this.convertChildren(block.children),
    };
  }

  private convertHeading(block: ClipperBlock, id: string): BlockNoteBlock {
    const props = block.props as HeadingProps;
    return {
      id,
      type: 'heading',
      props: {
        level: props.level,
        textColor: this.convertColor(props),
        backgroundColor: this.convertBackgroundColor(props),
        isToggleable: props.isToggleable,
      },
      content: this.convertInlineContent(block.content),
      children: props.isToggleable ? this.convertChildren(block.children) : [],
    };
  }

  private convertBulletList(block: ClipperBlock, id: string): BlockNoteBlock {
    const props = block.props as ListItemProps;
    return {
      id,
      type: 'bulletListItem',
      props: {
        textColor: this.convertColor(props),
        backgroundColor: this.convertBackgroundColor(props),
      },
      content: this.convertInlineContent(block.content),
      children: this.convertChildren(block.children),
    };
  }

  private convertNumberedList(block: ClipperBlock, id: string): BlockNoteBlock {
    const props = block.props as ListItemProps;
    return {
      id,
      type: 'numberedListItem',
      props: {
        textColor: this.convertColor(props),
        backgroundColor: this.convertBackgroundColor(props),
      },
      content: this.convertInlineContent(block.content),
      children: this.convertChildren(block.children),
    };
  }

  private convertTodoList(block: ClipperBlock, id: string): BlockNoteBlock {
    const props = block.props as ListItemProps;
    return {
      id,
      type: 'checkListItem',
      props: {
        checked: props.checked || false,
        textColor: this.convertColor(props),
        backgroundColor: this.convertBackgroundColor(props),
      },
      content: this.convertInlineContent(block.content),
      children: this.convertChildren(block.children),
    };
  }

  private convertToggle(block: ClipperBlock, id: string): BlockNoteBlock {
    // Toggle = custom block dans BlockNote
    return {
      id,
      type: 'toggle',
      props: {
        textColor: this.convertColor(block.props as any),
        backgroundColor: this.convertBackgroundColor(block.props as any),
      },
      content: this.convertInlineContent(block.content),
      children: this.convertChildren(block.children),
    };
  }

  private convertQuote(block: ClipperBlock, id: string): BlockNoteBlock {
    return {
      id,
      type: 'quote',
      props: {
        textColor: this.convertColor(block.props as any),
        backgroundColor: this.convertBackgroundColor(block.props as any),
      },
      content: this.convertInlineContent(block.content),
      children: this.convertChildren(block.children),
    };
  }

  private convertCallout(block: ClipperBlock, id: string): BlockNoteBlock {
    const props = block.props as CalloutProps;
    return {
      id,
      type: 'callout',
      props: {
        icon: props.icon,
        backgroundColor: this.clipperColorToBlockNote(props.backgroundColor),
      },
      content: this.convertInlineContent(block.content),
      children: this.convertChildren(block.children),
    };
  }

  private convertCode(block: ClipperBlock, id: string): BlockNoteBlock {
    const props = block.props as CodeProps;
    return {
      id,
      type: 'codeBlock',
      props: {
        language: props.language || 'plain text',
      },
      content: this.convertInlineContent(block.content),
      children: [],
    };
  }

  private convertDivider(id: string): BlockNoteBlock {
    return {
      id,
      type: 'divider',
      props: {},
      content: undefined,
      children: [],
    };
  }

  private convertImage(block: ClipperBlock, id: string): BlockNoteBlock {
    const props = block.props as ImageProps;
    return {
      id,
      type: 'image',
      props: {
        url: props.url,
        caption: props.caption || '',
        previewWidth: props.width || 512,
      },
      content: undefined,
      children: [],
    };
  }

  private convertVideo(block: ClipperBlock, id: string): BlockNoteBlock {
    const props = block.props as VideoProps;
    return {
      id,
      type: 'video',
      props: {
        url: props.url,
        caption: props.caption || '',
        previewWidth: 512,
      },
      content: undefined,
      children: [],
    };
  }

  private convertAudio(block: ClipperBlock, id: string): BlockNoteBlock {
    const props = block.props as AudioProps;
    return {
      id,
      type: 'audio',
      props: {
        url: props.url,
        caption: props.caption || '',
      },
      content: undefined,
      children: [],
    };
  }

  private convertFile(block: ClipperBlock, id: string): BlockNoteBlock {
    const props = block.props as FileProps;
    return {
      id,
      type: 'file',
      props: {
        url: props.url,
        name: props.name,
        caption: props.caption || '',
      },
      content: undefined,
      children: [],
    };
  }

  private convertBookmark(block: ClipperBlock, id: string): BlockNoteBlock {
    const props = block.props as BookmarkProps;
    return {
      id,
      type: 'bookmark',
      props: {
        url: props.url,
        title: props.title || '',
        description: props.description || '',
      },
      content: undefined,
      children: [],
    };
  }

  private convertEquation(block: ClipperBlock, id: string): BlockNoteBlock {
    const props = block.props as EquationProps;
    return {
      id,
      type: 'equation',
      props: {
        expression: props.expression,
      },
      content: undefined,
      children: [],
    };
  }

  private convertTable(block: ClipperBlock, id: string): BlockNoteBlock {
    const props = block.props as TableProps;
    
    // Convertir les rows en format BlockNote table
    const rows = block.children
      .filter(child => child.type === 'tableRow')
      .map(row => {
        const rowProps = row.props as TableRowProps;
        return {
          cells: rowProps.cells.map(cell => this.convertInlineContent(cell.content)),
        };
      });

    return {
      id,
      type: 'table',
      props: {
        textColor: 'default',
      },
      content: {
        type: 'tableContent',
        rows,
      } as any,
      children: [],
    };
  }

  private convertTableRow(block: ClipperBlock, id: string): BlockNoteBlock {
    // Les table rows sont gérés dans convertTable
    // Ce cas ne devrait pas être appelé directement
    return {
      id,
      type: 'paragraph',
      props: {},
      content: [{ type: 'text', text: '[Table Row]', styles: {} }],
      children: [],
    };
  }

  private convertColumnList(block: ClipperBlock, id: string): BlockNoteBlock {
    // DÉGRADATION: Colonnes → séquence linéaire
    // On aplatit les colonnes en blocs successifs
    return {
      id,
      type: 'columnList',
      props: {},
      content: undefined,
      children: this.convertChildren(block.children),
    };
  }

  private convertColumn(block: ClipperBlock, id: string): BlockNoteBlock {
    return {
      id,
      type: 'column',
      props: {},
      content: undefined,
      children: this.convertChildren(block.children),
    };
  }

  private convertSyncedBlock(block: ClipperBlock, id: string): BlockNoteBlock {
    const props = block.props as SyncedBlockProps;
    return {
      id,
      type: 'syncedBlock',
      props: {
        syncedFrom: props.syncedFromId || null,
        isOriginal: props.isOriginal,
      },
      content: undefined,
      children: this.convertChildren(block.children),
    };
  }

  private convertUnsupported(block: ClipperBlock, id: string): BlockNoteBlock {
    const props = block.props as UnsupportedProps;
    return {
      id,
      type: 'paragraph',
      props: {
        textColor: 'gray',
        backgroundColor: 'default',
      },
      content: [{ 
        type: 'text', 
        text: `[Unsupported: ${props.originalType}]`, 
        styles: { italic: true } 
      }],
      children: [],
    };
  }

  private convertFallback(block: ClipperBlock, id: string): BlockNoteBlock {
    return {
      id,
      type: 'paragraph',
      props: {},
      content: this.convertInlineContent(block.content),
      children: this.convertChildren(block.children),
    };
  }

  // ==========================================================================
  // INLINE CONTENT
  // ==========================================================================

  private convertInlineContent(
    content?: ClipperInlineContent[]
  ): BlockNoteInlineContent[] | undefined {
    if (!content || content.length === 0) {
      return undefined;
    }

    return content.map(item => this.convertInlineItem(item));
  }

  private convertInlineItem(item: ClipperInlineContent): BlockNoteInlineContent {
    switch (item.type) {
      case 'text':
        return this.convertText(item);
      case 'link':
        return this.convertLink(item);
      case 'mention':
        return this.convertMentionToText(item);
      case 'equation':
        return this.convertEquationInline(item);
      default:
        return { type: 'text', text: '', styles: {} };
    }
  }

  private convertText(item: ClipperText): BlockNoteInlineContent {
    return {
      type: 'text',
      text: item.text,
      styles: this.convertStyles(item.styles),
    };
  }

  private convertLink(item: ClipperLink): BlockNoteInlineContent {
    return {
      type: 'link',
      href: item.url,
      content: item.content.map(text => ({
        type: 'text' as const,
        text: text.text,
        styles: this.convertStyles(text.styles),
      })),
    };
  }

  private convertMentionToText(item: ClipperMention): BlockNoteInlineContent {
    // Les mentions sont converties en texte avec style
    return {
      type: 'text',
      text: item.displayText,
      styles: { backgroundColor: 'gray' },
    };
  }

  private convertEquationInline(item: { type: 'equation'; expression: string }): BlockNoteInlineContent {
    // Les équations inline sont converties en code
    return {
      type: 'text',
      text: item.expression,
      styles: { code: true },
    };
  }

  private convertStyles(styles: ClipperTextStyles): BlockNoteStyles {
    const result: BlockNoteStyles = {};
    
    if (styles.bold) result.bold = true;
    if (styles.italic) result.italic = true;
    if (styles.underline) result.underline = true;
    if (styles.strikethrough) result.strikethrough = true;
    if (styles.code) result.code = true;
    if (styles.textColor) result.textColor = this.clipperColorToBlockNote(styles.textColor);
    if (styles.backgroundColor) result.backgroundColor = this.clipperColorToBlockNote(styles.backgroundColor);
    
    return result;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private convertChildren(children: ClipperBlock[]): BlockNoteBlock[] {
    return children.map(child => this.convertBlock(child));
  }

  private convertColor(props: { textColor?: ClipperColor }): string {
    return this.clipperColorToBlockNote(props.textColor || 'default');
  }

  private convertBackgroundColor(props: { backgroundColor?: ClipperColor }): string {
    return this.clipperColorToBlockNote(props.backgroundColor || 'default');
  }

  private clipperColorToBlockNote(color: ClipperColor): string {
    // BlockNote utilise des noms de couleurs simples
    const colorMap: Record<ClipperColor, string> = {
      'default': 'default',
      'gray': 'gray',
      'brown': 'brown',
      'orange': 'orange',
      'yellow': 'yellow',
      'green': 'green',
      'blue': 'blue',
      'purple': 'purple',
      'pink': 'pink',
      'red': 'red',
      'grayBackground': 'gray',
      'brownBackground': 'brown',
      'orangeBackground': 'orange',
      'yellowBackground': 'yellow',
      'greenBackground': 'green',
      'blueBackground': 'blue',
      'purpleBackground': 'purple',
      'pinkBackground': 'pink',
      'redBackground': 'red',
    };
    return colorMap[color] || 'default';
  }

  private generateId(): string {
    this.idCounter++;
    return `bn-${Date.now()}-${this.idCounter}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
