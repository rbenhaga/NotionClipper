/**
 * Types Notion API - Définis localement pour éviter les dépendances circulaires
 */

export type NotionColor = 
  | 'default' | 'gray' | 'brown' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'red'
  | 'gray_background' | 'brown_background' | 'orange_background' | 'yellow_background' 
  | 'green_background' | 'blue_background' | 'purple_background' | 'pink_background' | 'red_background';

export interface NotionRichText {
  type: 'text' | 'mention' | 'equation';
  text?: {
    content: string;
    link?: { url: string } | null;
  };
  mention?: {
    type: 'user' | 'page' | 'database' | 'date' | 'link_preview';
    [key: string]: any;
  };
  equation?: {
    expression: string;
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
  href?: string | null;
}

// Interfaces spécifiques pour les blocs Notion

export interface AudioBlock {
  type: 'audio';
  audio: {
    type: 'external' | 'file';
    external?: {
      url: string;
    };
    file?: {
      url: string;
      expiry_time: string;
    };
    caption?: NotionRichText[];
  };
}

export interface TableBlock {
  type: 'table';
  table: {
    table_width: number;
    has_column_header: boolean;
    has_row_header: boolean;
    children?: TableRowBlock[];
  };
}

export interface TableRowBlock {
  type: 'table_row';
  table_row: {
    cells: NotionRichText[][];
  };
}

export interface HeadingBlock {
  type: 'heading_1' | 'heading_2' | 'heading_3';
  heading_1?: {
    rich_text: NotionRichText[];
    color?: NotionColor;
    is_toggleable?: boolean;
    children?: NotionBlock[];
  };
  heading_2?: {
    rich_text: NotionRichText[];
    color?: NotionColor;
    is_toggleable?: boolean;
    children?: NotionBlock[];
  };
  heading_3?: {
    rich_text: NotionRichText[];
    color?: NotionColor;
    is_toggleable?: boolean;
    children?: NotionBlock[];
  };
}

export interface ImageBlock {
  type: 'image';
  image: {
    type: 'external' | 'file';
    external?: {
      url: string;
    };
    file?: {
      url: string;
      expiry_time: string;
    };
    caption?: NotionRichText[];
  };
}

export interface VideoBlock {
  type: 'video';
  video: {
    type: 'external' | 'file';
    external?: {
      url: string;
    };
    file?: {
      url: string;
      expiry_time: string;
    };
    caption?: NotionRichText[];
  };
}

export interface FileBlock {
  type: 'file';
  file: {
    type: 'external' | 'file';
    external?: {
      url: string;
      name?: string;
    };
    file?: {
      url: string;
      expiry_time: string;
    };
    caption?: NotionRichText[];
    name?: string;
  };
}

export interface PdfBlock {
  type: 'pdf';
  pdf: {
    type: 'external' | 'file';
    external?: {
      url: string;
    };
    file?: {
      url: string;
      expiry_time: string;
    };
    caption?: NotionRichText[];
  };
}

export type NotionBlock = 
  | AudioBlock
  | TableBlock
  | TableRowBlock
  | HeadingBlock
  | ImageBlock
  | VideoBlock
  | FileBlock
  | PdfBlock
  | {
      type: string;
      [key: string]: any;
    };