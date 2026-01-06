/**
 * @notion-clipper/plate-adapter
 * 
 * Plate-based editor adapter for ClipperDoc.
 * Provides a Notion-like editing experience with ClipperDoc as source of truth.
 * 
 * Uses Plate v49 with proper plugins for rich text editing.
 * ClipperDoc is the ONLY source of truth. Plate is just a view/edit layer.
 * 
 * REFACTORED: Clean implementation using official Plate patterns.
 * - NO custom DnD wrappers (use Plate's DndPlugin)
 * - NO wrapper divs around block elements
 * - Proper canonical list structure (ul > li > lic)
 */

// Main component
export { ClipperPlateEditor, type ClipperPlateEditorProps, type ClipperPlateEditorRef } from './components/ClipperPlateEditor';

// Hook
export { useClipperPlateEditor } from './hooks/useClipperPlateEditor';

// Converters
export { clipperDocToPlate } from './convert/clipperDocToPlate';
export { plateToClipperDoc } from './convert/plateToClipperDoc';

// Types
export type {
  ClipperDocument,
  ClipperBlock,
  ClipperInlineContent,
  PlateValue,
  PlateElement,
  PlateText,
  IdMapping,
  ClipperEditorState,
  PlateEditorConfig,
} from './types';

export {
  CLIPPER_TO_PLATE_TYPE,
  PLATE_TO_CLIPPER_TYPE,
} from './types';

// Schema/Plugins
export { 
  createClipperPlugins, 
  SLASH_MENU_ITEMS,
  ELEMENT_PARAGRAPH,
  ELEMENT_H1,
  ELEMENT_H2,
  ELEMENT_H3,
  ELEMENT_UL,
  ELEMENT_OL,
  ELEMENT_LI,
  ELEMENT_BLOCKQUOTE,
  ELEMENT_CODE_BLOCK,
  ELEMENT_HR,
  ELEMENT_LINK,
  ELEMENT_IMAGE,
  MARK_BOLD,
  MARK_ITALIC,
  MARK_UNDERLINE,
  MARK_STRIKETHROUGH,
  MARK_CODE,
} from './schema/platePlugins';

// Clean Element Components (NO DnD wrappers)
export { editorComponents } from './components/editor-components';
export { ParagraphElement } from './components/plate-ui/paragraph-element';
export { Heading1Element, Heading2Element, Heading3Element } from './components/plate-ui/heading-element';
export { BlockquoteElement } from './components/plate-ui/blockquote-element';
export { CodeBlockElement, CodeLineElement } from './components/plate-ui/code-block-element';
export { 
  BulletedListElement, 
  NumberedListElement, 
  ListItemElement, 
  ListItemContentElement 
} from './components/plate-ui/list-element';
export { HorizontalRuleElement } from './components/plate-ui/hr-element';
export { LinkElement } from './components/plate-ui/link-element';
export { TodoElement } from './components/plate-ui/todo-element';

// Legacy plate-elements (for backwards compatibility)
export { plateComponents } from './components/plate-elements';

// UI Components
export {
  SlashMenu,
  BlockAddButton,
  BlockDragHandle,
  BlockWrapper,
} from './schema/notionLikeUi';

// Commands
export {
  setBlockType,
  insertBlockAfter,
  deleteBlock,
  getCurrentBlockType,
  BLOCK_TYPE_MAP,
} from './commands/blockCommands';

// Editor Plugins
export { createEditorPlugins, defaultEditorPlugins } from './plugins/editorPlugins';
