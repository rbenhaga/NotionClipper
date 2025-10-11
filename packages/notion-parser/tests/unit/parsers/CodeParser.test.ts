/**
 * Tests unitaires pour CodeParser - Cahier des Charges v2.1
 * Couvre le parsing de code avec détection de langage complète
 */

import { CodeParser } from '../../../src/parsers/CodeParser';
import { parseContent } from '../../../src/parseContent';

// Type helper pour éviter les erreurs TypeScript
type CodeResult = ReturnType<CodeParser['parse']>;

describe('CodeParser - Cahier des Charges v2.1', () => {
  let parser: CodeParser;

  beforeEach(() => {
    parser = new CodeParser();
  });

  describe('Language Detection - JavaScript/TypeScript', () => {
    it('should detect JavaScript with function declarations', () => {
      const jsCode = 'function hello() {\n  console.log("Hello World");\n  return true;\n}';
      const result = parser.parse(jsCode);
      
      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('code');
      expect(result[0]?.metadata?.language).toBe('javascript');
    });

    it('should detect JavaScript with arrow functions', () => {
      const jsCode = 'const hello = () => {\n  console.log("Hello");\n};';
      const result = parser.parse(jsCode);
      
      expect(result[0]?.metadata?.language).toBe('javascript');
    });

    it('should detect JavaScript with ES6 imports', () => {
      const jsCode = 'import React from "react";\nconst component = () => <div>Hello</div>;';
      const result = parser.parse(jsCode);
      
      expect(result[0]?.metadata?.language).toBe('javascript');
    });

    it('should detect TypeScript with type annotations', () => {
      const tsCode = 'interface User {\n  name: string;\n  age: number;\n}\nfunction greet(user: User): string {\n  return `Hello ${user.name}`;\n}';
      const result = parser.parse(tsCode);
      
      expect(result[0]?.metadata?.language).toBe('typescript');
    });

    it('should detect TypeScript with generic types', () => {
      const tsCode = 'function identity<T>(arg: T): T {\n  return arg;\n}';
      const result = parser.parse(tsCode);
      
      expect(result[0]?.metadata?.language).toBe('typescript');
    });
  });

  describe('Language Detection - Python', () => {
    it('should detect Python with function definitions', () => {
      const pythonCode = 'def hello():\n    print("Hello World")\n    return True';
      const result = parser.parse(pythonCode);
      
      expect(result[0]?.metadata?.language).toBe('python');
    });

    it('should detect Python with class definitions', () => {
      const pythonCode = 'class MyClass:\n    def __init__(self):\n        self.value = 42';
      const result = parser.parse(pythonCode);
      
      expect(result[0]?.metadata?.language).toBe('python');
    });

    it('should detect Python with imports', () => {
      const pythonCode = 'import os\nfrom datetime import datetime\n\nprint("Hello")';
      const result = parser.parse(pythonCode);
      
      expect(result[0]?.metadata?.language).toBe('python');
    });

    it('should detect Python with list comprehensions', () => {
      const pythonCode = 'numbers = [x for x in range(10) if x % 2 == 0]';
      const result = parser.parse(pythonCode);
      
      expect(result[0]?.metadata?.language).toBe('python');
    });
  });

  describe('Language Detection - Java', () => {
    it('should detect Java with class declarations', () => {
      const javaCode = 'public class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}';
      const result = parser.parse(javaCode);
      
      expect(result[0]?.metadata?.language).toBe('java');
    });

    it('should detect Java with imports', () => {
      const javaCode = 'import java.util.List;\nimport java.util.ArrayList;\n\npublic class Test {}';
      const result = parser.parse(javaCode);
      
      expect(result[0]?.metadata?.language).toBe('java');
    });
  });

  describe('Language Detection - C/C++', () => {
    it('should detect C with includes and main function', () => {
      const cCode = '#include <stdio.h>\n\nint main() {\n    printf("Hello World");\n    return 0;\n}';
      const result = parser.parse(cCode);
      
      expect(result[0]?.metadata?.language).toBe('c');
    });

    it('should detect C++ with std namespace', () => {
      const cppCode = '#include <iostream>\n\nint main() {\n    std::cout << "Hello World" << std::endl;\n    return 0;\n}';
      const result = parser.parse(cppCode);
      
      expect(result[0]?.metadata?.language).toBe('c++');
    });
  });

  describe('Language Detection - Other Languages', () => {
    it('should detect C# with using statements', () => {
      const csharpCode = 'using System;\n\nnamespace HelloWorld {\n    public class Program {\n        public static void Main() {\n            Console.WriteLine("Hello World");\n        }\n    }\n}';
      const result = parser.parse(csharpCode);
      
      expect(result[0]?.metadata?.language).toBe('c#');
    });

    it('should detect PHP with PHP tags', () => {
      const phpCode = '<?php\n$name = "World";\necho "Hello " . $name;\n?>';
      const result = parser.parse(phpCode);
      
      expect(result[0]?.metadata?.language).toBe('php');
    });

    it('should detect Ruby with def and end', () => {
      const rubyCode = 'def hello\n  puts "Hello World"\nend\n\nhello';
      const result = parser.parse(rubyCode);
      
      expect(result[0]?.metadata?.language).toBe('ruby');
    });

    it('should detect Go with package and func', () => {
      const goCode = 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello World")\n}';
      const result = parser.parse(goCode);
      
      expect(result[0]?.metadata?.language).toBe('go');
    });

    it('should detect Rust with fn and println!', () => {
      const rustCode = 'fn main() {\n    println!("Hello World");\n}';
      const result = parser.parse(rustCode);
      
      expect(result[0]?.metadata?.language).toBe('rust');
    });

    it('should detect SQL with SELECT statements', () => {
      const sqlCode = 'SELECT name, age FROM users WHERE age > 18 ORDER BY name;';
      const result = parser.parse(sqlCode);
      
      expect(result[0]?.metadata?.language).toBe('sql');
    });

    it('should detect CSS with selectors and properties', () => {
      const cssCode = '.container {\n  display: flex;\n  justify-content: center;\n  background-color: #f0f0f0;\n}';
      const result = parser.parse(cssCode);
      
      expect(result[0]?.metadata?.language).toBe('css');
    });

    it('should detect HTML with tags', () => {
      const htmlCode = '<!DOCTYPE html>\n<html>\n<head>\n    <title>Test</title>\n</head>\n<body>\n    <h1>Hello World</h1>\n</body>\n</html>';
      const result = parser.parse(htmlCode);
      
      expect(result[0]?.metadata?.language).toBe('html');
    });
  });

  describe('Language Detection - Fallback', () => {
    it('should fallback to plain text for unknown languages', () => {
      const unknownCode = 'some unknown syntax here that does not match any pattern';
      const result = parser.parse(unknownCode);
      
      expect(result[0]?.metadata?.language).toBe('plain text');
    });

    it('should handle mixed language content', () => {
      const mixedCode = '// JavaScript comment\nfunction test() {}\n/* CSS comment */\n.class { color: red; }';
      const result = parser.parse(mixedCode);
      
      // Should detect the most prominent language (JavaScript in this case)
      expect(['javascript', 'css', 'plain text']).toContain(result[0]?.metadata?.language);
    });
  });

  describe('Code Block Structure', () => {
    it('should create valid Notion code block structure', () => {
      const code = 'const test = "hello";';
      const result = parser.parse(code);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'code',
        content: code,
        metadata: {
          language: expect.any(String),
          isBlock: true
        }
      });
    });

    it('should preserve code formatting and whitespace', () => {
      const code = 'function test() {\n    if (true) {\n        return "indented";\n    }\n}';
      const result = parser.parse(code);
      
      expect(result[0]?.content).toBe(code);
    });

    it('should handle empty code blocks', () => {
      const code = '';
      const result = parser.parse(code);
      
      expect(result).toEqual([]);
    });

    it('should handle whitespace-only code', () => {
      const code = '   \n\t\n   ';
      const result = parser.parse(code);
      
      expect(result).toEqual([]);
    });
  });

  describe('Content Truncation', () => {
    it('should truncate extremely long code blocks', () => {
      const longCode = 'a'.repeat(5000); // Exceeds 2000 char limit
      const result = parser.parse(longCode);
      
      expect(result).toHaveLength(1);
      expect(result[0]?.content?.length).toBeLessThanOrEqual(2000);
    });

    it('should respect custom maxCodeLength option', () => {
      const customParser = new CodeParser({ maxCodeLength: 100 });
      const longCode = 'a'.repeat(200);
      const result = customParser.parse(longCode);
      
      expect(result[0]?.content?.length).toBeLessThanOrEqual(100);
    });

    it('should not truncate short code', () => {
      const shortCode = 'function test() { return true; }';
      const result = parser.parse(shortCode);
      
      expect(result[0]?.content).toBe(shortCode);
    });
  });

  describe('Language Validation', () => {
    it('should validate provided language from metadata', () => {
      const customParser = new CodeParser({ 
        metadata: { language: 'python' } 
      });
      const code = 'some code here';
      const result = customParser.parse(code);
      
      expect(result[0]?.metadata?.language).toBe('python');
    });

    it('should fallback if provided language is invalid', () => {
      const customParser = new CodeParser({ 
        metadata: { language: 'invalid-language' } 
      });
      const jsCode = 'function test() {}';
      const result = customParser.parse(jsCode);
      
      expect(result[0]?.metadata?.language).toBe('javascript'); // Auto-detected
    });

    it('should handle case-insensitive language names', () => {
      const customParser = new CodeParser({ 
        metadata: { language: 'JAVASCRIPT' } 
      });
      const code = 'some code';
      const result = customParser.parse(code);
      
      expect(result[0]?.metadata?.language).toBe('javascript');
    });
  });

  describe('Special Characters and Encoding', () => {
    it('should handle code with special characters', () => {
      const codeWithSpecial = 'const emoji = "🎯";\nconst unicode = "Spéciàl chàracters";';
      const result = parser.parse(codeWithSpecial);
      
      expect(result[0]?.content).toContain('🎯');
      expect(result[0]?.content).toContain('Spéciàl');
    });

    it('should handle code with escape sequences', () => {
      const codeWithEscapes = 'const str = "Hello\\nWorld\\t!";\nconst regex = /\\d+/g;';
      const result = parser.parse(codeWithEscapes);
      
      expect(result[0]?.content).toBe(codeWithEscapes);
    });

    it('should handle code with various quotes', () => {
      const codeWithQuotes = `const single = 'single quotes';\nconst double = "double quotes";\nconst template = \`template \${literal}\`;`;
      const result = parser.parse(codeWithQuotes);
      
      expect(result[0]?.content).toBe(codeWithQuotes);
    });
  });

  describe('Performance', () => {
    it('should parse large code files efficiently', () => {
      const largeCode = Array(1000).fill('function test() { return true; }').join('\n');
      
      const startTime = Date.now();
      const result = parser.parse(largeCode);
      const duration = Date.now() - startTime;
      
      expect(result).toHaveLength(1);
      expect(duration).toBeLessThan(100); // Should be fast
    });

    it('should handle concurrent code parsing', () => {
      const codeSnippets = [
        'const a = 1;',
        'def func(): pass',
        'public class Test {}',
        '.class { color: red; }',
        'SELECT * FROM table;'
      ];
      
      const results = codeSnippets.map(code => parser.parse(code));
      
      results.forEach(result => {
        expect(result).toHaveLength(1);
        expect(result[0]?.type).toBe('code');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed code gracefully', () => {
      const malformedCode = 'function unclosed() { if (true { return;';
      const result = parser.parse(malformedCode);
      
      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('code');
      expect(result[0]?.content).toBe(malformedCode);
    });

    it('should handle null and undefined input', () => {
      expect(parser.parse(null as any)).toEqual([]);
      expect(parser.parse(undefined as any)).toEqual([]);
    });

    it('should handle very short code snippets', () => {
      const shortCode = 'x';
      const result = parser.parse(shortCode);
      
      expect(result).toHaveLength(1);
      expect(result[0]?.content).toBe(shortCode);
    });
  });

  describe('Integration with parseContent', () => {
    it('should work correctly with parseContent function', () => {
      const jsCode = 'function hello() {\n  console.log("Hello World");\n}';
      const result = parseContent(jsCode, { contentType: 'code' });
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('code');
    });

    it('should auto-detect code in parseContent', () => {
      const pythonCode = 'def hello():\n    print("Hello World")';
      const result = parseContent(pythonCode);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('code');
    });
  });
});
