// packages/ui/src/components/editor/index.ts
// 🎯 Editor components - Content creation and editing

export { ContentEditor } from './ContentEditor';
export { DynamicDatabaseProperties } from './DynamicDatabaseProperties';
export { DropdownPortal } from './DropdownPortal';
export { ImagePreview } from './ImagePreview';
export { FileUploadZone } from './FileUploadZone';
export { FileUploadModal } from './FileUploadModal';
export type { FileUploadConfig, UploadMode } from './FileUploadModal';
export { FileCarousel } from './FileCarousel';
export type { AttachedFile } from './FileCarousel';
export { TableOfContents } from './TableOfContents';
export { DestinationsCarousel } from './DestinationsCarousel';

// 🆕 Nouveaux composants UI/UX redesign
export { WorkspaceSelector } from './WorkspaceSelector';
export type { Workspace, WorkspaceSelectorProps } from './WorkspaceSelector';
export { VoiceRecorder } from './VoiceRecorder';
export type { VoiceRecording, VoiceRecorderProps } from './VoiceRecorder';
export { TemplateSelector } from './TemplateSelector';
export type { Template, TemplateBlock, TemplateSelectorProps } from './TemplateSelector';
export { NotionClipboardEditor } from './NotionClipboardEditor';
export type { 
  NotionClipboardEditorProps, 
  NotionClipboardEditorRef,
  ClipboardImage,
  AttachedFile as EditorAttachedFile 
} from './NotionClipboardEditor';
export { FormattingMenu } from './FormattingMenu';
export type { FormattingMenuProps, FormattingAction } from './FormattingMenu';
export { 
  LiveMarkdownFormatter, 
  liveMarkdownFormatter,
  INLINE_PATTERNS,
  formatBold,
  formatItalic,
  formatCode,
  formatStrikethrough,
  formatLink
} from './LiveMarkdownFormatter';
export type { FormattingResult, InlinePattern } from './LiveMarkdownFormatter';
export {
  LineStartHandler,
  lineStartHandler,
  LINE_START_PATTERNS,
  isBulletList,
  isTodo,
  isNumberedList,
  isHeading,
  isToggle,
  isQuote,
  isDivider
} from './LineStartHandler';
export type { BlockType, LineStartResult, LineStartPattern } from './LineStartHandler';
export { FloatingTOC } from './FloatingTOC';
export { 
  SlashMenu,
  filterCommands,
  BLOCK_COMMANDS,
  ACTION_COMMANDS,
  COLOR_COMMANDS,
  ALL_COMMANDS
} from './SlashMenu';
export type { SlashMenuProps, SlashCommand, SlashCommandType } from './SlashMenu';
export { EnhancedContentEditor } from './EnhancedContentEditor';
export type { EnhancedContentEditorProps } from './EnhancedContentEditor';

// 🆕 TOC Multi-Select components
export { TabBar } from './toc';
export type { TabBarProps } from './toc';

// 🎯 Section Target Panel (anchored, not floating)
export { SectionTargetPanel } from './SectionTargetPanel';