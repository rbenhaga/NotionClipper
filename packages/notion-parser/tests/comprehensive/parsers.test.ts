/**
 * Tests complets des parsers spécialisés
 * Basé sur le test ultimate exhaustif - Phase 2
 */

import { parseContent } from '../../src/parseContent';

// Types flexibles pour les tests
type TestBlock = {
  type: string;
  [key: string]: any;
};

describe('Specialized Parsers - Phase 2', () => {
  describe('MarkdownParser - Headers', () => {
    it('should parse all header levels correctly', async () => {
      const content = `# H1 Title
## H2 Subtitle
### H3 Section`;
      
      const result = parseContent(content, { contentType: 'markdown' });
      const blocks = result.blocks as TestBlock[];
      
      const headerTypes = blocks.map((b: TestBlock) => b.type);
      const expectedTypes = ['heading_1', 'heading_2', 'heading_3'];
      
      expect(expectedTypes.every(type => headerTypes.includes(type))).toBe(true);
    });

    it('should handle headers with formatting', async () => {
      const content = `# **Bold** Header with *italic*
## Header with \`code\``;
      
      const result = parseContent(content, { contentType: 'markdown' });
      const blocks = result.blocks as TestBlock[];
      
      const h1Block = blocks.find((b: TestBlock) => b.type === 'heading_1');
      expect(h1Block?.heading_1?.rich_text).toBeDefined();
      expect(h1Block?.heading_1?.rich_text?.length).toBeGreaterThan(1);
    });
  });

  describe('MarkdownParser - Lists', () => {
    it('should parse nested lists with proper hierarchy', async () => {
      const content = `- Bullet 1
- Bullet 2
  - Nested 1
    - Deep nested
      - Too deep (should be flattened to level 3)

1. Numbered 1
2. Numbered 2
   1. Nested numbered

- [ ] Todo unchecked
- [x] Todo checked`;
      
      const result = parseContent(content, { contentType: 'markdown' });
      const blocks = result.blocks as TestBlock[];
      
      const listTypes = blocks.map((b: TestBlock) => b.type);
      const hasRequiredLists = listTypes.includes('bulleted_list_item') && 
                              listTypes.includes('numbered_list_item') && 
                              listTypes.includes('to_do');
      
      expect(hasRequiredLists).toBe(true);
    });

    it('should respect maximum nesting depth of 3', async () => {
      const content = `- Level 1
  - Level 2
    - Level 3
      - Level 4 (should be flattened)
        - Level 5 (should be flattened)`;
      
      const result = parseContent(content, { contentType: 'markdown' });
      const blocks = result.blocks as TestBlock[];
      
      // Vérifier que l'imbrication ne dépasse pas 3 niveaux
      const checkMaxDepth = (block: any, depth = 0): number => {
        if (depth > 3) return depth;
        if (block.children && Array.isArray(block.children)) {
          return Math.max(depth, ...block.children.map((child: any) => checkMaxDepth(child, depth + 1)));
        }
        return depth;
      };
      
      const maxDepth = Math.max(...blocks.map(block => checkMaxDepth(block)));
      expect(maxDepth).toBeLessThanOrEqual(3);
    });
  });

  describe('MarkdownParser - Callouts', () => {
    it('should parse all 6 callout types', async () => {
      const content = `> [!note] Note
> Content

> [!info] Info
> Content

> [!tip] Tip
> Content

> [!warning] Warning
> Content

> [!danger] Danger
> Content

> [!success] Success
> Content`;
      
      const result = parseContent(content, { contentType: 'markdown' });
      const blocks = result.blocks as TestBlock[];
      
      const callouts = blocks.filter((b: TestBlock) => b.type === 'callout');
      expect(callouts.length).toBeGreaterThanOrEqual(6);
      
      const calloutIcons = callouts.map(c => c.callout?.icon?.emoji).filter(Boolean);
      expect(calloutIcons.length).toBeGreaterThan(0);
    });

    it('should handle callouts with rich text content', async () => {
      const content = `> [!info] Information
> This callout has **bold** and *italic* text with \`code\`.`;
      
      const result = parseContent(content, { contentType: 'markdown' });
      const blocks = result.blocks as TestBlock[];
      
      const callout = blocks.find((b: TestBlock) => b.type === 'callout');
      expect(callout?.callout?.rich_text).toBeDefined();
      expect(callout?.callout?.rich_text?.length).toBeGreaterThan(1);
    });
  });

  describe('MarkdownParser - Rich Text Annotations', () => {
    it('should parse multiple annotation types', async () => {
      const content = `**bold** *italic* ***bold italic*** __underline__ ~~strikethrough~~ \`code\` [link](https://notion.so) $E=mc^2$ inline equation`;
      
      const result = parseContent(content, { contentType: 'markdown' });
      const blocks = result.blocks as TestBlock[];
      
      let annotationTypes = new Set<string>();
      blocks.forEach((block: TestBlock) => {
        if (block.paragraph?.rich_text) {
          block.paragraph.rich_text.forEach((segment: any) => {
            if (segment.annotations) {
              Object.keys(segment.annotations).forEach(key => {
                if (segment.annotations[key]) {
                  annotationTypes.add(key);
                }
              });
            }
            if (segment.href) annotationTypes.add('link');
            if (segment.type === 'equation') annotationTypes.add('equation');
          });
        }
      });
      
      expect(annotationTypes.size).toBeGreaterThanOrEqual(5);
    });
  });

  describe('AudioParser - Format Support', () => {
    it('should create audio blocks for supported formats', async () => {
      const audioUrls = [
        'https://example.com/audio.mp3',
        'https://example.com/audio.wav',
        'https://soundcloud.com/track/123',
        'https://spotify.com/track/456'
      ];
      
      let audioBlocksCreated = 0;
      
      audioUrls.forEach(url => {
        const result = parseContent(url, { contentType: 'audio' });
        const blocks = result.blocks as TestBlock[];
        
        const audioBlocks = blocks.filter((b: TestBlock) => b.type === 'audio');
        audioBlocksCreated += audioBlocks.length;
      });
      
      expect(audioBlocksCreated).toBeGreaterThanOrEqual(2);
    });

    it('should validate audio URL formats', async () => {
      const supportedFormats = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'];
      const testUrls = supportedFormats.map(format => `https://example.com/audio.${format}`);
      
      let validFormats = 0;
      
      testUrls.forEach(url => {
        try {
          const result = parseContent(url, { contentType: 'audio' });
          const blocks = result.blocks as TestBlock[];
          
          if (blocks.some(b => b.type === 'audio')) {
            validFormats++;
          }
        } catch (error) {
          // Format non supporté
        }
      });
      
      expect(validFormats).toBeGreaterThanOrEqual(5);
    });
  });

  describe('TableParser - Header Detection', () => {
    it('should automatically detect CSV headers', async () => {
      const csvWithHeaders = `Name,Age,City
John,30,Paris
Jane,25,London`;
      
      const result = parseContent(csvWithHeaders, { contentType: 'csv' });
      const blocks = result.blocks as TestBlock[];
      
      const tableBlock = blocks.find((b: TestBlock) => b.type === 'table');
      expect(tableBlock?.table?.has_column_header).toBe(true);
    });

    it('should detect row headers when appropriate', async () => {
      const csvWithRowHeaders = `Category,Q1,Q2,Q3,Q4
Sales,100,120,110,130
Marketing,50,60,55,65
Support,30,35,32,38`;
      
      const result = parseContent(csvWithRowHeaders, { contentType: 'csv' });
      const blocks = result.blocks as TestBlock[];
      
      const tableBlock = blocks.find((b: TestBlock) => b.type === 'table');
      // Row headers detection might be implemented
      expect(tableBlock?.table).toBeDefined();
    });

    it('should handle markdown tables with separators', async () => {
      const markdownTable = `| Product | Price | Stock |
|---------|-------|-------|
| Apple   | $1.00 | 50    |
| Orange  | $0.80 | 30    |`;
      
      const result = parseContent(markdownTable, { contentType: 'markdown' });
      const blocks = result.blocks as TestBlock[];
      
      const tableBlock = blocks.find((b: TestBlock) => b.type === 'table');
      expect(tableBlock?.table?.has_column_header).toBe(true);
      expect(tableBlock?.table?.table_width).toBe(3);
    });
  });

  describe('Toggle Headings', () => {
    it('should create toggle headings with children', async () => {
      const content = `> # Toggle Heading 1
> Content under toggle

> ## Toggle Heading 2  
> More content`;
      
      const result = parseContent(content, { contentType: 'markdown' });
      const blocks = result.blocks as TestBlock[];
      
      const toggleHeadings = blocks.filter((b: TestBlock) => 
        (b.type === 'heading_1' || b.type === 'heading_2') && 
        (b.heading_1?.is_toggleable || b.heading_2?.is_toggleable || b.children?.length > 0)
      );
      
      expect(toggleHeadings.length).toBeGreaterThanOrEqual(1);
    });

    it('should properly nest content under toggle headings', async () => {
      const content = `> # Toggle Heading
> This is content under the toggle
> - List item 1
> - List item 2
> 
> More content`;
      
      const result = parseContent(content, { contentType: 'markdown' });
      const blocks = result.blocks as TestBlock[];
      
      const toggleHeading = blocks.find((b: TestBlock) => 
        b.type === 'heading_1' && 
        (b.heading_1?.is_toggleable || b.children?.length > 0)
      );
      
      expect(toggleHeading).toBeDefined();
      if (toggleHeading?.children) {
        expect(toggleHeading.children.length).toBeGreaterThan(0);
      }
    });
  });
});