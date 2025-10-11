/**
 * Expressions régulières communes pour le parsing
 */

// Markdown patterns
export const MARKDOWN_PATTERNS = {
  // Headers
  HEADER: /^(#{1,6})\s+(.+)$/,
  
  // Lists
  BULLET_LIST: /^[\s]*[-*+]\s+(.+)$/,
  NUMBERED_LIST: /^[\s]*\d+\.\s+(.+)$/,
  CHECKBOX: /^[\s]*- \[([ x])\]\s+(.+)$/,
  
  // Code
  CODE_BLOCK: /^```(\w*)\s*$/,
  INLINE_CODE: /`([^`]+)`/g,
  
  // Links and images
  LINK: /\[([^\]]+)\]\(([^)]+)\)/g,
  IMAGE: /!\[([^\]]*)\]\(([^)]+)\)/g,
  
  // Formatting
  BOLD_ITALIC: /\*\*\*(.+?)\*\*\*/g,
  BOLD: /\*\*(.+?)\*\*/g,
  ITALIC: /\*(.+?)\*/g,
  STRIKETHROUGH: /~~(.+?)~~/g,
  UNDERLINE: /__(.+?)__/g,
  
  // Quotes and callouts
  QUOTE: /^>\s+(.+)$/,
  CALLOUT: /^>\s*\[!(\w+)\]\s*(.*)$/,
  
  // Dividers
  DIVIDER: /^(---|\*\*\*|___)$/,
  
  // Tables
  TABLE_ROW: /^\|(.+)\|$/,
  TABLE_SEPARATOR: /^[\|\-:\s]+$/,
  
  // Equations
  BLOCK_EQUATION: /^\$\$$/, 
  INLINE_EQUATION: /\$([^$]+)\$/g
};

// HTML patterns
export const HTML_PATTERNS = {
  TAG: /<[^>]+>/g,
  SCRIPT: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  STYLE: /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
  COMMENT: /<!--[\s\S]*?-->/g,
  
  // Common tags
  PARAGRAPH: /<p\b[^>]*>(.*?)<\/p>/gi,
  DIV: /<div\b[^>]*>(.*?)<\/div>/gi,
  SPAN: /<span\b[^>]*>(.*?)<\/span>/gi,
  LINK: /<a\b[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi,
  IMAGE: /<img\b[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi,
  
  // Lists
  UL: /<ul\b[^>]*>(.*?)<\/ul>/gi,
  OL: /<ol\b[^>]*>(.*?)<\/ol>/gi,
  LI: /<li\b[^>]*>(.*?)<\/li>/gi,
  
  // Headers
  H1: /<h1\b[^>]*>(.*?)<\/h1>/gi,
  H2: /<h2\b[^>]*>(.*?)<\/h2>/gi,
  H3: /<h3\b[^>]*>(.*?)<\/h3>/gi,
  
  // Code
  CODE: /<code\b[^>]*>(.*?)<\/code>/gi,
  PRE: /<pre\b[^>]*>(.*?)<\/pre>/gi,
  
  // Tables
  TABLE: /<table\b[^>]*>(.*?)<\/table>/gi,
  TR: /<tr\b[^>]*>(.*?)<\/tr>/gi,
  TD: /<td\b[^>]*>(.*?)<\/td>/gi,
  TH: /<th\b[^>]*>(.*?)<\/th>/gi
};

// LaTeX patterns
export const LATEX_PATTERNS = {
  ENVIRONMENT: /\\begin\{(\w+)\}(.*?)\\end\{\1\}/gs,
  COMMAND: /\\(\w+)(?:\[([^\]]*)\])?(?:\{([^}]*)\})?/g,
  
  // Math environments
  EQUATION: /\\begin\{equation\}(.*?)\\end\{equation\}/gs,
  ALIGN: /\\begin\{align\}(.*?)\\end\{align\}/gs,
  
  // Lists
  ITEMIZE: /\\begin\{itemize\}(.*?)\\end\{itemize\}/gs,
  ENUMERATE: /\\begin\{enumerate\}(.*?)\\end\{enumerate\}/gs,
  ITEM: /\\item\s+([^\n\\]+)/g,
  
  // Tables
  TABULAR: /\\begin\{tabular\}(?:\{[^}]*\})?(.*?)\\end\{tabular\}/gs,
  TABLE_ROW: /([^\\]+)(?:\\\\|$)/g,
  
  // Inline math
  INLINE_MATH: /\$([^$]+)\$/g,
  DISPLAY_MATH: /\$\$(.*?)\$\$/gs
};

// URL patterns
export const URL_PATTERNS = {
  HTTP: /https?:\/\/[^\s<>"{}|\\^`[\]]+/g,
  DOMAIN: /^(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/,
  
  // Media URLs
  IMAGE_URL: /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff?)$/i,
  VIDEO_URL: /\.(mp4|avi|mov|wmv|webm|mkv)$/i,
  AUDIO_URL: /\.(mp3|wav|ogg|m4a|flac)$/i,
  
  // Embed services
  YOUTUBE: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
  VIMEO: /vimeo\.com\/(\d+)/,
  TWITTER: /twitter\.com\/\w+\/status\/(\d+)/,
  
  // File types
  PDF: /\.pdf$/i,
  DOC: /\.(doc|docx)$/i,
  SPREADSHEET: /\.(xls|xlsx|csv)$/i
};

// Code language detection patterns
export const CODE_LANGUAGE_PATTERNS = {
  javascript: [
    /\b(const|let|var)\s+\w+/,
    /function\s*\(/,
    /=>\s*{?/,
    /import\s+.*from/
  ],
  typescript: [
    /interface\s+\w+/,
    /:\s*(string|number|boolean)/,
    /type\s+\w+\s*=/
  ],
  python: [
    /\bdef\s+\w+\s*\(/,
    /\bclass\s+\w+/,
    /\bimport\s+\w+/,
    /\bfrom\s+\w+\s+import/
  ],
  java: [
    /\bpublic\s+class\s+\w+/,
    /\bpublic\s+static\s+void\s+main/,
    /\bimport\s+java\./
  ],
  cpp: [
    /#include\s*<.*>/,
    /\bstd::/,
    /\bint\s+main\s*\(/
  ],
  csharp: [
    /\busing\s+System/,
    /\bnamespace\s+\w+/,
    /\bConsole\.WriteLine/
  ],
  php: [
    /<\?php/,
    /\$\w+\s*=/,
    /\becho\s+/
  ],
  ruby: [
    /\bdef\s+\w+/,
    /\bend\s*$/m,
    /\bputs\s+/
  ],
  go: [
    /\bpackage\s+\w+/,
    /\bfunc\s+\w+\s*\(/,
    /\bfmt\.Print/
  ],
  rust: [
    /\bfn\s+\w+\s*\(/,
    /\blet\s+mut\s+/,
    /\bprintln!\s*\(/
  ],
  sql: [
    /\bSELECT\s+.*\bFROM\b/i,
    /\bINSERT\s+INTO\b/i,
    /\bCREATE\s+TABLE\b/i
  ]
};

// Table detection patterns
export const TABLE_PATTERNS = {
  CSV: /^[^,\n]*,[^,\n]*(?:,[^,\n]*)*$/m,
  TSV: /^[^\t\n]*\t[^\t\n]*(?:\t[^\t\n]*)*$/m,
  MARKDOWN_TABLE: /^\|?[^|\n]*\|[^|\n]*\|?$/m,
  PIPE_SEPARATOR: /^\|?[\s]*:?-+:?[\s]*\|/
};