import { BaseParser } from './BaseParser';
import type { ASTNode, ParseOptions } from '../types';

export class ToggleHeadingsParser extends BaseParser {
  constructor(options: ParseOptions = {}) {
    super(options);
  }

  parse(content: string): ASTNode[] {
    if (!content?.trim()) return [];

    const lines = content.split('\n');
    const blocks: ASTNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Détecter toggle heading
      if (line.match(/^>\s*#{1,3}\s+/)) {
        // Collecter le contenu enfant (lignes indentées suivantes)
        const childLines = [];
        i++;
        while (i < lines.length && (lines[i].startsWith('  ') || lines[i].trim() === '')) {
          if (lines[i].trim()) {
            childLines.push(lines[i].substring(2)); // Retirer l'indentation
          }
          i++;
        }
        blocks.push(this.parseToggleHeading(line, childLines));
        continue;
      }

      // Parsing normal pour les autres lignes
      if (line.trim()) {
        blocks.push(this.createTextNode(line));
      }
      i++;
    }

    return blocks;
  }

  private parseToggleHeading(line: string, content: string[]): ASTNode {
    const match = line.match(/^>\s*(#{1,3})\s+(.+)$/);
    if (!match) {
      // Fallback pour une syntaxe simple
      const simpleMatch = line.match(/^>\s*#\s+(.+)$/);
      if (simpleMatch) {
        return this.createToggleHeading(1, simpleMatch[1], content);
      }
      throw new Error('Invalid toggle heading format');
    }

    const level = match[1].length as 1 | 2 | 3;
    const title = match[2];

    return this.createToggleHeading(level, title, content);
  }

  private createToggleHeading(level: 1 | 2 | 3, title: string, childContent: string[]): ASTNode {
    const headingType = `heading_${level}` as const;

    // Parser le contenu enfant
    const children = childContent.length > 0
      ? this.parseLines(childContent)
      : [];

    return {
      type: headingType,
      content: title,
      metadata: {
        level,
        isToggleable: true,
        hasChildren: children.length > 0
      },
      children
    };
  }

  private parseLines(lines: string[]): ASTNode[] {
    // Simple parsing des lignes enfants
    return lines
      .filter(line => line.trim())
      .map(line => this.createTextNode(line));
  }
}