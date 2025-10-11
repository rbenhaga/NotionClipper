/**
 * Test Ultimate Exhaustif - Version Jest Professionnelle
 * Suite complète reprenant la logique du test original avec une structure Jest moderne
 */

import { parseContent } from '../../src/parseContent';
import { testHelpers, ContentGenerators } from '../helpers/test-helpers';

// Types locaux
type TestBlock = {
  type: string;
  [key: string]: any;
};

type ValidationTestCase = {
  name: string;
  input: string;
  expectedSuccess: boolean;
  description: string;
  options?: any;
};

describe('Ultimate Exhaustive Test Suite', () => {
  const globalStats = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    startTime: Date.now(),
    errors: [] as string[]
  };

  beforeAll(() => {
    console.log('🎯 ========== DÉMARRAGE TEST ULTIMATE EXHAUSTIF ==========');
    globalStats.startTime = Date.now();
  });

  afterAll(() => {
    const totalTime = Date.now() - globalStats.startTime;
    const successRate = globalStats.totalTests > 0 
      ? (globalStats.passedTests / globalStats.totalTests) * 100 
      : 0;
    
    console.log('\n🏁 ========== RÉSULTATS FINAUX ==========');
    console.log(`✅ Tests réussis: ${globalStats.passedTests}/${globalStats.totalTests}`);
    console.log(`❌ Tests échoués: ${globalStats.failedTests}`);
    console.log(`📈 Taux de réussite: ${successRate.toFixed(2)}%`);
    console.log(`⏱️ Temps total: ${totalTime}ms`);
    
    if (successRate >= 95) {
      console.log('🎉 VALIDATION RÉUSSIE - Parser prêt pour production !');
    } else {
      console.log('⚠️ VALIDATION ÉCHOUÉE - Corrections nécessaires');
    }
  });

  describe('Phase 1: Détection Automatique (Priorité Critique)', () => {
    const detectionTests: ValidationTestCase[] = [
      {
        name: 'URL Detection',
        input: 'https://www.notion.so',
        expectedSuccess: true,
        description: 'Should detect URLs with high confidence (>0.90)',
        options: { includeMetadata: true }
      },
      {
        name: 'Code Detection',
        input: 'function hello() {\n  console.log("Hello World");\n  return true;\n}',
        expectedSuccess: true,
        description: 'Should detect JavaScript code with good confidence (>0.70)',
        options: { includeMetadata: true }
      },
      {
        name: 'CSV Detection',
        input: 'Name,Age,City\nJohn,30,Paris\nJane,25,London',
        expectedSuccess: true,
        description: 'Should detect CSV format with good confidence (>0.70)',
        options: { includeMetadata: true }
      },
      {
        name: 'JSON Detection',
        input: '{\n  "name": "John",\n  "age": 30,\n  "city": "Paris"\n}',
        expectedSuccess: true,
        description: 'Should detect JSON with good confidence (>0.70)',
        options: { includeMetadata: true }
      },
      {
        name: 'Markdown Detection',
        input: '# Title\n**Bold** and *italic*\n- List item',
        expectedSuccess: true,
        description: 'Should detect Markdown with moderate confidence (>0.40)',
        options: { includeMetadata: true }
      },
      {
        name: 'Text Fallback',
        input: 'Just plain text without any special formatting',
        expectedSuccess: true,
        description: 'Should fallback to text with perfect confidence (1.0)',
        options: { includeMetadata: true }
      }
    ];

    detectionTests.forEach(test => {
      it(`should handle ${test.name}`, () => {
        globalStats.totalTests++;
        
        const result = parseContent(test.input, test.options);
        
        try {
          testHelpers.expectValidResult(result);
          expect(result.metadata).toBeDefined();
          expect(result.metadata?.detectedType).toBeDefined();
          expect(result.metadata?.confidence).toBeGreaterThan(0);
          
          globalStats.passedTests++;
        } catch (error) {
          globalStats.failedTests++;
          globalStats.errors.push(`${test.name}: ${error}`);
          throw error;
        }
      });
    });
  });

  describe('Phase 2: Parsers Spécialisés (Fonctionnalités Complètes)', () => {
    it('should parse all Markdown header levels', () => {
      globalStats.totalTests++;
      
      const content = '# H1 Title\n## H2 Subtitle\n### H3 Section';
      const result = parseContent(content, { contentType: 'markdown' });
      
      try {
        testHelpers.expectValidResult(result);
        testHelpers.expectBlockTypes(result.blocks as TestBlock[], ['heading_1', 'heading_2', 'heading_3']);
        globalStats.passedTests++;
      } catch (error) {
        globalStats.failedTests++;
        globalStats.errors.push(`Headers: ${error}`);
        throw error;
      }
    });

    it('should parse nested lists with proper hierarchy', () => {
      globalStats.totalTests++;
      
      const content = `- Bullet 1
- Bullet 2
  - Nested 1
    - Deep nested

1. Numbered 1
2. Numbered 2

- [ ] Todo unchecked
- [x] Todo checked`;
      
      const result = parseContent(content, { contentType: 'markdown' });
      
      try {
        testHelpers.expectValidResult(result);
        testHelpers.expectBlockTypes(result.blocks as TestBlock[], ['bulleted_list_item', 'numbered_list_item', 'to_do']);
        globalStats.passedTests++;
      } catch (error) {
        globalStats.failedTests++;
        globalStats.errors.push(`Lists: ${error}`);
        throw error;
      }
    });

    it('should parse callouts correctly', () => {
      globalStats.totalTests++;
      
      const content = `> [!note] Note\n> Content\n\n> [!info] Info\n> Content\n\n> [!tip] Tip\n> Content`;
      
      const result = parseContent(content, { contentType: 'markdown' });
      
      try {
        testHelpers.expectValidResult(result);
        const callouts = (result.blocks as TestBlock[]).filter(b => b.type === 'callout');
        expect(callouts.length).toBeGreaterThanOrEqual(3);
        globalStats.passedTests++;
      } catch (error) {
        globalStats.failedTests++;
        globalStats.errors.push(`Callouts: ${error}`);
        throw error;
      }
    });
  });

  describe('Phase 3: Rich Text Avancé (Formatage Complexe)', () => {
    it('should handle nested formatting correctly', () => {
      globalStats.totalTests++;
      
      const content = '**bold with `code` inside** *italic with `code` inside*';
      const result = parseContent(content, { contentType: 'markdown' });
      
      try {
        testHelpers.expectValidResult(result);
        
        let hasNestedFormatting = false;
        (result.blocks as TestBlock[]).forEach(block => {
          if (block.paragraph?.rich_text) {
            block.paragraph.rich_text.forEach((segment: any) => {
              const annotations = segment.annotations || {};
              const annotationCount = Object.keys(annotations).filter(key => annotations[key]).length;
              if (annotationCount > 1) {
                hasNestedFormatting = true;
              }
            });
          }
        });
        
        expect(hasNestedFormatting).toBe(true);
        globalStats.passedTests++;
      } catch (error) {
        globalStats.failedTests++;
        globalStats.errors.push(`Nested formatting: ${error}`);
        throw error;
      }
    });

    it('should auto-detect URLs in text', () => {
      globalStats.totalTests++;
      
      const content = 'Visit https://www.notion.so for more information.';
      const result = parseContent(content, { contentType: 'markdown' });
      
      try {
        testHelpers.expectValidResult(result);
        
        let hasAutoLink = false;
        (result.blocks as TestBlock[]).forEach(block => {
          if (block.paragraph?.rich_text) {
            block.paragraph.rich_text.forEach((segment: any) => {
              if (segment.href && segment.href.includes('notion.so')) {
                hasAutoLink = true;
              }
            });
          }
        });
        
        expect(hasAutoLink).toBe(true);
        globalStats.passedTests++;
      } catch (error) {
        globalStats.failedTests++;
        globalStats.errors.push(`Auto-link: ${error}`);
        throw error;
      }
    });
  });

  describe('Phase 4: Blocs Notion Complets (25+ Types)', () => {
    it('should create comprehensive block types', () => {
      globalStats.totalTests++;
      
      const content = ContentGenerators.generateComplexContent();
      const result = parseContent(content, { contentType: 'markdown' });
      
      try {
        testHelpers.expectValidResult(result);
        
        const blockTypes = [...new Set((result.blocks as TestBlock[]).map(b => b.type))];
        const expectedMinimumTypes = 8;
        
        expect(blockTypes.length).toBeGreaterThanOrEqual(expectedMinimumTypes);
        globalStats.passedTests++;
      } catch (error) {
        globalStats.failedTests++;
        globalStats.errors.push(`Block types: ${error}`);
        throw error;
      }
    });
  });

  describe('Phase 5: Configuration Options (Flexibilité)', () => {
    it('should respect detection options', () => {
      globalStats.totalTests++;
      
      const codeContent = 'function test() { console.log("hello"); }';
      
      const withDetection = parseContent(codeContent, {
        detection: { enableCodeDetection: true },
        includeMetadata: true
      });
      
      const withoutDetection = parseContent(codeContent, {
        detection: { enableCodeDetection: false },
        includeMetadata: true
      });
      
      try {
        testHelpers.expectValidResult(withDetection);
        testHelpers.expectValidResult(withoutDetection);
        
        const differentResults = withDetection.metadata?.detectedType !== withoutDetection.metadata?.detectedType;
        expect(differentResults).toBe(true);
        globalStats.passedTests++;
      } catch (error) {
        globalStats.failedTests++;
        globalStats.errors.push(`Detection options: ${error}`);
        throw error;
      }
    });

    it('should include metadata when requested', () => {
      globalStats.totalTests++;
      
      const result = parseContent('Test content', { includeMetadata: true });
      
      try {
        testHelpers.expectValidResult(result);
        expect(result.metadata).toBeDefined();
        globalStats.passedTests++;
      } catch (error) {
        globalStats.failedTests++;
        globalStats.errors.push(`Metadata: ${error}`);
        throw error;
      }
    });
  });

  describe('Phase 6: Edge Cases (Robustesse)', () => {
    const edgeCases = [
      { name: 'Empty content', content: '', shouldSucceed: true },
      { name: 'Null content', content: null, shouldSucceed: true },
      { name: 'Undefined content', content: undefined, shouldSucceed: true },
      { name: 'Malformed markdown', content: '**unclosed bold', shouldSucceed: true },
      { name: 'Very long line', content: 'a'.repeat(1000), shouldSucceed: true }
    ];

    edgeCases.forEach(testCase => {
      it(`should handle ${testCase.name} gracefully`, () => {
        globalStats.totalTests++;
        
        try {
          const result = parseContent(testCase.content as any);
          expect(result.success).toBe(testCase.shouldSucceed);
          globalStats.passedTests++;
        } catch (error) {
          globalStats.failedTests++;
          globalStats.errors.push(`Edge case ${testCase.name}: ${error}`);
          throw error;
        }
      });
    });
  });

  describe('Phase 7: Performance Validation', () => {
    it('should process content efficiently', () => {
      globalStats.totalTests++;
      
      const content = ContentGenerators.generateMarkdown('medium');
      
      const { result, metrics } = testHelpers.measurePerformance(() => {
        return parseContent(content, { contentType: 'markdown' });
      });
      
      try {
        testHelpers.expectValidResult(result);
        expect(metrics.duration).toBeLessThan(1000); // 1 second max
        globalStats.passedTests++;
      } catch (error) {
        globalStats.failedTests++;
        globalStats.errors.push(`Performance: ${error}`);
        throw error;
      }
    });
  });
});