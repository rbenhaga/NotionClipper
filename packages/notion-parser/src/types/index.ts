// packages/notion-parser/src/types/index.ts

// AST Node types
export interface ASTNode {
  type: string;
  content?: string;
  children?: ASTNode[];
  attributes?: Record<string, any>;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: NotionColor;
  };
  url?: string;
  language?: string;
  level?: number;
  ordered?: boolean;
  checked?: boolean;
  metadata?: {
    richText?: any[];
    level?: number;
    color?: NotionColor | string;
    isToggleable?: boolean;
    listType?: 'bulleted' | 'numbered' | 'to_do' | 'todo';
    checked?: boolean;
    indentLevel?: number;
    language?: string;
    isBlock?: boolean;
    headers?: string[];
    rows?: string[][];
    hasColumnHeader?: boolean;
    hasRowHeader?: boolean;
    icon?: string;
    url?: string;
    caption?: string;
    alt?: string;
    title?: string;
    description?: string;
    hasChildren?: boolean;
    [key: string]: any;
  };
}

// Parse options
export interface ParseOptions {
  maxBlocks?: number;
  maxRichTextLength?: number;
  maxCodeLength?: number;
  defaultLanguage?: string;
  preserveWhitespace?: boolean;
  enableTables?: boolean;
  enableMath?: boolean;
}

// Conversion options
export interface ConversionOptions {
  maxBlocks?: number;
  preserveFormatting?: boolean;
  defaultColor?: NotionColor;
  enableCodeHighlighting?: boolean;
  tableMaxColumns?: number;
  tableMaxRows?: number;
  convertImages?: boolean;
  convertVideos?: boolean;
  convertLinks?: boolean;
  convertTables?: boolean;
  convertCode?: boolean;
}

// Notion color types
export type NotionColor = 
  | 'default'
  | 'gray'
  | 'brown'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red'
  | 'gray_background'
  | 'brown_background'
  | 'orange_background'
  | 'yellow_background'
  | 'green_background'
  | 'blue_background'
  | 'purple_background'
  | 'pink_background'
  | 'red_background';

// Notion block types
export interface NotionBlock {
  object?: 'block';
  type: string;
  [key: string]: any;
}

export interface NotionRichText {
  type: 'text';
  text: {
    content: string;
    link?: {
      url: string;
    };
  };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: NotionColor;
  };
  plain_text?: string;
  href?: string;
}

export interface NotionFile {
  type: 'file_upload' | 'external';
  file_upload?: {
    id: string;
  };
  external?: {
    url: string;
  };
  caption?: NotionRichText[];
  name?: string;
}

export interface NotionImageBlock extends NotionBlock {
  type: 'image';
  image: NotionFile;
}

export interface NotionVideoBlock extends NotionBlock {
  type: 'video';
  video: NotionFile;
}

export interface NotionAudioBlock extends NotionBlock {
  type: 'audio';
  audio: NotionFile;
}

export interface NotionFileBlock extends NotionBlock {
  type: 'file';
  file: NotionFile;
}

export interface NotionEmbedBlock extends NotionBlock {
  type: 'embed';
  embed: {
    url: string;
    caption?: NotionRichText[];
  };
}

export interface NotionBookmarkBlock extends NotionBlock {
  type: 'bookmark';
  bookmark: {
    url: string;
    caption?: NotionRichText[];
  };
}

// Paragraph block
export interface NotionParagraphBlock extends NotionBlock {
  type: 'paragraph';
  paragraph: {
    rich_text: NotionRichText[];
    color?: NotionColor;
  };
}

// Heading blocks
export interface NotionHeadingBlock extends NotionBlock {
  type: 'heading_1' | 'heading_2' | 'heading_3';
  heading_1?: {
    rich_text: NotionRichText[];
    color?: NotionColor;
    is_toggleable?: boolean;
  };
  heading_2?: {
    rich_text: NotionRichText[];
    color?: NotionColor;
    is_toggleable?: boolean;
  };
  heading_3?: {
    rich_text: NotionRichText[];
    color?: NotionColor;
    is_toggleable?: boolean;
  };
}

// List blocks
export interface NotionBulletedListItemBlock extends NotionBlock {
  type: 'bulleted_list_item';
  bulleted_list_item: {
    rich_text: NotionRichText[];
    color?: NotionColor;
    children?: NotionBlock[];
  };
}

export interface NotionNumberedListItemBlock extends NotionBlock {
  type: 'numbered_list_item';
  numbered_list_item: {
    rich_text: NotionRichText[];
    color?: NotionColor;
    children?: NotionBlock[];
  };
}

export interface NotionToDoBlock extends NotionBlock {
  type: 'to_do';
  to_do: {
    rich_text: NotionRichText[];
    checked: boolean;
    color?: NotionColor;
    children?: NotionBlock[];
  };
}

// Code block
export interface NotionCodeBlock extends NotionBlock {
  type: 'code';
  code: {
    rich_text: NotionRichText[];
    language: string;
    caption?: NotionRichText[];
  };
}

// Quote block
export interface NotionQuoteBlock extends NotionBlock {
  type: 'quote';
  quote: {
    rich_text: NotionRichText[];
    color?: NotionColor;
    children?: NotionBlock[];
  };
}

// Callout block
export interface NotionCalloutBlock extends NotionBlock {
  type: 'callout';
  callout: {
    rich_text: NotionRichText[];
    icon?: {
      type: 'emoji';
      emoji: string;
    } | {
      type: 'external';
      external: {
        url: string;
      };
    };
    color?: NotionColor;
    children?: NotionBlock[];
  };
}

// Divider block
export interface NotionDividerBlock extends NotionBlock {
  type: 'divider';
  divider: {};
}

// Table blocks
export interface NotionTableBlock extends NotionBlock {
  type: 'table';
  table: {
    table_width: number;
    has_column_header: boolean;
    has_row_header: boolean;
    children?: NotionTableRowBlock[];
  };
}

export interface NotionTableRowBlock extends NotionBlock {
  type: 'table_row';
  table_row: {
    cells: NotionRichText[][];
  };
}