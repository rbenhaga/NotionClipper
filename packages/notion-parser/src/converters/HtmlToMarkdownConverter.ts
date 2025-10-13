// Crypto import conditionnel pour compatibilité navigateur/Node.js
let crypto: any;
try {
    crypto = require('crypto');
} catch (e) {
    // Fallback pour le navigateur
    crypto = null;
}

// Types simplifiés pour compatibilité
type DOMNode = any;
type DOMElement = any;
type DOMDocument = any;

export interface ConversionOptions {
    preserveFormatting?: boolean;
    cacheEnabled?: boolean;
    maxCacheSize?: number;
}

/**
 * ✅ CORRECTION CRITIQUE: HtmlToMarkdownConverter avec parser DOM réel
 * 
 * PROBLÈMES RÉSOLUS:
 * - HTML copié depuis le web complètement détruit
 * - Listes imbriquées aplaties (hiérarchie perdue)
 * - Tableaux ignorés
 * - Callouts/alerts perdus
 * - Structure sémantique détruite
 * 
 * SOLUTION: Utiliser DOMParser au lieu de regex simples
 */
export class HtmlToMarkdownConverter {
    private conversionCache = new Map<string, string>();
    private readonly CACHE_MAX_SIZE: number;

    constructor(options: ConversionOptions = {}) {
        this.CACHE_MAX_SIZE = options.maxCacheSize || 100; // ✅ Augmenté pour de meilleures performances
    }

    convert(html: string, options: ConversionOptions = {}): string {
        if (!html || !html.trim()) return '';

        const htmlHash = this.hashHTML(html);

        if (options.cacheEnabled !== false && this.conversionCache.has(htmlHash)) {
            return this.conversionCache.get(htmlHash)!;
        }

        // ✅ CORRECTION: Utiliser le nouveau convertisseur DOM
        const markdown = this.convertHTMLToMarkdownWithDOM(html);

        if (options.cacheEnabled !== false) {
            this.conversionCache.set(htmlHash, markdown);

            if (this.conversionCache.size > this.CACHE_MAX_SIZE) {
                const firstKey = this.conversionCache.keys().next().value;
                if (firstKey !== undefined) {
                    this.conversionCache.delete(firstKey);
                }
            }
        }

        return markdown;
    }

    private hashHTML(html: string): string {
        if (crypto && crypto.createHash) {
            // Node.js environment
            return crypto.createHash('md5')
                .update(html.substring(0, 5000))
                .digest('hex');
        } else {
            // Browser environment - simple hash fallback
            let hash = 0;
            const str = html.substring(0, 5000);
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return Math.abs(hash).toString(16);
        }
    }

    /**
     * ✅ NOUVELLE MÉTHODE: Conversion HTML → Markdown avec parser DOM réel
     * 
     * Utilise DOMParser (navigateur) ou JSDOM (Node.js) pour un parsing robuste
     */
    private convertHTMLToMarkdownWithDOM(html: string): string {
        try {
            // ✅ Nettoyer le HTML d'abord
            const cleanedHtml = this.preprocessHTML(html);

            // ✅ Parser avec DOM
            const doc = this.parseHTML(cleanedHtml);
            if (!doc) {
                // Fallback vers l'ancienne méthode si le parsing échoue
                return this.convertHTMLToMarkdownLegacy(html);
            }

            // ✅ Convertir le DOM en Markdown
            const body = doc.body || doc.documentElement || doc;
            const markdown = this.convertNode(body);

            // ✅ Post-traitement
            return this.postProcessMarkdown(markdown);

        } catch (error) {
            console.warn('[HtmlToMarkdownConverter] DOM parsing failed, falling back to regex:', error);
            return this.convertHTMLToMarkdownLegacy(html);
        }
    }

    /**
     * ✅ NOUVELLE MÉTHODE: Pré-traitement du HTML
     */
    private preprocessHTML(html: string): string {
        let cleaned = html;

        // Supprimer les scripts et styles
        cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        cleaned = cleaned.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

        // Nettoyer les commentaires HTML
        cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

        // Normaliser les espaces dans les attributs
        cleaned = cleaned.replace(/\s+/g, ' ');

        return cleaned;
    }

    /**
     * ✅ NOUVELLE MÉTHODE: Parser HTML avec DOMParser ou JSDOM
     */
    private parseHTML(html: string): DOMDocument | null {
        // Environnement navigateur
        if (typeof globalThis !== 'undefined' && (globalThis as any).DOMParser) {
            const parser = new (globalThis as any).DOMParser();
            return parser.parseFromString(html, 'text/html');
        }

        // Environnement Node.js - essayer JSDOM
        try {
            const { JSDOM } = require('jsdom');
            const dom = new JSDOM(html);
            return dom.window.document;
        } catch (e) {
            // JSDOM non disponible, retourner null pour fallback
            return null;
        }
    }

    /**
     * ✅ NOUVELLE MÉTHODE: Convertir un nœud DOM en Markdown
     */
    private convertNode(node: DOMNode): string {
        if (node.nodeType === 3) { // TEXT_NODE
            return node.textContent || '';
        }

        if (node.nodeType === 1) { // ELEMENT_NODE
            const element = node as DOMElement;
            const children = Array.from(element.childNodes)
                .map(child => this.convertNode(child))
                .join('');

            return this.convertElement(element, children);
        }

        return '';
    }

    /**
     * ✅ NOUVELLE MÉTHODE: Convertir un élément HTML en Markdown
     */
    private convertElement(element: DOMElement, children: string): string {
        const tagName = element.tagName.toLowerCase();

        switch (tagName) {
            // Headers
            case 'h1': return `\n\n# ${children.trim()}\n\n`;
            case 'h2': return `\n\n## ${children.trim()}\n\n`;
            case 'h3': return `\n\n### ${children.trim()}\n\n`;
            case 'h4': return `\n\n#### ${children.trim()}\n\n`;
            case 'h5': return `\n\n##### ${children.trim()}\n\n`;
            case 'h6': return `\n\n###### ${children.trim()}\n\n`;

            // Paragraphs et breaks
            case 'p': return `\n\n${children.trim()}\n\n`;
            case 'br': return '\n';
            case 'hr': return '\n\n---\n\n';

            // Formatage inline
            case 'strong':
            case 'b': return `**${children}**`;
            case 'em':
            case 'i': return `*${children}*`;
            case 'u': return `__${children}__`;
            case 'del':
            case 's': return `~~${children}~~`;
            case 'code': return `\`${children}\``;
            case 'kbd': return `\`${children}\``;

            // Code blocks
            case 'pre':
                const codeElement = element.querySelector('code');
                if (codeElement) {
                    const language = this.extractCodeLanguage(codeElement);
                    const code = codeElement.textContent || '';
                    return `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
                }
                return `\n\`\`\`\n${children}\n\`\`\`\n`;

            // Links
            case 'a':
                const href = element.getAttribute('href') || '';
                if (href && children.trim()) {
                    return `[${children.trim()}](${href})`;
                }
                return children;

            // Images
            case 'img':
                const src = element.getAttribute('src') || '';
                const alt = element.getAttribute('alt') || '';
                if (src) {
                    return `![${alt}](${src})`;
                }
                return alt ? `[Image: ${alt}]` : '[Image]';

            // Listes
            case 'ul':
                return '\n' + this.convertList(element, '-') + '\n';
            case 'ol':
                return '\n' + this.convertList(element, '1.') + '\n';
            case 'li':
                return children; // Géré par convertList()

            // Citations
            case 'blockquote':
                const quotedText = children.trim().split('\n')
                    .map(line => `> ${line}`)
                    .join('\n');
                return `\n\n${quotedText}\n\n`;

            // Tableaux
            case 'table':
                return this.convertTable(element);

            // Callouts et alerts
            case 'div':
            case 'section':
            case 'article':
            case 'aside':
                return this.convertContainer(element, children);

            // Éléments ignorés
            case 'script':
            case 'style':
            case 'noscript':
            case 'head':
            case 'meta':
            case 'link':
            case 'title':
                return '';

            // Éléments de structure (préserver le contenu)
            case 'html':
            case 'body':
            case 'main':
            case 'header':
            case 'footer':
            case 'nav':
            case 'span':
                return children;

            // Fallback: préserver le contenu
            default:
                return children;
        }
    }

    /**
     * ✅ NOUVELLE MÉTHODE: Convertir les listes avec hiérarchie préservée
     */
    private convertList(listElement: DOMElement, marker: string): string {
        const items = Array.from(listElement.children || []).filter((child: any) =>
            child.tagName && child.tagName.toLowerCase() === 'li'
        );

        let result = '';
        const indent = this.getListIndent(listElement);

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const content = this.convertNode(item);

            // Déterminer le marqueur
            const actualMarker = marker === '1.' ? `${i + 1}.` : marker;

            // Ajouter l'item avec indentation
            const lines = content.trim().split('\n');
            const firstLine = lines[0] || '';
            const otherLines = lines.slice(1);

            result += `${indent}${actualMarker} ${firstLine}\n`;

            // Indenter les lignes suivantes
            for (const line of otherLines) {
                if (line.trim()) {
                    result += `${indent}   ${line}\n`;
                }
            }

            // Gérer les sous-listes
            const subLists = (item as any).querySelectorAll ? (item as any).querySelectorAll(':scope > ul, :scope > ol') : [];
            for (const subList of Array.from(subLists)) {
                const subMarker = (subList as any).tagName && (subList as any).tagName.toLowerCase() === 'ul' ? '-' : '1.';
                const subListMarkdown = this.convertList(subList as DOMElement, subMarker);
                result += subListMarkdown;
            }
        }

        return result;
    }

    /**
     * ✅ NOUVELLE MÉTHODE: Calculer l'indentation des listes
     */
    private getListIndent(element: DOMElement): string {
        let indent = '';
        let parent = element.parentElement;

        while (parent && parent.tagName !== 'BODY') {
            if (parent.tagName === 'UL' || parent.tagName === 'OL') {
                indent += '  ';
            }
            parent = parent.parentElement;
        }

        return indent;
    }

    /**
     * ✅ NOUVELLE MÉTHODE: Convertir les tableaux
     */
    private convertTable(table: DOMElement): string {
        const rows = Array.from(table.querySelectorAll('tr'));
        if (rows.length === 0) return '';

        let result = '\n\n';

        // Header row
        const headerCells = Array.from((rows[0] as any).querySelectorAll ? (rows[0] as any).querySelectorAll('th, td') : []);
        if (headerCells.length > 0) {
            const headerContent = headerCells.map((cell: any) =>
                this.convertNode(cell).trim().replace(/\n/g, ' ')
            );
            result += '| ' + headerContent.join(' | ') + ' |\n';
            result += '|' + headerCells.map(() => ' --- ').join('|') + '|\n';
        }

        // Data rows
        const startIndex = headerCells.length > 0 ? 1 : 0;
        for (let i = startIndex; i < rows.length; i++) {
            const cells = Array.from((rows[i] as any).querySelectorAll ? (rows[i] as any).querySelectorAll('td, th') : []);
            if (cells.length > 0) {
                const cellContent = cells.map((cell: any) =>
                    this.convertNode(cell).trim().replace(/\n/g, ' ')
                );
                result += '| ' + cellContent.join(' | ') + ' |\n';
            }
        }

        return result + '\n';
    }

    /**
     * ✅ NOUVELLE MÉTHODE: Convertir les conteneurs (callouts, alerts)
     */
    private convertContainer(element: DOMElement, children: string): string {
        const classList = Array.from(element.classList || []).map((cls: any) => String(cls));

        // Détecter les callouts/alerts
        const calloutType = this.detectCalloutType(classList);
        if (calloutType) {
            const content = children.trim().split('\n')
                .map(line => `> ${line}`)
                .join('\n');
            return `\n\n> [!${calloutType}]\n${content}\n\n`;
        }

        // Conteneur normal
        return children;
    }

    /**
     * ✅ NOUVELLE MÉTHODE: Détecter le type de callout
     */
    private detectCalloutType(classList: string[]): string | null {
        const classString = classList.join(' ').toLowerCase();

        if (classString.includes('warning') || classString.includes('alert-warning')) return 'WARNING';
        if (classString.includes('danger') || classString.includes('alert-danger') || classString.includes('error')) return 'DANGER';
        if (classString.includes('success') || classString.includes('alert-success')) return 'SUCCESS';
        if (classString.includes('info') || classString.includes('alert-info')) return 'INFO';
        if (classString.includes('tip') || classString.includes('hint')) return 'TIP';
        if (classString.includes('note') || classString.includes('callout')) return 'NOTE';

        return null;
    }

    /**
     * ✅ NOUVELLE MÉTHODE: Extraire le langage du code
     */
    private extractCodeLanguage(codeElement: DOMElement): string {
        const classList = Array.from(codeElement.classList || []).map((cls: any) => String(cls));

        for (const className of classList) {
            if (className.startsWith('language-')) {
                return className.replace('language-', '');
            }
            if (className.startsWith('lang-')) {
                return className.replace('lang-', '');
            }
        }

        return '';
    }

    /**
     * ✅ NOUVELLE MÉTHODE: Post-traitement du Markdown
     */
    private postProcessMarkdown(markdown: string): string {
        let result = markdown;

        // Nettoyer les espaces multiples
        result = result.replace(/[ \t]+/g, ' ');

        // Nettoyer les sauts de ligne multiples
        result = result.replace(/\n{3,}/g, '\n\n');

        // Nettoyer les espaces en début/fin de ligne
        result = result.split('\n')
            .map(line => line.trimEnd())
            .join('\n');

        // Trim final
        result = result.trim();

        return result;
    }

    /**
     * ✅ FALLBACK: Ancienne méthode regex (pour compatibilité)
     */
    private convertHTMLToMarkdownLegacy(html: string): string {
        let text = html;

        // Remove scripts and styles
        text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

        // Headers
        text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n# $1\n\n');
        text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n## $1\n\n');
        text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n### $1\n\n');

        // Lists
        text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');

        // Links
        text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

        // Bold and italic
        text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
        text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
        text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
        text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

        // Code
        text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
        text = text.replace(/<pre[^>]*>(.*?)<\/pre>/gi, '\n```\n$1\n```\n');

        // Paragraphs
        text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n\n$1\n\n');
        text = text.replace(/<br\s*\/?>/gi, '\n');

        // Remove remaining HTML tags
        text = text.replace(/<[^>]+>/g, '');

        // Decode HTML entities
        text = this.decodeHTMLEntities(text);

        // Clean up whitespace
        text = text.replace(/\n{3,}/g, '\n\n');
        text = text.trim();

        return text;
    }

    private decodeHTMLEntities(text: string): string {
        const entities: Record<string, string> = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&nbsp;': ' ',
            '&copy;': '©',
            '&reg;': '®',
            '&trade;': '™',
            '&hellip;': '…',
            '&mdash;': '—',
            '&ndash;': '–',
            '&lsquo;': "'",
            '&rsquo;': "'",
            '&ldquo;': '"',
            '&rdquo;': '"'
        };

        return text.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
    }
}

export const htmlToMarkdownConverter = new HtmlToMarkdownConverter();