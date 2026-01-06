/**
 * ClipperDoc → Plate Converter
 * 
 * CRITICAL: This converter transforms ClipperDoc (source of truth) into Plate/Slate nodes.
 * 
 * Rules:
 * - Each ClipperBlock => 1 Slate node with STABLE id
 * - Inline styles (bold/italic/code/link) => Slate marks
 * - Lists produce proper Slate structure
 * - NO "copy all content into one block" - preserve structure
 */

import type { 
  ClipperDocument, 
  ClipperBlock, 
  ClipperInlineContent,
  PlateValue,
  PlateElement,
  PlateText,
  IdMapping,
} from '../types';

/**
 * Convert ClipperDocument to Plate value (array of Slate nodes)
 */
export function clipperDocToPlate(doc: ClipperDocument): {
  value: PlateValue;
  idMapping: IdMapping;
} {
  const idMapping: IdMapping = {
    clipperToPlate: new Map(),
    plateToClipper: new Map(),
  };

  const value: PlateValue = [];

  for (const block of doc.content) {
    const plateNode = convertBlock(block, idMapping);
    if (plateNode) {
      value.push(plateNode);
    }
  }

  // Ensure at least one paragraph if empty
  if (value.length === 0) {
    value.push({
      id: 'empty-paragraph',
      type: 'p',
      children: [{ text: '' }],
    });
  }

  return { value, idMapping };
}

/**
 * Convert a single ClipperBlock to a Plate element
 */
function convertBlock(block: ClipperBlock, idMapping: IdMapping): PlateElement | null {
  const plateId = block.id;
  idMapping.clipperToPlate.set(block.id, plateId);
  idMapping.plateToClipper.set(plateId, block.id);

  const content = block.content || [];

  switch (block.type) {
    case 'paragraph':
      return {
        id: plateId,
        type: 'p',
        children: convertInlineContent(content),
      };

    case 'heading1':
      return {
        id: plateId,
        type: 'h1',
        children: convertInlineContent(content),
      };

    case 'heading2':
      return {
        id: plateId,
        type: 'h2',
        children: convertInlineContent(content),
      };

    case 'heading3':
      return {
        id: plateId,
        type: 'h3',
        children: convertInlineContent(content),
      };

    case 'bulletList':
      return {
        id: plateId,
        type: 'p',
        indent: 1,
        listStyleType: 'disc',
        children: convertInlineContent(content),
      };

    case 'numberedList':
      return {
        id: plateId,
        type: 'p',
        indent: 1,
        listStyleType: 'decimal',
        children: convertInlineContent(content),
      };

    case 'todoList':
      const props = block.props as { checked?: boolean };
      return {
        id: plateId,
        type: 'p',
        indent: 1,
        listStyleType: 'todo',  // ListPlugin utilise 'todo' pour les checkboxes
        checked: props?.checked || false,
        children: convertInlineContent(content),
      };

    case 'quote':
      return {
        id: plateId,
        type: 'blockquote',
        children: convertInlineContent(content),
      };

    case 'callout':
      const calloutProps = block.props as { icon?: string; variant?: string };
      return {
        id: plateId,
        type: 'callout',
        icon: calloutProps?.icon || '💡',
        variant: calloutProps?.variant || 'info',
        children: convertInlineContent(content),
      };

    case 'code':
      const codeProps = block.props as { language?: string };
      return {
        id: plateId,
        type: 'code_block',
        lang: codeProps?.language || 'plain',
        children: [{
          id: `${plateId}-line`,
          type: 'code_line',
          children: [{ text: getPlainText(content) }],
        }],
      };

    case 'divider':
      // HR is a void element - children are required by Slate but won't be rendered
      return {
        id: plateId,
        type: 'hr',
        children: [{ text: '' }],
      };

    case 'image':
      const imageProps = block.props as { url?: string; caption?: string };
      return {
        id: plateId,
        type: 'img',
        url: imageProps?.url || '',
        caption: imageProps?.caption || getPlainText(content),
        children: [{ text: '' }],
      };

    case 'toggle':
      return {
        id: plateId,
        type: 'toggle',
        children: convertInlineContent(content),
      };

    case 'table':
      const tableProps = block.props as { rows?: Array<{ cells: string[] }> };
      const rows = tableProps?.rows || [];
      return {
        id: plateId,
        type: 'table',
        children: rows.map((row, rowIndex) => ({
          id: `${plateId}-row-${rowIndex}`,
          type: 'tr',
          children: row.cells.map((cell, cellIndex) => ({
            id: `${plateId}-cell-${rowIndex}-${cellIndex}`,
            type: rowIndex === 0 ? 'th' : 'td',
            children: [{ text: cell }],
          })),
        })),
      };

    // Note: 'mention' et 'embed' ne sont pas des types ClipperDoc natifs
    // Ils seront gérés par le case 'default' ci-dessous

    default:
      // Unknown block type - convert to paragraph
      return {
        id: plateId,
        type: 'p',
        children: convertInlineContent(content),
      };
  }
}

/**
 * Convert ClipperInlineContent array to Plate text nodes with marks
 */
function convertInlineContent(content: ClipperInlineContent[]): (PlateText | PlateElement)[] {
  if (!content || content.length === 0) {
    return [{ text: '' }];
  }

  const result: (PlateText | PlateElement)[] = [];

  for (const item of content) {
    if (item.type === 'text') {
      const textNode: PlateText = { text: item.text || '' };
      
      if (item.styles) {
        if (item.styles.bold) textNode.bold = true;
        if (item.styles.italic) textNode.italic = true;
        if (item.styles.underline) textNode.underline = true;
        if (item.styles.strikethrough) textNode.strikethrough = true;
        if (item.styles.code) textNode.code = true;
      }
      
      result.push(textNode);
    } else if (item.type === 'link') {
      result.push({
        id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'a',
        url: item.url || '',
        children: item.content 
          ? convertInlineContent(item.content)
          : [{ text: item.url || '' }],
      } as PlateElement);
    }
  }

  if (result.length === 0) {
    result.push({ text: '' });
  }

  return result;
}

/**
 * Extract plain text from inline content
 */
function getPlainText(content: ClipperInlineContent[]): string {
  return content
    .map(item => {
      if (item.type === 'text') return item.text || '';
      if (item.type === 'link') {
        return item.content 
          ? getPlainText(item.content)
          : item.url || '';
      }
      return '';
    })
    .join('');
}

export default clipperDocToPlate;
