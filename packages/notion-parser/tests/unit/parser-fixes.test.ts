/**
 * Tests unitaires pour les corrections du parser
 */

import { parseContent } from '../../src/parseContent';
import { NotionValidator } from '../../src/validators/NotionValidator';
import type { NotionBlock } from '../../src/types';

describe('Parser Fixes', () => {
  let validator: NotionValidator;

  beforeEach(() => {
    validator = new NotionValidator();
  });

  describe('Block Structure Validation', () => {
    test('should have correct type property for all blocks', () => {
      const content = `# Heading

Paragraph with **bold** text.

- List item
  - Nested item

> Toggle content
> More content

> [!NOTE]
> Callout content

\`\`\`javascript
console.log('code');
\`\`\`

---

| Col1 | Col2 |
|------|------|
| A    | B    |`;

      const result = parseContent(content, { contentType: 'markdown' });
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);

      result.blocks.forEach((block, index) => {
        // Chaque bloc doit avoir un type
        expect(block.type).toBeDefined();
        expect(typeof block.type).toBe('string');

        // Chaque bloc doit avoir la propriété correspondante à son type
        const typeProperty = (block as any)[block.type];
        expect(typeProperty).toBeDefined();
        
        console.log(`Bloc ${index}: ${block.type} - Property exists: ${!!typeProperty}`);
      });
    });

    test('should handle children blocks correctly', () => {
      const content = `- Parent item
  - Child item
    - Grandchild item

> Toggle parent
> Child content
> More child content`;

      const result = parseContent(content, { contentType: 'markdown' });
      
      expect(result.success).toBe(true);

      const blocksWithChildren = result.blocks.filter(block => 
        'children' in block && Array.isArray((block as any).children)
      );

      blocksWithChildren.forEach((block, index) => {
        const children = (block as any).children;
        const hasChildrenFlag = (block as any).has_children;

        expect(children).toBeDefined();
        expect(Array.isArray(children)).toBe(true);
        expect(hasChildrenFlag).toBe(true);
        
        console.log(`Bloc avec children ${index}: ${block.type} - Children: ${children.length}, Flag: ${hasChildrenFlag}`);
      });
    });

    test('should create valid divider blocks', () => {
      const content = `Text before

---

Text after

***

More text

___

Final text`;

      const result = parseContent(content, { contentType: 'markdown' });
      
      expect(result.success).toBe(true);

      const dividers = result.blocks.filter(block => block.type === 'divider');
      expect(dividers.length).toBeGreaterThan(0);

      dividers.forEach((divider, index) => {
        expect(divider.type).toBe('divider');
        expect((divider as any).divider).toBeDefined();
        expect(typeof (divider as any).divider).toBe('object');
        expect(Object.keys((divider as any).divider)).toHaveLength(0);
        
        console.log(`Divider ${index}: Valid structure`);
      });
    });
  });

  describe('Notion API Validation', () => {
    test('should pass Notion API validation', () => {
      const content = `# Test Document

This is a **paragraph** with *formatting*.

- List item 1
- List item 2
  - Nested item

> [!INFO]
> This is a callout

\`\`\`typescript
const test = 'code block';
\`\`\`

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |

---

> Toggle block
> With content`;

      const result = parseContent(content, { 
        contentType: 'markdown',
        skipValidation: false,
        includeValidation: true
      });
      
      expect(result.success).toBe(true);
      expect(result.validation).toBeDefined();
      
      if (result.validation) {
        expect(result.validation.isValid).toBe(true);
        expect(result.validation.errors).toHaveLength(0);
        
        console.log(`Validation passed: ${result.validation.isValid}`);
        console.log(`Errors: ${result.validation.errors.length}`);
        console.log(`Warnings: ${result.validation.warnings.length}`);
      }
    });

    test('should simulate Notion API block validation', () => {
      const content = `# Test

Text content

---

> Toggle
> Content`;

      const result = parseContent(content, { contentType: 'markdown' });
      
      expect(result.success).toBe(true);

      // Simuler la validation de l'API Notion
      const apiValidationErrors: string[] = [];

      result.blocks.forEach((block, index) => {
        // Vérifier que la propriété du type existe
        const typeProperty = (block as any)[block.type];
        if (!typeProperty) {
          apiValidationErrors.push(`Block ${index}: ${block.type} property should be defined, instead was undefined`);
        }

        // Vérifier les children
        if ('children' in block && (block as any).children) {
          if (!('has_children' in block)) {
            apiValidationErrors.push(`Block ${index}: children should not be present without has_children`);
          }
        }

        // Vérifications spécifiques par type
        switch (block.type) {
          case 'divider':
            if (!(block as any).divider) {
              apiValidationErrors.push(`Block ${index}: divider should be defined`);
            }
            break;
          case 'paragraph':
            if (!(block as any).paragraph?.rich_text) {
              apiValidationErrors.push(`Block ${index}: paragraph.rich_text should be defined`);
            }
            break;
        }
      });

      expect(apiValidationErrors).toHaveLength(0);
      
      if (apiValidationErrors.length > 0) {
        console.log('API Validation Errors:');
        apiValidationErrors.forEach(error => console.log(`  - ${error}`));
      } else {
        console.log('✅ All blocks would pass Notion API validation');
      }
    });
  });

  describe('Complex Content Parsing', () => {
    test('should handle nested structures correctly', () => {
      const content = `# Main Title

## Section with Lists

1. First numbered item
   - Nested bullet
     - Deep nested bullet
   - Back to level 2
2. Second numbered item

## Section with Toggles

> Main toggle
> Content line 1
> Content line 2

> [!WARNING]
> Important callout
> With multiple lines

## Section with Mixed Content

Text with **bold** and *italic* and \`code\`.

| Table | Header |
|-------|--------|
| Cell  | Data   |

---

Final paragraph.`;

      const result = parseContent(content, { 
        contentType: 'markdown',
        conversion: {
          preserveFormatting: true,
          convertLinks: true
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(10);

      // Vérifier que tous les blocs sont valides
      result.blocks.forEach((block, index) => {
        expect(block.type).toBeDefined();
        expect((block as any)[block.type]).toBeDefined();
        
        if ('children' in block && (block as any).children) {
          expect((block as any).has_children).toBe(true);
        }
      });

      console.log(`Complex content parsed into ${result.blocks.length} blocks`);
    });

    test('should handle edge cases', () => {
      const content = `# Title

Empty lines:



Multiple dividers:

---
***
___

Empty list:
- 

Empty toggle:
> 

Empty callout:
> [!NOTE]
> 

Code with no language:
\`\`\`
plain code
\`\`\`

Table with empty cells:
| A |   | C |
|---|---|---|
|   | B |   |`;

      const result = parseContent(content, { contentType: 'markdown' });
      
      expect(result.success).toBe(true);
      
      // Tous les blocs doivent être valides même avec du contenu edge case
      result.blocks.forEach((block, index) => {
        expect(block.type).toBeDefined();
        expect((block as any)[block.type]).toBeDefined();
      });

      console.log(`Edge cases handled: ${result.blocks.length} blocks generated`);
    });
  });

  describe('Performance and Limits', () => {
    test('should handle large content efficiently', () => {
      // Générer du contenu volumineux
      const sections = [];
      for (let i = 1; i <= 50; i++) {
        sections.push(`## Section ${i}

This is paragraph ${i} with some **bold** text and *italic* text.

- List item ${i}.1
- List item ${i}.2
  - Nested item ${i}.2.1

> Toggle ${i}
> Content for toggle ${i}

---`);
      }
      
      const largeContent = `# Large Document\n\n${sections.join('\n\n')}`;
      
      const startTime = Date.now();
      const result = parseContent(largeContent, { contentType: 'markdown' });
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(100);
      
      const processingTime = endTime - startTime;
      console.log(`Large content (${largeContent.length} chars) processed in ${processingTime}ms`);
      console.log(`Generated ${result.blocks.length} blocks`);
      
      // Le traitement ne devrait pas prendre plus de 1 seconde
      expect(processingTime).toBeLessThan(1000);
    });
  });
});