import type { DetectionResult } from './ContentDetector';

export class MarkdownDetector {
  detect(content: string): DetectionResult {
    if (!content?.trim()) {
      return { type: 'markdown', confidence: 0.0 };
    }

    let confidence = 0;
    const lines = content.split('\n');

    // Headers (# ## ###)
    const headerLines = lines.filter(line => 
      line.match(/^#{1,6}\s+/)
    ).length;
    if (headerLines > 0) {
      confidence += Math.min(headerLines * 0.15, 0.3);
    }

    // Lists (- * + 1.)
    const listLines = lines.filter(line => 
      line.match(/^[\s]*[-*+]\s+/) || line.match(/^[\s]*\d+\.\s+/)
    ).length;
    if (listLines > 0) {
      confidence += Math.min(listLines * 0.1, 0.25);
    }

    // Code blocks (```)
    const codeBlocks = (content.match(/```/g) || []).length / 2;
    if (codeBlocks > 0) {
      confidence += Math.min(codeBlocks * 0.2, 0.3);
    }

    // Inline code (`)
    const inlineCode = (content.match(/`[^`]+`/g) || []).length;
    if (inlineCode > 0) {
      confidence += Math.min(inlineCode * 0.05, 0.15);
    }

    // Bold/Italic (**text** *text*)
    const boldItalic = (content.match(/\*\*[^*]+\*\*|\*[^*]+\*/g) || []).length;
    if (boldItalic > 0) {
      confidence += Math.min(boldItalic * 0.05, 0.2);
    }

    // Links ([text](url))
    const links = (content.match(/\[[^\]]+\]\([^)]+\)/g) || []).length;
    if (links > 0) {
      confidence += Math.min(links * 0.1, 0.2);
    }

    // Images (![alt](url))
    const images = (content.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;
    if (images > 0) {
      confidence += Math.min(images * 0.15, 0.2);
    }

    // Tables (|col1|col2|)
    const tableLines = lines.filter(line => 
      line.includes('|') && line.split('|').length > 2
    ).length;
    if (tableLines >= 2) {
      confidence += Math.min(tableLines * 0.1, 0.25);
    }

    // Blockquotes (>)
    const quoteLines = lines.filter(line => 
      line.match(/^>\s+/)
    ).length;
    if (quoteLines > 0) {
      confidence += Math.min(quoteLines * 0.08, 0.15);
    }

    // Horizontal rules (--- *** ___)
    const hrLines = lines.filter(line => 
      line.match(/^(---|\*\*\*|___)$/)
    ).length;
    if (hrLines > 0) {
      confidence += Math.min(hrLines * 0.1, 0.1);
    }

    // Checkboxes (- [ ] - [x])
    const checkboxes = (content.match(/- \[[x ]\]/g) || []).length;
    if (checkboxes > 0) {
      confidence += Math.min(checkboxes * 0.1, 0.2);
    }

    return {
      type: 'markdown',
      confidence: Math.min(confidence, 1.0),
      metadata: {
        features: {
          headers: headerLines,
          lists: listLines,
          codeBlocks,
          links,
          images,
          tables: tableLines >= 2,
          checkboxes
        }
      }
    };
  }
}