/**
 * Plate → ClipperDoc Converter
 * 
 * CRITICAL: This converter transforms Plate/Slate nodes back to ClipperDoc.
 * 
 * Rules:
 * - Preserve IDs: if node has id => keep it; else generate stable Clipper ID
 * - Normalize: paragraph vide => bloc vide (OK)
 * - List structure => ClipperDoc list blocks
 */

import type { 
  ClipperDocument, 
  ClipperBlock, 
  ClipperInlineContent,
  ClipperText,
  PlateValue,
  PlateElement,
  PlateText,
  IdMapping,
} from '../types';

import { 
  createClipperDocument, 
  generateClipperId,
  computeBlockHash,
} from '@notion-clipper/notion-parser';

/**
 * Convert Plate value to ClipperDocument
 */
export function plateToClipperDoc(
  value: PlateValue,
  options: {
    existingDocument?: ClipperDocument;
    idMapping?: IdMapping;
    title?: string;
  } = {}
): {
  document: ClipperDocument;
  modifiedBlockIds: string[];
  newBlockIds: string[];
  deletedBlockIds: string[];
} {
  const { existingDocument, idMapping, title = 'Untitled' } = options;

  const existingIds = new Set(existingDocument?.content.map(b => b.id) || []);
  const newIds: string[] = [];
  const modifiedIds: string[] = [];

  const content: ClipperBlock[] = [];
  const processedIds = new Set<string>();

  for (const node of value) {
    const blocks = convertNode(node, idMapping);
    for (const block of blocks) {
      content.push(block);
      processedIds.add(block.id);

      if (!existingIds.has(block.id)) {
        newIds.push(block.id);
      } else {
        const existingBlock = existingDocument?.content.find(b => b.id === block.id);
        if (existingBlock) {
          const oldHash = existingBlock._meta?.contentHash || '';
          const newHash = computeBlockHash(block);
          if (oldHash !== newHash) {
            modifiedIds.push(block.id);
          }
        }
      }
    }
  }

  const deletedIds = [...existingIds].filter(id => !processedIds.has(id));

  const document: ClipperDocument = existingDocument 
    ? {
        ...existingDocument,
        content,
        metadata: {
          ...existingDocument.metadata,
          updatedAt: new Date().toISOString(),
        },
      }
    : createClipperDocument({
        title,
        source: { type: 'clipboard' },
      });

  if (!existingDocument) {
    document.content = content;
  }

  document.content = document.content.map(block => ({
    ...block,
    _meta: {
      ...block._meta,
      contentHash: computeBlockHash(block),
      modifiedAt: new Date().toISOString(),
    },
  }));

  return {
    document,
    modifiedBlockIds: modifiedIds,
    newBlockIds: newIds,
    deletedBlockIds: deletedIds,
  };
}

/**
 * Convert a single Plate node to ClipperBlock(s)
 */
function convertNode(node: PlateElement, idMapping?: IdMapping): ClipperBlock[] {
  const clipperId = idMapping?.plateToClipper.get(node.id) || node.id || generateClipperId();
  const now = new Date().toISOString();
  const baseMeta = { contentHash: '', modifiedAt: now };
  const baseProps = { textColor: 'default' as const, backgroundColor: 'default' as const };

  // Vérifier si c'est un paragraphe avec des propriétés de liste (Plate v52 indent list)
  if (node.type === 'p') {
    const listStyleType = (node as any).listStyleType as string | undefined;
    const indent = (node as any).indent as number | undefined;
    const checked = (node as any).checked as boolean | undefined;
    
    // Todo list (checkbox) - ListPlugin utilise listStyleType: 'todo'
    if ((checked !== undefined || listStyleType === 'todo') && indent) {
      return [{
        id: clipperId,
        type: 'todoList',
        content: convertChildren(node.children),
        props: { 
          ...baseProps,
          checked: checked ?? false,
        },
        children: [],
        _meta: baseMeta,
      }];
    }
    
    // Bullet list
    if (listStyleType && indent) {
      const isOrdered = listStyleType === 'decimal' || 
                        listStyleType === 'lower-alpha' || 
                        listStyleType === 'upper-alpha' ||
                        listStyleType === 'lower-roman' ||
                        listStyleType === 'upper-roman';
      
      return [{
        id: clipperId,
        type: isOrdered ? 'numberedList' : 'bulletList',
        content: convertChildren(node.children),
        props: baseProps,
        children: [],
        _meta: baseMeta,
      }];
    }
    
    // Paragraphe normal
    return [{
      id: clipperId,
      type: 'paragraph',
      content: convertChildren(node.children),
      props: baseProps,
      children: [],
      _meta: baseMeta,
    }];
  }

  switch (node.type) {
    case 'h1':
      return [{
        id: clipperId,
        type: 'heading1',
        content: convertChildren(node.children),
        props: { ...baseProps, level: 1 as const, isToggleable: false },
        children: [],
        _meta: baseMeta,
      }];

    case 'h2':
      return [{
        id: clipperId,
        type: 'heading2',
        content: convertChildren(node.children),
        props: { ...baseProps, level: 2 as const, isToggleable: false },
        children: [],
        _meta: baseMeta,
      }];

    case 'h3':
      return [{
        id: clipperId,
        type: 'heading3',
        content: convertChildren(node.children),
        props: { ...baseProps, level: 3 as const, isToggleable: false },
        children: [],
        _meta: baseMeta,
      }];

    case 'ul':
      return extractListItems(node, 'bulletList', idMapping);

    case 'ol':
      return extractListItems(node, 'numberedList', idMapping);

    case 'action_item':
      return [{
        id: clipperId,
        type: 'todoList',
        content: convertChildren(node.children),
        props: { 
          ...baseProps,
          checked: (node as { checked?: boolean }).checked || false,
        },
        children: [],
        _meta: baseMeta,
      }];

    case 'blockquote':
      return [{
        id: clipperId,
        type: 'quote',
        content: convertChildren(node.children),
        props: baseProps,
        children: [],
        _meta: baseMeta,
      }];

    case 'code_block':
      return [{
        id: clipperId,
        type: 'code',
        content: [{ 
          type: 'text', 
          text: extractCodeText(node), 
          styles: {} 
        }],
        props: { 
          ...baseProps,
          language: (node as { lang?: string }).lang || 'plain',
        },
        children: [],
        _meta: baseMeta,
      }];

    case 'hr':
      return [{
        id: clipperId,
        type: 'divider',
        content: [],
        props: {},
        children: [],
        _meta: baseMeta,
      }];

    case 'img':
      const imgNode = node as { url?: string; caption?: string };
      return [{
        id: clipperId,
        type: 'image',
        content: imgNode.caption 
          ? [{ type: 'text', text: imgNode.caption, styles: {} }]
          : [],
        props: { 
          ...baseProps,
          url: imgNode.url || '',
        },
        children: [],
        _meta: baseMeta,
      }];

    case 'callout':
      const calloutNode = node as { icon?: string; variant?: string };
      return [{
        id: clipperId,
        type: 'callout',
        content: convertChildren(node.children),
        props: { 
          ...baseProps,
          icon: calloutNode.icon || '💡',
          variant: calloutNode.variant || 'info',
        },
        children: [],
        _meta: baseMeta,
      }];

    case 'toggle':
      return [{
        id: clipperId,
        type: 'toggle',
        content: convertChildren(node.children),
        props: baseProps,
        children: [],
        _meta: baseMeta,
      }];

    case 'table':
      const tableRows = node.children
        .filter((c): c is PlateElement => isPlateElement(c) && c.type === 'tr')
        .map(row => ({
          cells: row.children
            .filter((c): c is PlateElement => isPlateElement(c) && (c.type === 'td' || c.type === 'th'))
            .map(cell => {
              const text = cell.children
                .filter(isPlateText)
                .map(t => t.text)
                .join('');
              return text;
            }),
        }));
      return [{
        id: clipperId,
        type: 'table',
        content: [],
        props: { 
          ...baseProps,
          rows: tableRows,
        },
        children: [],
        _meta: baseMeta,
      }];

    case 'mention':
      // Mention n'est pas un type ClipperDoc natif - convertir en paragraph
      const mentionNode = node as { value?: string };
      return [{
        id: clipperId,
        type: 'paragraph',
        content: [{ type: 'text', text: `@${mentionNode.value || ''}`, styles: {} }],
        props: baseProps,
        children: [],
        _meta: baseMeta,
      }];

    case 'media_embed':
      // Embed n'est pas un type ClipperDoc natif - convertir en image
      const embedNode = node as { url?: string };
      return [{
        id: clipperId,
        type: 'image',
        content: [],
        props: { 
          ...baseProps,
          url: embedNode.url || '',
        },
        children: [],
        _meta: baseMeta,
      }];

    case 'image':
      // Alternative image type
      const imageNode = node as { url?: string; caption?: string };
      return [{
        id: clipperId,
        type: 'image',
        content: imageNode.caption 
          ? [{ type: 'text', text: imageNode.caption, styles: {} }]
          : [],
        props: { 
          ...baseProps,
          url: imageNode.url || '',
        },
        children: [],
        _meta: baseMeta,
      }];

    default:
      return [{
        id: clipperId,
        type: 'paragraph',
        content: convertChildren(node.children),
        props: baseProps,
        children: [],
        _meta: baseMeta,
      }];
  }
}

/**
 * Extract list items from a list node
 */
function extractListItems(
  listNode: PlateElement, 
  blockType: 'bulletList' | 'numberedList',
  idMapping?: IdMapping
): ClipperBlock[] {
  const blocks: ClipperBlock[] = [];
  const now = new Date().toISOString();
  const baseProps = { textColor: 'default' as const, backgroundColor: 'default' as const };

  for (const child of listNode.children) {
    if (isPlateElement(child) && child.type === 'li') {
      const clipperId = idMapping?.plateToClipper.get(child.id) || child.id || generateClipperId();
      
      const licNode = child.children.find(
        (c): c is PlateElement => isPlateElement(c) && c.type === 'lic'
      );

      blocks.push({
        id: clipperId,
        type: blockType,
        content: licNode 
          ? convertChildren(licNode.children)
          : convertChildren(child.children),
        props: baseProps,
        children: [],
        _meta: { contentHash: '', modifiedAt: now },
      });
    }
  }

  return blocks;
}

/**
 * Convert Plate children to ClipperInlineContent
 */
function convertChildren(children: (PlateElement | PlateText)[]): ClipperText[] {
  const result: ClipperText[] = [];

  for (const child of children) {
    if (isPlateText(child)) {
      result.push({
        type: 'text',
        text: child.text,
        styles: {
          bold: child.bold || false,
          italic: child.italic || false,
          underline: child.underline || false,
          strikethrough: child.strikethrough || false,
          code: child.code || false,
        },
      });
    } else if (isPlateElement(child)) {
      // Flatten nested elements to text
      const nestedText = convertChildren(child.children);
      result.push(...nestedText);
    }
  }

  return result;
}

/**
 * Extract text from code block
 */
function extractCodeText(node: PlateElement): string {
  const lines: string[] = [];
  
  for (const child of node.children) {
    if (isPlateElement(child) && child.type === 'code_line') {
      const text = child.children
        .filter(isPlateText)
        .map(t => t.text)
        .join('');
      lines.push(text);
    } else if (isPlateText(child)) {
      lines.push(child.text);
    }
  }

  return lines.join('\n');
}

function isPlateElement(node: PlateElement | PlateText): node is PlateElement {
  return 'type' in node && 'children' in node;
}

function isPlateText(node: PlateElement | PlateText): node is PlateText {
  return 'text' in node && !('type' in node);
}

export default plateToClipperDoc;
