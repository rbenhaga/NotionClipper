import type { LexerRule } from '../../types/tokens';

/**
 * Règles de tokenization pour les éléments de bloc
 */
export const blockRules: LexerRule[] = [
  // Code blocks (priorité maximale pour éviter conflicts)
  {
    name: 'code_block_start',
    priority: 100,
    pattern: /^```([a-zA-Z0-9#+\-._]*)/,
    tokenType: 'CODE_BLOCK',
    extract: (match) => ({
      metadata: {
        language: Array.isArray(match) ? (match[1] || 'plain text') : 'plain text'
      }
    })
  },

  // Toggle headings (> # Heading)
  {
    name: 'toggle_heading',
    priority: 95,
    pattern: /^>\s*(#{1,3})\s+(.+)$/,
    tokenType: 'TOGGLE_HEADING',
    extract: (match) => {
      if (!Array.isArray(match)) return {};
      const level = match[1].length as 1 | 2 | 3;
      return {
        content: match[2],
        metadata: {
          level,
          isToggleable: true
        }
      };
    }
  },

  // Callouts (> [!type])
  {
    name: 'callout',
    priority: 90,
    pattern: /^>\s*\[!(\w+)\]\s*(.*)$/,
    tokenType: 'CALLOUT',
    extract: (match) => {
      if (!Array.isArray(match)) return {};
      return {
        content: match[2] || '',
        metadata: {
          calloutType: match[1].toLowerCase(),
          icon: getCalloutIcon(match[1].toLowerCase()),
          color: getCalloutColor(match[1].toLowerCase())
        }
      };
    }
  },

  // Blockquotes (> content)
  {
    name: 'blockquote',
    priority: 85,
    pattern: /^>\s*(.*)$/,
    tokenType: 'QUOTE_BLOCK',
    extract: (match) => ({
      content: Array.isArray(match) ? match[1] : ''
    })
  },

  // Headings (# ## ###)
  {
    name: 'heading_1',
    priority: 80,
    pattern: /^#\s+(.+)$/,
    tokenType: 'HEADING_1',
    extract: (match) => ({
      content: Array.isArray(match) ? match[1] : '',
      metadata: { level: 1 as const }
    })
  },
  {
    name: 'heading_2',
    priority: 80,
    pattern: /^##\s+(.+)$/,
    tokenType: 'HEADING_2',
    extract: (match) => ({
      content: Array.isArray(match) ? match[1] : '',
      metadata: { level: 2 as const }
    })
  },
  {
    name: 'heading_3',
    priority: 80,
    pattern: /^###\s+(.+)$/,
    tokenType: 'HEADING_3',
    extract: (match) => ({
      content: Array.isArray(match) ? match[1] : '',
      metadata: { level: 3 as const }
    })
  },

  // Lists - Todo items
  {
    name: 'todo_item',
    priority: 75,
    pattern: /^(\s*)- \[([ x])\]\s+(.+)$/,
    tokenType: 'LIST_ITEM_TODO',
    extract: (match) => {
      if (!Array.isArray(match)) return {};
      const indentLevel = Math.floor(match[1].length / 2);
      return {
        content: match[3],
        metadata: {
          indentLevel,
          listType: 'todo' as const,
          checked: match[2] === 'x'
        }
      };
    }
  },

  // Lists - Bulleted
  {
    name: 'bulleted_list_item',
    priority: 70,
    pattern: /^(\s*)[-*+]\s+(.+)$/,
    tokenType: 'LIST_ITEM_BULLETED',
    extract: (match) => {
      if (!Array.isArray(match)) return {};
      const indentLevel = Math.floor(match[1].length / 2);
      return {
        content: match[2],
        metadata: {
          indentLevel,
          listType: 'bulleted' as const
        }
      };
    }
  },

  // Lists - Numbered
  {
    name: 'numbered_list_item',
    priority: 70,
    pattern: /^(\s*)\d+\.\s+(.+)$/,
    tokenType: 'LIST_ITEM_NUMBERED',
    extract: (match) => {
      if (!Array.isArray(match)) return {};
      const indentLevel = Math.floor(match[1].length / 2);
      return {
        content: match[2],
        metadata: {
          indentLevel,
          listType: 'numbered' as const
        }
      };
    }
  },

  // Table rows
  {
    name: 'table_row',
    priority: 65,
    pattern: /^\|(.+)\|$/,
    tokenType: 'TABLE_ROW',
    extract: (match) => ({
      content: Array.isArray(match) ? match[1] : ''
    })
  },

  // Dividers
  {
    name: 'divider',
    priority: 60,
    pattern: /^(-{3,}|\*{3,}|_{3,})$/,
    tokenType: 'DIVIDER',
    extract: () => ({
      content: ''
    })
  },

  // Equation blocks
  {
    name: 'equation_block',
    priority: 55,
    pattern: /^\$\$$/,
    tokenType: 'EQUATION_BLOCK',
    extract: () => ({
      content: ''
    })
  }
];

/**
 * Obtient l'icône pour un type de callout
 */
function getCalloutIcon(type: string): string {
  const icons: Record<string, string> = {
    'note': '📝',
    'info': 'ℹ️',
    'tip': '💡',
    'warning': '⚠️',
    'danger': '🚨',
    'error': '❌',
    'success': '✅',
    'question': '❓',
    'quote': '💬',
    'example': '📋'
  };
  return icons[type] || '📝';
}

/**
 * Obtient la couleur pour un type de callout
 */
function getCalloutColor(type: string): string {
  const colors: Record<string, string> = {
    'note': 'blue',
    'info': 'blue',
    'tip': 'green',
    'warning': 'yellow',
    'danger': 'red',
    'error': 'red',
    'success': 'green',
    'question': 'purple',
    'quote': 'gray',
    'example': 'orange'
  };
  return colors[type] || 'gray';
}