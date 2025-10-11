/**
 * Types pour l'AST intermédiaire
 */

export interface ASTNode {
  type: string;
  content?: string;
  children?: ASTNode[];
  metadata?: Record<string, any>;
}

export interface TextNode extends ASTNode {
  type: 'text';
  content: string;
  formatting?: TextFormatting;
}

export interface TextFormatting {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  code?: boolean;
  color?: string;
  link?: string;
}

export interface HeadingNode extends ASTNode {
  type: 'heading';
  level: 1 | 2 | 3;
  content: string;
  isToggleable?: boolean;
}

export interface ListNode extends ASTNode {
  type: 'list';
  listType: 'bulleted' | 'numbered' | 'todo';
  items: ListItemNode[];
}

export interface ListItemNode extends ASTNode {
  type: 'list_item';
  content: string;
  checked?: boolean;
  children?: ASTNode[];
}

export interface CodeNode extends ASTNode {
  type: 'code';
  content: string;
  language?: string;
  isBlock?: boolean;
}

export interface TableNode extends ASTNode {
  type: 'table';
  headers: string[];
  rows: string[][];
  hasColumnHeader?: boolean;
  hasRowHeader?: boolean;
}

export interface CalloutNode extends ASTNode {
  type: 'callout';
  content: string;
  icon?: string;
  color?: string;
}

export interface MediaNode extends ASTNode {
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  caption?: string;
  alt?: string;
}

export interface EquationNode extends ASTNode {
  type: 'equation';
  expression: string;
  isBlock?: boolean;
}

export interface QuoteNode extends ASTNode {
  type: 'quote';
  content: string;
}

export interface DividerNode extends ASTNode {
  type: 'divider';
}

export interface ToggleNode extends ASTNode {
  type: 'toggle';
  content: string;
  children?: ASTNode[];
}

export interface BookmarkNode extends ASTNode {
  type: 'bookmark';
  url: string;
  title?: string;
  description?: string;
}

export type ContentNode = 
  | TextNode
  | HeadingNode
  | ListNode
  | ListItemNode
  | CodeNode
  | TableNode
  | CalloutNode
  | MediaNode
  | EquationNode
  | QuoteNode
  | DividerNode
  | ToggleNode
  | BookmarkNode;