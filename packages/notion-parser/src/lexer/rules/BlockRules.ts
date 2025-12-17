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



    // ✅ NOUVEAU: Citations avec guillemets simples
    {
        name: 'quote_with_marks',
        priority: 98,  // Priorité élevée pour détecter avant blockquote
        pattern: /^"(.+)$/,
        tokenType: 'QUOTE_BLOCK',
        extract: (match) => {
            if (!Array.isArray(match)) return {};
            return {
                content: match[1].trim(),
                metadata: {
                    isQuoted: true,
                    quoteType: 'simple'
                }
            };
        }
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

    // ✅ FIX: Callout HTML single line (priorité plus haute)
    {
        name: 'callout_html_single',
        priority: 91,
        pattern: /^<aside>\s*([^<]+)\s*<\/aside>\s*$/,
        tokenType: 'CALLOUT_HTML_SINGLE',
        extract: (match) => {
            if (!Array.isArray(match)) return {};
            const emoji = match[1].trim();
            const calloutType = getCalloutTypeFromEmoji(emoji);
            
            return {
                content: '', // Le contenu sera sur la ligne suivante
                metadata: {
                    calloutType: calloutType,
                    icon: emoji,
                    color: getCalloutColor(calloutType)
                }
            };
        }
    },

    // ✅ FIX: Callout HTML opening tag (pour multi-lignes)
    {
        name: 'callout_html_open',
        priority: 89,
        pattern: /^<aside>\s*$/,
        tokenType: 'CALLOUT_HTML_OPEN',
        extract: () => ({
            content: ''
        })
    },

    // ✅ FIX: Callout HTML closing tag  
    {
        name: 'callout_html_close',
        priority: 89,
        pattern: /^<\/aside>\s*$/,
        tokenType: 'CALLOUT_HTML_CLOSE',
        extract: () => ({
            content: ''
        })
    },



    // ✅ Double > for quote blocks (>> content)
    {
        name: 'blockquote_double',
        priority: 75,  // Higher priority than single > toggle
        pattern: /^>>\s*(.*)$/,  // Double >> followed by optional space and content
        tokenType: 'QUOTE_BLOCK',
        extract: (match) => ({
            content: Array.isArray(match) ? match[1].trim() : ''
        })
    },

    // ✅ Single > for toggle lists (> content, but not > [! for callouts)
    {
        name: 'toggle_list',
        priority: 72,  // Lower than callout (90) and toggle_heading (95), but higher than old blockquote
        pattern: /^>\s+(?!\[!)(.+)$/,  // Single > followed by space, NOT followed by [!
        tokenType: 'TOGGLE_LIST',
        extract: (match) => ({
            content: Array.isArray(match) ? match[1].trim() : '',
            metadata: {
                isToggleable: true
            }
        })
    },

    // ✅ Blockquote standard - now only for edge cases (empty > or legacy)
    {
        name: 'blockquote',
        priority: 70,  // Lowest priority among > rules
        pattern: /^>\s*$/,  // Empty blockquote line
        tokenType: 'QUOTE_BLOCK',
        extract: () => ({
            content: ''
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
            const indentLevel = Math.floor(match[1].length / 4);
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
            const indentLevel = Math.floor(match[1].length / 4);
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
            const indentLevel = Math.floor(match[1].length / 4);
            return {
                content: match[2],
                metadata: {
                    indentLevel,
                    listType: 'numbered' as const
                }
            };
        }
    },

    // Toggle Lists - Todo items (> - [ ] Item)
    {
        name: 'toggle_todo_item',
        priority: 90,
        pattern: /^(\s*)>(\s*)- \[([ x])\]\s+(.+)$/,
        tokenType: 'LIST_ITEM_TODO',
        extract: (match) => {
            if (!Array.isArray(match)) return {};
            // Indentation can be before > or after >
            const leadingIndent = match[1].length;
            const afterGtIndent = match[2].length;
            // Use the larger indentation, but subtract 1 for the minimum space after >
            const totalIndent = leadingIndent + Math.max(0, afterGtIndent - 1);
            const indentLevel = Math.floor(totalIndent / 4);
            return {
                content: match[4],
                metadata: {
                    indentLevel,
                    listType: 'todo' as const,
                    checked: match[3] === 'x',
                    isToggleable: true
                }
            };
        }
    },

    // Toggle Lists - Bulleted (> - Item)
    {
        name: 'toggle_bulleted_list_item',
        priority: 90,
        pattern: /^(\s*)>(\s*)[-*+]\s+(.+)$/,
        tokenType: 'LIST_ITEM_BULLETED',
        extract: (match) => {
            if (!Array.isArray(match)) return {};
            // Indentation can be before > or after >
            const leadingIndent = match[1].length;
            const afterGtIndent = match[2].length;
            // Use the larger indentation, but subtract 1 for the minimum space after >
            const totalIndent = leadingIndent + Math.max(0, afterGtIndent - 1);
            const indentLevel = Math.floor(totalIndent / 4);
            return {
                content: match[3],
                metadata: {
                    indentLevel,
                    listType: 'bulleted' as const,
                    isToggleable: true
                }
            };
        }
    },

    // Toggle Lists - Numbered (> 1. Item)
    {
        name: 'toggle_numbered_list_item',
        priority: 90,
        pattern: /^(\s*)>(\s*)\d+\.\s+(.+)$/,
        tokenType: 'LIST_ITEM_NUMBERED',
        extract: (match) => {
            if (!Array.isArray(match)) return {};
            // Indentation can be before > or after >
            const leadingIndent = match[1].length;
            const afterGtIndent = match[2].length;
            // Use the larger indentation, but subtract 1 for the minimum space after >
            const totalIndent = leadingIndent + Math.max(0, afterGtIndent - 1);
            const indentLevel = Math.floor(totalIndent / 4);
            return {
                content: match[3],
                metadata: {
                    indentLevel,
                    listType: 'numbered' as const,
                    isToggleable: true
                }
            };
        }
    },

    // Table rows - Markdown format (with or without outer pipes)
    {
        name: 'table_row_markdown',
        priority: 65,
        pattern: /^(\|?)([^|\n]*\|[^|\n]*\|[^|\n]*)+(\|?)$/,  // ✅ FIX: Exiger au moins 2 séparateurs | pour avoir au moins 2 colonnes
        tokenType: 'TABLE_ROW',
        extract: (match) => {
            if (!Array.isArray(match)) return {};
            // Nettoyer la ligne et extraire le contenu
            let content = match[0];
            // Enlever les | du début et de la fin si présents
            if (content.startsWith('|')) content = content.substring(1);
            if (content.endsWith('|')) content = content.substring(0, content.length - 1);
            
            // ✅ VALIDATION: Vérifier qu'on a au moins 2 colonnes après nettoyage
            const cells = content.split('|').map(c => c.trim());
            if (cells.length < 2) {
                return null; // Ne pas créer de token si moins de 2 colonnes
            }
            
            return {
                content: content.trim(),
                metadata: {
                    tableType: 'markdown'
                }
            };
        }
    },

    // CSV rows (comma-separated values) - Pattern plus strict pour éviter les faux positifs
    {
        name: 'csv_row',
        priority: 64,
        pattern: /^([^,.\n]{1,100},){2,}[^,.\n]{1,100}$/,  // ✅ FIX: Cellules courtes sans points, au moins 3 cellules
        tokenType: 'TABLE_ROW',
        extract: (match) => {
            if (!Array.isArray(match)) return {};
            const content = match[0];
            
            // ✅ VALIDATION RENFORCÉE: Exclure les expressions mathématiques et LaTeX
            if (content.includes('$') || content.includes('\\') || content.includes('=') || 
                content.includes('×') || content.includes('→') || content.includes('↑') ||
                content.includes('↓') || content.includes('**') || content.includes('*') ||
                /\d+,\d+/.test(content) ||  // Nombres décimaux avec virgules
                /\w+\s*→\s*\w+/.test(content) ||  // Flèches entre mots
                content.includes('ET ') || content.includes('mais ')) {  // Connecteurs logiques
                return null;
            }
            
            // ✅ VALIDATION RENFORCÉE: Vérifier qu'on a au moins 3 colonnes et que ce n'est pas du texte normal
            const cells = content.split(',').map(c => c.trim()).filter(c => c.length > 0);
            
            // Rejeter si moins de 3 colonnes
            if (cells.length < 3) {
                return null;
            }
            
            // Rejeter si les cellules sont trop longues (probablement du texte normal)
            const hasLongCells = cells.some(cell => cell.length > 100);
            if (hasLongCells) {
                return null;
            }
            
            // Rejeter si les cellules contiennent des phrases complètes (avec points)
            const hasFullSentences = cells.some(cell => cell.includes('.') && cell.length > 50);
            if (hasFullSentences) {
                return null;
            }
            
            return {
                content,
                metadata: {
                    tableType: 'csv'
                }
            };
        }
    },

    // TSV rows (tab-separated values) - Pattern plus strict pour éviter les faux positifs
    {
        name: 'tsv_row',
        priority: 63,
        pattern: /^([^\t.\n]{1,100}\t){2,}[^\t.\n]{1,100}$/,  // ✅ FIX: Cellules courtes sans points, au moins 3 cellules
        tokenType: 'TABLE_ROW',
        extract: (match) => {
            if (!Array.isArray(match)) return {};
            const content = match[0];
            
            // ✅ VALIDATION RENFORCÉE: Exclure les expressions mathématiques et LaTeX
            if (content.includes('$') || content.includes('\\') || content.includes('=') || 
                content.includes('×') || content.includes('→') || content.includes('↑') ||
                content.includes('↓') || content.includes('**') || content.includes('*') ||
                /\d+,\d+/.test(content) ||  // Nombres décimaux avec virgules
                /\w+\s*→\s*\w+/.test(content) ||  // Flèches entre mots
                content.includes('ET ') || content.includes('mais ')) {  // Connecteurs logiques
                return null;
            }
            
            // ✅ VALIDATION RENFORCÉE: Vérifier qu'on a au moins 3 colonnes et que ce n'est pas du texte normal
            const cells = content.split('\t').map(c => c.trim()).filter(c => c.length > 0);
            
            // Rejeter si moins de 3 colonnes
            if (cells.length < 3) {
                return null;
            }
            
            // Rejeter si les cellules sont trop longues (probablement du texte normal)
            const hasLongCells = cells.some(cell => cell.length > 100);
            if (hasLongCells) {
                return null;
            }
            
            // Rejeter si les cellules contiennent des phrases complètes (avec points)
            const hasFullSentences = cells.some(cell => cell.includes('.') && cell.length > 50);
            if (hasFullSentences) {
                return null;
            }
            
            return {
                content,
                metadata: {
                    tableType: 'tsv'
                }
            };
        }
    },

    // Images markdown ![alt](url)
    {
        name: 'image_markdown',
        priority: 65,
        pattern: /^!\[([^\]]*)\]\(([^)]+)\)$/,
        tokenType: 'IMAGE',
        extract: (match) => {
            if (!Array.isArray(match)) return {};
            return {
                content: match[1] || '',
                metadata: {
                    url: match[2],
                    alt: match[1] || ''
                }
            };
        }
    },

    // Dividers
    {
        name: 'divider',
        priority: 60,
        pattern: /^(-{3,}|\*{3,}|_{3,})\s*$/,  // ✅ Accepter espaces après
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
    },

    // ✅ NOUVEAU: URLs audio seules sur une ligne
    {
        name: 'audio_url_block',
        priority: 85,
        pattern: /^(https?:\/\/[^\s]+\.(?:mp3|wav|ogg|m4a|aac|flac|webm|opus)(?:\?[^\s]*)?)$/i,
        tokenType: 'AUDIO',
        extract: (match) => {
            if (!Array.isArray(match)) return {};
            return {
                content: match[1],
                metadata: {
                    url: match[1]
                }
            };
        }
    },

    // ✅ NOUVEAU: URLs vidéo seules sur une ligne
    {
        name: 'video_url_block',
        priority: 84,
        pattern: /^(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/|dailymotion\.com\/video\/)[\w\-._~:/?#[\]@!$&'()*+,;=]+)$/,
        tokenType: 'VIDEO',
        extract: (match) => {
            if (!Array.isArray(match)) return {};
            return {
                content: match[1],
                metadata: {
                    url: match[1]
                }
            };
        }
    },

    // ✅ NOUVEAU: URLs d'images seules sur une ligne
    {
        name: 'image_url_block',
        priority: 83,
        pattern: /^(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp|ico)(?:\?[^\s]*)?)$/i,
        tokenType: 'IMAGE',
        extract: (match) => {
            if (!Array.isArray(match)) return {};
            return {
                content: match[1],
                metadata: {
                    url: match[1],
                    alt: ''
                }
            };
        }
    },

    // ✅ NOUVEAU: URLs de bookmarks seules sur une ligne
    {
        name: 'bookmark_url_block',
        priority: 82,
        pattern: /^(https?:\/\/[^\s<>"{}|\\^`[\]]+)$/,
        tokenType: 'BOOKMARK',
        extract: (match) => {
            if (!Array.isArray(match)) return {};
            return {
                content: match[1],
                metadata: {
                    url: match[1]
                }
            };
        }
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

/**
 * ✅ NOUVEAU: Détermine le type de callout basé sur l'emoji
 */
function getCalloutTypeFromEmoji(emoji: string): string {
    const emojiToType: Record<string, string> = {
        '📝': 'note',
        'ℹ️': 'info',
        '💡': 'tip',
        '⚠️': 'warning',
        '🚨': 'danger',
        '❌': 'error',
        '✅': 'success',
        '❓': 'question',
        '💬': 'quote',
        '📋': 'example'
    };
    return emojiToType[emoji] || 'note';
}