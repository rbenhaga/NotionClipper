/**
 * Types centralisés pour les tests
 */

import type { NotionBlock } from '../../src/types/notion';
import type { ParseContentResult } from '../../src/parseContent';

// Types flexibles pour les tests
export type TestBlock = {
  type: string;
  [key: string]: any;
  children?: TestBlock[];
  has_children?: boolean;
};

export type TestResult = ParseContentResult & {
  blocks: TestBlock[];
};

// Interfaces pour les tests de performance
export interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
}

// Interfaces pour les tests de sécurité
export interface SecurityTestCase {
  name: string;
  input: string;
  expectedBlocked: boolean;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Interfaces pour les tests de validation
export interface ValidationTestCase {
  name: string;
  input: string;
  options?: any;
  expectedSuccess: boolean;
  expectedBlockCount?: number;
  expectedTypes?: string[];
  description: string;
}

// Helpers pour les assertions
export interface TestHelpers {
  expectValidResult(result: TestResult): void;
  expectBlockTypes(blocks: TestBlock[], expectedTypes: string[]): void;
  expectRichTextContent(block: TestBlock, expectedContent: string): void;
  measurePerformance<T>(fn: () => T): { result: T; metrics: PerformanceMetrics };
}

// Configuration des tests
export interface TestConfig {
  timeout: number;
  retries: number;
  verbose: boolean;
  skipSlowTests: boolean;
  performanceThresholds: {
    small: number;    // < 100 lines
    medium: number;   // < 1000 lines  
    large: number;    // < 10000 lines
    memory: number;   // MB
  };
}

// Types pour les mocks
export interface MockOptions {
  shouldFail?: boolean;
  delay?: number;
  customResponse?: any;
}

// Constantes de test
export const TEST_CONSTANTS = {
  PERFORMANCE_THRESHOLDS: {
    SMALL_CONTENT: 50,    // ms
    MEDIUM_CONTENT: 500,  // ms
    LARGE_CONTENT: 5000,  // ms
    MEMORY_LIMIT: 100     // MB
  },
  CONTENT_SIZES: {
    SMALL: 100,
    MEDIUM: 1000,
    LARGE: 10000
  },
  SECURITY_PATTERNS: {
    XSS: [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      'onload="alert(1)"',
      '<svg onload="alert(1)">',
      'data:text/html,<script>alert(1)</script>'
    ],
    INJECTION: [
      '${7*7}',
      '{{7*7}}',
      '<%= 7*7 %>',
      '#{7*7}'
    ],
    MALICIOUS_URLS: [
      'javascript:void(0)',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      'vbscript:msgbox(1)',
      'file:///etc/passwd'
    ]
  }
} as const;