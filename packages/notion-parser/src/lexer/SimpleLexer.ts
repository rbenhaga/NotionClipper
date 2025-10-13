import type { Token, TokenStream } from '../types/tokens';

/**
 * Lexer simplifié et efficace pour le parsing Notion
 * Évite la complexité excessive et se concentre sur les résultats
 */
export class SimpleLexer {
    tokenize(input: string): TokenStream {
        if (!input?.trim()) {
            return new SimpleTokenStream([]);
        }

        const tokens: Token[] = [];
        const lines = input.split('\n');
        let lineNumber = 1;
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trim();

            if (!trimmed) {
                tokens.push(this.createToken('NEWLINE', '', lineNumber));
                i++;
                lineNumber++;
                continue;
            }

            // Code blocks (```language)
            if (trimmed.startsWith('```')) {
                const result = this.processCodeBlock(lines, i, lineNumber);
                tokens.push(...result.tokens);
                i = result.nextIndex;
                lineNumber = result.nextLineNumber;
                continue;
            }

            // Equations ($$)
            if (trimmed.startsWith('$$')) {
                const result = this.processEquationBlock(lines, i, lineNumber);
                tokens.push(...result.tokens);
                i = result.nextIndex;
                lineNumber = result.nextLineNumber;
                continue;
            }

            // Callouts HTML single-line
            const calloutMatch = trimmed.match(/^<aside>\s*([^<]+)\s*<\/aside>\s*$/);
            if (calloutMatch) {
                const result = this.processCalloutSingleLine(lines, i, lineNumber, calloutMatch[1]);
                tokens.push(result.token);
                i = result.nextIndex;
                lineNumber = result.nextLineNumber;
                continue;
            }

            // Callouts HTML multi-line
            if (trimmed === '<aside>') {
                const result = this.processCalloutMultiLine(lines, i, lineNumber);
                if (result) {
                    tokens.push(result.token);
                    i = result.nextIndex;
                    lineNumber = result.nextLineNumber;
                    continue;
                }
            }

            // Tables
            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                const result = this.processTable(lines, i, lineNumber);
                tokens.push(...result.tokens);
                i = result.nextIndex;
                lineNumber = result.nextLineNumber;
                continue;
            }

            // Single line processing
            const token = this.processLine(line, lineNumber);
            if (token) {
                tokens.push(token);
            }

            i++;
            lineNumber++;
        }

        return new SimpleTokenStream(tokens);
    }

    private processCodeBlock(lines: string[], startIndex: number, startLineNumber: number) {
        const startLine = lines[startIndex].trim();
        const languageMatch = startLine.match(/^```([a-zA-Z0-9#+\-._]*)/);
        const language = languageMatch?.[1] || 'plain text';

        const codeLines: string[] = [];
        let i = startIndex + 1;

        while (i < lines.length && lines[i].trim() !== '```') {
            codeLines.push(lines[i]);
            i++;
        }

        const content = codeLines.join('\n');
        const token = this.createToken('CODE_BLOCK', content, startLineNumber, { language });

        return {
            tokens: [token],
            nextIndex: i + 1,
            nextLineNumber: startLineNumber + (i - startIndex) + 1
        };
    }

    private processEquationBlock(lines: string[], startIndex: number, startLineNumber: number) {
        const equationLines: string[] = [];
        let i = startIndex + 1;

        while (i < lines.length && lines[i].trim() !== '$$') {
            equationLines.push(lines[i]);
            i++;
        }

        const content = equationLines.join('\n');
        const token = this.createToken('EQUATION_BLOCK', content, startLineNumber, { isBlock: true });

        return {
            tokens: [token],
            nextIndex: i + 1,
            nextLineNumber: startLineNumber + (i - startIndex) + 1
        };
    }

    private processCalloutSingleLine(lines: string[], startIndex: number, startLineNumber: number, icon: string) {
        const contentLines: string[] = [];
        let i = startIndex + 1;

        // Collecter le contenu qui suit
        while (i < lines.length) {
            const line = lines[i].trim();
            if (!line || line.startsWith('#') || line.startsWith('<aside>') || 
                line.startsWith('```') || line.startsWith('|')) {
                break;
            }
            contentLines.push(lines[i]);
            i++;
        }

        const content = contentLines.join('\n').trim();
        const token = this.createToken('CALLOUT', content, startLineNumber, {
            icon: icon.trim(),
            color: 'gray',
            calloutType: 'info'
        });

        return {
            token,
            nextIndex: i,
            nextLineNumber: startLineNumber + (i - startIndex)
        };
    }

    private processCalloutMultiLine(lines: string[], startIndex: number, startLineNumber: number) {
        let i = startIndex + 1;
        let icon = '📝';

        // Ligne avec l'emoji
        if (i < lines.length && lines[i].trim() && lines[i].trim() !== '</aside>') {
            icon = lines[i].trim();
            i++;
        }

        // Chercher </aside>
        while (i < lines.length && lines[i].trim() !== '</aside>') {
            i++;
        }

        if (i >= lines.length) return null;
        i++; // Passer </aside>

        // Collecter le contenu
        const contentLines: string[] = [];
        while (i < lines.length) {
            const line = lines[i].trim();
            if (!line || line.startsWith('#') || line.startsWith('<aside>')) break;
            
            if (line.startsWith('>')) {
                contentLines.push(line.substring(1).trim());
            } else {
                contentLines.push(line);
            }
            i++;
        }

        const content = contentLines.join('\n').trim();
        const token = this.createToken('CALLOUT', content, startLineNumber, {
            icon,
            color: 'gray',
            calloutType: 'info'
        });

        return {
            token,
            nextIndex: i,
            nextLineNumber: startLineNumber + (i - startIndex)
        };
    }

    private processTable(lines: string[], startIndex: number, startLineNumber: number) {
        const tableLines: string[] = [];
        let i = startIndex;

        while (i < lines.length) {
            const line = lines[i].trim();
            if (!line.startsWith('|') || !line.endsWith('|')) break;
            tableLines.push(line);
            i++;
        }

        const tokens = tableLines.map((line, index) => 
            this.createToken('TABLE_ROW', line, startLineNumber + index)
        );

        return {
            tokens,
            nextIndex: i,
            nextLineNumber: startLineNumber + tableLines.length
        };
    }

    private processLine(line: string, lineNumber: number): Token | null {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Headings
        const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
        if (headingMatch) {
            const level = headingMatch[1].length as 1 | 2 | 3;
            return this.createToken(`HEADING_${level}` as any, headingMatch[2], lineNumber, { level });
        }

        // Todo items
        const todoMatch = trimmed.match(/^(\s*)- \[([ x])\]\s+(.+)$/);
        if (todoMatch) {
            const indentLevel = Math.floor(todoMatch[1].length / 2);
            return this.createToken('LIST_ITEM_TODO', todoMatch[3], lineNumber, {
                indentLevel,
                checked: todoMatch[2] === 'x',
                listType: 'todo'
            });
        }

        // Bulleted lists
        const bulletMatch = trimmed.match(/^(\s*)[-*+]\s+(.+)$/);
        if (bulletMatch) {
            const indentLevel = Math.floor(bulletMatch[1].length / 2);
            return this.createToken('LIST_ITEM_BULLETED', bulletMatch[2], lineNumber, {
                indentLevel,
                listType: 'bulleted'
            });
        }

        // Numbered lists
        const numberedMatch = trimmed.match(/^(\s*)\d+\.\s+(.+)$/);
        if (numberedMatch) {
            const indentLevel = Math.floor(numberedMatch[1].length / 2);
            return this.createToken('LIST_ITEM_NUMBERED', numberedMatch[2], lineNumber, {
                indentLevel,
                listType: 'numbered'
            });
        }

        // Quotes
        const quoteMatch = trimmed.match(/^>\s*(.*)$/);
        if (quoteMatch) {
            return this.createToken('QUOTE_BLOCK', quoteMatch[1], lineNumber);
        }

        // Images
        const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imageMatch) {
            return this.createToken('IMAGE', imageMatch[1] || '', lineNumber, {
                url: imageMatch[2],
                alt: imageMatch[1] || ''
            });
        }

        // Dividers
        if (trimmed.match(/^(-{3,}|\*{3,}|_{3,})\s*$/)) {
            return this.createToken('DIVIDER', '', lineNumber);
        }

        // Default: paragraph
        return this.createToken('PARAGRAPH', trimmed, lineNumber);
    }

    private createToken(type: any, content: string, line: number, metadata?: any): Token {
        return {
            type,
            content,
            position: {
                start: 0,
                end: content.length,
                line,
                column: 1
            },
            metadata
        };
    }
}

class SimpleTokenStream implements TokenStream {
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