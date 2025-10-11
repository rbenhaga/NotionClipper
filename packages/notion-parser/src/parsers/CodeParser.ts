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
    const languagePatterns = [
      // JavaScript/TypeScript
      {
        patterns: [
          /function\s+\w+\s*\(/,
          /const\s+\w+\s*=/,
          /=>\s*{/,
          /console\.\w+/,
          /document\.\w+/,
          /import\s+.*\s+from\s+['"]/
        ],
        language: 'javascript'
      },
      {
        patterns: [
          /interface\s+\w+\s*{/,
          /type\s+\w+\s*=/,
          /:\s*(?:string|number|boolean|any)\s*[;,\)]/,
          /export\s+type/,
          /implements\s+\w+/
        ],
        language: 'typescript'
      },
      // Python
      {
        patterns: [
          /def\s+\w+\s*\(/,
          /class\s+\w+(?:\(.*?\))?:/,
          /import\s+\w+/,
          /from\s+\w+\s+import/,
          /if\s+__name__\s*==\s*['"]__main__['"]/,
          /\[.*\s+for\s+.*\s+in\s+.*\]/ // List comprehension
        ],
        language: 'python'
      },
      // Java
      {
        patterns: [
          /public\s+class\s+\w+/,
          /private\s+(?:void|int|String)\s+\w+/,
          /import\s+java\.\w+/,
          /System\.out\.print/,
          /public\s+static\s+void\s+main/
        ],
        language: 'java'
      },
      // C#
      {
        patterns: [
          /using\s+System/,
          /namespace\s+\w+/,
          /public\s+class\s+\w+/,
          /Console\.Write/,
          /\[.*Attribute\]/
        ],
        language: 'c#'
      },
      // PHP
      {
        patterns: [
          /<\?php/,
          /function\s+\w+\s*\(/,
          /\$\w+\s*=/,
          /echo\s+/,
          /require_once/
        ],
        language: 'php'
      },
      // Ruby
      {
        patterns: [
          /def\s+\w+/,
          /class\s+\w+/,
          /end\s*$/m,
          /puts\s+/,
          /require\s+['"]/
        ],
        language: 'ruby'
      },
      // Go
      {
        patterns: [
          /package\s+\w+/,
          /func\s+\w+/,
          /import\s+\(/,
          /fmt\.Print/
        ],
        language: 'go'
      },
      // Rust
      {
        patterns: [
          /fn\s+\w+/,
          /let\s+mut\s+/,
          /println!/,
          /impl\s+\w+/,
          /use\s+std::/
        ],
        language: 'rust'
      },
      // SQL
      {
        patterns: [
          /SELECT\s+.*\s+FROM/i,
          /INSERT\s+INTO/i,
          /UPDATE\s+.*\s+SET/i,
          /CREATE\s+TABLE/i
        ],
        language: 'sql'
      },
      // CSS
      {
        patterns: [
          /\.\w+\s*{[^}]*}/,
          /#\w+\s*{[^}]*}/,
          /:\s*(?:hover|active|focus)/,
          /display:\s*(?:flex|block|none)/
        ],
        language: 'css'
      },
      // HTML
      {
        patterns: [
          /<html/i,
          /<\/?\w+>/,
          /<div\s+class=/,
          /<!DOCTYPE/i
        ],
        language: 'html'
      },
      // C/C++
      {
        patterns: [
          /#include\s*<\w+>/,
          /int\s+main\s*\(/,
          /std::/,
          /printf\s*\(/
        ],
        language: 'c'
      }
    ];

    // Calculer les scores
    const scores: { [key: string]: number } = {};

    for (const { patterns, language } of languagePatterns) {
      let score = 0;
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          score++;
        }
      }
      if (score > 0) {
        scores[language] = score;
      }
    }

    // Trouver le langage avec le score le plus élevé
    let maxScore = 0;
    let detectedLang = 'plain text';

    for (const [lang, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedLang = lang;
      }
    }

    return detectedLang;
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