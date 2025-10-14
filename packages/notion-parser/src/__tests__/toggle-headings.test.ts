import { parseContent } from '../parseContent';

describe('Toggle Headings', () => {
  test('should parse H1 toggle heading with content', () => {
    const markdown = `
> # My Toggle Heading
  Content line 1
  Content line 2
`.trim();

    const result = parseContent(markdown);

    console.log('Result blocks:', JSON.stringify(result.blocks, null, 2));

    expect(result.success).toBe(true);
    expect(result.blocks).toHaveLength(3); // Heading + 2 paragraphs

    // Vérifier le heading
    const heading = result.blocks[0];
    expect(heading.type).toBe('heading_1');
    expect((heading as any).heading_1).toBeDefined();
    expect((heading as any).heading_1.is_toggleable).toBe(true);
    expect((heading as any).has_children).toBe(true);

    // Vérifier les enfants (structure plate)
    expect(result.blocks[1].type).toBe('paragraph');
    expect(result.blocks[2].type).toBe('paragraph');
  });

  test('should parse H2 toggle heading with lists', () => {
    const markdown = `
> ## Configuration
  - Option 1
  - Option 2
`.trim();

    const result = parseContent(markdown);

    expect(result.success).toBe(true);

    const heading = result.blocks[0];
    expect(heading.type).toBe('heading_2');
    expect((heading as any).heading_2.is_toggleable).toBe(true);
    expect((heading as any).has_children).toBe(true);

    // Les listes doivent être au même niveau (structure plate)
    expect(result.blocks[1].type).toBe('bulleted_list_item');
    expect(result.blocks[2].type).toBe('bulleted_list_item');
  });

  test('should parse H3 toggle heading with nested content', () => {
    const markdown = `
> ### Details
  Some text

  > [!NOTE]
  > Important note
`.trim();

    const result = parseContent(markdown);

    expect(result.success).toBe(true);

    const heading = result.blocks[0];
    expect(heading.type).toBe('heading_3');
    expect((heading as any).heading_3.is_toggleable).toBe(true);
    expect((heading as any).has_children).toBe(true);
  });

  test('should handle nested toggle headings', () => {
    const markdown = `
> # Parent Heading
  Parent content

  > ## Child Heading
    Child content
`.trim();

    const result = parseContent(markdown);

    expect(result.success).toBe(true);

    // Structure plate: tous les blocs au même niveau
    const h1 = result.blocks.find(b => b.type === 'heading_1');
    const h2 = result.blocks.find(b => b.type === 'heading_2');

    expect(h1).toBeDefined();
    expect((h1 as any).heading_1.is_toggleable).toBe(true);

    expect(h2).toBeDefined();
    expect((h2 as any).heading_2.is_toggleable).toBe(true);
  });

  test('should not add is_toggleable to regular headings', () => {
    const markdown = `
# Regular Heading

Content below
`.trim();

    const result = parseContent(markdown);

    expect(result.success).toBe(true);

    const heading = result.blocks[0];
    expect(heading.type).toBe('heading_1');
    expect((heading as any).heading_1.is_toggleable).toBeUndefined();
  });
});