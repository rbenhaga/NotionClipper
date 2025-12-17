import { Lexer } from '../lexer/Lexer';

describe('CSV/TSV Table Detection', () => {
    let lexer: Lexer;

    beforeEach(() => {
        lexer = new Lexer();
    });

    describe('CSV Detection', () => {
        it('should detect 2+ consecutive CSV lines as TABLE_ROW tokens with tableType csv', () => {
            const input = `Name,Age,City
John,25,Paris
Jane,30,London`;

            const result = lexer.tokenize(input);
            const tokens = result.tokens.filter(t => t.type !== 'EOF');

            expect(tokens).toHaveLength(3);
            tokens.forEach(token => {
                expect(token.type).toBe('TABLE_ROW');
                expect(token.metadata?.tableType).toBe('csv');
            });
        });

        it('should handle a single CSV line (may be detected by BlockRules)', () => {
            const input = `Name,Age,City`;

            const result = lexer.tokenize(input);
            const tokens = result.tokens.filter(t => t.type !== 'EOF');

            // Single line may be detected as TABLE_ROW by BlockRules
            // The key requirement is that 2+ consecutive lines are detected with tableType: 'csv'
            expect(tokens).toHaveLength(1);
            // Either PARAGRAPH or TABLE_ROW is acceptable for single lines
            expect(['PARAGRAPH', 'TABLE_ROW']).toContain(tokens[0].type);
        });

        it('should detect CSV with various cell counts', () => {
            const input = `A,B
C,D
E,F`;

            const result = lexer.tokenize(input);
            const tokens = result.tokens.filter(t => t.type !== 'EOF');

            expect(tokens).toHaveLength(3);
            tokens.forEach(token => {
                expect(token.type).toBe('TABLE_ROW');
                expect(token.metadata?.tableType).toBe('csv');
            });
        });

        it('should NOT detect lines with decimal numbers as CSV', () => {
            const input = `The value is 1,234
Another value is 5,678`;

            const result = lexer.tokenize(input);
            const tokens = result.tokens.filter(t => t.type !== 'EOF');

            // Should be paragraphs, not CSV
            tokens.forEach(token => {
                expect(token.type).toBe('PARAGRAPH');
            });
        });
    });

    describe('TSV Detection', () => {
        it('should detect 2+ consecutive TSV lines as TABLE_ROW tokens with tableType tsv', () => {
            const input = `Name\tAge\tCity
John\t25\tParis
Jane\t30\tLondon`;

            const result = lexer.tokenize(input);
            const tokens = result.tokens.filter(t => t.type !== 'EOF');

            expect(tokens).toHaveLength(3);
            tokens.forEach(token => {
                expect(token.type).toBe('TABLE_ROW');
                expect(token.metadata?.tableType).toBe('tsv');
            });
        });

        it('should handle a single TSV line (may be detected by BlockRules)', () => {
            const input = `Name\tAge\tCity`;

            const result = lexer.tokenize(input);
            const tokens = result.tokens.filter(t => t.type !== 'EOF');

            // Single line may be detected as TABLE_ROW by BlockRules
            // The key requirement is that 2+ consecutive lines are detected with tableType: 'tsv'
            expect(tokens).toHaveLength(1);
            // Either PARAGRAPH or TABLE_ROW is acceptable for single lines
            expect(['PARAGRAPH', 'TABLE_ROW']).toContain(tokens[0].type);
        });

        it('should detect TSV with various cell counts', () => {
            const input = `A\tB
C\tD
E\tF`;

            const result = lexer.tokenize(input);
            const tokens = result.tokens.filter(t => t.type !== 'EOF');

            expect(tokens).toHaveLength(3);
            tokens.forEach(token => {
                expect(token.type).toBe('TABLE_ROW');
                expect(token.metadata?.tableType).toBe('tsv');
            });
        });
    });

    describe('Mixed Content', () => {
        it('should handle CSV table followed by regular text', () => {
            const input = `Name,Age,City
John,25,Paris

This is regular text.`;

            const result = lexer.tokenize(input);
            const tokens = result.tokens.filter(t => t.type !== 'EOF');

            expect(tokens).toHaveLength(3);
            expect(tokens[0].type).toBe('TABLE_ROW');
            expect(tokens[0].metadata?.tableType).toBe('csv');
            expect(tokens[1].type).toBe('TABLE_ROW');
            expect(tokens[1].metadata?.tableType).toBe('csv');
            expect(tokens[2].type).toBe('PARAGRAPH');
        });

        it('should handle TSV table followed by regular text', () => {
            const input = `Name\tAge\tCity
John\t25\tParis

This is regular text.`;

            const result = lexer.tokenize(input);
            const tokens = result.tokens.filter(t => t.type !== 'EOF');

            expect(tokens).toHaveLength(3);
            expect(tokens[0].type).toBe('TABLE_ROW');
            expect(tokens[0].metadata?.tableType).toBe('tsv');
            expect(tokens[1].type).toBe('TABLE_ROW');
            expect(tokens[1].metadata?.tableType).toBe('tsv');
            expect(tokens[2].type).toBe('PARAGRAPH');
        });
    });
});
