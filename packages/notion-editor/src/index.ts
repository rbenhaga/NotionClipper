/**
 * @notion-clipper/notion-editor
 * 
 * Modular Notion-style editor component with hooks and sub-components.
 * Refactored from the monolithic NotionClipboardEditor (4,576 lines).
 * 
 * Features:
 * - Live Markdown formatting (**bold**, *italic*, `code`, etc.)
 * - Line-start shortcuts (# → H1, - → list, [] → todo, etc.)
 * - Slash commands menu
 * - Drag & drop block reordering
 * - Formatting toolbar on selection
 * - Clipboard sync with reset button
 * - Image and file attachments with quota validation
 */

// Components
export * from './components';

// Hooks
export * from './hooks';

// Types
export * from './types';

// Styles - import this in your app to get Notion-like styling
// import '@notion-clipper/notion-editor/styles/notion-blocks.css';
