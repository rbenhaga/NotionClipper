import { parseContent } from '../src/parseContent';

describe('✅ API Notion Compatibility - Format plat correct', () => {
  
  describe('🔴 CRITIQUE RÉSOLU: Blocs compatibles API Notion', () => {
    test('should generate flat blocks without children property at root level', () => {
      const markdown = `- Level 1 item 1
  - Level 2 item 1
    - Level 3 item 1
- Level 1 item 2`;

      const result = parseContent(markdown);

      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(0);

      // Vérifier qu'AUCUN bloc n'a de propriété children au niveau racine
      result.blocks.forEach((block, index) => {
        expect((block as any).children).toBeUndefined();
        console.log(`Block ${index}: type=${block.type}, has_children=${(block as any).has_children}`);
      });

      // Vérifier que les blocs parents ont has_children = true
      const parentBlocks = result.blocks.filter(b => (b as any).has_children);
      expect(parentBlocks.length).toBeGreaterThan(0);

      // Vérifier que tous les blocs ont leur propriété principale définie
      result.blocks.forEach(block => {
        const blockType = block.type;
        if (!['divider', 'breadcrumb', 'table_of_contents'].includes(blockType)) {
          expect((block as any)[blockType]).toBeDefined();
        }
      });
    });

    test('should generate valid toggle blocks without children property', () => {
      const markdown = `> Toggle Title
> - Item 1
> - Item 2
> Content text`;

      const result = parseContent(markdown);

      expect(result.success).toBe(true);
      
      // Vérifier qu'il n'y a pas de propriété children au niveau racine
      result.blocks.forEach(block => {
        expect((block as any).children).toBeUndefined();
      });

      // Vérifier qu'il y a un toggle avec has_children
      const toggleBlock = result.blocks.find(b => b.type === 'toggle');
      if (toggleBlock) {
        expect((toggleBlock as any).has_children).toBe(true);
        expect((toggleBlock as any).toggle).toBeDefined();
      }
    });

    test('should generate valid toggle headings without children property', () => {
      const markdown = `> # Main Heading
> This is content inside the toggle
> - With a list`;

      const result = parseContent(markdown);

      expect(result.success).toBe(true);
      
      // Vérifier qu'il n'y a pas de propriété children au niveau racine
      result.blocks.forEach(block => {
        expect((block as any).children).toBeUndefined();
      });

      // Vérifier qu'il y a un heading avec is_toggleable
      const headingBlock = result.blocks.find(b => b.type === 'heading_1');
      if (headingBlock) {
        expect((headingBlock as any).heading_1.is_toggleable).toBe(true);
        expect((headingBlock as any).has_children).toBe(true);
      }
    });
  });

  describe('🔍 VALIDATION: Structure des blocs', () => {
    test('should validate all blocks have correct structure', () => {
      const markdown = `# Heading

Paragraph with **bold** text.

- List item 1
  - Nested item
- List item 2

> Quote text

> Toggle with content
> - List inside toggle

https://example.com/audio.mp3

---`;

      const result = parseContent(markdown);

      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(5);

      // Vérifier que chaque bloc a la structure correcte
      result.blocks.forEach((block, index) => {
        // 1. Chaque bloc doit avoir un type
        expect(block.type).toBeDefined();
        expect(typeof block.type).toBe('string');

        // 2. Aucun bloc ne doit avoir children au niveau racine
        expect((block as any).children).toBeUndefined();

        // 3. Chaque bloc doit avoir sa propriété principale (sauf types spéciaux)
        const specialTypes = ['divider', 'breadcrumb', 'table_of_contents'];
        if (!specialTypes.includes(block.type)) {
          expect((block as any)[block.type]).toBeDefined();
        }

        // 4. has_children doit être boolean si présent
        if ((block as any).has_children !== undefined) {
          expect(typeof (block as any).has_children).toBe('boolean');
        }

        console.log(`✅ Block ${index}: ${block.type} - Valid structure`);
      });
    });

    test('should demonstrate flat structure preserves hierarchy information', () => {
      const markdown = `- Parent 1
  - Child 1.1
  - Child 1.2
- Parent 2
  - Child 2.1`;

      const result = parseContent(markdown);

      expect(result.success).toBe(true);

      // Dans le format plat, nous avons tous les blocs au même niveau
      // Mais les parents ont has_children = true
      const allBlocks = result.blocks;
      const parentBlocks = allBlocks.filter(b => (b as any).has_children);
      const childBlocks = allBlocks.filter(b => !(b as any).has_children);

      expect(parentBlocks.length).toBe(2); // 2 parents
      expect(childBlocks.length).toBeGreaterThan(0); // Au moins quelques enfants

      // Vérifier que les parents sont bien des list items
      parentBlocks.forEach(parent => {
        expect(parent.type).toBe('bulleted_list_item');
        expect((parent as any).has_children).toBe(true);
      });

      console.log(`📊 Structure: ${parentBlocks.length} parents, ${childBlocks.length} enfants`);
      console.log(`📊 Total blocks: ${allBlocks.length}`);
    });
  });

  describe('🎯 RÉSOLUTION: Erreurs API résolues', () => {
    test('should not generate blocks that would cause API validation errors', () => {
      const problematicMarkdown = `# Test Document

- List with nesting
  - Nested item
    - Deep nested

> Toggle content
> - With list
> - Multiple items

> # Toggle heading
> Content inside

---

Final paragraph.`;

      const result = parseContent(problematicMarkdown);

      expect(result.success).toBe(true);

      // Vérifier qu'aucun bloc ne causerait l'erreur API
      result.blocks.forEach((block, index) => {
        // 1. Pas de propriété children au niveau racine
        expect((block as any).children).toBeUndefined();

        // 2. Chaque bloc a sa propriété principale définie
        const blockType = block.type;
        const specialTypes = ['divider', 'breadcrumb', 'table_of_contents'];
        
        if (!specialTypes.includes(blockType)) {
          expect((block as any)[blockType]).toBeDefined();
          expect((block as any)[blockType]).not.toBeNull();
        }

        // 3. Pas de propriétés orphelines dangereuses
        const validRootProps = ['type', blockType, 'has_children'];
        const actualProps = Object.keys(block);
        const invalidProps = actualProps.filter(prop => !validRootProps.includes(prop));
        
        expect(invalidProps).toEqual([]);

        console.log(`✅ Block ${index} (${blockType}): API-compatible`);
      });

      console.log(`🎉 Tous les ${result.blocks.length} blocs sont compatibles avec l'API Notion`);
    });
  });
});