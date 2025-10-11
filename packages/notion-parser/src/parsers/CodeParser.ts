import { BaseParser } from './BaseParser';
import type { ASTNode, ParseOptions } from '../types';

export class CodeParser extends BaseParser {
  private readonly validLanguages = [
    'abap', 'arduino', 'bash', 'basic', 'c', 'clojure', 'coffeescript', 'c++', 'c#', 'css',
    'dart', 'diff', 'docker', 'elixir', 'elm', 'erlang', 'flow', 'fortran', 'f#',
    'gherkin', 'glsl', 'go', 'graphql', 'groovy', 'haskell', 'html', 'java', 'javascript',
    'json', 'julia', 'kotlin', 'latex', 'less', 'lisp', 'livescript', 'lua', 'makefile',
    'markdown', 'markup', 'matlab', 'mermaid', 'nix', 'objective-c', 'ocaml', 'pascal',
    'perl', 'php', 'plain text', 'powershell', 'prolog', 'protobuf', 'python', 'r', 'reason',
    'ruby', 'rust', 'sass', 'scala', 'scheme', 'scss', 'shell', 'sql', 'swift',
    'typescript', 'vb.net', 'verilog', 'vhdl', 'visual basic', 'webassembly', 'xml', 'yaml'
  ];

  constructor(options: ParseOptions = {}) {
    super(options);
  }

  parse(content: string): ASTNode[] {
    if (!content?.trim()) return [];

    const language = this.detectLanguage(content);
    const truncatedContent = this.truncateContent(content, this.options.maxCodeLength || 2000);

    return [this.createCodeNode(truncatedContent, language, true)];
  }

  private detectLanguage(content: string): string {
    // Check if language is provided in metadata
    if (this.options.metadata?.language) {
      const providedLang = this.options.metadata.language.toLowerCase();
      if (this.validLanguages.includes(providedLang)) {
        return providedLang;
      }
    }

    // Auto-detect based on content patterns
    const detectedLang = this.autoDetectLanguage(content);
    return this.validLanguages.includes(detectedLang) ? detectedLang : 'plain text';
  }

  private autoDetectLanguage(content: string): string {
    // JavaScript/TypeScript
    if (this.hasPatterns(content, [
      /\b(const|let|var)\s+\w+/,
      /function\s*\(/,
      /=>\s*{?/,
      /import\s+.*from/
    ])) {
      if (content.includes('interface ') || content.includes(': string') || content.includes(': number')) {
        return 'typescript';
      }
      return 'javascript';
    }

    // Python
    if (this.hasPatterns(content, [
      /\bdef\s+\w+\s*\(/,
      /\bclass\s+\w+/,
      /\bimport\s+\w+/,
      /\bfrom\s+\w+\s+import/,
      /:\s*$/m
    ])) {
      return 'python';
    }

    // Java
    if (this.hasPatterns(content, [
      /\bpublic\s+class\s+\w+/,
      /\bpublic\s+static\s+void\s+main/,
      /\bimport\s+java\./,
      /\bSystem\.out\.println/
    ])) {
      return 'java';
    }

    // C/C++
    if (this.hasPatterns(content, [
      /#include\s*<.*>/,
      /\bint\s+main\s*\(/,
      /\bstd::/,
      /\bprintf\s*\(/
    ])) {
      return content.includes('std::') || content.includes('#include <iostream>') ? 'c++' : 'c';
    }

    // C#
    if (this.hasPatterns(content, [
      /\busing\s+System/,
      /\bnamespace\s+\w+/,
      /\bpublic\s+class\s+\w+/,
      /\bConsole\.WriteLine/
    ])) {
      return 'c#';
    }

    // PHP
    if (content.includes('<?php') || this.hasPatterns(content, [
      /\$\w+\s*=/,
      /\bfunction\s+\w+\s*\(/,
      /\becho\s+/
    ])) {
      return 'php';
    }

    // Ruby
    if (this.hasPatterns(content, [
      /\bdef\s+\w+/,
      /\bclass\s+\w+/,
      /\bend\s*$/m,
      /\bputs\s+/
    ])) {
      return 'ruby';
    }

    // Go
    if (this.hasPatterns(content, [
      /\bpackage\s+\w+/,
      /\bfunc\s+\w+\s*\(/,
      /\bimport\s+\(/,
      /\bfmt\.Print/
    ])) {
      return 'go';
    }

    // Rust
    if (this.hasPatterns(content, [
      /\bfn\s+\w+\s*\(/,
      /\blet\s+mut\s+/,
      /\buse\s+std::/,
      /\bprintln!\s*\(/
    ])) {
      return 'rust';
    }

    // SQL
    if (this.hasPatterns(content, [
      /\bSELECT\s+.*\bFROM\b/i,
      /\bINSERT\s+INTO\b/i,
      /\bUPDATE\s+.*\bSET\b/i,
      /\bCREATE\s+TABLE\b/i
    ])) {
      return 'sql';
    }

    // HTML
    if (this.hasPatterns(content, [
      /<html\b/i,
      /<head\b/i,
      /<body\b/i,
      /<div\b.*>/i
    ])) {
      return 'html';
    }

    // CSS
    if (this.hasPatterns(content, [
      /\w+\s*{\s*[\w-]+\s*:/,
      /@media\s+/,
      /\.[\w-]+\s*{/,
      /#[\w-]+\s*{/
    ])) {
      return 'css';
    }

    // JSON
    if (this.isValidJson(content)) {
      return 'json';
    }

    // XML
    if (this.hasPatterns(content, [
      /<\?xml\s+version/i,
      /<\/\w+>/,
      /<\w+\s+.*=/
    ])) {
      return 'xml';
    }

    // YAML
    if (this.hasPatterns(content, [
      /^[\w-]+:\s*$/m,
      /^[\w-]+:\s+\w+/m,
      /^\s*-\s+\w+/m
    ])) {
      return 'yaml';
    }

    // Shell/Bash
    if (this.hasPatterns(content, [
      /^#!/,
      /\becho\s+/,
      /\bif\s+\[.*\]/,
      /\$\w+/
    ])) {
      return 'bash';
    }

    return 'plain text';
  }

  private hasPatterns(content: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(content));
  }

  private isValidJson(content: string): boolean {
    try {
      JSON.parse(content.trim());
      return true;
    } catch {
      return false;
    }
  }
}