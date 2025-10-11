import { parseContent } from '../../../src/parseContent';

// Types flexibles pour les tests
type TestBlock = {
  type: string;
  [key: string]: any;
};

describe('LaTeX Parsing', () => {
  describe('Inline LaTeX Detection', () => {
    it('should detect inline math with single dollar signs', () => {
      const content = 'The formula $E = mc^2$ is famous';
      const result = parseContent(content, { contentType: 'latex' });
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
      
      const blocks = result.blocks as TestBlock[];
      const equationBlock = blocks.find((b: TestBlock) => b.type === 'equation');
      expect(equationBlock).toBeDefined();
    });

    it('should detect inline math with escaped parentheses', () => {
      const content = 'Formula \\(x^2 + y^2 = z^2\\) is Pythagorean';
      const result = parseContent(content, { contentType: 'latex' });
      
      expect(result.success).toBe(true);
      const blocks = result.blocks as TestBlock[];
      const equationBlock = blocks.find((b: TestBlock) => b.type === 'equation');
      expect(equationBlock).toBeDefined();
    });
  });

  describe('Block LaTeX Detection', () => {
    it('should detect display math with double dollar signs', () => {
      const content = '$$\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)$$';
      const result = parseContent(content, { contentType: 'latex' });
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.blocks[0].type).toBe('equation');
    });

    it('should detect LaTeX environments', () => {
      const content = `\\begin{equation}
E = mc^2
\\end{equation}`;
      
      const result = parseContent(content, { contentType: 'latex' });
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.blocks[0].type).toBe('equation');
    });

    it('should detect align environments', () => {
      const content = `\\begin{align}
x &= a + b \\\\
y &= c + d
\\end{align}`;
      
      const result = parseContent(content, { contentType: 'latex' });
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.blocks[0].type).toBe('equation');
    });
  });

  describe('Complex LaTeX Expressions', () => {
    it('should handle fractions', () => {
      const content = '$\\frac{a}{b} + \\frac{c}{d} = \\frac{ad + bc}{bd}$';
      const result = parseContent(content, { contentType: 'latex' });
      
      expect(result.success).toBe(true);
      const blocks = result.blocks as TestBlock[];
      const equationBlock = blocks.find((b: TestBlock) => b.type === 'equation');
      expect(equationBlock).toBeDefined();
    });

    it('should handle integrals and summations', () => {
      const content = '$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$';
      const result = parseContent(content, { contentType: 'latex' });
      
      expect(result.success).toBe(true);
      const blocks = result.blocks as TestBlock[];
      const equationBlock = blocks.find((b: TestBlock) => b.type === 'equation');
      expect(equationBlock).toBeDefined();
    });

    it('should handle matrices', () => {
      const content = `$\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}$`;
      
      const result = parseContent(content, { contentType: 'latex' });
      
      expect(result.success).toBe(true);
      expect(result.blocks[0].type).toBe('equation');
    });

    it('should handle Greek letters and symbols', () => {
      const content = '$\\alpha + \\beta = \\gamma \\cdot \\delta$';
      const result = parseContent(content, { contentType: 'latex' });
      
      expect(result.success).toBe(true);
      const blocks = result.blocks as TestBlock[];
      const equationBlock = blocks.find((b: TestBlock) => b.type === 'equation');
      expect(equationBlock).toBeDefined();
    });
  });

  describe('Mixed Content', () => {
    it('should handle text with multiple equations', () => {
      const content = 'First equation $a = b$ and second $c = d$ in text';
      const result = parseContent(content, { contentType: 'latex' });
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);
      
      const blocks = result.blocks as TestBlock[];
      const equations = blocks.filter((b: TestBlock) => b.type === 'equation');
      expect(equations.length).toBeGreaterThan(0);
    });

    it('should handle LaTeX mixed with markdown', () => {
      const content = '# Math Section\n\nThe formula $E = mc^2$ is **important**.\n\n$F = ma$';
      const result = parseContent(content, { contentType: 'markdown' });
      
      expect(result.success).toBe(true);
      const blocks = result.blocks as TestBlock[];
      const equations = blocks.filter((b: TestBlock) => b.type === 'equation');
      expect(equations.length).toBeGreaterThan(0);
    });
  });

  describe('LaTeX Validation', () => {
    it('should handle malformed LaTeX gracefully', () => {
      const malformed = '$\\frac{a}{b$'; // Missing closing brace
      const result = parseContent(malformed, { contentType: 'latex' });
      
      expect(result.success).toBe(true);
      // Should either fix or treat as text
    });

    it('should handle unmatched delimiters', () => {
      const unmatched = '$a = b + c'; // Missing closing $
      const result = parseContent(unmatched, { contentType: 'latex' });
      
      expect(result.success).toBe(true);
    });

    it('should handle nested delimiters', () => {
      const nested = '$a = \\text{nested}$'; // Simplified nested content
      const result = parseContent(nested, { contentType: 'latex' });
      
      expect(result.success).toBe(true);
    });
  });

  describe('Equation Block Structure', () => {
    it('should create proper equation block structure', () => {
      const content = '$x^2 + y^2 = r^2$';
      const result = parseContent(content, { contentType: 'latex' });
      
      expect(result.success).toBe(true);
      const blocks = result.blocks as TestBlock[];
      const equationBlock = blocks.find((b: TestBlock) => b.type === 'equation');
      
      expect(equationBlock).toBeValidNotionBlock();
      expect(equationBlock?.type).toBe('equation');
      expect(equationBlock?.equation).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty content', () => {
      const result = parseContent('', { contentType: 'latex' });
      
      expect(result.success).toBe(true);
      expect(result.blocks).toEqual([]);
    });

    it('should handle null content', () => {
      const result = parseContent(null as any, { contentType: 'latex' });
      
      expect(result.success).toBe(true);
      expect(result.blocks).toEqual([]);
    });
  });

  describe('Performance', () => {
    it('should handle complex equations efficiently', () => {
      const complexEquation = `$\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$`;
      
      const startTime = performance.now();
      const result = parseContent(complexEquation, { contentType: 'latex' });
      const endTime = performance.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});