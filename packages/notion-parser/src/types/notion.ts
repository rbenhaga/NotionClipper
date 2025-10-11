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

export interface NotionBlock {
  type: string;
  [key: string]: any;
}