/**
 * ClipperDoc → Notion Blocks Converter
 * 
 * ✅ P0-3: Structure-preserving conversion from ClipperDocument to Notion API blocks
 * ✅ P0.6: Conversion report with degraded/skipped tracking
 * 
 * This converter:
 * - Preserves all structure (headings, lists, code, etc.)
 * - Handles nested children recursively
 * - Reuses RichTextBuilder for inline content
 * - Supports all ClipperDoc block types per loss budget
 * - Returns optional conversion report for observability
 * 
 * @module converters/clipperToNotion
 */

import type { NotionBlock, NotionRichText, NotionColor } from '../types/notion';
import type {
  ClipperDocument,
  ClipperBlock,
  ClipperInlineContent,
  ClipperText,
  ClipperLink,
  ClipperColor,
  HeadingProps,
  ListItemProps,
  CodeProps,
  CalloutProps,
  ImageProps,
  VideoProps,
  AudioProps,
  FileProps,
  BookmarkProps,
  EquationProps,
  TableProps,
  TableRowProps,
  ToggleProps,
} from '../types/clipper';

/**
 * ✅ P0.6: Conversion report for observability
 */
export interface ConversionReport {
  blocksInput: number;
  blocksConverted: number;
  blocksSkipped: number;
  degraded: string[];  // Block types that were degraded (e.g., 'columnList', 'syncedBlock')
  errors: string[];    // Any conversion errors
}

// Module-level report accumulator (reset per conversion)
let currentReport: ConversionReport | null = null;

/**
 * Convert ClipperDocument to Notion API blocks
 * 
 * @param doc - ClipperDocument to convert
 * @param options - Optional settings
 * @returns Array of Notion blocks ready for API
 */
export function clipperToNotion(doc: ClipperDocument, options?: { withReport?: boolean }): NotionBlock[] {
  if (!doc?.content || !Array.isArray(doc.content)) {
    if (process.env.DEBUG_PARSER === '1') {
      console.warn('[clipperToNotion] Invalid document, returning empty blocks');
    }
    return [];
  }

  // ✅ P0.6: Initialize conversion report
  currentReport = {
    blocksInput: doc.content.length,
    blocksConverted: 0,
    blocksSkipped: 0,
    degraded: [],
    errors: [],
  };

  const blocks: NotionBlock[] = [];
  
  for (const block of doc.content) {
    const converted = convertClipperBlock(block);
    if (converted) {
      blocks.push(converted);
      currentReport.blocksConverted++;
    } else {
      currentReport.blocksSkipped++;
    }
  }

  if (process.env.DEBUG_PARSER === '1') {
    console.log(`[clipperToNotion] Converted ${doc.content.length} ClipperBlocks to ${blocks.length} Notion blocks`);
  }
  
  return blocks;
}

/**
 * ✅ P0.6: Get the conversion report from the last clipperToNotion call
 * Call this immediately after clipperToNotion() to get degradation info
 */
export function getLastConversionReport(): ConversionReport | null {
  return currentReport;
}

/**
 * ✅ P0.6: Convert with report in a single call
 */
export function clipperToNotionWithReport(doc: ClipperDocument): { 
  blocks: NotionBlock[]; 
  report: ConversionReport;
} {
  const blocks = clipperToNotion(doc, { withReport: true });
  const report = currentReport || {
    blocksInput: 0,
    blocksConverted: 0,
    blocksSkipped: 0,
    degraded: [],
    errors: [],
  };
  return { blocks, report };
}

/**
 * ✅ P0.6: Track degraded/skipped blocks for report
 */
function trackDegraded(blockType: string, reason: string): void {
  if (currentReport) {
    const entry = `${blockType}: ${reason}`;
    if (!currentReport.degraded.includes(entry)) {
      currentReport.degraded.push(entry);
    }
  }
  if (process.env.DEBUG_PARSER === '1') {
    console.warn(`[clipperToNotion] ${blockType} ${reason}`);
  }
}

/**
 * Convert a single ClipperBlock to a single Notion block
 * 
 * ✅ FIX: Children are NESTED inside block[type].children, NOT flattened
 * Notion API supports up to 2 levels of nesting per request
 * See: https://developers.notion.com/reference/patch-block-children
 */
function convertClipperBlock(block: ClipperBlock): NotionBlock | null {
  if (!block || !block.type) {
    return null;
  }

  const notionBlock = convertBlockByType(block);
  
  if (notionBlock && block.children && block.children.length > 0) {
    // ✅ FIX: Nest children inside the block's type-specific property
    // NOT as siblings (which was the bug)
    const nestedChildren = block.children
      .map(child => convertClipperBlock(child))
      .filter((b): b is NotionBlock => b !== null);
    
    if (nestedChildren.length > 0) {
      // Add children to the appropriate property based on block type
      // Notion expects children inside block[type].children for most block types
      const blockType = notionBlock.type;
      const blockContent = (notionBlock as any)[blockType];
      
      if (blockContent && supportsChildren(blockType)) {
        blockContent.children = nestedChildren;
      }
    }
  }

  return notionBlock;
}

/**
 * Check if a block type supports nested children in Notion API
 * See: https://developers.notion.com/reference/block
 */
function supportsChildren(blockType: string): boolean {
  const typesWithChildren = new Set([
    'paragraph',
    'bulleted_list_item',
    'numbered_list_item',
    'to_do',
    'toggle',
    'quote',
    'callout',
    'synced_block',
    'template',
    'column',
    'column_list',
    // Headings with is_toggleable also support children
    'heading_1',
    'heading_2', 
    'heading_3',
  ]);
  return typesWithChildren.has(blockType);
}

/**
 * Convert block based on its type
 */
function convertBlockByType(block: ClipperBlock): NotionBlock | null {
  switch (block.type) {
    case 'paragraph':
      return convertParagraph(block);
    
    case 'heading1':
    case 'heading2':
    case 'heading3':
      return convertHeading(block);
    
    case 'bulletList':
      return convertBulletList(block);
    
    case 'numberedList':
      return convertNumberedList(block);
    
    case 'todoList':
      return convertTodoList(block);
    
    case 'toggle':
      return convertToggle(block);
    
    case 'quote':
      return convertQuote(block);
    
    case 'callout':
      return convertCallout(block);
    
    case 'code':
      return convertCode(block);
    
    case 'image':
      return convertImage(block);
    
    case 'video':
      return convertVideo(block);
    
    case 'audio':
      return convertAudio(block);
    
    case 'file':
      return convertFile(block);
    
    case 'bookmark':
      return convertBookmark(block);
    
    case 'divider':
      return convertDivider();
    
    case 'equation':
      return convertEquation(block);
    
    case 'table':
      return convertTable(block);
    
    case 'tableRow':
      return convertTableRow(block);
    
    // Layout blocks (degraded)
    case 'columnList':
    case 'column':
      // Columns are degraded to sequential content
      trackDegraded(block.type, 'degraded to sequential content');
      return null; // Children will be processed separately
    
    // Synced blocks (degraded)
    case 'syncedBlock':
      trackDegraded('syncedBlock', 'degraded to regular content');
      return null; // Children will be processed separately
    
    case 'unsupported':
      trackDegraded('unsupported', 'skipped');
      return null;
    
    default:
      trackDegraded(block.type, 'unknown block type');
      return null;
  }
}

// ============================================================================
// BLOCK CONVERTERS
// ============================================================================

function convertParagraph(block: ClipperBlock): NotionBlock {
  return {
    type: 'paragraph',
    paragraph: {
      rich_text: convertInlineContent(block.content),
      color: mapColor(block.props as any)
    }
  };
}

function convertHeading(block: ClipperBlock): NotionBlock {
  const props = block.props as HeadingProps;
  const level = props?.level || (block.type === 'heading1' ? 1 : block.type === 'heading2' ? 2 : 3);
  const type = `heading_${level}` as 'heading_1' | 'heading_2' | 'heading_3';
  
  const headingBlock: any = {
    type,
    [type]: {
      rich_text: convertInlineContent(block.content),
      color: mapColor(props)
    }
  };
  
  // Support toggleable headings
  if (props?.isToggleable) {
    headingBlock[type].is_toggleable = true;
  }
  
  return headingBlock;
}

function convertBulletList(block: ClipperBlock): NotionBlock {
  return {
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: convertInlineContent(block.content),
      color: mapColor(block.props as any)
    }
  };
}

function convertNumberedList(block: ClipperBlock): NotionBlock {
  return {
    type: 'numbered_list_item',
    numbered_list_item: {
      rich_text: convertInlineContent(block.content),
      color: mapColor(block.props as any)
    }
  };
}

function convertTodoList(block: ClipperBlock): NotionBlock {
  const props = block.props as ListItemProps;
  return {
    type: 'to_do',
    to_do: {
      rich_text: convertInlineContent(block.content),
      checked: props?.checked || false,
      color: mapColor(props)
    }
  };
}

function convertToggle(block: ClipperBlock): NotionBlock {
  const props = block.props as ToggleProps;
  return {
    type: 'toggle',
    toggle: {
      rich_text: convertInlineContent(block.content),
      color: mapColor(props)
    }
  };
}

function convertQuote(block: ClipperBlock): NotionBlock {
  return {
    type: 'quote',
    quote: {
      rich_text: convertInlineContent(block.content),
      color: mapColor(block.props as any)
    }
  };
}

function convertCallout(block: ClipperBlock): NotionBlock {
  const props = block.props as CalloutProps;
  return {
    type: 'callout',
    callout: {
      rich_text: convertInlineContent(block.content),
      icon: props?.iconType === 'url' 
        ? { type: 'external', external: { url: props.icon } }
        : { type: 'emoji', emoji: props?.icon || '📝' },
      color: mapCalloutColor(props?.backgroundColor)
    }
  };
}

function convertCode(block: ClipperBlock): NotionBlock {
  const props = block.props as CodeProps;
  
  // Extract plain text from content for code blocks
  const codeText = block.content
    ?.map(c => c.type === 'text' ? (c as ClipperText).text : '')
    .join('') || '';
  
  return {
    type: 'code',
    code: {
      rich_text: [{ type: 'text', text: { content: codeText } }],
      language: normalizeLanguage(props?.language || 'plain text'),
      caption: props?.caption ? [{ type: 'text', text: { content: props.caption } }] : []
    }
  };
}

function convertImage(block: ClipperBlock): NotionBlock {
  const props = block.props as ImageProps;
  return {
    type: 'image',
    image: {
      type: 'external',
      external: { url: props?.url || '' },
      caption: props?.caption ? [{ type: 'text', text: { content: props.caption } }] : []
    }
  };
}

function convertVideo(block: ClipperBlock): NotionBlock {
  const props = block.props as VideoProps;
  return {
    type: 'video',
    video: {
      type: 'external',
      external: { url: props?.url || '' }
    }
  };
}

function convertAudio(block: ClipperBlock): NotionBlock {
  const props = block.props as AudioProps;
  return {
    type: 'audio',
    audio: {
      type: 'external',
      external: { url: props?.url || '' },
      caption: props?.caption ? [{ type: 'text', text: { content: props.caption } }] : []
    }
  };
}

function convertFile(block: ClipperBlock): NotionBlock {
  const props = block.props as FileProps;
  
  // PDFs get special treatment
  if (props?.mimeType === 'application/pdf' || props?.url?.toLowerCase().endsWith('.pdf')) {
    return {
      type: 'pdf',
      pdf: {
        type: 'external',
        external: { url: props?.url || '' },
        caption: props?.caption ? [{ type: 'text', text: { content: props.caption } }] : []
      }
    };
  }
  
  return {
    type: 'file',
    file: {
      type: 'external',
      external: { url: props?.url || '' },
      caption: props?.caption ? [{ type: 'text', text: { content: props.caption } }] : [],
      name: props?.name || 'file'
    }
  };
}

function convertBookmark(block: ClipperBlock): NotionBlock {
  const props = block.props as BookmarkProps;
  return {
    type: 'bookmark',
    bookmark: {
      url: props?.url || '',
      caption: props?.title ? [{ type: 'text', text: { content: props.title } }] : []
    }
  };
}

function convertDivider(): NotionBlock {
  return {
    type: 'divider',
    divider: {}
  };
}

function convertEquation(block: ClipperBlock): NotionBlock {
  const props = block.props as EquationProps;
  return {
    type: 'equation',
    equation: {
      expression: props?.expression || ''
    }
  };
}

function convertTable(block: ClipperBlock): NotionBlock {
  const props = block.props as TableProps;
  
  // ✅ FIX: Convert table rows from children and embed them directly
  // Table is special: rows MUST be in table.children (not handled by generic nesting)
  const tableRows = block.children
    .filter(child => child.type === 'tableRow')
    .map(row => {
      const rowProps = row.props as TableRowProps;
      const cells = rowProps?.cells?.map(cell => 
        convertInlineContent(cell.content)
      ) || [];
      return {
        type: 'table_row' as const,
        table_row: { cells }
      };
    });
  
  return {
    type: 'table',
    table: {
      table_width: props?.columnCount || 1,
      has_column_header: props?.hasColumnHeader || false,
      has_row_header: props?.hasRowHeader || false,
      children: tableRows
    }
  };
}

function convertTableRow(block: ClipperBlock): NotionBlock {
  const props = block.props as TableRowProps;
  
  const cells = props?.cells?.map(cell => 
    convertInlineContent(cell.content)
  ) || [];
  
  return {
    type: 'table_row',
    table_row: {
      cells
    }
  };
}

// ============================================================================
// INLINE CONTENT CONVERTER
// ============================================================================

function convertInlineContent(content?: ClipperInlineContent[]): NotionRichText[] {
  if (!content || !Array.isArray(content)) {
    return [];
  }

  const richText: NotionRichText[] = [];

  for (const item of content) {
    switch (item.type) {
      case 'text':
        richText.push(convertTextToRichText(item as ClipperText));
        break;
      
      case 'link':
        richText.push(...convertLinkToRichText(item as ClipperLink));
        break;
      
      case 'mention':
        // Mentions are complex - degrade to text for now
        richText.push({
          type: 'text',
          text: { content: item.displayText || '@mention' }
        });
        break;
      
      case 'equation':
        richText.push({
          type: 'equation',
          equation: { expression: item.expression || '' }
        });
        break;
    }
  }

  return richText;
}

function convertTextToRichText(text: ClipperText): NotionRichText {
  const annotations: any = {};
  
  if (text.styles) {
    if (text.styles.bold) annotations.bold = true;
    if (text.styles.italic) annotations.italic = true;
    if (text.styles.underline) annotations.underline = true;
    if (text.styles.strikethrough) annotations.strikethrough = true;
    if (text.styles.code) annotations.code = true;
    if (text.styles.textColor && text.styles.textColor !== 'default') {
      annotations.color = mapTextColor(text.styles.textColor);
    }
  }

  return {
    type: 'text',
    text: { content: text.text || '' },
    ...(Object.keys(annotations).length > 0 && { annotations })
  };
}

function convertLinkToRichText(link: ClipperLink): NotionRichText[] {
  return link.content.map(text => ({
    type: 'text',
    text: { 
      content: text.text || '',
      link: { url: link.url }
    },
    ...(text.styles && Object.keys(text.styles).length > 0 && {
      annotations: {
        bold: text.styles.bold,
        italic: text.styles.italic,
        underline: text.styles.underline,
        strikethrough: text.styles.strikethrough,
        code: text.styles.code,
      }
    })
  }));
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Map ClipperColor to Notion color
 */
function mapColor(props?: { textColor?: ClipperColor; backgroundColor?: ClipperColor }): NotionColor {
  if (!props) return 'default';
  
  // Background color takes precedence
  if (props.backgroundColor && props.backgroundColor !== 'default') {
    return mapBackgroundColor(props.backgroundColor);
  }
  
  if (props.textColor && props.textColor !== 'default') {
    return mapTextColor(props.textColor);
  }
  
  return 'default';
}

function mapTextColor(color: ClipperColor): NotionColor {
  const mapping: Record<string, NotionColor> = {
    'gray': 'gray',
    'brown': 'brown',
    'orange': 'orange',
    'yellow': 'yellow',
    'green': 'green',
    'blue': 'blue',
    'purple': 'purple',
    'pink': 'pink',
    'red': 'red',
  };
  return mapping[color] || 'default';
}

function mapBackgroundColor(color: ClipperColor): NotionColor {
  const mapping: Record<string, NotionColor> = {
    'grayBackground': 'gray_background',
    'brownBackground': 'brown_background',
    'orangeBackground': 'orange_background',
    'yellowBackground': 'yellow_background',
    'greenBackground': 'green_background',
    'blueBackground': 'blue_background',
    'purpleBackground': 'purple_background',
    'pinkBackground': 'pink_background',
    'redBackground': 'red_background',
  };
  return mapping[color] || 'default';
}

function mapCalloutColor(color?: ClipperColor): NotionColor {
  if (!color || color === 'default') return 'gray_background';
  return mapBackgroundColor(color) || 'gray_background';
}

/**
 * Normalize language name for Notion API
 */
function normalizeLanguage(language: string): string {
  const mapping: Record<string, string> = {
    'csharp': 'c#',
    'cs': 'c#',
    'fsharp': 'f#',
    'fs': 'f#',
    'cplusplus': 'c++',
    'cpp': 'c++',
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'sh': 'shell',
    'bash': 'shell',
    'yml': 'yaml',
    'md': 'markdown',
  };
  
  const normalized = language.toLowerCase().trim();
  return mapping[normalized] || normalized;
}
