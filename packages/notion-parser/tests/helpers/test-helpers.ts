/**
 * Helpers centralisés pour les tests
 */

// Types locaux pour éviter les problèmes d'import
type TestBlock = {
  type: string;
  [key: string]: any;
  children?: TestBlock[];
  has_children?: boolean;
};

type TestResult = {
  success: boolean;
  blocks: TestBlock[];
  error?: string;
  validation?: any;
  metadata?: {
    detectedType: string;
    confidence: number;
    originalLength: number;
    blockCount: number;
    processingTime: number;
    contentType?: string;
    detectionConfidence?: number;
  };
};

type PerformanceMetrics = {
  startTime: number;
  endTime: number;
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
};

interface TestHelpers {
  expectValidResult(result: TestResult): void;
  expectBlockTypes(blocks: TestBlock[], expectedTypes: string[]): void;
  expectRichTextContent(block: TestBlock, expectedContent: string): void;
  measurePerformance<T>(fn: () => T): { result: T; metrics: PerformanceMetrics };
}

export class TestHelpersImpl implements TestHelpers {
  expectValidResult(result: TestResult): void {
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.blocks).toBeDefined();
    expect(Array.isArray(result.blocks)).toBe(true);
    expect(result.error).toBeUndefined();
  }

  expectBlockTypes(blocks: TestBlock[], expectedTypes: string[]): void {
    const actualTypes = blocks.map(b => b.type);
    expectedTypes.forEach(expectedType => {
      expect(actualTypes).toContain(expectedType);
    });
  }

  expectRichTextContent(block: TestBlock, expectedContent: string): void {
    const richText = this.extractRichText(block);
    const content = richText.map(rt => rt.text?.content || rt.plain_text || '').join('');
    expect(content).toBe(expectedContent);
  }

  measurePerformance<T>(fn: () => T): { result: T; metrics: PerformanceMetrics } {
    const memoryBefore = process.memoryUsage().heapUsed;
    const startTime = performance.now();
    
    const result = fn();
    
    const endTime = performance.now();
    const memoryAfter = process.memoryUsage().heapUsed;
    
    return {
      result,
      metrics: {
        startTime,
        endTime,
        duration: endTime - startTime,
        memoryBefore,
        memoryAfter,
        memoryDelta: (memoryAfter - memoryBefore) / 1024 / 1024 // MB
      }
    };
  }

  private extractRichText(block: TestBlock): any[] {
    // Essayer différents chemins pour trouver le rich_text
    if (block.paragraph?.rich_text) return block.paragraph.rich_text;
    if (block.heading_1?.rich_text) return block.heading_1.rich_text;
    if (block.heading_2?.rich_text) return block.heading_2.rich_text;
    if (block.heading_3?.rich_text) return block.heading_3.rich_text;
    if (block.callout?.rich_text) return block.callout.rich_text;
    if (block.quote?.rich_text) return block.quote.rich_text;
    if (block.rich_text) return block.rich_text;
    return [];
  }
}

// Instance globale des helpers
export const testHelpers = new TestHelpersImpl();

// Générateurs de contenu de test
export class ContentGenerators {
  static generateMarkdown(size: 'small' | 'medium' | 'large'): string {
    const baseContent = `# Test Header
This is a paragraph with **bold** and *italic* text.

## Subsection
- List item 1
- List item 2 with [link](https://example.com)

### Code Example
\`\`\`javascript
function test() {
  return "hello world";
}
\`\`\`

> This is a blockquote

| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`;

    switch (size) {
      case 'small':
        return baseContent;
      case 'medium':
        return Array(10).fill(baseContent).join('\n\n');
      case 'large':
        return Array(100).fill(baseContent).join('\n\n');
      default:
        return baseContent;
    }
  }

  static generateCode(language: string, size: 'small' | 'medium' | 'large'): string {
    const templates = {
      javascript: `function example() {
  console.log("Hello World");
  return true;
}`,
      python: `def example():
    print("Hello World")
    return True`,
      java: `public class Example {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`,
      css: `.example {
  color: red;
  font-size: 16px;
}`
    };

    const baseCode = templates[language as keyof typeof templates] || templates.javascript;

    switch (size) {
      case 'small':
        return baseCode;
      case 'medium':
        return Array(50).fill(0).map((_, i) => 
          baseCode.replace(/example/g, `example${i}`)
        ).join('\n\n');
      case 'large':
        return Array(500).fill(0).map((_, i) => 
          baseCode.replace(/example/g, `example${i}`)
        ).join('\n\n');
      default:
        return baseCode;
    }
  }

  static generateTable(format: 'csv' | 'tsv' | 'markdown', rows: number = 10): string {
    const headers = ['Name', 'Age', 'City', 'Country'];
    const data = Array(rows).fill(0).map((_, i) => [
      `Person${i}`,
      `${20 + i}`,
      `City${i}`,
      `Country${i}`
    ]);

    switch (format) {
      case 'csv':
        return [headers.join(','), ...data.map(row => row.join(','))].join('\n');
      case 'tsv':
        return [headers.join('\t'), ...data.map(row => row.join('\t'))].join('\n');
      case 'markdown':
        const separator = headers.map(() => '---').join('|');
        return [
          `|${headers.join('|')}|`,
          `|${separator}|`,
          ...data.map(row => `|${row.join('|')}|`)
        ].join('\n');
      default:
        return '';
    }
  }

  static generateComplexContent(): string {
    return `# Complex Document Test

This document contains various types of content to test comprehensive parsing.

## Rich Text Formatting

Here we have **bold text**, *italic text*, ***bold and italic***, ~~strikethrough~~, \`inline code\`, and [links](https://example.com).

### Nested Formatting

**Bold with \`code\` inside** and *italic with [link](https://example.com) inside*.

## Lists

### Bulleted Lists
- Item 1
- Item 2
  - Nested item 1
  - Nested item 2
    - Deep nested item

### Numbered Lists
1. First item
2. Second item
   1. Nested numbered
   2. Another nested

### Todo Lists
- [ ] Unchecked task
- [x] Completed task
- [ ] Another task

## Code Blocks

\`\`\`javascript
function complexFunction(param1, param2) {
  const result = param1 + param2;
  console.log(\`Result: \${result}\`);
  return result;
}

// Usage
const value = complexFunction(10, 20);
\`\`\`

\`\`\`python
def complex_function(param1, param2):
    result = param1 + param2
    print(f"Result: {result}")
    return result

# Usage
value = complex_function(10, 20)
\`\`\`

## Tables

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Parsing | ✅ Done | High | Core functionality |
| Testing | 🔄 In Progress | High | Comprehensive coverage |
| Docs | ❌ Todo | Medium | User documentation |

## Callouts

> [!note] Important Note
> This is a note callout with **formatting**.

> [!warning] Warning
> This is a warning callout.

> [!tip] Pro Tip
> This is a tip callout with \`code\`.

## Quotes

> This is a simple quote.
> 
> It can span multiple lines.

> > This is a nested quote.

## Mathematical Expressions

The formula $E = mc^2$ is famous.

Block equation:
$$
\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)
$$

## Media Links

Image: ![Test Image](https://example.com/image.jpg)
Video: https://youtube.com/watch?v=dQw4w9WgXcQ
Audio: https://example.com/audio.mp3

## Dividers

---

## Unicode and Special Characters

Emojis: 🚀 🎯 ✅ ❌ 🔥 💡
Accents: café, naïve, résumé
Math symbols: α β γ δ ∑ ∫ ∞
Arrows: → ← ↑ ↓ ⇒ ⇐

## Edge Cases

Empty lines:



Multiple spaces:    test    with    spaces

Special characters: @#$%^&*()_+-={}[]|\\:";'<>?,./ 

Very long line: ${'a'.repeat(1000)}

## End of Document`;
  }
}

// Utilitaires de validation
export class ValidationUtils {
  static isValidNotionBlock(block: any): boolean {
    return (
      block &&
      typeof block === 'object' &&
      typeof block.type === 'string' &&
      block[block.type] !== undefined
    );
  }

  static hasRichText(block: TestBlock): boolean {
    const richTextPaths = [
      'paragraph.rich_text',
      'heading_1.rich_text',
      'heading_2.rich_text',
      'heading_3.rich_text',
      'callout.rich_text',
      'quote.rich_text'
    ];

    return richTextPaths.some(path => {
      const value = this.getNestedProperty(block, path);
      return Array.isArray(value) && value.length > 0;
    });
  }

  static getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  static countBlocks(blocks: TestBlock[]): Record<string, number> {
    const counts: Record<string, number> = {};
    
    const countRecursive = (blockList: TestBlock[]) => {
      blockList.forEach(block => {
        counts[block.type] = (counts[block.type] || 0) + 1;
        if (block.children) {
          countRecursive(block.children);
        }
      });
    };

    countRecursive(blocks);
    return counts;
  }
}

// Mocks et stubs
export class TestMocks {
  static createMockFile(name: string, type: string, size: number = 1024): File {
    const content = 'x'.repeat(size);
    return new File([content], name, { type, lastModified: Date.now() });
  }

  static createMockFetch(response: any, shouldFail: boolean = false) {
    return jest.fn().mockImplementation(() => {
      if (shouldFail) {
        return Promise.reject(new Error('Mock fetch error'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response))
      });
    });
  }
}

// Assertions personnalisées
export const customMatchers = {
  toBeValidNotionBlock(received: any) {
    const pass = ValidationUtils.isValidNotionBlock(received);
    return {
      message: () => pass 
        ? `expected ${JSON.stringify(received)} not to be a valid Notion block`
        : `expected ${JSON.stringify(received)} to be a valid Notion block`,
      pass
    };
  },

  toHaveRichTextContent(received: any, expected: string) {
    const richText = new TestHelpersImpl()['extractRichText'](received);
    const content = richText.map((rt: any) => rt.text?.content || rt.plain_text || '').join('');
    const pass = content === expected;
    
    return {
      message: () => pass
        ? `expected rich text content not to be "${expected}"`
        : `expected rich text content "${content}" to be "${expected}"`,
      pass
    };
  },

  toHaveBlockTypes(received: TestBlock[], expected: string[]) {
    const actualTypes = received.map(b => b.type);
    const missingTypes = expected.filter(type => !actualTypes.includes(type));
    const pass = missingTypes.length === 0;

    return {
      message: () => pass
        ? `expected blocks not to have types ${expected.join(', ')}`
        : `expected blocks to have types ${expected.join(', ')}, missing: ${missingTypes.join(', ')}`,
      pass
    };
  },

  toBeWithinPerformanceThreshold(received: number, threshold: number) {
    const pass = received <= threshold;
    return {
      message: () => pass
        ? `expected ${received}ms not to be within threshold ${threshold}ms`
        : `expected ${received}ms to be within threshold ${threshold}ms`,
      pass
    };
  }
};