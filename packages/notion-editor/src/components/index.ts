/**
 * Editor Components
 * 
 * - NotionEditor: Main orchestrating component (< 250 lines)
 * - EditorArea: contentEditable region
 * - FormattingToolbar: Bold, Italic, etc. toolbar
 * - SlashMenu: Slash command menu
 * - DragHandle: Block drag handle
 */

export { NotionEditor, type NotionEditorRef } from './NotionEditor';
export { EditorArea } from './EditorArea';
export { FormattingToolbar } from './FormattingToolbar';
export { SlashMenu, DEFAULT_SLASH_COMMANDS } from './SlashMenu';
export { DragHandle } from './DragHandle';
