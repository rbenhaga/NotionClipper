import { parseContent } from '../parseContent';
import { Lexer } from '../lexer/Lexer';

describe('Toggle vs Quote Distinction', () => {
  describe('Lexer Token Generation', () => {
    const lexer = new Lexer();

    test('single > followed by space should produce TOGGLE_LIST token', () => {
      const input = '> This is a toggle item';
      const tokenStream = lexer.tokenize(input);
      
      // Find the first non-EOF token
      const token = tokenStream.tokens.find(t => t.type !== 'EOF');
      
      expect(token).toBeDefined();
      expect(token?.type).toBe('TOGGLE_LIST');
      expect(token?.content).toBe('This is a toggle item');
      expect(token?.metadata?.isToggleable).toBe(true);
    });

    test('double >> should produce QUOTE_BLOCK token', () => {
      const input = '>> This is a quote';
      const tokenStream = lexer.tokenize(input);
      
      const token = tokenStream.tokens.find(t => t.type !== 'EOF');
      
      expect(token).toBeDefined();
      expect(token?.type).toBe('QUOTE_BLOCK');
      expect(token?.content).toBe('This is a quote');
    });

    test('> [!type] should produce CALLOUT token (not TOGGLE_LIST)', () => {
      const input = '> [!note] This is a callout';
      const tokenStream = lexer.tokenize(input);
      
      const token = tokenStream.tokens.find(t => t.type !== 'EOF');
      
      expect(token).toBeDefined();
      expect(token?.type).toBe('CALLOUT');
      expect(token?.metadata?.calloutType).toBe('note');
    });

    test('> - item should produce LIST_ITEM_BULLETED with isToggleable', () => {
      const input = '> - Toggle list item';
      const tokenStream = lexer.tokenize(input);
      
      const token = tokenStream.tokens.find(t => t.type !== 'EOF');
      
      expect(token).toBeDefined();
      expect(token?.type).toBe('LIST_ITEM_BULLETED');
      expect(token?.metadata?.isToggleable).toBe(true);
    });
  });

  describe('Parser AST Generation', () => {
    test('single > should create toggle AST node', () => {
      const result = parseContent('> Toggle content');
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.blocks[0].type).toBe('toggle');
    });

    test('double >> should create quote AST node', () => {
      const result = parseContent('>> Quote content');
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.blocks[0].type).toBe('quote');
    });

    test('> [!note] should create callout AST node', () => {
      const result = parseContent('> [!note] Callout content');
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.blocks[0].type).toBe('callout');
    });
  });

  describe('Edge Cases', () => {
    test('empty > should produce QUOTE_BLOCK token', () => {
      const lexer = new Lexer();
      const input = '>';
      const tokenStream = lexer.tokenize(input);
      
      const token = tokenStream.tokens.find(t => t.type !== 'EOF');
      
      // Empty > should be handled by the fallback blockquote rule
      expect(token).toBeDefined();
      expect(token?.type).toBe('QUOTE_BLOCK');
    });

    test('> with only whitespace should produce QUOTE_BLOCK token', () => {
      const lexer = new Lexer();
      const input = '>   ';
      const tokenStream = lexer.tokenize(input);
      
      const token = tokenStream.tokens.find(t => t.type !== 'EOF');
      
      expect(token).toBeDefined();
      expect(token?.type).toBe('QUOTE_BLOCK');
    });

    test('>>> (triple) should produce QUOTE_BLOCK token', () => {
      const lexer = new Lexer();
      const input = '>>> Triple quote';
      const tokenStream = lexer.tokenize(input);
      
      const token = tokenStream.tokens.find(t => t.type !== 'EOF');
      
      // Triple > should match the double >> pattern first
      expect(token).toBeDefined();
      expect(token?.type).toBe('QUOTE_BLOCK');
    });
  });
});
