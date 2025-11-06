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

        // ✅ NOUVEAU: Détecter les éléments de code par leur style
        if (this.isCodeElement(element)) {
            const codeContent = children.trim();
            if (codeContent && this.looksLikeCode(codeContent)) {
                return this.formatAsCodeBlock(codeContent);
            }
        }

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

        // ✅ NOUVEAU: Décoder les entités HTML d'abord
        result = this.decodeHTMLEntities(result);

        // Nettoyer les espaces multiples
        result = result.replace(/[ \t]+/g, ' ');

        // Nettoyer les sauts de ligne multiples
        result = result.replace(/\n{3,}/g, '\n\n');

        // ✅ NOUVEAU: Nettoyer les espaces insécables résiduels
        result = result.replace(/\u00A0/g, ' '); // Unicode non-breaking space

        // Nettoyer les espaces en début/fin de ligne
        result = result.split('\n')
            .map(line => line.trimEnd())
            .join('\n');

        // ✅ NOUVEAU: Formater le code proprement si détecté
        if (this.looksLikeCode(result)) {
            result = this.formatAsCodeBlock(result);
        }

        // Trim final
        result = result.trim();

        return result;
    }

    /**
     * ✅ NOUVEAU: Détecter si un élément HTML représente du code
     */
    private isCodeElement(element: DOMElement): boolean {
        // Vérifier les attributs style pour les polices de code
        const style = element.getAttribute('style') || '';
        const hasCodeFont = /font-family:\s*[^;]*(?:Consolas|Monaco|'Courier New'|monospace)/i.test(style);
        
        // Vérifier les classes communes pour le code
        const classList = Array.from(element.classList || []).map((cls: any) => String(cls));
        const hasCodeClass = classList.some(cls => 
            /code|highlight|syntax|pre|mono/.test(cls.toLowerCase())
        );
        
        // Vérifier si c'est un élément de code natif
        const tagName = element.tagName.toLowerCase();
        const isCodeTag = ['code', 'pre', 'kbd', 'samp', 'var'].includes(tagName);
        
        return hasCodeFont || hasCodeClass || isCodeTag;
    }

    /**
     * ✅ NOUVEAU: Détecter si le contenu ressemble à du code
     */
    private looksLikeCode(text: string): boolean {
        const trimmedText = text.trim();
        
        // Vérifier si c'est déjà dans un bloc de code
        if (trimmedText.startsWith('```') && trimmedText.endsWith('```')) {
            return false; // Déjà formaté
        }
        
        const codeIndicators = [
            /interface\s+\w+\s*\{/, // TypeScript interface
            /class\s+\w+\s*\{/, // Class definition
            /function\s+\w+\s*\(/, // Function definition
            /constructor\s*\(\s*\)\s*\{/, // Constructor
            /const\s+\w+\s*=/, // Const assignment
            /let\s+\w+\s*=/, // Let assignment
            /var\s+\w+\s*=/, // Var assignment
            /import\s+.*from/, // Import statement
            /export\s+(default\s+)?/, // Export statement
            /new\s+\w+\s*\(/, // New instance
            /this\.\w+\s*=/, // Property assignment
            /\w+\s*:\s*\w+[,;]/, // Object property with type
            /\{\s*\w+\s*:\s*.*\}/, // Object literal
        ];

        // Compter les indicateurs de code
        const matches = codeIndicators.filter(pattern => pattern.test(trimmedText));
        
        // Si on a au moins 2 indicateurs ou un indicateur fort, c'est probablement du code
        if (matches.length >= 2) return true;
        
        // Indicateurs forts (un seul suffit)
        const strongIndicators = [
            /interface\s+\w+\s*\{/,
            /class\s+\w+\s*\{/,
            /constructor\s*\(\s*\)\s*\{/,
            /function\s+\w+\s*\(/
        ];
        
        return strongIndicators.some(pattern => pattern.test(trimmedText));
    }

    /**
     * ✅ NOUVEAU: Formater le contenu comme un bloc de code
     */
    private formatAsCodeBlock(text: string): string {
        // Détecter le langage probable
        let language = 'javascript'; // Par défaut JavaScript
        
        // TypeScript indicators (plus spécifiques)
        if (/interface\s+\w+|type\s+\w+|\w+\s*:\s*\w+|import.*from.*['"].*\.ts['"]/.test(text)) {
            language = 'typescript';
        }
        // JavaScript indicators
        else if (/class\s+\w+|function\s+\w+|const\s+\w+|constructor\s*\(|new\s+\w+\s*\(/.test(text)) {
            language = 'javascript';
        }
        // Python indicators
        else if (/def\s+\w+|import\s+\w+|from\s+\w+\s+import|__init__|self\./.test(text)) {
            language = 'python';
        }
        // CSS indicators
        else if (/\w+\s*\{[^}]*\}|\.\w+\s*\{|#\w+\s*\{/.test(text)) {
            language = 'css';
        }
        // JSON indicators
        else if (/^\s*\{[\s\S]*\}\s*$/.test(text) && /"[\w-]+"\s*:/.test(text)) {
            language = 'json';
        }

        // Formater le code avec une indentation propre
        const formattedText = this.formatCodeIndentation(text);
        
        return `\`\`\`${language}\n${formattedText}\n\`\`\``;
    }

    /**
     * ✅ NOUVEAU: Formater l'indentation du code
     */
    private formatCodeIndentation(text: string): string {
        const lines = text.split('\n');
        
        // Si c'est une seule ligne, essayer de la formater
        if (lines.length === 1) {
            const singleLine = lines[0].trim();
            
            // Formater les objets/fonctions sur une ligne
            if (singleLine.includes('{') && singleLine.includes('}')) {
                return this.formatSingleLineCode(singleLine);
            }
        }
        
        return text;
    }

    /**
     * ✅ NOUVEAU: Formater le code sur une seule ligne
     */
    private formatSingleLineCode(code: string): string {
        // Nettoyer d'abord le code
        let cleaned = code.trim()
            .replace(/\s+/g, ' ') // Normaliser les espaces multiples
            .replace(/\s*{\s*/g, '{') // Supprimer les espaces autour des accolades ouvrantes
            .replace(/\s*}\s*/g, '}') // Supprimer les espaces autour des accolades fermantes
            .replace(/\s*,\s*/g, ',') // Normaliser les espaces autour des virgules
            .replace(/\s*;\s*/g, ';') // Normaliser les espaces autour des points-virgules
            .replace(/\s*\(\s*/g, '(') // Supprimer les espaces autour des parenthèses ouvrantes
            .replace(/\s*\)\s*/g, ')'); // Supprimer les espaces autour des parenthèses fermantes
        
        // Utiliser une approche plus simple et robuste
        let result = '';
        let indentLevel = 0;
        let i = 0;
        
        while (i < cleaned.length) {
            const char = cleaned[i];
            const nextChar = i < cleaned.length - 1 ? cleaned[i + 1] : '';
            const prevChar = i > 0 ? cleaned[i - 1] : '';
            
            if (char === '{') {
                // Ne pas ajouter d'espace après une parenthèse fermante
                const needsSpace = prevChar && prevChar !== '(' && prevChar !== '{' && !/\s/.test(prevChar);
                result += (needsSpace ? ' ' : '') + '{\n';
                indentLevel++;
                result += '  '.repeat(indentLevel);
            } else if (char === '}') {
                // Retirer l'indentation courante si on est sur une ligne vide
                if (result.endsWith('  '.repeat(indentLevel))) {
                    result = result.slice(0, -('  '.repeat(indentLevel)).length);
                }
                if (!result.endsWith('\n')) {
                    result += '\n';
                }
                indentLevel = Math.max(0, indentLevel - 1);
                result += '  '.repeat(indentLevel) + '}';
                
                // Ajouter virgule si nécessaire
                if (nextChar === ',' || nextChar === ';') {
                    // Ne rien faire, on traitera la virgule/point-virgule au prochain tour
                } else if (nextChar && nextChar !== ')' && nextChar !== '}') {
                    result += '\n' + '  '.repeat(indentLevel);
                }
            } else if (char === ',') {
                result += ',';
                if (nextChar && nextChar !== '}' && nextChar !== ')') {
                    result += '\n' + '  '.repeat(indentLevel);
                }
            } else if (char === ';') {
                result += ';';
                if (nextChar && indentLevel > 0) {
                    result += '\n' + '  '.repeat(indentLevel);
                }
            } else if (char === '(' && (prevChar === ')' || /\w/.test(prevChar))) {
                result += '(';
            } else if (char === ')') {
                result += ')';
            } else if (char === ' ') {
                // Gérer les espaces de manière plus intelligente
                if (nextChar === '{' && prevChar === ')') {
                    // Espace entre ) et { -> ne pas ajouter d'espace supplémentaire
                    // L'accolade ajoutera son propre espace
                } else if (nextChar === '{') {
                    // Pas d'espace avant une accolade ouvrante
                } else {
                    result += char;
                }
            } else {
                result += char;
            }
            
            i++;
        }
        
        // Post-traitement pour nettoyer
        return result
            .split('\n')
            .map(line => line.trimEnd()) // Supprimer les espaces en fin de ligne
            .filter((line, index, array) => {
                // Supprimer les lignes vides sauf si elles séparent des blocs logiques
                if (line.trim() === '') {
                    const prevLine = array[index - 1];
                    const nextLine = array[index + 1];
                    return prevLine && nextLine && 
                           (prevLine.trim().endsWith('}') || nextLine.trim().startsWith('}'));
                }
                return true;
            })
            .join('\n')
            .trim();
    }

    /**
     * ✅ FALLBACK: Ancienne méthode regex (pour compatibilité)
     */
    private convertHTMLToMarkdownLegacy(html: string): string {
        let text = html;

        // ✅ NOUVEAU: Détecter et traiter les éléments de code avec font-family monospace
        // Utiliser une approche plus robuste pour les divs imbriqués
        if (/font-family:\s*[^;]*(?:Consolas|Monaco|'Courier New'|monospace)/i.test(text)) {
            // Trouver le div principal avec la police monospace
            const mainDivMatch = text.match(/<div[^>]*font-family:\s*[^;]*(?:Consolas|Monaco|'Courier New'|monospace)[^>]*>/i);
            if (mainDivMatch) {
                const startIndex = text.indexOf(mainDivMatch[0]);
                const startTag = mainDivMatch[0];
                
                // Trouver le div fermant correspondant en comptant les balises
                let divCount = 1;
                let currentIndex = startIndex + startTag.length;
                let endIndex = -1;
                
                while (currentIndex < text.length && divCount > 0) {
                    const nextDiv = text.indexOf('<div', currentIndex);
                    const nextCloseDiv = text.indexOf('</div>', currentIndex);
                    
                    if (nextCloseDiv === -1) break;
                    
                    if (nextDiv !== -1 && nextDiv < nextCloseDiv) {
                        divCount++;
                        currentIndex = nextDiv + 4;
                    } else {
                        divCount--;
                        if (divCount === 0) {
                            endIndex = nextCloseDiv + 6; // +6 pour </div>
                            break;
                        }
                        currentIndex = nextCloseDiv + 6;
                    }
                }
                
                if (endIndex !== -1) {
                    const fullCodeDiv = text.substring(startIndex, endIndex);
                    const content = text.substring(startIndex + startTag.length, endIndex - 6); // -6 pour </div>
                    
                    // Nettoyer le contenu HTML du code
                    let cleanCode = content
                        .replace(/<br\s*\/?>/gi, '\n') // Convertir <br> en nouvelles lignes
                        .replace(/<div[^>]*>/gi, '\n') // Convertir <div> en nouvelles lignes
                        .replace(/<\/div>/gi, '') // Supprimer les fermetures de div
                        .replace(/<[^>]+>/g, '') // Supprimer toutes les autres balises HTML
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&#160;/g, ' ')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&')
                        .replace(/&=&gt;/g, '=>') // Flèches de fonction
                        .replace(/\n+/g, '\n') // Supprimer les lignes vides multiples
                        .trim();
                    
                    // Vérifier si c'est du code (inline pour éviter les problèmes de contexte)
                    const codeIndicators = [
                        /private\s+\w+\s*\(/,
                        /interface\s+\w+\s*\{/,
                        /class\s+\w+\s*\{/,
                        /function\s+\w+\s*\(/,
                        /constructor\s*\(\s*\)\s*\{/,
                        /const\s+\w+\s*=/,
                        /let\s+\w+\s*=/,
                        /var\s+\w+\s*=/,
                        /import\s+.*from/,
                        /export\s+(default\s+)?/,
                        /new\s+\w+\s*\(/,
                        /this\.\w+\s*=/,
                        /\w+\s*:\s*\w+[,;]/,
                        /\{\s*\w+\s*:\s*.*\}/,
                    ];
                    
                    const matches = codeIndicators.filter(pattern => pattern.test(cleanCode));
                    const strongIndicators = [
                        /private\s+\w+\s*\(/,
                        /interface\s+\w+\s*\{/,
                        /class\s+\w+\s*\{/,
                        /constructor\s*\(\s*\)\s*\{/,
                        /function\s+\w+\s*\(/
                    ];
                    
                    const isCode = matches.length >= 2 || strongIndicators.some(pattern => pattern.test(cleanCode));
                    
                    if (isCode) {
                        // Détecter le langage
                        let language = 'javascript';
                        if (/private\s+\w+|:\s*void|:\s*string|interface\s+\w+|type\s+\w+/.test(cleanCode)) {
                            language = 'typescript';
                        }
                        
                        const codeBlock = `\`\`\`${language}\n${cleanCode}\n\`\`\``;
                        text = text.replace(fullCodeDiv, codeBlock);
                    } else {
                        text = text.replace(fullCodeDiv, cleanCode);
                    }
                }
            }
        }

        // Remove scripts and styles
        text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

        // Headers
        text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n# $1\n\n');
        text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n## $1\n\n');
        text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n### $1\n\n');

        // ✅ AMÉLIORATION: Listes numérotées (format correct pour le parser)
        text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
            let counter = 1;
            const items = content.replace(/<li[^>]*>(.*?)<\/li>/gi, (liMatch: string, liContent: string) => {
                const cleanContent = liContent.replace(/<[^>]+>/g, '').trim();
                return `${counter++}. ${cleanContent}\n`;
            });
            return '\n\n' + items + '\n';
        });

        // ✅ AMÉLIORATION: Listes à puces (format correct pour le parser)
        text = text.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
            const items = content.replace(/<li[^>]*>(.*?)<\/li>/gi, (liMatch: string, liContent: string) => {
                const cleanContent = liContent.replace(/<[^>]+>/g, '').trim();
                return `- ${cleanContent}\n`;
            });
            return '\n\n' + items + '\n';
        });

        // Nettoyer les <li> restants (au cas où)
        text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');

        // Links
        text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

        // Bold and italic
        text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
        text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
        text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
        text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

        // ✅ AMÉLIORATION: Code blocks
        text = text.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n');
        text = text.replace(/<pre[^>]*>(.*?)<\/pre>/gi, '\n```\n$1\n```\n');
        
        // Code inline
        text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

        // ✅ AMÉLIORATION: Séparateurs
        text = text.replace(/<hr\s*\/?>/gi, '\n\n---\n\n');

        // ✅ AMÉLIORATION: Paragraphes (éviter les doubles sauts de ligne)
        text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n\n$1\n\n');
        text = text.replace(/<br\s*\/?>/gi, '\n');

        // Remove remaining HTML tags
        text = text.replace(/<[^>]+>/g, '');

        // Decode HTML entities
        text = this.decodeHTMLEntities(text);

        // ✅ AMÉLIORATION: Nettoyage des espaces
        // Supprimer les lignes vides multiples
        text = text.replace(/\n{3,}/g, '\n\n');
        
        // Supprimer les espaces en début/fin de ligne
        text = text.split('\n')
            .map(line => line.trimEnd())
            .join('\n');
            
        // Supprimer les paragraphes vides (juste des tirets)
        text = text.replace(/\n\n-\s*\n\n/g, '\n\n');
        text = text.replace(/^-\s*\n/gm, '');
        
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
            '&#160;': ' ', // ✅ NOUVEAU: Espace insécable
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

        // ✅ NOUVEAU: Gérer les entités numériques décimales
        text = text.replace(/&#(\d+);/g, (match, num) => {
            const code = parseInt(num, 10);
            if (code === 160) return ' '; // Espace insécable
            if (code === 8203) return ''; // Zero-width space
            if (code === 8204) return ''; // Zero-width non-joiner
            if (code === 8205) return ''; // Zero-width joiner
            if (code >= 32 && code <= 126) return String.fromCharCode(code); // ASCII printable
            return match; // Garder l'entité si on ne sait pas quoi en faire
        });

        // ✅ NOUVEAU: Gérer les entités numériques hexadécimales
        text = text.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
            const code = parseInt(hex, 16);
            if (code === 160) return ' '; // Espace insécable
            if (code === 8203) return ''; // Zero-width space
            if (code >= 32 && code <= 126) return String.fromCharCode(code); // ASCII printable
            return match; // Garder l'entité si on ne sait pas quoi en faire
        });

        return text.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
    }
}

export const htmlToMarkdownConverter = new HtmlToMarkdownConverter();