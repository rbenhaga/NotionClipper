/**
 * Configuration Jest pour les tests - Cahier des Charges v2.1 ⭐
 * Inclut des matchers personnalisés et configuration avancée
 */

import { customMatchers, testHelpers } from './helpers/test-helpers';

// Constantes conformes au Cahier des Charges v2.1
const PERFORMANCE_BENCHMARKS = {
  DETECTION_1000_LINES: 5,      // <5ms (P50)
  PARSE_MARKDOWN_1000: 30,      // <30ms (P50)
  PARSE_CODE_1000: 20,          // <20ms (P50)
  PARSE_TABLE_100_ROWS: 15,     // <15ms (P50)
  PARSE_AUDIO_URL: 1,           // <1ms (P50)
  CONVERT_100_BLOCKS: 20,       // <20ms (P50)
  VALIDATE_100_BLOCKS: 10,      // <10ms (P50)
  PIPELINE_TOTAL_1000: 80,      // <80ms (P50)
  FILE_UPLOAD_5MB: 2000,        // <2s (P50)
  
  // Timeout global pour les tests
  TEST_TIMEOUT: 30000
};

// Configuration des timeouts
jest.setTimeout(PERFORMANCE_BENCHMARKS.TEST_TIMEOUT);

// Mock console pour les tests
const originalConsole = console;

beforeAll(() => {
  // Silencer les logs pendant les tests sauf si DEBUG=true
  if (!process.env.DEBUG) {
    global.console = {
      ...console,
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: originalConsole.error // Garder les erreurs
    };
  }

  // Initialiser les helpers globaux
  (global as any).testHelpers = testHelpers;
  (global as any).PERFORMANCE_BENCHMARKS = PERFORMANCE_BENCHMARKS;
});

afterAll(() => {
  global.console = originalConsole;
});

// ⭐ Matchers personnalisés pour le Cahier des Charges v2.1
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinPerformanceThreshold(threshold: number): R;
      toHaveValidNotionBlockStructure(): R;
      toHaveAudioBlock(): R;
      toHaveTableWithHeaders(): R;
      toHaveToggleHeading(): R;
      toBeValidAudioUrl(): R;
      toHaveValidRichText(): R;
    }
  }
}

// Matchers personnalisés étendus
expect.extend({
  ...customMatchers,
  
  // Matcher pour les seuils de performance
  toBeWithinPerformanceThreshold(received: number, threshold: number) {
    const pass = received <= threshold;
    
    if (pass) {
      return {
        message: () => `Expected ${received}ms to exceed performance threshold ${threshold}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received}ms to be within performance threshold ${threshold}ms`,
        pass: false,
      };
    }
  },
  
  // Matcher pour valider la structure des blocs Notion
  toHaveValidNotionBlockStructure(received: any) {
    const isValid = received && 
                   typeof received === 'object' &&
                   typeof received.type === 'string' &&
                   received.type.length > 0;
    
    if (isValid) {
      return {
        message: () => `Expected block to have invalid Notion structure`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected block to have valid Notion structure with type property`,
        pass: false,
      };
    }
  },
  
  // Matcher pour les blocs audio (⭐ NOUVEAU v2.1)
  toHaveAudioBlock(received: any[]) {
    const hasAudioBlock = received.some(block => 
      block.type === 'audio' && 
      block.audio &&
      block.audio.type === 'external' &&
      block.audio.external &&
      block.audio.external.url
    );
    
    if (hasAudioBlock) {
      return {
        message: () => `Expected blocks to not contain audio block`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected blocks to contain at least one valid audio block`,
        pass: false,
      };
    }
  },
  
  // Matcher pour les tables avec headers (⭐ NOUVEAU v2.1)
  toHaveTableWithHeaders(received: any[]) {
    const hasTableWithHeaders = received.some(block => 
      block.type === 'table' && 
      block.table &&
      (block.table.has_column_header === true || block.table.has_row_header === true)
    );
    
    if (hasTableWithHeaders) {
      return {
        message: () => `Expected blocks to not contain table with headers`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected blocks to contain at least one table with headers`,
        pass: false,
      };
    }
  },
  
  // Matcher pour les toggle headings (⭐ NOUVEAU v2.1)
  toHaveToggleHeading(received: any[]) {
    const hasToggleHeading = received.some(block => 
      block.type && 
      block.type.startsWith('heading_') &&
      block[block.type] &&
      block[block.type].is_toggleable === true
    );
    
    if (hasToggleHeading) {
      return {
        message: () => `Expected blocks to not contain toggle heading`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected blocks to contain at least one toggle heading`,
        pass: false,
      };
    }
  },
  
  // Matcher pour valider les URLs audio
  toBeValidAudioUrl(received: string) {
    const audioExtensions = ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'webm'];
    const urlPattern = /^https?:\/\/[^\s<>"{}|\\^`[\]]+$/;
    
    const isValidUrl = urlPattern.test(received);
    const hasAudioExtension = audioExtensions.some(ext => 
      received.toLowerCase().endsWith(`.${ext}`)
    );
    
    const isValid = isValidUrl && hasAudioExtension;
    
    if (isValid) {
      return {
        message: () => `Expected ${received} to not be a valid audio URL`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid audio URL with supported extension`,
        pass: false,
      };
    }
  },
  
  // Matcher pour valider le rich text
  toHaveValidRichText(received: any) {
    const isValidRichText = Array.isArray(received) &&
                           received.every(segment => 
                             segment &&
                             typeof segment === 'object' &&
                             segment.type &&
                             segment.text &&
                             segment.annotations &&
                             typeof segment.plain_text === 'string'
                           );
    
    if (isValidRichText) {
      return {
        message: () => `Expected rich text to be invalid`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected valid rich text array with proper structure`,
        pass: false,
      };
    }
  }
});

// Mock global pour fetch si nécessaire
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Mock pour performance.now si pas disponible
if (!global.performance) {
  global.performance = {
    now: jest.fn(() => Date.now())
  } as any;
}

// Configuration pour les tests de performance
const originalSetTimeout = global.setTimeout;
const originalSetInterval = global.setInterval;

beforeEach(() => {
  // Reset des mocks avant chaque test
  jest.clearAllMocks();
  
  // Mock console.time et console.timeEnd pour les tests de performance
  jest.spyOn(console, 'time').mockImplementation(() => {});
  jest.spyOn(console, 'timeEnd').mockImplementation(() => {});
});

afterEach(() => {
  // Nettoyage après chaque test
  jest.restoreAllMocks();
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Configuration des variables d'environnement pour les tests
process.env.NODE_ENV = 'test';

// ⭐ Utilitaires de test globaux pour v2.1
global.testUtils = {
  // Générateur de contenu de test
  generateTestContent: (type: string, size: 'small' | 'medium' | 'large' = 'small') => {
    const sizes = {
      small: 10,
      medium: 100,
      large: 1000
    };
    
    const count = sizes[size];
    
    switch (type) {
      case 'markdown':
        return Array(count).fill(0).map((_, i) => 
          `# Header ${i}\n\nParagraph ${i} with **bold** text.`
        ).join('\n\n');
      
      case 'audio':
        return Array(count).fill(0).map((_, i) => 
          `https://example.com/audio${i}.mp3`
        ).join('\n');
      
      case 'table':
        const rows = Array(count).fill(0).map((_, i) => 
          `Row${i},Value${i},Data${i}`
        );
        return `Header1,Header2,Header3\n${rows.join('\n')}`;
      
      case 'toggle':
        return Array(count).fill(0).map((_, i) => 
          `> # Toggle ${i}\n> Content for toggle ${i}`
        ).join('\n\n');
      
      default:
        return Array(count).fill(0).map((_, i) => 
          `Line ${i} of test content`
        ).join('\n');
    }
  },
  
  // Mesure de performance
  measurePerformance: <T>(fn: () => T): { result: T; duration: number; memory: any } => {
    const startMemory = process.memoryUsage();
    const startTime = Date.now();
    
    const result = fn();
    
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    
    return {
      result,
      duration: endTime - startTime,
      memory: {
        start: startMemory,
        end: endMemory,
        delta: endMemory.heapUsed - startMemory.heapUsed
      }
    };
  }
};

// Types globaux pour TypeScript
declare global {
  var testUtils: {
    generateTestContent: (type: string, size?: 'small' | 'medium' | 'large') => string;
    measurePerformance: <T>(fn: () => T) => { result: T; duration: number; memory: any };
  };
  var PERFORMANCE_BENCHMARKS: any;
}