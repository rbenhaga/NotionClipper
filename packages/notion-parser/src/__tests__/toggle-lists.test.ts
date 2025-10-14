import { parseContent } from '../parseContent';

describe('Toggle Lists', () => {
  test('should parse bulleted toggle list', () => {
    const markdown = `
> - First toggle item
> - Second toggle item
> - Third toggle item
`.trim();

    const result = parseContent(markdown);

    console.log('Result blocks:', JSON.stringify(result.blocks, null, 2));

    expect(result.success).toBe(true);
    expect(result.blocks).toHaveLength(3);

    for (const block of result.blocks) {
      expect(block.type).toBe('bulleted_list_item');
      expect((block as any).bulleted_list_item).toBeDefined();
      expect((block as any).bulleted_list_item.is_toggleable).toBe(true);
    }
  });

  test('should parse numbered toggle list', () => {
    const markdown = `
> 1. First toggle item
> 2. Second toggle item
> 3. Third toggle item
`.trim();

    const result = parseContent(markdown);

    expect(result.success).toBe(true);
    expect(result.blocks).toHaveLength(3);

    for (const block of result.blocks) {
      expect(block.type).toBe('numbered_list_item');
      expect((block as any).numbered_list_item).toBeDefined();
      expect((block as any).numbered_list_item.is_toggleable).toBe(true);
    }
  });

  test('should parse todo toggle list', () => {
    const markdown = `
> - [ ] Unchecked toggle task
> - [x] Checked toggle task
`.trim();

    const result = parseContent(markdown);

    expect(result.success).toBe(true);
    expect(result.blocks).toHaveLength(2);

    expect(result.blocks[0].type).toBe('to_do');
    expect((result.blocks[0] as any).to_do.is_toggleable).toBe(true);
    expect((result.blocks[0] as any).to_do.checked).toBe(false);

    expect(result.blocks[1].type).toBe('to_do');
    expect((result.blocks[1] as any).to_do.is_toggleable).toBe(true);
    expect((result.blocks[1] as any).to_do.checked).toBe(true);
  });

  test('should parse nested toggle lists', () => {
    const markdown = `
> - Parent item
>     - Child item 1
>     - Child item 2
> - Another parent
`.trim();

    const result = parseContent(markdown);

    expect(result.success).toBe(true);

    // Structure plate: tous les items au même niveau
    expect(result.blocks).toHaveLength(4);

    // Vérifier le parent
    expect((result.blocks[0] as any).bulleted_list_item.is_toggleable).toBe(true);
    expect((result.blocks[0] as any).has_children).toBe(true);

    // Vérifier les enfants
    expect((result.blocks[1] as any).bulleted_list_item.is_toggleable).toBe(true);
    expect((result.blocks[2] as any).bulleted_list_item.is_toggleable).toBe(true);

    // Vérifier le second parent
    expect((result.blocks[3] as any).bulleted_list_item.is_toggleable).toBe(true);
  });

  test('should distinguish toggle lists from normal lists', () => {
    const markdown = `
- Normal list item
- Another normal item

> - Toggle list item
> - Another toggle item
`.trim();

    const result = parseContent(markdown);

    expect(result.success).toBe(true);
    expect(result.blocks).toHaveLength(4);

    // Vérifier les listes normales
    expect((result.blocks[0] as any).bulleted_list_item.is_toggleable).toBeUndefined();
    expect((result.blocks[1] as any).bulleted_list_item.is_toggleable).toBeUndefined();

    // Vérifier les toggle lists
    expect((result.blocks[2] as any).bulleted_list_item.is_toggleable).toBe(true);
    expect((result.blocks[3] as any).bulleted_list_item.is_toggleable).toBe(true);
  });

  test('should handle mixed list types', () => {
    const markdown = `
> - Bulleted toggle
> 1. Numbered toggle
> - [ ] Todo toggle
`.trim();

    const result = parseContent(markdown);

    expect(result.success).toBe(true);
    expect(result.blocks).toHaveLength(3);

    expect(result.blocks[0].type).toBe('bulleted_list_item');
    expect((result.blocks[0] as any).bulleted_list_item.is_toggleable).toBe(true);

    expect(result.blocks[1].type).toBe('numbered_list_item');
    expect((result.blocks[1] as any).numbered_list_item.is_toggleable).toBe(true);

    expect(result.blocks[2].type).toBe('to_do');
    expect((result.blocks[2] as any).to_do.is_toggleable).toBe(true);
  });
});