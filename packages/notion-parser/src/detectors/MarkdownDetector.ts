import type { DetectionResult } from './ContentDetector';

export class MarkdownDetector {
  detect(content: string): DetectionResult {
    if (!content?.trim()) {
      return { type: 'markdown', confidence: 0.0 };
    }

    let confidence = 0;
    const lines = content.split('\n');

    // Check for markdown headers
    const headerPattern = /^#{1,6}\s+/;
    const headerLines = lines.filter(line => headerPattern.test(line)).length;
    if (headerLines > 0) {
      confidence += Math.min(headerLines * 0.2, 0.4);
    }

    // Check for markdown lists
    const listPattern = /^[\s]*[-*+]\s+|^[\s]*\d+\.\s+/;
    const listLines = lines.filter(line => listPattern.test(line)).length;
    if (listLines > 0) {
      confidence += Math.min(listLines * 0.1, 0.3);
    }

    // Check for markdown formatting
    const boldPattern = /\*\*[^*]+\*\*|\__[^_]+\__/;
    const italicPattern = /\*[^*]+\*|\_[^_]+\_/;
    const codePattern = /`[^`]+`/;
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/;

    if (boldPattern.test(content)) confidence += 0.15;
    if (italicPattern.test(content)) confidence += 0.15;
    if (codePattern.test(content)) confidence += 0.1;
    if (linkPattern.test(content)) confidence += 0.2;

    // Check for blockquotes
    const blockquoteLines = lines.filter(line => line.startsWith('>')).length;
    if (blockquoteLines > 0) {
      confidence += Math.min(blockquoteLines * 0.1, 0.2);
    }

    // Check for code blocks
    const codeBlockPattern = /```[\s\S]*?```/;
    if (codeBlockPattern.test(content)) {
      confidence += 0.3;
    }

    // Check for tables
    const tablePattern = /\|.*\|/;
    const tableLines = lines.filter(line => tablePattern.test(line)).length;
    if (tableLines >= 2) {
      confidence += 0.2;
    }

    return {
      type: 'markdown',
      confidence: Math.min(confidence, 1.0),
      metadata: {
        hasHeaders: headerLines > 0,
        hasLists: listLines > 0,
        hasFormatting: boldPattern.test(content) || italicPattern.test(content),
        hasLinks: linkPattern.test(content),
        hasCodeBlocks: codeBlockPattern.test(content),
        hasTables: tableLines >= 2
      }
    };
  }
}