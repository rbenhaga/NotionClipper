import type { Token, TokenStream, LexerState, LexerRule, Position } from '../types/tokens';
import { RuleEngine } from './rules/RuleEngine';
import { blockRules } from './rules/BlockRules';
import { inlineRules, mediaRules } from './rules/InlineRules';

/**
 * Lexer principal utilisant un state machine pour la tokenization efficace
 * ✅ NOUVELLE ARCHITECTURE: Un seul passage, pas de backtracking
 */
export class Lexer {
    private ruleEngine: RuleEngine;
    private options: LexerOptions;

    constructor(options: LexerOptions = {}) {
        this.options = {
            preserveWhitespace: false,
            trackPositions: true,
            maxTokens: 10000,
            enableInlineFormatting: true,
            enableMediaDetection: true,
            ...options
        };

        this.ruleEngine = new RuleEngine();
        this.initializeRules();
    }

    /**
     * ✅ API PRINCIPALE: Tokenize le texte d'entrée avec gestion des blocs multi-lignes
     */
    tokenize(input: string): TokenStream {
        if (!input?.trim()) {
            return this.createEmptyTokenStream();
        }

        const lines = input.split('\n');
        const tokens: Token[] = [];
        let lineNumber = 1;
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];

            // ✅ FIX: Détecter les callouts HTML single-line
            if (line.trim().match(/^<aside>\s*[^<]+\s*<\/aside>\s*$/)) {
                const calloutResult = this.processSingleLineHTMLCallout(lines, i, lineNumber);
                if (calloutResult) {
                    tokens.push(calloutResult.token);
                    i = calloutResult.nextIndex;
                    lineNumber = calloutResult.nextLineNumber;
                    continue;
                }
            }

            // ✅ FIX: Détecter les callouts HTML multi-lignes
            if (line.trim() === '<aside>') {
                const calloutResult = this.processHTMLCallout(lines, i, lineNumber);
                if (calloutResult) {
                    tokens.push(calloutResult.token);
                    i = calloutResult.nextIndex;
                    lineNumber = calloutResult.nextLineNumber;
                    continue;
                }
            }

            // ✅ NOUVEAU: Détecter les callouts markdown multi-lignes
            if (line.trim().match(/^>\s*\[!(\w+)\]/)) {
                const calloutResult = this.processMarkdownCallout(lines, i, lineNumber);
                if (calloutResult) {
                    tokens.push(calloutResult.token);
                    i = calloutResult.nextIndex;
                    lineNumber = calloutResult.nextLineNumber;
                    continue;
                }
            }

            // ✅ NOUVEAU: Détecter les toggle headings (> # Heading) avec contenu indenté
            if (line.trim().match(/^>\s*#{1,3}\s+.+$/)) {
                const toggleHeadingResult = this.processToggleHeading(lines, i, lineNumber);
                if (toggleHeadingResult) {
                    tokens.push(...toggleHeadingResult.tokens);
                    i = toggleHeadingResult.nextIndex;
                    lineNumber = toggleHeadingResult.nextLineNumber;
                    continue;
                }
            }

            // ✅ NOUVEAU: Détecter les blocs multi-lignes (code blocks)
            if (line.trim().startsWith('```')) {
                const codeBlockResult = this.processCodeBlock(lines, i, lineNumber);
                if (codeBlockResult) {
                    tokens.push(...codeBlockResult.tokens);
                    i = codeBlockResult.nextIndex;
                    lineNumber = codeBlockResult.nextLineNumber;
                    continue;
                }
            }

            // ✅ NOUVEAU: Détecter les équations en bloc ($$)
            if (line.trim() === '$$') {
                const equationBlockResult = this.processEquationBlock(lines, i, lineNumber);
                if (equationBlockResult) {
                    tokens.push(...equationBlockResult.tokens);
                    i = equationBlockResult.nextIndex;
                    lineNumber = equationBlockResult.nextLineNumber;
                    continue;
                }
            }

            // ✅ NOUVEAU: Détecter les tables CSV (2+ lignes consécutives avec virgules)
            if (this.isCSVLine(line)) {
                const csvResult = this.processCSVTable(lines, i, lineNumber);
                if (csvResult) {
                    tokens.push(...csvResult.tokens);
                    i = csvResult.nextIndex;
                    lineNumber = csvResult.nextLineNumber;
                    continue;
                }
            }

            // ✅ NOUVEAU: Détecter les tables TSV (2+ lignes consécutives avec tabs)
            if (this.isTSVLine(line)) {
                const tsvResult = this.processTSVTable(lines, i, lineNumber);
                if (tsvResult) {
                    tokens.push(...tsvResult.tokens);
                    i = tsvResult.nextIndex;
                    lineNumber = tsvResult.nextLineNumber;
                    continue;
                }
            }

            // Traitement normal ligne par ligne
            if (line.trim()) {
                const lineToken = this.processLine(line, lineNumber);
                if (lineToken) {
                    tokens.push(lineToken);
                }
            }

            i++;
            lineNumber++;
        }

        // Ajouter EOF token
        tokens.push({
            type: 'EOF',
            content: '',
            position: { start: input.length, end: input.length, line: lineNumber, column: 1 }
        });

        return this.createTokenStream(tokens);
    }

    /**
     * ✅ NOUVEAU: Traite un bloc de code complet (multi-lignes)
     */
    private processCodeBlock(lines: string[], startIndex: number, startLineNumber: number): {
        tokens: Token[];
        nextIndex: number;
        nextLineNumber: number;
    } | null {
        const startLine = lines[startIndex].trim();
        const languageMatch = startLine.match(/^```([a-zA-Z0-9#+\-._]*)/);

        if (!languageMatch) return null;

        const language = languageMatch[1] || 'plain text';
        const codeLines: string[] = [];
        let endIndex = startIndex + 1;

        // Chercher la ligne de fermeture
        while (endIndex < lines.length) {
            const line = lines[endIndex];

            if (line.trim() === '```') {
                break;
            }

            codeLines.push(line);
            endIndex++;
        }

        // Si pas de fermeture trouvée, traiter comme un bloc ouvert
        const codeContent = codeLines.join('\n');

        const tokens: Token[] = [
            {
                type: 'CODE_BLOCK',
                content: codeContent,
                position: {
                    start: 0,
                    end: codeContent.length,
                    line: startLineNumber,
                    column: 1
                },
                metadata: {
                    language: language
                }
            }
        ];

        return {
            tokens,
            nextIndex: endIndex + 1, // Passer la ligne de fermeture
            nextLineNumber: startLineNumber + (endIndex - startIndex) + 1
        };
    }

    /**
     * ✅ NOUVEAU: Traite un bloc d'équation complet (multi-lignes)
     */
    private processEquationBlock(lines: string[], startIndex: number, startLineNumber: number): {
        tokens: Token[];
        nextIndex: number;
        nextLineNumber: number;
    } | null {
        const startLine = lines[startIndex].trim();

        if (startLine !== '$$') return null;

        const equationLines: string[] = [];
        let endIndex = startIndex + 1;

        // Chercher la ligne de fermeture
        while (endIndex < lines.length) {
            const line = lines[endIndex];

            if (line.trim() === '$$') {
                break;
            }

            equationLines.push(line);
            endIndex++;
        }

        // Si pas de fermeture trouvée, traiter comme un bloc ouvert
        const equationContent = equationLines.join('\n');

        const tokens: Token[] = [
            {
                type: 'EQUATION_BLOCK',
                content: equationContent,
                position: {
                    start: 0,
                    end: equationContent.length,
                    line: startLineNumber,
                    column: 1
                },
                metadata: {
                    isBlock: true
                }
            }
        ];

        return {
            tokens,
            nextIndex: endIndex + 1, // Passer la ligne de fermeture
            nextLineNumber: startLineNumber + (endIndex - startIndex) + 1
        };
    }

    /**
     * ✅ NOUVEAU: Vérifie si une ligne est une ligne CSV valide
     * Une ligne CSV doit avoir au moins 2 cellules séparées par des virgules
     */
    private isCSVLine(line: string): boolean {
        const trimmed = line.trim();
        if (!trimmed) return false;
        
        // Exclure les lignes qui ressemblent à du code ou du texte normal
        if (trimmed.includes('$') || trimmed.includes('\\') || trimmed.includes('=') ||
            trimmed.includes('×') || trimmed.includes('→') || trimmed.includes('↑') ||
            trimmed.includes('↓') || trimmed.includes('**') ||
            /\d+,\d+/.test(trimmed) ||  // Nombres décimaux avec virgules
            trimmed.includes('ET ') || trimmed.includes('mais ')) {
            return false;
        }
        
        // Vérifier qu'on a au moins 2 cellules
        const cells = trimmed.split(',').map(c => c.trim()).filter(c => c.length > 0);
        if (cells.length < 2) return false;
        
        // Rejeter si les cellules sont trop longues
        if (cells.some(cell => cell.length > 100)) return false;
        
        return true;
    }

    /**
     * ✅ NOUVEAU: Vérifie si une ligne est une ligne TSV valide
     * Une ligne TSV doit avoir au moins 2 cellules séparées par des tabs
     */
    private isTSVLine(line: string): boolean {
        const trimmed = line.trim();
        if (!trimmed) return false;
        
        // Doit contenir au moins un tab
        if (!trimmed.includes('\t')) return false;
        
        // Exclure les lignes qui ressemblent à du code ou du texte normal
        if (trimmed.includes('$') || trimmed.includes('\\') || trimmed.includes('=') ||
            trimmed.includes('×') || trimmed.includes('→') || trimmed.includes('↑') ||
            trimmed.includes('↓') || trimmed.includes('**') ||
            trimmed.includes('ET ') || trimmed.includes('mais ')) {
            return false;
        }
        
        // Vérifier qu'on a au moins 2 cellules
        const cells = trimmed.split('\t').map(c => c.trim()).filter(c => c.length > 0);
        if (cells.length < 2) return false;
        
        // Rejeter si les cellules sont trop longues
        if (cells.some(cell => cell.length > 100)) return false;
        
        return true;
    }

    /**
     * ✅ NOUVEAU: Traite une table CSV (2+ lignes consécutives avec virgules)
     * Requirements: 9.1 - Detect comma-separated values on consecutive lines
     */
    private processCSVTable(lines: string[], startIndex: number, startLineNumber: number): {
        tokens: Token[];
        nextIndex: number;
        nextLineNumber: number;
    } | null {
        // Collecter toutes les lignes CSV consécutives
        const csvLines: string[] = [];
        let endIndex = startIndex;
        
        while (endIndex < lines.length && this.isCSVLine(lines[endIndex])) {
            csvLines.push(lines[endIndex]);
            endIndex++;
        }
        
        // Exiger au moins 2 lignes consécutives pour être considéré comme une table CSV
        if (csvLines.length < 2) {
            return null;
        }
        
        // Créer un token TABLE_ROW pour chaque ligne avec tableType: 'csv'
        const tokens: Token[] = csvLines.map((line, idx) => ({
            type: 'TABLE_ROW' as const,
            content: line.trim(),
            position: {
                start: 0,
                end: line.length,
                line: startLineNumber + idx,
                column: 1
            },
            metadata: {
                tableType: 'csv'
            }
        }));
        
        return {
            tokens,
            nextIndex: endIndex,
            nextLineNumber: startLineNumber + csvLines.length
        };
    }

    /**
     * ✅ NOUVEAU: Traite une table TSV (2+ lignes consécutives avec tabs)
     * Requirements: 9.2 - Detect tab-separated values on consecutive lines
     */
    private processTSVTable(lines: string[], startIndex: number, startLineNumber: number): {
        tokens: Token[];
        nextIndex: number;
        nextLineNumber: number;
    } | null {
        // Collecter toutes les lignes TSV consécutives
        const tsvLines: string[] = [];
        let endIndex = startIndex;
        
        while (endIndex < lines.length && this.isTSVLine(lines[endIndex])) {
            tsvLines.push(lines[endIndex]);
            endIndex++;
        }
        
        // Exiger au moins 2 lignes consécutives pour être considéré comme une table TSV
        if (tsvLines.length < 2) {
            return null;
        }
        
        // Créer un token TABLE_ROW pour chaque ligne avec tableType: 'tsv'
        const tokens: Token[] = tsvLines.map((line, idx) => ({
            type: 'TABLE_ROW' as const,
            content: line.trim(),
            position: {
                start: 0,
                end: line.length,
                line: startLineNumber + idx,
                column: 1
            },
            metadata: {
                tableType: 'tsv'
            }
        }));
        
        return {
            tokens,
            nextIndex: endIndex,
            nextLineNumber: startLineNumber + tsvLines.length
        };
    }

    /**
     * ✅ FIX: Traite un callout HTML multi-lignes
     * Format:
     * <aside>
     * 📝
     * </aside>
     * > Contenu du callout
     */
    private processHTMLCallout(
        lines: string[],
        startIdx: number,
        startLine: number
    ): { token: Token; nextIndex: number; nextLineNumber: number } | null {
        let i = startIdx;

        // Ligne 1: <aside>
        if (lines[i].trim() !== '<aside>') {
            return null;
        }
        i++;

        // Ligne 2: emoji (peut être vide ou contenir l'emoji)
        let emoji = '📝'; // Par défaut
        if (i < lines.length) {
            const emojiLine = lines[i].trim();
            if (emojiLine && !emojiLine.startsWith('</aside>')) {
                emoji = emojiLine;
                i++;
            }
        }

        // Lignes vides potentielles
        while (i < lines.length && lines[i].trim() === '') {
            i++;
        }

        // Ligne suivante: </aside>
        if (i >= lines.length || lines[i].trim() !== '</aside>') {
            return null;
        }
        i++;

        // Lignes vides après le closing tag
        while (i < lines.length && lines[i].trim() === '') {
            i++;
        }

        // Ligne suivante: contenu avec >
        let content = '';
        if (i < lines.length && lines[i].trim().startsWith('>')) {
            content = lines[i].trim().substring(1).trim();
            i++;
        }

        // Déterminer le type de callout basé sur l'emoji
        const calloutType = this.getCalloutTypeFromEmoji(emoji);
        const color = this.getCalloutColor(calloutType);

        const token: Token = {
            type: 'CALLOUT',
            content: content,
            position: {
                start: 0,
                end: content.length,
                line: startLine,
                column: 0
            },
            metadata: {
                calloutType,
                icon: emoji,
                color
            }
        };

        return {
            token,
            nextIndex: i,
            nextLineNumber: startLine + (i - startIdx)
        };
    }



    /**
     * ✅ NOUVEAU: Traite un toggle heading avec son contenu indenté
     * Format:
     * > # My Toggle Heading
     *   Content line 1 (indenté avec 2+ espaces)
     *   Content line 2
     */
    private processToggleHeading(
        lines: string[],
        startIndex: number,
        startLineNumber: number
    ): { tokens: Token[]; nextIndex: number; nextLineNumber: number } | null {
        const firstLine = lines[startIndex].trim();
        
        // Vérifier le format: > # Heading ou > ## Heading ou > ### Heading
        const headingMatch = firstLine.match(/^>\s*(#{1,3})\s+(.+)$/);
        if (!headingMatch) {
            return null;
        }
        
        const level = headingMatch[1].length as 1 | 2 | 3;
        const content = headingMatch[2];
        
        const tokens: Token[] = [];
        let i = startIndex + 1;
        let hasIndentedContent = false;
        
        // Vérifier si les lignes suivantes sont indentées (contenu du toggle)
        while (i < lines.length) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Ligne vide - continuer à chercher du contenu indenté
            if (!trimmedLine) {
                i++;
                continue;
            }
            
            // Vérifier si la ligne est indentée (commence par des espaces)
            const indentMatch = line.match(/^(\s+)/);
            if (indentMatch && indentMatch[1].length >= 2) {
                // C'est du contenu indenté - marquer qu'on a des enfants
                hasIndentedContent = true;
                i++;
                continue;
            }
            
            // Si la ligne n'est pas indentée, arrêter
            break;
        }
        
        // Créer le token du toggle heading
        const headingToken: Token = {
            type: `HEADING_${level}` as 'HEADING_1' | 'HEADING_2' | 'HEADING_3',
            content: content,
            position: {
                start: 0,
                end: content.length,
                line: startLineNumber,
                column: 1
            },
            metadata: {
                level,
                isToggleable: true,
                hasChildren: hasIndentedContent
            }
        };
        
        tokens.push(headingToken);
        
        // Maintenant traiter le contenu indenté comme des tokens séparés
        let j = startIndex + 1;
        let currentLineNumber = startLineNumber + 1;
        
        while (j < i) {
            const line = lines[j];
            const trimmedLine = line.trim();
            
            if (trimmedLine) {
                // Traiter la ligne indentée comme un token normal
                const lineToken = this.processLine(trimmedLine, currentLineNumber);
                if (lineToken) {
                    tokens.push(lineToken);
                }
            }
            
            j++;
            currentLineNumber++;
        }
        
        return {
            tokens,
            nextIndex: i,
            nextLineNumber: startLineNumber + (i - startIndex)
        };
    }

    /**
     * ✅ NOUVEAU: Traite un callout markdown multi-lignes
     * Format:
     * > [!NOTE]
     * > Contenu du callout
     * > Ligne suivante
     */
    private processMarkdownCallout(
        lines: string[],
        startIndex: number,
        startLineNumber: number
    ): { token: Token; nextIndex: number; nextLineNumber: number } | null {
        const firstLine = lines[startIndex].trim();
        
        // Vérifier le format: > [!TYPE] optionnel_contenu
        const calloutMatch = firstLine.match(/^>\s*\[!(\w+)\]\s*(.*)$/);
        if (!calloutMatch) {
            return null;
        }
        
        const calloutType = calloutMatch[1].toLowerCase();
        let content = calloutMatch[2] || ''; // Contenu optionnel sur la première ligne
        
        let i = startIndex + 1;
        
        // Collecter toutes les lignes suivantes qui commencent par >
        while (i < lines.length) {
            const line = lines[i].trim();
            
            // Arrêter si ligne vide
            if (!line) {
                break;
            }
            
            // Arrêter si ce n'est pas une ligne de quote
            if (!line.startsWith('>')) {
                break;
            }
            
            // Extraire le contenu après le >
            const lineContent = line.substring(1).trim();
            if (lineContent) {
                if (content) {
                    content += '\n' + lineContent;
                } else {
                    content = lineContent;
                }
            }
            
            i++;
        }
        
        const token: Token = {
            type: 'CALLOUT',
            content: content,
            position: {
                start: 0,
                end: content.length,
                line: startLineNumber,
                column: 0
            },
            metadata: {
                calloutType,
                icon: this.getCalloutIcon(calloutType),
                color: this.getCalloutColor(calloutType)
            }
        };
        
        return {
            token,
            nextIndex: i,
            nextLineNumber: startLineNumber + (i - startIndex)
        };
    }

    private getCalloutIcon(type: string): string {
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

    private getCalloutColor(type: string): string {
        const colors: Record<string, string> = {
            'note': 'blue_background',
            'info': 'blue_background',
            'tip': 'green_background',
            'warning': 'yellow_background',
            'danger': 'red_background',
            'error': 'red_background',
            'success': 'green_background',
            'question': 'purple_background',
            'quote': 'gray_background',
            'example': 'orange_background'
        };
        return colors[type] || 'gray_background';
    }

    private getCalloutTypeFromEmoji(emoji: string): string {
        const map: Record<string, string> = {
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
        return map[emoji] || 'note';
    }

    /**
     * ✅ CORRECTION CRITIQUE: Processeur de callout HTML single-line
     * Format: <aside> 📝</aside>
     * Suivi de contenu sur les lignes suivantes
     */
    private processSingleLineHTMLCallout(
        lines: string[],
        startIndex: number,
        lineNumber: number
    ): { token: Token; nextIndex: number; nextLineNumber: number } | null {
        const line = lines[startIndex].trim();

        // Vérifier le format: <aside>emoji</aside>
        const asideMatch = line.match(/^<aside>\s*([^<]+)\s*<\/aside>\s*$/);

        if (!asideMatch) {
            return null;
        }

        const icon = asideMatch[1].trim();

        // Collecter le contenu qui suit jusqu'à une ligne vide ou un nouveau bloc
        const contentLines: string[] = [];
        let i = startIndex + 1;

        while (i < lines.length) {
            const contentLine = lines[i];
            const trimmedLine = contentLine.trim();

            // Arrêter sur ligne vide
            if (!trimmedLine) {
                break;
            }

            // Arrêter si on rencontre un nouveau bloc structuré
            if (trimmedLine.startsWith('#') ||
                trimmedLine.startsWith('<aside>') ||
                trimmedLine.startsWith('```') ||
                trimmedLine.startsWith('$$') ||
                (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) ||
                trimmedLine.match(/^-{3,}$/)) {
                break;
            }

            // Enlever le ">" au début si c'est une quote
            const cleaned = trimmedLine.startsWith('>')
                ? trimmedLine.substring(1).trim()
                : trimmedLine;

            contentLines.push(cleaned);
            i++;
        }

        const content = contentLines.join('\n').trim();

        return {
            token: {
                type: 'CALLOUT',
                content,
                position: {
                    start: 0,
                    end: content.length,
                    line: lineNumber,
                    column: 1
                },
                metadata: {
                    icon,
                    color: 'gray',
                    calloutType: 'info'
                }
            },
            nextIndex: i,
            nextLineNumber: lineNumber + (i - startIndex)
        };
    }

    /**
     * ✅ TRAITEMENT D'UNE LIGNE
     */
    private processLine(line: string, lineNumber: number): Token | null {
        // ✅ NE PAS TRIM - préserver l'indentation pour les listes
        if (!line.trim()) return null;

        const trimmedLine = line.trim();
        
        // ✅ NOUVEAU: Essayer d'abord avec la ligne complète pour les listes
        const fullLineState: LexerState = {
            text: line,  // Ligne complète avec espaces
            position: 0,
            line: lineNumber,
            column: 1,
            tokens: []
        };

        // Essayer de matcher les règles de listes avec la ligne complète
        const fullLineMatch = this.ruleEngine.findMatch(fullLineState);
        
        if (fullLineMatch && this.isListRule(fullLineMatch.rule)) {
            const token = this.ruleEngine.applyRule(fullLineMatch.rule, fullLineMatch.match, fullLineState);
            if (token) {
                return token;
            }
        }

        // Si pas de liste, utiliser la ligne trimmed pour les autres règles
        const trimmedState: LexerState = {
            text: trimmedLine,
            position: 0,
            line: lineNumber,
            column: 1,
            tokens: []
        };

        const trimmedMatch = this.ruleEngine.findMatch(trimmedState);

        if (trimmedMatch) {
            const token = this.ruleEngine.applyRule(trimmedMatch.rule, trimmedMatch.match, trimmedState);
            if (token) {
                return token;
            }
        }

        // Fallback: créer un token PARAGRAPH
        return {
            type: 'PARAGRAPH',
            content: trimmedLine,
            position: {
                start: 0,
                end: line.length,
                line: lineNumber,
                column: 1
            }
        };
    }

    /**
     * ✅ NOUVEAU: Vérifier si une règle concerne les listes
     */
    private isListRule(rule: LexerRule): boolean {
        const listRuleNames = [
            'todo_item',
            'bulleted_list_item', 
            'numbered_list_item'
        ];
        return listRuleNames.includes(rule.name);
    }

    /**
     * ✅ TRAITEMENT DU PROCHAIN TOKEN
     */
    private processNextToken(state: LexerState): { success: boolean; consumed: number } {
        // Ignorer les espaces si nécessaire
        if (!this.options.preserveWhitespace) {
            const whitespaceConsumed = this.consumeWhitespace(state);
            if (whitespaceConsumed > 0) {
                return { success: true, consumed: whitespaceConsumed };
            }
        }

        // Appliquer les règles via le moteur
        const match = this.ruleEngine.findMatch(state);

        if (match) {
            const token = this.ruleEngine.applyRule(match.rule, match.match, state);
            if (token) {
                state.tokens.push(token);
                return { success: true, consumed: match.length };
            }
        }

        return { success: false, consumed: 0 };
    }

    /**
     * ✅ CONSOMMATION DES ESPACES
     */
    private consumeWhitespace(state: LexerState): number {
        const text = state.text;
        let consumed = 0;
        let pos = state.position;

        while (pos < text.length && /\s/.test(text[pos])) {
            if (text[pos] === '\n') {
                // Créer un token newline si nécessaire
                if (this.options.preserveWhitespace) {
                    const position: Position = {
                        start: pos,
                        end: pos + 1,
                        line: state.line,
                        column: state.column
                    };

                    state.tokens.push({
                        type: 'NEWLINE',
                        content: '\n',
                        position
                    });
                }
            }

            pos++;
            consumed++;
        }

        return consumed;
    }

    /**
     * ✅ FALLBACK POUR TEXTE NON RECONNU
     */
    private processFallbackText(state: LexerState): void {
        const text = state.text;
        let length = 1;

        // Étendre jusqu'au prochain caractère spécial ou espace
        while (state.position + length < text.length) {
            const char = text[state.position + length];
            if (/[\s*_`~\[\]()$#>|!-]/.test(char)) {
                break;
            }
            length++;
        }

        const content = text.substring(state.position, state.position + length);
        const position: Position = {
            start: state.position,
            end: state.position + length,
            line: state.line,
            column: state.column
        };

        state.tokens.push({
            type: 'TEXT',
            content,
            position
        });

        this.updatePosition(state, length);
    }

    /**
     * ✅ MISE À JOUR DE LA POSITION
     */
    private updatePosition(state: LexerState, consumed: number): void {
        const text = state.text.substring(state.position, state.position + consumed);

        for (const char of text) {
            if (char === '\n') {
                state.line++;
                state.column = 1;
            } else {
                state.column++;
            }
        }

        state.position += consumed;
    }

    /**
     * ✅ INITIALISATION DES RÈGLES
     */
    private initializeRules(): void {
        // Ajouter les règles de bloc (priorité haute)
        this.ruleEngine.addRules(blockRules);

        // Ajouter les règles média si activées (pour les URLs seules sur une ligne)
        if (this.options.enableMediaDetection) {
            this.ruleEngine.addRules(mediaRules);
        }
    }

    /**
     * ✅ CRÉATION DU TOKEN STREAM
     */
    private createTokenStream(tokens: Token[]): TokenStream {
        return new TokenStreamImpl(tokens);
    }

    /**
     * ✅ TOKEN STREAM VIDE
     */
    private createEmptyTokenStream(): TokenStream {
        return new TokenStreamImpl([{
            type: 'EOF',
            content: '',
            position: { start: 0, end: 0, line: 1, column: 1 }
        }]);
    }

    /**
     * ✅ AJOUTER TOKEN EOF
     */
    private addEOFToken(state: LexerState): void {
        const position: Position = {
            start: state.position,
            end: state.position,
            line: state.line,
            column: state.column
        };

        state.tokens.push({
            type: 'EOF',
            content: '',
            position
        });
    }

    /**
     * ✅ STATISTIQUES DE TOKENIZATION
     */
    getStats(tokens: Token[]): LexerStats {
        const stats: LexerStats = {
            totalTokens: tokens.length,
            tokenTypes: {},
            textLength: 0,
            averageTokenLength: 0
        };

        for (const token of tokens) {
            stats.tokenTypes[token.type] = (stats.tokenTypes[token.type] || 0) + 1;
            stats.textLength += token.content.length;
        }

        stats.averageTokenLength = stats.textLength / Math.max(1, tokens.length);

        return stats;
    }
}

/**
 * ✅ IMPLÉMENTATION DU TOKEN STREAM
 */
class TokenStreamImpl implements TokenStream {
    tokens: Token[];
    current: number = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    peek(offset: number = 0): Token | null {
        const index = this.current + offset;
        return index < this.tokens.length ? this.tokens[index] : null;
    }

    next(): Token | null {
        if (this.current < this.tokens.length) {
            return this.tokens[this.current++];
        }
        return null;
    }

    hasNext(): boolean {
        return this.current < this.tokens.length;
    }

    position(): number {
        return this.current;
    }

    seek(position: number): void {
        this.current = Math.max(0, Math.min(position, this.tokens.length));
    }
}

/**
 * ✅ OPTIONS DU LEXER
 */
export interface LexerOptions {
    preserveWhitespace?: boolean;
    trackPositions?: boolean;
    maxTokens?: number;
    enableInlineFormatting?: boolean;
    enableMediaDetection?: boolean;
}

/**
 * ✅ STATISTIQUES DU LEXER
 */
export interface LexerStats {
    totalTokens: number;
    tokenTypes: Record<string, number>;
    textLength: number;
    averageTokenLength: number;
}