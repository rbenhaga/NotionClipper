import { BaseParser } from './BaseParser';
import type { ASTNode, ParseOptions } from '../types';

export class CodeParser extends BaseParser {
  private readonly validLanguages = [
    'abap', 'actionscript', 'ada', 'apache', 'applescript', 'arduino', 'assembly', 'autohotkey',
    'bash', 'basic', 'batch', 'brainfuck', 'c', 'clojure', 'cmake', 'cobol', 'coffeescript',
    'c++', 'c#', 'crystal', 'css', 'cuda', 'd', 'dart', 'delphi', 'diff', 'django', 'docker',
    'dockerfile', 'elixir', 'elm', 'erlang', 'f#', 'flow', 'fortran', 'fsharp', 'gherkin',
    'git', 'glsl', 'go', 'gradle', 'graphql', 'groovy', 'haml', 'handlebars', 'haskell',
    'haxe', 'html', 'http', 'ini', 'java', 'javascript', 'jinja2', 'json', 'jsx', 'julia',
    'kotlin', 'latex', 'less', 'liquid', 'lisp', 'livescript', 'llvm', 'lua', 'makefile',
    'markdown', 'markup', 'matlab', 'mermaid', 'nim', 'nix', 'objective-c', 'ocaml', 'pascal',
    'perl', 'php', 'plain text', 'powershell', 'prolog', 'protobuf', 'pug', 'puppet', 'python',
    'qml', 'r', 'razor', 'reason', 'ruby', 'rust', 'sass', 'scala', 'scheme', 'scss', 'shell',
    'smalltalk', 'solidity', 'sql', 'stylus', 'svelte', 'swift', 'tcl', 'tex', 'toml',
    'tsx', 'typescript', 'vala', 'vb.net', 'verilog', 'vhdl', 'vim', 'visual basic',
    'vue', 'webassembly', 'xml', 'xquery', 'yaml', 'zig'
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

    // Kotlin
    if (this.hasPatterns(content, [
      /\bfun\s+\w+\s*\(/,
      /\bval\s+\w+/,
      /\bvar\s+\w+/,
      /\bclass\s+\w+.*{/
    ])) {
      return 'kotlin';
    }

    // Swift
    if (this.hasPatterns(content, [
      /\bfunc\s+\w+\s*\(/,
      /\bvar\s+\w+/,
      /\blet\s+\w+/,
      /\bimport\s+Foundation/
    ])) {
      return 'swift';
    }

    // Dart
    if (this.hasPatterns(content, [
      /\bvoid\s+main\s*\(/,
      /\bclass\s+\w+\s*{/,
      /\bimport\s+'dart:/,
      /\bString\s+\w+/
    ])) {
      return 'dart';
    }

    // Julia
    if (this.hasPatterns(content, [
      /\bfunction\s+\w+\s*\(/,
      /\bend\s*$/m,
      /\busing\s+\w+/,
      /\bprintln\s*\(/
    ])) {
      return 'julia';
    }

    // Scala
    if (this.hasPatterns(content, [
      /\bobject\s+\w+/,
      /\bdef\s+\w+\s*\(/,
      /\bval\s+\w+/,
      /\bimport\s+scala\./
    ])) {
      return 'scala';
    }

    // Haskell
    if (this.hasPatterns(content, [
      /\w+\s*::\s*\w+/,
      /\bmodule\s+\w+/,
      /\bimport\s+\w+/,
      /\bwhere\s*$/m
    ])) {
      return 'haskell';
    }

    // Elixir
    if (this.hasPatterns(content, [
      /\bdefmodule\s+\w+/,
      /\bdef\s+\w+\s*\(/,
      /\bdo\s*$/m,
      /\bIO\.puts/
    ])) {
      return 'elixir';
    }

    // Erlang
    if (this.hasPatterns(content, [
      /^-module\s*\(/m,
      /^-export\s*\(/m,
      /\w+\s*\(.*\)\s*->/,
      /\bio:format/
    ])) {
      return 'erlang';
    }

    // F#
    if (this.hasPatterns(content, [
      /\blet\s+\w+\s*=/,
      /\bmodule\s+\w+/,
      /\bopen\s+\w+/,
      /\bprintfn\s+/
    ])) {
      return 'f#';
    }

    // Fortran
    if (this.hasPatterns(content, [
      /\bprogram\s+\w+/i,
      /\bsubroutine\s+\w+/i,
      /\binteger\s*::/i,
      /\bwrite\s*\(/i
    ])) {
      return 'fortran';
    }

    // R
    if (this.hasPatterns(content, [
      /\blibrary\s*\(/,
      /<-\s*\w+/,
      /\bprint\s*\(/,
      /\bdata\.frame\s*\(/
    ])) {
      return 'r';
    }

    // MATLAB
    if (this.hasPatterns(content, [
      /\bfunction\s+.*=\s*\w+\s*\(/,
      /\bdisp\s*\(/,
      /\bplot\s*\(/,
      /\bend\s*$/m
    ])) {
      return 'matlab';
    }

    // Dockerfile
    if (this.hasPatterns(content, [
      /^FROM\s+\w+/m,
      /^RUN\s+/m,
      /^COPY\s+/m,
      /^WORKDIR\s+/m
    ])) {
      return 'dockerfile';
    }

    // TOML
    if (this.hasPatterns(content, [
      /^\[[\w.-]+\]/m,
      /^[\w-]+\s*=\s*".*"/m,
      /^[\w-]+\s*=\s*\d+/m
    ])) {
      return 'toml';
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