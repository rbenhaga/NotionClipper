import { describe, it, expect } from 'vitest';
import { parseContent, parseMarkdown, parseCode, parseTable } from '../src';

describe('parseContent', () => {
  it('should parse empty content', () => {
    const result = parseContent('');
    expect(result).toEqual([]);
  });

  it('should parse simple text', () => {
    const result = parseContent('Hello world');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('paragraph');
  });

  it('should auto-detect markdown', () => {
    const result = parseContent('# Hello\n\nThis is **bold** text.');
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('heading_1');
    expect(result[1].type).toBe('paragraph');
  });

  it('should parse with options', () => {
    const result = parseContent('Hello world', {
      color: 'blue_background',
      maxBlocks: 10
    });
    expect(result).toHaveLength(1);
    expect((result[0] as any).paragraph.color).toBe('blue_background');
  });

  it('should return validation results when requested', () => {
    const result = parseContent('# Test', {
      includeValidation: true
    }) as any;
    
    expect(result.blocks).toBeDefined();
    expect(result.validation).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(result.validation.isValid).toBe(true);
  });
});

describe('parseMarkdown', () => {
  it('should parse markdown headers', () => {
    const result = parseMarkdown('# H1\n## H2\n### H3');
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('heading_1');
    expect(result[1].type).toBe('heading_2');
    expect(result[2].type).toBe('heading_3');
  });

  it('should parse markdown lists', () => {
    const result = parseMarkdown('- Item 1\n- Item 2\n1. Numbered 1\n2. Numbered 2');
    expect(result).toHaveLength(4);
    expect(result[0].type).toBe('bulleted_list_item');
    expect(result[2].type).toBe('numbered_list_item');
  });

  it('should parse code blocks', () => {
    const result = parseMarkdown('```javascript\nconsole.log("hello");\n```');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('code');
    expect((result[0] as any).code.language).toBe('javascript');
  });
});

describe('parseCode', () => {
  it('should parse code with specified language', () => {
    const result = parseCode('console.log("hello");', 'javascript');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('code');
    expect((result[0] as any).code.language).toBe('javascript');
  });

  it('should auto-detect language', () => {
    const result = parseCode('def hello():\n    print("hello")');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('code');
    expect((result[0] as any).code.language).toBe('python');
  });
});

describe('parseTable', () => {
  it('should parse CSV table', () => {
    const csv = 'Name,Age\nJohn,25\nJane,30';
    const result = parseTable(csv, 'csv');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('table');
    expect((result[0] as any).table.table_width).toBe(2);
  });

  it('should parse TSV table', () => {
    const tsv = 'Name\tAge\nJohn\t25\nJane\t30';
    const result = parseTable(tsv, 'tsv');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('table');
  });

  it('should parse markdown table', () => {
    const markdown = '| Name | Age |\n|------|-----|\n| John | 25 |\n| Jane | 30 |';
    const result = parseTable(markdown, 'markdown');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('table');
  });
});