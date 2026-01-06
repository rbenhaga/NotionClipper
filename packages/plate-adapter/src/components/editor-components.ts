/**
 * Editor Components Map - Clean Plate UI components
 * 
 * This replaces draggable-elements.tsx with proper Plate components.
 * NO custom DnD wrappers - DnD is handled by Plate's DndPlugin via render.aboveNodes.
 * 
 * IMPORTANT: These components render ONLY the semantic HTML element.
 * Drag handles, + buttons, and selection overlays are rendered by Plate plugins,
 * NOT inside these components.
 */

// Core blocks
import { ParagraphElement } from './plate-ui/paragraph-element';
import { Heading1Element, Heading2Element, Heading3Element } from './plate-ui/heading-element';
import { BlockquoteElement } from './plate-ui/blockquote-element';
import { CodeBlockElement, CodeLineElement } from './plate-ui/code-block-element';
import {
  BulletedListElement,
  NumberedListElement,
  ListItemElement,
  ListItemContentElement,
} from './plate-ui/list-element';
import { HorizontalRuleElement } from './plate-ui/hr-element';
import { LinkElement } from './plate-ui/link-element';
import { TodoElement } from './plate-ui/todo-element';

// Advanced blocks
import { TableElement, TableRowElement, TableCellElement, TableCellHeaderElement } from './plate-ui/table-element';
import { CalloutElement } from './plate-ui/callout-element';
import { ToggleElement } from './plate-ui/toggle-element';
import { MentionElement, MentionInputElement } from './plate-ui/mention-element';
import { ImageElement, MediaEmbedElement } from './plate-ui/image-element';

/**
 * Component map for Plate editor
 * 
 * Keys are Plate element types, values are React components.
 * Used in createPlateEditor({ override: { components: editorComponents } })
 */
export const editorComponents = {
  // ═══════════════════════════════════════════════════════════════
  // CORE BLOCKS
  // ═══════════════════════════════════════════════════════════════
  
  // Paragraphs
  p: ParagraphElement,
  
  // Headings
  h1: Heading1Element,
  h2: Heading2Element,
  h3: Heading3Element,
  
  // Lists (canonical Plate structure: ul > li > lic)
  ul: BulletedListElement,
  ol: NumberedListElement,
  li: ListItemElement,
  lic: ListItemContentElement,
  
  // Other blocks
  blockquote: BlockquoteElement,
  code_block: CodeBlockElement,
  code_line: CodeLineElement,
  hr: HorizontalRuleElement,
  
  // Inline elements
  a: LinkElement,
  
  // Special blocks
  action_item: TodoElement,

  // ═══════════════════════════════════════════════════════════════
  // ADVANCED BLOCKS
  // ═══════════════════════════════════════════════════════════════
  
  // Table
  table: TableElement,
  tr: TableRowElement,
  td: TableCellElement,
  th: TableCellHeaderElement,
  
  // Callout
  callout: CalloutElement,
  
  // Toggle
  toggle: ToggleElement,
  
  // Mention
  mention: MentionElement,
  mention_input: MentionInputElement,
  
  // Media
  img: ImageElement,
  image: ImageElement,
  media_embed: MediaEmbedElement,
};

export default editorComponents;
