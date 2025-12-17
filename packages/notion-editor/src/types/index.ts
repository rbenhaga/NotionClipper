/**
 * Editor Types
 * 
 * Type definitions for the notion-editor package.
 */

// Editor State Types
export interface EditorState {
  content: string;    // Markdown content
  html: string;       // Rendered HTML
  isDirty: boolean;   // Has unsaved changes
  isFocused: boolean; // Editor is focused
}

export type EditorAction =
  | { type: 'SET_CONTENT'; payload: string }
  | { type: 'SET_HTML'; payload: string }
  | { type: 'MARK_DIRTY' }
  | { type: 'MARK_CLEAN' }
  | { type: 'FOCUS'; payload: boolean };

// Position Types
export interface Position {
  x: number;
  y: number;
}

export interface BlockPosition {
  top: number;
  left: number;
}

// Formatting Types
export type FormattingAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'code'
  | 'link'
  | 'heading1'
  | 'heading2'
  | 'heading3';

// Slash Command Types
export interface SlashCommand {
  name: string;
  icon?: string;
  keywords: string[];
  action: () => void;
}

// Image type for clipboard images
export interface ClipboardImage {
  id?: string;
  data?: string | ArrayBuffer;
  content?: string | Uint8Array;
  preview?: string;
  size?: number;
}

// Attached file type
export interface AttachedFile {
  id: string;
  file?: File;
  url?: string;
  name: string;
  type: string;
  size?: number;
  preview?: string;
}

// Block types for line-start shortcuts
export type BlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bulleted_list'
  | 'numbered_list'
  | 'todo'
  | 'quote'
  | 'divider';

// Component Props Types
export interface NotionEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  // Clipboard sync props
  clipboardContent?: string;
  hasUserEdited?: boolean;
  onResetToClipboard?: () => void;
  // Image props
  images?: ClipboardImage[];
  onImageRemove?: (index: number) => void;
  // File props
  attachedFiles?: AttachedFile[];
  onFileRemove?: (id: string) => void;
  onFilesAdd?: (files: AttachedFile[]) => void;
  // Quota props
  fileQuotaRemaining?: number | null;
  maxFileSize?: number;
  onFileQuotaExceeded?: () => void;
  showNotification?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  // Feature flags
  enableLiveMarkdown?: boolean;
  enableLineStartShortcuts?: boolean;
}

export interface EditorAreaProps {
  html: string;
  onChange: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  placeholder?: string;
}

export interface FormattingToolbarProps {
  position: Position;
  onAction: (action: FormattingAction) => void;
  onClose: () => void;
}

export interface SlashMenuProps {
  position: Position;
  filter: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

export interface DragHandleProps {
  position: BlockPosition;
  onDragStart: (e: React.DragEvent) => void;
}

// Hook Return Types
export interface UseEditorStateReturn {
  ref: React.RefObject<HTMLDivElement>;
  html: string;
  isFocused: boolean;
  insertAtCursor: (text: string) => void;
  focus: () => void;
  getSelection: () => Selection | null;
  getContent: () => string;
  handleChange: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handlePaste: (e: React.ClipboardEvent) => void;
}

export interface UseFormattingMenuReturn {
  isVisible: boolean;
  position: Position;
  hide: () => void;
}

export interface UseSlashCommandsReturn {
  isVisible: boolean;
  position: Position;
  filter: string;
  selectedIndex: number;
  hide: () => void;
}

export interface UseDragAndDropReturn {
  showHandle: boolean;
  handlePosition: BlockPosition;
  isDragging: boolean;
  dropIndicator: BlockPosition | null;
  /** Get the currently hovered block element */
  getHoveredBlock: () => HTMLElement | null;
  /** Trigger drag start from external component (DragHandle) */
  onDragStart: (e: React.DragEvent) => void;
}

// Note: UseLiveMarkdownReturn and UseLineStartShortcutsReturn are exported from their respective hooks
