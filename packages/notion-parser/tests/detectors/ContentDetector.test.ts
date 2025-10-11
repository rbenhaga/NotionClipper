import { describe, it, expect } from 'vitest';
import { ContentDetector } from '../../src/detectors/ContentDetector';

describe('ContentDetector', () => {
  const detector = new ContentDetector();

  describe('URL detection', () => {
    it('should detect single URL', () => {
      const result = detector.detect('https://example.com');
      expect(result.type).toBe('url');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect multiple URLs', () => {
      const result = detector.detect('https://example.com https://google.com');
      expect(result.type).toBe('url');
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Code detection', () => {
    it('should detect JavaScript code', () => {
      const code = `
function hello() {
  const message = "Hello World";
  console.log(message);
}
      `;
      const result = detector.detect(code);
      expect(result.type).toBe('code');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Python code', () => {
      const code = `
def hello():
    message = "Hello World"
    print(message)
      `;
      const result = detector.detect(code);
      expect(result.type).toBe('code');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Table detection', () => {
    it('should detect CSV', () => {
      const csv = 'Name,Age,City\nJohn,25,Paris\nJane,30,London';
      const result = detector.detect(csv);
      expect(result.type).toBe('csv');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect TSV', () => {
      const tsv = 'Name\tAge\tCity\nJohn\t25\tParis\nJane\t30\tLondon';
      const result = detector.detect(tsv);
      expect(result.type).toBe('tsv');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect markdown table', () => {
      const table = '| Name | Age |\n|------|-----|\n| John | 25 |\n| Jane | 30 |';
      const result = detector.detect(table);
      expect(result.type).toBe('table');
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('HTML detection', () => {
    it('should detect HTML content', () => {
      const html = '<div><p>Hello <strong>world</strong></p></div>';
      const result = detector.detect(html);
      expect(result.type).toBe('html');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should detect full HTML document', () => {
      const html = `
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><p>Hello world</p></body>
</html>
      `;
      const result = detector.detect(html);
      expect(result.type).toBe('html');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Markdown detection', () => {
    it('should detect markdown headers', () => {
      const markdown = '# Title\n## Subtitle\nSome content';
      const result = detector.detect(markdown);
      expect(result.type).toBe('markdown');
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('should detect markdown with multiple features', () => {
      const markdown = `
# Title
- List item
- Another item

**Bold text** and *italic text*

\`\`\`javascript
console.log("code");
\`\`\`

[Link](https://example.com)
      `;
      const result = detector.detect(markdown);
      expect(result.type).toBe('markdown');
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Text fallback', () => {
    it('should fallback to text for plain content', () => {
      const result = detector.detect('Just some plain text without any special formatting.');
      expect(result.type).toBe('text');
      expect(result.confidence).toBe(1.0);
    });

    it('should return text for empty content', () => {
      const result = detector.detect('');
      expect(result.type).toBe('text');
      expect(result.confidence).toBe(1.0);
    });
  });
});