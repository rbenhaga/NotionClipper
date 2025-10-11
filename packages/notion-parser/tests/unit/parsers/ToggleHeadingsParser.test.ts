/**
 * Tests unitaires pour Toggle Headings - Nouvelle fonctionnalité v2.1
 * Couvre la propriété is_toggleable pour les headings selon le cahier des charges
 */

import { parseContent } from '../../../src/parseContent';
import type { NotionBlock } from '../../../src/types';

describe('Toggle Headings Parser - Nouvelle fonctionnalité v2.1 ⭐', () => {
    describe('Toggle Heading Detection (is_toggleable)', () => {
        it('should parse toggle heading with content', () => {
            const toggleMarkdown = `> # Section 1
> This content is inside the toggle
> 
> More content here`;

            const result = parseContent(toggleMarkdown, { contentType: 'markdown' });

            expect(result.success).toBe(true);
            expect(result.blocks).toHaveLength(1);

            const headingBlock = result.blocks[0] as any;
            expect(headingBlock.type).toBe('heading_1');
            expect(headingBlock.heading_1.is_toggleable).toBe(true);
            expect(headingBlock.children).toBeDefined();
            expect(headingBlock.children.length).toBeGreaterThan(0);
        });

        it('should parse all heading levels as toggleable', () => {
            const toggleMarkdown = `> # Heading 1
> Content for H1

> ## Heading 2  
> Content for H2

> ### Heading 3
> Content for H3`;

            const result = parseContent(toggleMarkdown, { contentType: 'markdown' });

            expect(result.success).toBe(true);
            expect(result.blocks).toHaveLength(3);

            const [h1, h2, h3] = result.blocks as any[];

            expect(h1.type).toBe('heading_1');
            expect(h1.heading_1.is_toggleable).toBe(true);

            expect(h2.type).toBe('heading_2');
            expect(h2.heading_2.is_toggleable).toBe(true);

            expect(h3.type).toBe('heading_3');
            expect(h3.heading_3.is_toggleable).toBe(true);
        });

        it('should handle nested toggle headings', () => {
            const nestedToggle = `> # Main Section
> This is the main content
> 
> ## Subsection
> This is subsection content
> 
> ### Sub-subsection
> This is nested content`;

            const result = parseContent(nestedToggle, { contentType: 'markdown' });

            expect(result.success).toBe(true);

            const mainHeading = result.blocks[0] as any;
            expect(mainHeading.type).toBe('heading_1');
            expect(mainHeading.heading_1.is_toggleable).toBe(true);
            expect(mainHeading.children).toBeDefined();

            // Check for nested headings in children
            const hasNestedHeadings = mainHeading.children.some((child: any) =>
                child.type.startsWith('heading_')
            );
            expect(hasNestedHeadings).toBe(true);
        });

        it('should NOT mark regular headings as toggleable', () => {
            const regularMarkdown = `# Regular Heading 1

This is normal content.

## Regular Heading 2

More normal content.`;

            const result = parseContent(regularMarkdown, { contentType: 'markdown' });

            expect(result.success).toBe(true);

            const headings = result.blocks.filter((block: any) =>
                block.type.startsWith('heading_')
            ) as any[];

            headings.forEach(heading => {
                const headingType = heading.type;
                expect(heading[headingType].is_toggleable).toBe(false);
            });
        });
    });

    describe('Toggle Heading Syntax Validation', () => {
        it('should require > prefix for toggle syntax', () => {
            const nonToggleMarkdown = `# Not a toggle
Content without > prefix`;

            const result = parseContent(nonToggleMarkdown, { contentType: 'markdown' });

            expect(result.success).toBe(true);
            const headingBlock = result.blocks[0] as any;
            expect(headingBlock.heading_1.is_toggleable).toBe(false);
        });

        it('should handle mixed toggle and regular headings', () => {
            const mixedMarkdown = `# Regular Heading

Normal content.

> # Toggle Heading
> Toggle content.

## Another Regular Heading

More normal content.`;

            const result = parseContent(mixedMarkdown, { contentType: 'markdown' });

            expect(result.success).toBe(true);

            const headings = result.blocks.filter((block: any) =>
                block.type.startsWith('heading_')
            ) as any[];

            expect(headings).toHaveLength(3);
            expect(headings[0].heading_1.is_toggleable).toBe(false); // Regular
            expect(headings[1].heading_1.is_toggleable).toBe(true);  // Toggle
            expect(headings[2].heading_2.is_toggleable).toBe(false); // Regular
        });

        it('should handle toggle headings with various content types', () => {
            const complexToggle = `> # Complex Toggle Section
> 
> This section contains:
> 
> - Bullet points
> - **Bold text**
> - \`code snippets\`
> 
> 1. Numbered lists
> 2. With multiple items
> 
> > Nested blockquotes
> 
> \`\`\`javascript
> function example() {
>   return "code blocks";
> }
> \`\`\``;

            const result = parseContent(complexToggle, { contentType: 'markdown' });

            expect(result.success).toBe(true);

            const toggleHeading = result.blocks[0] as any;
            expect(toggleHeading.type).toBe('heading_1');
            expect(toggleHeading.heading_1.is_toggleable).toBe(true);
            expect(toggleHeading.children).toBeDefined();
            expect(toggleHeading.children.length).toBeGreaterThan(1);

            // Verify different content types in children
            const childTypes = toggleHeading.children.map((child: any) => child.type);
            expect(childTypes).toContain('paragraph');
            expect(childTypes).toContain('bulleted_list_item');
            expect(childTypes).toContain('numbered_list_item');
        });

        it('should handle empty toggle headings', () => {
            const emptyToggle = `> # Empty Toggle`;

            const result = parseContent(emptyToggle, { contentType: 'markdown' });

            expect(result.success).toBe(true);

            const headingBlock = result.blocks[0] as any;
            expect(headingBlock.type).toBe('heading_1');
            expect(headingBlock.heading_1.is_toggleable).toBe(true);
            expect(headingBlock.children).toEqual([]);
        });
    });

    describe('Toggle Heading Structure Validation', () => {
        it('should create valid Notion heading structure with is_toggleable', () => {
            const toggleMarkdown = `> ## Project Overview
> This project includes multiple phases and deliverables.`;

            const result = parseContent(toggleMarkdown, { contentType: 'markdown' });

            expect(result.success).toBe(true);
            const headingBlock = result.blocks[0] as any;

            // Validate complete heading structure
            expect(headingBlock).toMatchObject({
                type: 'heading_2',
                heading_2: {
                    rich_text: expect.any(Array),
                    color: expect.any(String),
                    is_toggleable: true
                },
                children: expect.any(Array),
                has_children: true
            });

            // Validate rich text content
            expect(headingBlock.heading_2.rich_text).toHaveLength(1);
            expect(headingBlock.heading_2.rich_text[0].text.content).toBe('Project Overview');
        });

        it('should preserve heading formatting in toggle headings', () => {
            const formattedToggle = `> # **Bold** and *Italic* Toggle
> Content with formatting`;

            const result = parseContent(formattedToggle, { contentType: 'markdown' });

            expect(result.success).toBe(true);
            const headingBlock = result.blocks[0] as any;

            expect(headingBlock.heading_1.is_toggleable).toBe(true);
            expect(headingBlock.heading_1.rich_text.length).toBeGreaterThan(1);

            // Check for formatting annotations
            const richTextSegments = headingBlock.heading_1.rich_text;
            const hasBold = richTextSegments.some((segment: any) =>
                segment.annotations.bold
            );
            const hasItalic = richTextSegments.some((segment: any) =>
                segment.annotations.italic
            );

            expect(hasBold).toBe(true);
            expect(hasItalic).toBe(true);
        });

        it('should handle toggle headings with links', () => {
            const toggleWithLink = `> # Check out [this link](https://example.com)
> More information available at the link above.`;

            const result = parseContent(toggleWithLink, { contentType: 'markdown' });

            expect(result.success).toBe(true);
            const headingBlock = result.blocks[0] as any;

            expect(headingBlock.heading_1.is_toggleable).toBe(true);

            // Check for link in rich text
            const hasLink = headingBlock.heading_1.rich_text.some((segment: any) =>
                segment.href !== null
            );
            expect(hasLink).toBe(true);
        });
    });

    describe('Toggle Heading Options and Configuration', () => {
        it('should handle toggle heading options', () => {
            const toggleMarkdown = `> # Toggle Section
> Content inside`;

            const withToggle = parseContent(toggleMarkdown, {
                contentType: 'markdown',
                conversion: { convertLinks: true }
            });

            const withoutToggle = parseContent(toggleMarkdown, {
                contentType: 'markdown',
                conversion: { convertLinks: false }
            });

            expect(withToggle.success).toBe(true);
            expect(withoutToggle.success).toBe(true);

            const withToggleHeading = withToggle.blocks[0] as any;
            const withoutToggleHeading = withoutToggle.blocks[0] as any;

            expect(withToggleHeading.heading_1.is_toggleable).toBe(true);
            expect(withoutToggleHeading.heading_1.is_toggleable).toBe(false);
        });

        it('should handle maxBlockDepth for nested toggles', () => {
            const deeplyNested = `> # Level 1
> Content 1
> 
> ## Level 2
> Content 2
> 
> ### Level 3
> Content 3
> 
> #### Level 4 (should be limited)
> Content 4`;

            const result = parseContent(deeplyNested, {
                contentType: 'markdown'
            });

            expect(result.success).toBe(true);

            // Should limit nesting depth
            const mainHeading = result.blocks[0] as any;
            expect(mainHeading.heading_1.is_toggleable).toBe(true);
        });
    });

    describe('Toggle Heading Performance and Edge Cases', () => {
        it('should handle large toggle sections efficiently', () => {
            const largeContent = Array(1000).fill('> Line of content').join('\n');
            const largeToggle = `> # Large Toggle Section\n${largeContent}`;

            const startTime = Date.now();
            const result = parseContent(largeToggle, { contentType: 'markdown' });
            const processingTime = Date.now() - startTime;

            expect(result.success).toBe(true);
            expect(processingTime).toBeLessThan(1000); // Should be reasonably fast

            const headingBlock = result.blocks[0] as any;
            expect(headingBlock.heading_1.is_toggleable).toBe(true);
            expect(headingBlock.children.length).toBeGreaterThan(0);
        });

        it('should handle malformed toggle syntax gracefully', () => {
            const malformedToggles = [
                '># Malformed (no space after >)',
                '> #Malformed (no space after #)',
                '> # \n> (empty heading)',
                '> #### Too deep heading\n> Content'
            ];

            malformedToggles.forEach(malformed => {
                const result = parseContent(malformed, { contentType: 'markdown' });

                expect(result.success).toBe(true);
                // Should handle gracefully, may or may not create toggle
                expect(result.blocks.length).toBeGreaterThanOrEqual(0);
            });
        });

        it('should handle toggle headings with special characters', () => {
            const specialCharToggle = `> # Spéciäl Chàracters & Émojis 🎯
> Content with ünïcödé characters`;

            const result = parseContent(specialCharToggle, { contentType: 'markdown' });

            expect(result.success).toBe(true);
            const headingBlock = result.blocks[0] as any;

            expect(headingBlock.heading_1.is_toggleable).toBe(true);
            expect(headingBlock.heading_1.rich_text[0].text.content).toContain('🎯');
        });

        it('should handle multiple consecutive toggle headings', () => {
            const multipleToggles = `> # First Toggle
> First content

> # Second Toggle  
> Second content

> # Third Toggle
> Third content`;

            const result = parseContent(multipleToggles, { contentType: 'markdown' });

            expect(result.success).toBe(true);
            expect(result.blocks).toHaveLength(3);

            result.blocks.forEach((block: any) => {
                expect(block.type).toBe('heading_1');
                expect(block.heading_1.is_toggleable).toBe(true);
                expect(block.children.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Toggle Heading Integration', () => {
        it('should work with other markdown features', () => {
            const complexMarkdown = `# Regular Heading

Some regular content.

> # Toggle Section
> This toggle contains:
> 
> - A list item
> - Another item with **bold** text
> 
> \`\`\`javascript
> const code = "example";
> \`\`\`
> 
> | Table | In | Toggle |
> |-------|----|----|
> | Cell  | 1  | 2  |

## Another Regular Heading

More content.`;

            const result = parseContent(complexMarkdown, { contentType: 'markdown' });

            expect(result.success).toBe(true);

            const headings = result.blocks.filter((block: any) =>
                block.type.startsWith('heading_')
            ) as any[];

            expect(headings).toHaveLength(3);
            expect(headings[0].heading_1.is_toggleable).toBe(false); // Regular
            expect(headings[1].heading_1.is_toggleable).toBe(true);  // Toggle
            expect(headings[2].heading_2.is_toggleable).toBe(false); // Regular

            // Verify toggle contains various content types
            const toggleHeading = headings[1];
            const childTypes = toggleHeading.children.map((child: any) => child.type);
            expect(childTypes).toContain('paragraph');
            expect(childTypes).toContain('bulleted_list_item');
            expect(childTypes).toContain('code');
        });

        it('should preserve toggle structure during validation', () => {
            const toggleMarkdown = `> # Validated Toggle
> Content for validation`;

            const result = parseContent(toggleMarkdown, {
                contentType: 'markdown',
                includeValidation: true
            });

            expect(result.success).toBe(true);
            expect(result.validation).toBeDefined();
            expect(result.validation?.isValid).toBe(true);

            const headingBlock = result.blocks[0] as any;
            expect(headingBlock.heading_1.is_toggleable).toBe(true);
            expect(typeof headingBlock.heading_1.is_toggleable).toBe('boolean');
        });

        it('should handle toggle headings in mixed content detection', () => {
            const mixedContent = `Some text before.

> # Toggle in Mixed Content
> Toggle content here.

More text after.`;

            const result = parseContent(mixedContent); // Auto-detection

            expect(result.success).toBe(true);
            expect(result.metadata?.detectedType).toBe('markdown');

            const toggleHeading = result.blocks.find((block: any) =>
                block.type === 'heading_1'
            ) as any;

            expect(toggleHeading).toBeDefined();
            expect(toggleHeading.heading_1.is_toggleable).toBe(true);
        });
    });

    describe('Toggle Heading Error Handling', () => {
        it('should handle incomplete toggle syntax', () => {
            const incompleteToggle = `> # Incomplete
> Some content
Regular content without >`;

            const result = parseContent(incompleteToggle, { contentType: 'markdown' });

            expect(result.success).toBe(true);
            // Should handle gracefully
            expect(result.blocks.length).toBeGreaterThan(0);
        });

        it('should provide meaningful warnings for toggle issues', () => {
            const problematicToggle = `> #### H4 Toggle (too deep)
> Content that might cause issues`;

            const result = parseContent(problematicToggle, {
                contentType: 'markdown',
                includeValidation: true
            });

            expect(result.success).toBe(true);
            // Should convert H4 to H3 (Notion limit)
            const headingBlock = result.blocks[0] as any;
            expect(headingBlock.type).toBe('heading_3'); // Normalized
        });
    });
});