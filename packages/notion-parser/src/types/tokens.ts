/**
 * Types pour le système de tokenization
 */

export interface Position {
  start: number;
  end: number;
  line: number;
  column: number;
}

export type TokenType = 
  // Block tokens
  | 'HEADING_1' | 'HEADING_2' | 'HEADING_3'
  | 'PARAGRAPH'
  | 'CODE_BLOCK'
  | 'QUOTE_BLOCK'
  | 'TOGGLE_HEADING'
  | 'CALLOUT'
  | 'LIST_ITEM_BULLETED'
  | 'LIST_ITEM_NUMBERED'
  | 'LIST_ITEM_TODO'
  | 'TABLE_ROW'
  | 'DIVIDER'
  | 'EQUATION_BLOCK'
  | 'TOGGLE_SIMPLE'
  | 'CALLOUT_HTML'
  | 'CALLOUT_HTML_SINGLE'
  | 'CALLOUT_HTML_OPEN'
  | 'CALLOUT_HTML_CLOSE'
  
  // Inline tokens
  | 'TEXT'
  | 'BOLD_START' | 'BOLD_END'
  | 'ITALIC_START' | 'ITALIC_END'
  | 'CODE_START' | 'CODE_END'
  | 'STRIKETHROUGH_START' | 'STRIKETHROUGH_END'
  | 'UNDERLINE_START' | 'UNDERLINE_END'
  | 'LINK'
  | 'EQUATION_INLINE'
  
  // Media tokens
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'BOOKMARK'
  
  // Special tokens
  | 'NEWLINE'
  | 'EOF'
  | 'WHITESPACE';

export interface Token {
  type: TokenType;
  content: string;
  position: Position;
  
  // Metadata spécifique selon le type
  metadata?: {
    // Pour les headings
    level?: 1 | 2 | 3;
    
    // Pour les listes
    indentLevel?: number;
    listType?: 'bulleted' | 'numbered' | 'todo';
    checked?: boolean;
    
    // Propriété commune pour headings et listes
    isToggleable?: boolean;
    
    // Pour les liens et médias
    url?: string;
    alt?: string;
    title?: string;
    
    // Pour les callouts
    calloutType?: string;
    
    // Pour les blocs (code, équations)
    isBlock?: boolean;
    
    // Pour les toggles
    isToggleCandidate?: boolean;
    icon?: string;
    color?: string;
    
    // Pour les code blocks
    language?: string;
    
    // Pour les équations
    expression?: string;
    
    // Pour les tables
    isHeader?: boolean;
    columnIndex?: number;
    tableType?: 'markdown' | 'csv' | 'tsv';
    
    // Pour le formatage inline
    annotations?: {
      bold?: boolean;
      italic?: boolean;
      strikethrough?: boolean;
      underline?: boolean;
      code?: boolean;
    };
  };
}

export interface TokenStream {
  tokens: Token[];
  current: number;
  
  peek(offset?: number): Token | null;
  next(): Token | null;
  hasNext(): boolean;
  position(): number;
  seek(position: number): void;
}

export interface LexerRule {
  name: string;
  priority: number;
  pattern: RegExp | ((text: string, position: number) => { match: boolean; length: number; });
  tokenType: TokenType;
  extract: (match: RegExpMatchArray | string, position: Position) => Partial<Token>;
}

export interface LexerState {
  text: string;
  position: number;
  line: number;
  column: number;
  tokens: Token[];
  
  // Context state
  inCodeBlock?: boolean;
  inTable?: boolean;
  inList?: boolean;
  listLevel?: number;
}