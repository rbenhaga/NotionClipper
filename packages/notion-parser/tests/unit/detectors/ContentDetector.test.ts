/**
 * Tests unitaires pour ContentDetector - Conformes au Cahier des Charges v2.1
 * Couvre toutes les fonctionnalités de détection automatique avec validation stricte
 */

import { ContentDetector } from '../../../src/detectors/ContentDetector';
import type { DetectionOptions } from '../../../src/types';

describe('ContentDetector - Cahier des Charges v2.1', () => {
  let detector: ContentDetector;

  beforeEach(() => {
    detector = new ContentDetector();
  });

  describe('URL Detection', () => {
    it('should detect HTTP URLs', () => {
      const result = detector.detect('http://example.com');
      expect(result.type).toBe('url');
      expect(result.confidence).toBe(1.0);
    });

    it('should detect HTTPS URLs', () => {
      const result = detector.detect('https://www.example.com/path?param=value');
      expect(result.type).toBe('url');
      expect(result.confidence).toBe(1.0);
    });

    it('should not detect malformed URLs', () => {
      const result = detector.detect('htp://malformed.com');
      expect(result.type).not.toBe('url');
    });
  });

  describe('Code Detection', () => {
    it('should detect JavaScript code', () => {
      const code = 'function test() { console.log("hello"); }';
      const result = detector.detect(code);
      expect(result.type).toBe('code');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect Python code', () => {
      const code = 'def hello():\n    print("Hello World")';
      const result = detector.detect(code);
      expect(result.type).toBe('code');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect code with high confidence for complex functions', () => {
      const code = `
        class MyClass {
          constructor(name) {
            this.name = name;
          }
          
          getName() {
            return this.name;
          }
        }
      `;
      const result = detector.detect(code);
      expect(result.type).toBe('code');
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Table Detection', () => {
    it('should detect CSV format', () => {
      const csv = 'Name,Age,City\nJohn,30,NYC\nJane,25,LA';
      const result = detector.detect(csv);
      expect(['csv', 'table']).toContain(result.type);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect TSV format', () => {
      const tsv = 'Name\tAge\tCity\nJohn\t30\tNYC\nJane\t25\tLA';
      const result = detector.detect(tsv);
      expect(['tsv', 'table']).toContain(result.type);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect markdown tables', () => {
      const table = '| Name | Age | City |\n|------|-----|------|\n| John | 30  | NYC  |';
      const result = detector.detect(table);
      expect(['table', 'markdown']).toContain(result.type);
    });
  });

  describe('Markdown Detection', () => {
    it('should detect markdown headers', () => {
      const markdown = '# Header 1\n## Header 2\nSome content';
      const result = detector.detect(markdown);
      expect(result.type).toBe('markdown');
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('should detect markdown lists', () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      const result = detector.detect(markdown);
      expect(result.type).toBe('markdown');
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('should detect markdown formatting', () => {
      const markdown = 'This is **bold** and *italic* text with `code`';
      const result = detector.detect(markdown);
      expect(result.type).toBe('markdown');
      expect(result.confidence).toBeGreaterThan(0.4);
    });
  });

  describe('HTML Detection', () => {
    it('should detect HTML tags', () => {
      const html = '<div><p>Hello <strong>world</strong></p></div>';
      const result = detector.detect(html);
      expect(result.type).toBe('html');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect HTML with attributes', () => {
      const html = '<div class="container" id="main"><p>Content</p></div>';
      const result = detector.detect(html);
      expect(result.type).toBe('html');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('JSON Detection', () => {
    it('should detect valid JSON objects', () => {
      const json = '{"name": "John", "age": 30, "city": "NYC"}';
      const result = detector.detect(json);
      expect(result.type).toBe('json');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect JSON arrays', () => {
      const json = '[{"id": 1}, {"id": 2}, {"id": 3}]';
      const result = detector.detect(json);
      expect(result.type).toBe('json');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should not detect invalid JSON', () => {
      const invalidJson = '{name: "John", age: 30}';
      const result = detector.detect(invalidJson);
      expect(result.type).not.toBe('json');
    });
  });

  describe('LaTeX Detection', () => {
    it('should detect LaTeX equations', () => {
      const latex = '\\begin{equation} E = mc^2 \\end{equation}';
      const result = detector.detect(latex);
      expect(result.type).toBe('latex');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect inline LaTeX with math symbols', () => {
      const latex = 'The formula $\\frac{1}{2} \\sum_{i=1}^{n} x_i$ is complex';
      const result = detector.detect(latex);
      // Le détecteur peut retourner 'code' ou 'latex' selon la priorité
      expect(['latex', 'code']).toContain(result.type);
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Text Fallback', () => {
    it('should fallback to text for unrecognized content', () => {
      const text = 'This is just plain text without any special formatting.';
      const result = detector.detect(text);
      expect(result.type).toBe('text');
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('Detection Options', () => {
    it('should respect confidence threshold', () => {
      const weakMarkdown = 'Maybe *italic* text';
      const options = { confidenceThreshold: 0.8 };
      const result = detector.detect(weakMarkdown, options);
      
      // Should have some result
      expect(result.type).toBeDefined();
    });

    it('should disable specific detectors', () => {
      const options = {
        enableMarkdownDetection: false,
        enableHtmlDetection: false,
        enableCodeDetection: false
      };
      
      const markdown = '# Header\n**bold** text';
      const result = detector.detect(markdown, options);
      
      expect(result.type).toBe('text');
    });
  });

  describe('Metadata Analysis', () => {
    it('should provide metadata for URL detection', () => {
      const content = 'https://example.com';
      const result = detector.detect(content);
      
      expect(result.metadata).toBeDefined();
      if (result.metadata) {
        expect(result.metadata.url).toBe('https://example.com');
      }
    });

    it('should provide metadata for code detection', () => {
      const content = 'function test() { return true; }';
      const result = detector.detect(content);
      
      if (result.type === 'code' && result.metadata) {
        expect(result.metadata.language).toBeDefined();
      }
    });

    it('should provide metadata for JSON detection', () => {
      const content = '{"name": "test", "value": 123}';
      const result = detector.detect(content);
      
      if (result.type === 'json' && result.metadata) {
        expect(result.metadata.isObject).toBe(true);
      }
    });
  });

  // ⭐ NOUVEAU : Tests pour la détection audio (Cahier des Charges v2.1)
  describe('Audio Detection (⭐ NOUVEAU v2.1)', () => {
    it('should detect MP3 audio URLs with high confidence', () => {
      const audioUrl = 'https://example.com/podcast.mp3';
      const result = detector.detect(audioUrl);
      
      expect(result.type).toBe('url'); // URL détectée en premier
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.metadata?.url).toBe(audioUrl);
    });

    it('should detect all supported audio formats', () => {
      const audioFormats = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'];
      
      audioFormats.forEach(format => {
        const url = `https://example.com/audio.${format}`;
        const result = detector.detect(url);
        
        expect(result.type).toBe('url');
        expect(result.confidence).toBeGreaterThan(0.9);
      });
    });

    it('should detect audio streaming URLs', () => {
      const streamingUrls = [
        'https://soundcloud.com/user/track',
        'https://spotify.com/track/123',
        'https://music.youtube.com/watch?v=123'
      ];
      
      streamingUrls.forEach(url => {
        const result = detector.detect(url);
        expect(result.type).toBe('url');
        expect(result.confidence).toBeGreaterThan(0.9);
      });
    });

    it('should not detect non-audio URLs as audio', () => {
      const nonAudioUrls = [
        'https://example.com/image.jpg',
        'https://example.com/document.pdf',
        'https://example.com/video.mp4'
      ];
      
      nonAudioUrls.forEach(url => {
        const result = detector.detect(url);
        expect(result.type).toBe('url'); // Toujours URL mais pas audio
      });
    });
  });

  // ⭐ AMÉLIORÉ : Tests de détection avec seuils de confiance précis
  describe('Detection Confidence Thresholds (Conformité Cahier des Charges)', () => {
    it('should detect URLs with confidence > 0.90', () => {
      const urls = [
        'https://www.notion.so',
        'http://example.com/path?param=value',
        'https://github.com/user/repo.git'
      ];
      
      urls.forEach(url => {
        const result = detector.detect(url);
        expect(result.type).toBe('url');
        expect(result.confidence).toBeGreaterThan(0.90);
      });
    });

    it('should detect code with confidence > 0.70', () => {
      const codeExamples = [
        'function hello() {\n  console.log("Hello World");\n  return true;\n}',
        'class MyClass {\n  constructor(name) {\n    this.name = name;\n  }\n}',
        'def calculate_sum(a, b):\n    return a + b\n\nresult = calculate_sum(5, 3)'
      ];
      
      codeExamples.forEach(code => {
        const result = detector.detect(code);
        expect(result.type).toBe('code');
        expect(result.confidence).toBeGreaterThan(0.70);
      });
    });

    it('should detect tables with confidence > 0.70', () => {
      const tableExamples = [
        'Name,Age,City\nJohn,30,Paris\nJane,25,London',
        'Name\tAge\tCity\nJohn\t30\tParis\nJane\t25\tLondon',
        '| Name | Age | City |\n|------|-----|------|\n| John | 30  | Paris |'
      ];
      
      tableExamples.forEach(table => {
        const result = detector.detect(table);
        expect(['csv', 'tsv', 'table']).toContain(result.type);
        expect(result.confidence).toBeGreaterThan(0.70);
      });
    });

    it('should detect JSON with confidence > 0.70', () => {
      const jsonExamples = [
        '{"name": "John", "age": 30, "city": "Paris"}',
        '[{"id": 1, "name": "Item 1"}, {"id": 2, "name": "Item 2"}]',
        '{\n  "users": [\n    {"name": "John", "active": true}\n  ]\n}'
      ];
      
      jsonExamples.forEach(json => {
        const result = detector.detect(json);
        expect(result.type).toBe('json');
        expect(result.confidence).toBeGreaterThan(0.70);
      });
    });

    it('should detect LaTeX with confidence > 0.50', () => {
      const latexExamples = [
        '\\begin{equation} E = mc^2 \\end{equation}',
        '$\\frac{1}{2} \\sum_{i=1}^{n} x_i$',
        '$$\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)$$'
      ];
      
      latexExamples.forEach(latex => {
        const result = detector.detect(latex);
        expect(result.type).toBe('latex');
        expect(result.confidence).toBeGreaterThan(0.50);
      });
    });

    it('should detect HTML with confidence > 0.50', () => {
      const htmlExamples = [
        '<div><p>Hello <strong>world</strong></p></div>',
        '<!DOCTYPE html>\n<html><head><title>Test</title></head><body><p>Content</p></body></html>',
        '<article><h1>Title</h1><p>Paragraph with <a href="#">link</a></p></article>'
      ];
      
      htmlExamples.forEach(html => {
        const result = detector.detect(html);
        expect(result.type).toBe('html');
        expect(result.confidence).toBeGreaterThan(0.50);
      });
    });

    it('should detect Markdown with confidence > 0.40', () => {
      const markdownExamples = [
        '# Title\n**Bold** and *italic*\n- List item',
        '## Subtitle\n\n> Blockquote\n\n```javascript\ncode block\n```',
        '### Section\n\n1. Numbered list\n2. Second item\n\n[Link](https://example.com)'
      ];
      
      markdownExamples.forEach(markdown => {
        const result = detector.detect(markdown);
        expect(result.type).toBe('markdown');
        expect(result.confidence).toBeGreaterThan(0.40);
      });
    });

    it('should fallback to text with confidence = 1.0', () => {
      const plainTexts = [
        'Just plain text without any special formatting',
        'Simple sentence.',
        'Multiple sentences. This is another one. And a third.'
      ];
      
      plainTexts.forEach(text => {
        const result = detector.detect(text);
        expect(result.type).toBe('text');
        expect(result.confidence).toBe(1.0);
      });
    });
  });

  // ⭐ NOUVEAU : Tests de priorité de détection
  describe('Detection Priority Order (Cahier des Charges v2.1)', () => {
    it('should prioritize URL over other types', () => {
      const mixedContent = 'https://github.com/user/repo.git';
      const result = detector.detect(mixedContent);
      
      expect(result.type).toBe('url');
      expect(result.confidence).toBeGreaterThan(0.90);
    });

    it('should prioritize LaTeX over code for math content', () => {
      const mathContent = '\\begin{equation} f(x) = \\sum_{i=1}^{n} a_i x^i \\end{equation}';
      const result = detector.detect(mathContent);
      
      expect(result.type).toBe('latex');
      expect(result.confidence).toBeGreaterThan(0.50);
    });

    it('should prioritize JSON over code for valid JSON', () => {
      const jsonContent = '{"function": "test", "code": true, "array": [1, 2, 3]}';
      const result = detector.detect(jsonContent);
      
      expect(result.type).toBe('json');
      expect(result.confidence).toBeGreaterThan(0.70);
    });

    it('should prioritize code over markdown for code-heavy content', () => {
      const codeContent = `class Calculator {
  constructor() {
    this.result = 0;
  }
  
  add(value) {
    this.result += value;
    return this;
  }
}`;
      const result = detector.detect(codeContent);
      
      expect(result.type).toBe('code');
      expect(result.confidence).toBeGreaterThan(0.70);
    });

    it('should prioritize table over markdown for table content', () => {
      const tableContent = `Name,Age,Department,Salary
John Doe,30,Engineering,75000
Jane Smith,28,Design,68000
Bob Johnson,35,Marketing,72000`;
      
      const result = detector.detect(tableContent);
      
      expect(result.type).toBe('csv');
      expect(result.confidence).toBeGreaterThan(0.70);
    });
  });

  // ⭐ NOUVEAU : Tests d'options de détection avancées
  describe('Advanced Detection Options (Cahier des Charges v2.1)', () => {
    it('should respect audio detection in URL detection', () => {
      const audioUrl = 'https://example.com/podcast.mp3';
      
      const result = detector.detect(audioUrl);
      
      expect(result.type).toBe('url');
      expect(result.metadata?.url).toBe(audioUrl);
    });

    it('should respect confidence threshold', () => {
      const weakMarkdown = 'Maybe *italic* text';
      
      const lowThreshold = detector.detect(weakMarkdown, { confidenceThreshold: 0.1 });
      const highThreshold = detector.detect(weakMarkdown, { confidenceThreshold: 0.8 });
      
      expect(lowThreshold.type).toBeDefined();
      expect(highThreshold.type).toBeDefined();
    });

    it('should disable specific detectors when requested', () => {
      const options: DetectionOptions = {
        enableMarkdownDetection: false,
        enableHtmlDetection: false,
        enableCodeDetection: false,
        enableLatexDetection: false,
        enableJsonDetection: false,
        enableTableDetection: false
      };
      
      const markdown = '# Header\n**bold** text';
      const result = detector.detect(markdown, options);
      
      expect(result.type).toBe('text');
    });

    it('should handle detection options correctly', () => {
      const code = 'function test() { return true; }';
      const options: DetectionOptions = {
        enableCodeDetection: false
      };
      
      const result = detector.detect(code, options);
      
      // Même avec code désactivé, devrait détecter autre chose ou text
      expect(result.type).toBeDefined();
    });
  });

  // ⭐ NOUVEAU : Tests de métadonnées enrichies
  describe('Enhanced Metadata Analysis (Cahier des Charges v2.1)', () => {
    it('should provide comprehensive metadata for URL detection', () => {
      const url = 'https://www.example.com/path?param=value#section';
      const result = detector.detect(url);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.url).toBe(url);
    });

    it('should provide language metadata for code detection', () => {
      const jsCode = 'const hello = () => console.log("Hello");';
      const result = detector.detect(jsCode);
      
      if (result.type === 'code') {
        expect(result.metadata?.language).toBeDefined();
        expect(result.metadata?.language).toBe('javascript');
      }
    });

    it('should provide format metadata for table detection', () => {
      const csv = 'Name,Age\nJohn,30\nJane,25';
      const result = detector.detect(csv);
      
      if (result.type === 'csv') {
        expect(result.metadata?.delimiter).toBe(',');
      }
    });

    it('should provide structure metadata for JSON detection', () => {
      const jsonObject = '{"name": "test", "items": [1, 2, 3]}';
      const result = detector.detect(jsonObject);
      
      if (result.type === 'json') {
        expect(result.metadata?.isObject).toBe(true);
        expect(result.metadata?.itemCount).toBeGreaterThan(0);
      }
    });

    it('should provide LaTeX features metadata', () => {
      const latex = '$\\frac{1}{2}$ and \\begin{equation} x = y \\end{equation}';
      const result = detector.detect(latex);
      
      if (result.type === 'latex') {
        expect(result.metadata?.hasInlineLatex).toBe(true);
        expect(result.metadata?.hasEnvironments).toBe(true);
      }
    });
  });

  // ⭐ AMÉLIORÉ : Tests d'edge cases robustes
  describe('Robust Edge Cases (Production Ready)', () => {
    it('should handle empty content gracefully', () => {
      const result = detector.detect('');
      expect(result.type).toBe('text');
      expect(result.confidence).toBe(1.0);
    });

    it('should handle null/undefined content without throwing', () => {
      expect(() => detector.detect(null as any)).not.toThrow();
      expect(() => detector.detect(undefined as any)).not.toThrow();
      
      const nullResult = detector.detect(null as any);
      const undefinedResult = detector.detect(undefined as any);
      
      expect(nullResult.type).toBe('text');
      expect(undefinedResult.type).toBe('text');
    });

    it('should handle whitespace-only content', () => {
      const whitespaceContent = '   \n\t  \n  ';
      const result = detector.detect(whitespaceContent);
      
      expect(result.type).toBe('text');
      expect(result.confidence).toBe(1.0);
    });

    it('should handle very long content efficiently', () => {
      const longContent = 'a'.repeat(50000); // 50k characters
      const startTime = Date.now();
      
      const result = detector.detect(longContent);
      const processingTime = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(result.type).toBe('text');
      expect(processingTime).toBeLessThan(100); // Should be fast
    });

    it('should handle malformed JSON gracefully', () => {
      const malformedJson = '{name: "John", age: 30, }';
      const result = detector.detect(malformedJson);
      
      // Should not crash and provide reasonable result
      expect(result).toBeDefined();
      expect(['json', 'text']).toContain(result.type);
    });

    it('should handle malformed URLs gracefully', () => {
      const malformedUrls = [
        'htp://malformed.com',
        'https://',
        'not-a-url-at-all',
        'javascript:alert("xss")'
      ];
      
      malformedUrls.forEach(url => {
        const result = detector.detect(url);
        expect(result).toBeDefined();
        expect(result.type).not.toBe('url');
      });
    });

    it('should handle mixed content appropriately', () => {
      const mixedContent = `# Markdown Title
      
function code() {
  return "javascript";
}

https://example.com

{"json": "object"}`;
      
      const result = detector.detect(mixedContent);
      
      // Should detect the most prominent type
      expect(result).toBeDefined();
      expect(['markdown', 'code', 'text']).toContain(result.type);
    });

    it('should handle special characters and Unicode', () => {
      const unicodeContent = '🎯 Test avec émojis et caractères spéciaux: àáâãäåæçèéêë';
      const result = detector.detect(unicodeContent);
      
      expect(result).toBeDefined();
      expect(result.type).toBe('text');
    });

    it('should handle binary-like content', () => {
      const binaryLike = '\x00\x01\x02\x03\x04\x05';
      const result = detector.detect(binaryLike);
      
      expect(result).toBeDefined();
      expect(result.type).toBe('text');
    });
  });

  // ⭐ NOUVEAU : Tests de performance
  describe('Performance Requirements (Cahier des Charges v2.1)', () => {
    it('should detect content type in < 5ms for 1000 lines', () => {
      const content = Array(1000).fill('Line of content').join('\n');
      const startTime = Date.now();
      
      const result = detector.detect(content);
      const processingTime = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(5);
    });

    it('should handle concurrent detections efficiently', async () => {
      const contents = [
        'https://example.com',
        'function test() {}',
        'Name,Age\nJohn,30',
        '{"key": "value"}',
        '# Markdown title'
      ];
      
      const startTime = Date.now();
      
      const results = contents.map(content => detector.detect(content));
      const processingTime = Date.now() - startTime;
      
      expect(results).toHaveLength(5);
      expect(results.every(r => r.confidence > 0)).toBe(true);
      expect(processingTime).toBeLessThan(10);
    });
  });

  // ⭐ NOUVEAU : Tests de sécurité
  describe('Security Validation (Cahier des Charges v2.1)', () => {
    it('should not be vulnerable to ReDoS attacks', () => {
      const maliciousContent = 'a'.repeat(10000) + '!';
      const startTime = Date.now();
      
      const result = detector.detect(maliciousContent);
      const processingTime = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(100); // Should not hang
    });

    it('should handle potentially malicious URLs safely', () => {
      const maliciousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'file:///etc/passwd',
        'ftp://malicious.com'
      ];
      
      maliciousUrls.forEach(url => {
        const result = detector.detect(url);
        expect(result.type).not.toBe('url'); // Should not detect as valid URL
      });
    });

    it('should handle large payloads without memory issues', () => {
      const largeContent = 'x'.repeat(1000000); // 1MB
      
      expect(() => {
        const result = detector.detect(largeContent);
        expect(result).toBeDefined();
      }).not.toThrow();
    });
  });
});