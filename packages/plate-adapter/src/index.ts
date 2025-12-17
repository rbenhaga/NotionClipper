/**
 * @notion-clipper/plate-adapter
 * 
 * Plate-based editor adapter for ClipperDoc.
 * Provides a Notion-like editing experience with ClipperDoc as source of truth.
 * 
 * Uses Plate v49 with proper plugins for rich text editing.
 * ClipperDoc is the ONLY source of truth. Plate is just a view/edit layer.
 * 
 * AI Features:
 * - Disabled by default via enableAi flag
 * - Can be enabled later for custom AI implementation
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
