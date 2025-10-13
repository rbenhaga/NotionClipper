import type { LexerRule } from '../../types/tokens';

/**
 * Règles de tokenization pour les éléments inline
 * ✅ CORRECTION: Gestion des espaces selon PATCH #1
 */
export const inlineRules: LexerRule[] = [
  // Équations inline (priorité maximale)
  {
    name: 'equation_inline',
    priority: 100,
    pattern: /\$([^$\n]+)\$/g,
    tokenType: 'EQUATION_INLINE',
    extract: (match) => ({
      content: Array.isArray(match) ? match[1] : '',
      metadata: {
        expression: Array.isArray(match) ? match[1] : ''
      }
    })
  },

  // Liens markdown [text](url)
  {
    name: 'link',
    priority: 95,
    pattern: /\[([^\]]+)\]\(((?:https?:\/\/)?[^)\s]+)\)/g,
    tokenType: 'LINK',
    extract: (match) => {
      if (!Array.isArray(match)) return {};
      return {
        content: match[1],
        metadata: {
          url: match[2],
          title: match[1]
        }
      };
    }
  },

  // Auto-links (URLs brutes)
  {
    name: 'auto_link',
    priority: 90,
    pattern: /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g,
    tokenType: 'LINK',
    extract: (match) => ({
      content: Array.isArray(match) ? match[1] : '',
      metadata: {
        url: Array.isArray(match) ? match[1] : ''
      }
    })
  },

  // Images ![alt](url)
  {
    name: 'image',
    priority: 85,
    pattern: /!\[([^\]]*)\]\(([^)]+)\)/g,
    tokenType: 'IMAGE',
    extract: (match) => {
      if (!Array.isArray(match)) return {};
      return {
        content: match[1],
        metadata: {
          url: match[2],
          alt: match[1]
        }
      };
    }
  },

  // ✅ PATCH #1: Bold avec capture d'espaces
  {
    name: 'bold_with_spaces',
    priority: 80,
    pattern: /(\s?)(\*\*(?!\s)(.+?)(?<!\s)\*\*)(\s?)/g,
    tokenType: 'TEXT',
    extract: (match) => {
      if (!Array.isArray(match)) return {};
      return {
        content: match[3], // Contenu sans les **
        metadata: {
          annotations: { bold: true }
        }
      };
    }
  },

  // ✅ PATCH #1: Bold-Italic combiné avec espaces
  {
    name: 'bold_italic_with_spaces',
    priority: 75,
    pattern: /(\s?)(\*\*\*(?!\s)(.+?)(?<!\s)\*\*\*)(\s?)/g,
    tokenType: 'TEXT',
    extract: (match) => {
      if (!Array.isArray(match)) return {};
      return {
        content: match[3],
        metadata: {
          annotations: { bold: true, italic: true }
        }
      };
    }
  },

  // ✅ PATCH #1: Italic avec espaces
  {
    name: 'italic_with_spaces',
    priority: 70,
    pattern: /(\s?)(\*(?!\s)(?!\*)(.+?)(?<!\s)\*)(\s?)/g,
    tokenType: 'TEXT',
    extract: (match) => {
      if (!Array.isArray(match)) return {};
      return {
        content: match[3],
        metadata: {
          annotations: { italic: true }
        }
      };
    }
  },

  // ✅ PATCH #1: Code inline avec espaces
  {
    name: 'code_with_spaces',
    priority: 65,
    pattern: /(\s?)(`(?!\s)([^`]+?)(?<!\s)`)(\s?)/g,
    tokenType: 'TEXT',
    extract: (match) => {
      if (!Array.isArray(match)) return {};
      return {
        content: match[3],
        metadata: {
          annotations: { code: true }
        }
      };
    }
  },

  // ✅ PATCH #1: Strikethrough avec espaces
  {
    name: 'strikethrough_with_spaces',
    priority: 60,
    pattern: /(\s?)(~~(?!\s)(.+?)(?<!\s)~~)(\s?)/g,
    tokenType: 'TEXT',
    extract: (match) => {
      if (!Array.isArray(match)) return {};
      return {
        content: match[3],
        metadata: {
          annotations: { strikethrough: true }
        }
      };
    }
  },

  // ✅ PATCH #1: Underline avec espaces
  {
    name: 'underline_with_spaces',
    priority: 55,
    pattern: /(\s?)(__(?!\s)(.+?)(?<!\s)__)(\s?)/g,
    tokenType: 'TEXT',
    extract: (match) => {
      if (!Array.isArray(match)) return {};
      return {
        content: match[3],
        metadata: {
          annotations: { underline: true }
        }
      };
    }
  },

  // Texte normal (priorité la plus basse)
  {
    name: 'text',
    priority: 1,
    pattern: (text: string, position: number) => {
      // Trouve le prochain caractère spécial ou la fin
      const specialChars = /[*_`~\[\]()$!]/;
      let length = 0;
      
      while (position + length < text.length) {
        const char = text[position + length];
        if (specialChars.test(char)) {
          break;
        }
        length++;
      }
      
      return {
        match: length > 0,
        length: Math.max(1, length) // Au moins 1 caractère
      };
    },
    tokenType: 'TEXT',
    extract: (match) => ({
      content: typeof match === 'string' ? match : match[0]
    })
  },

  // Whitespace et newlines
  {
    name: 'newline',
    priority: 10,
    pattern: /\n/g,
    tokenType: 'NEWLINE',
    extract: () => ({
      content: '\n'
    })
  },

  {
    name: 'whitespace',
    priority: 5,
    pattern: /[ \t]+/g,
    tokenType: 'WHITESPACE',
    extract: (match) => ({
      content: Array.isArray(match) ? match[0] : ''
    })
  }
];

/**
 * Règles spéciales pour la détection de médias
 */
export const mediaRules: LexerRule[] = [
  // Vidéos (YouTube, Vimeo, etc.)
  {
    name: 'video_url',
    priority: 95,
    pattern: /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/|dailymotion\.com\/video\/)[\w\-._~:/?#[\]@!$&'()*+,;=]+)/g,
    tokenType: 'VIDEO',
    extract: (match) => ({
      content: Array.isArray(match) ? match[1] : '',
      metadata: {
        url: Array.isArray(match) ? match[1] : ''
      }
    })
  },

  // Audio
  {
    name: 'audio_url',
    priority: 90,
    pattern: /(https?:\/\/[^\s]+\.(?:mp3|wav|ogg|m4a|aac|flac)(?:\?[^\s]*)?)/gi,
    tokenType: 'AUDIO',
    extract: (match) => ({
      content: Array.isArray(match) ? match[1] : '',
      metadata: {
        url: Array.isArray(match) ? match[1] : ''
      }
    })
  },

  // Images (URLs se terminant par des extensions d'image)
  {
    name: 'image_url',
    priority: 85,
    pattern: /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp|ico)(?:\?[^\s]*)?)/gi,
    tokenType: 'IMAGE',
    extract: (match) => ({
      content: Array.isArray(match) ? match[1] : '',
      metadata: {
        url: Array.isArray(match) ? match[1] : '',
        alt: ''
      }
    })
  },

  // Bookmarks (autres URLs)
  {
    name: 'bookmark_url',
    priority: 80,
    pattern: /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g,
    tokenType: 'BOOKMARK',
    extract: (match) => ({
      content: Array.isArray(match) ? match[1] : '',
      metadata: {
        url: Array.isArray(match) ? match[1] : ''
      }
    })
  }
];