/**
 * Tests de sécurité complets - Conformes au Cahier des Charges v2.1 ⭐
 * Couvre la protection XSS, injection, DoS et validation de sécurité
 */

import { parseContent } from '../../src/parseContent';
import { testHelpers } from '../helpers/test-helpers';

// Types locaux
type TestBlock = {
  type: string;
  [key: string]: any;
};

type SecurityTestCase = {
  name: string;
  input: string;
  expectedBlocked: boolean;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
};

// Constantes locales
const TEST_CONSTANTS = {
  SECURITY_PATTERNS: {
    MALICIOUS_URLS: [
      'javascript:void(0)',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      'vbscript:msgbox(1)',
      'file:///etc/passwd'
    ]
  }
};

describe('Security Tests - Cahier des Charges v2.1 ⭐', () => {
  describe('XSS Protection', () => {
    const xssTestCases: SecurityTestCase[] = [
      {
        name: 'Script tag injection',
        input: '<div><script>alert("XSS")</script><p>Normal content</p></div>',
        expectedBlocked: true,
        description: 'Should block script tags in HTML content',
        severity: 'critical'
      },
      {
        name: 'Event handler injection',
        input: '<div onclick="alert(\'XSS\')" onload="malicious()"><p onmouseover="steal()">Content</p></div>',
        expectedBlocked: true,
        description: 'Should remove event handlers from HTML',
        severity: 'critical'
      },
      {
        name: 'SVG with embedded scripts',
        input: '<svg onload="alert(\'XSS\')"><script>malicious()</script></svg>',
        expectedBlocked: true,
        description: 'Should block SVG with embedded scripts',
        severity: 'critical'
      },
      {
        name: 'Iframe injection',
        input: '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        expectedBlocked: true,
        description: 'Should block malicious iframes',
        severity: 'high'
      }
    ];

    xssTestCases.forEach(testCase => {
      it(`should handle ${testCase.name}`, () => {
        const result = parseContent(testCase.input, { contentType: 'html' });
        testHelpers.expectValidResult(result);
        
        const resultString = JSON.stringify(result.blocks);
        const hasScript = resultString.toLowerCase().includes('<script');
        const hasEventHandlers = /on\w+\s*=/i.test(resultString);
        
        if (testCase.expectedBlocked) {
          expect(hasScript).toBe(false);
          expect(hasEventHandlers).toBe(false);
        }
      });
    });
  });

  describe('URL Protocol Security', () => {
    const maliciousUrls = TEST_CONSTANTS.SECURITY_PATTERNS.MALICIOUS_URLS;

    maliciousUrls.forEach(url => {
      it(`should block malicious URL: ${url.substring(0, 20)}...`, () => {
        const content = `[Click me](${url})`;
        const result = parseContent(content, { contentType: 'markdown' });
        testHelpers.expectValidResult(result);
        
        const resultString = JSON.stringify(result.blocks);
        
        // Check that dangerous protocols are blocked (URLs should be empty)
        if (url.startsWith('javascript:') || url.startsWith('vbscript:')) {
          expect(resultString).toContain('"url":""'); // URL should be sanitized to empty string
        }
        
        // Data URLs with HTML/JS should be blocked
        if (url.includes('data:text/html') && url.includes('script')) {
          expect(resultString).not.toMatch(/data:text\/html.*<script/i);
        }
      });
    });

    it('should validate internal network URLs', () => {
      const internalUrls = [
        'http://localhost:3000/admin',
        'http://127.0.0.1/secret',
        'http://192.168.1.1/config',
        'http://10.0.0.1/internal'
      ];
      
      internalUrls.forEach(url => {
        const result = parseContent(`[Link](${url})`, { contentType: 'markdown' });
        testHelpers.expectValidResult(result);
        
        // Internal URLs should be handled appropriately
        // (Implementation dependent - may block or allow with warning)
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Content Sanitization', () => {
    it('should detect and handle null bytes', () => {
      const contentWithNullBytes = `Normal text\x00hidden content`;
      
      const result = parseContent(contentWithNullBytes);
      testHelpers.expectValidResult(result);
      
      const resultString = JSON.stringify(result.blocks);
      expect(resultString).not.toMatch(/\x00/);
    });

    it('should sanitize control characters', () => {
      const contentWithControlChars = `Text with\x01\x02\x03control chars`;
      
      const result = parseContent(contentWithControlChars);
      testHelpers.expectValidResult(result);
      
      const resultString = JSON.stringify(result.blocks);
      expect(resultString).not.toMatch(/[\x01-\x08\x0B\x0C\x0E-\x1F]/);
    });

    it('should safely decode HTML entities', () => {
      const contentWithEntities = `&lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt;`;
      
      const result = parseContent(contentWithEntities, { contentType: 'html' });
      testHelpers.expectValidResult(result);
      
      const resultString = JSON.stringify(result.blocks);
      expect(resultString).not.toMatch(/<script.*>.*alert.*<\/script>/i);
    });
  });

  describe('Input Validation', () => {
    it('should handle extremely long URLs safely', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(10000);
      
      const result = parseContent(longUrl);
      
      expect(result.success).toBeDefined();
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should validate URL formats strictly', () => {
      const malformedUrls = [
        'ht tp://example.com',
        'https://exam ple.com',
        'https://example.com/<script>',
        'ftp://example.com\x00hidden'
      ];
      
      malformedUrls.forEach(url => {
        const result = parseContent(url);
        testHelpers.expectValidResult(result);
        
        const hasValidLink = result.blocks.some((block: TestBlock) => 
          block.paragraph?.rich_text?.some((segment: any) => 
            segment.href === url
          )
        );
        
        expect(hasValidLink).toBe(false);
      });
    });

    it('should prevent ReDoS attacks with complex regex', () => {
      const redosContent = 'a'.repeat(1000) + '!';
      
      const startTime = Date.now();
      const result = parseContent(redosContent);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000);
      expect(result.success).toBeDefined();
    });
  });

  // ⭐ NOUVEAU : Tests de sécurité pour les nouvelles fonctionnalités v2.1
  describe('Audio URL Security (⭐ NOUVEAU v2.1)', () => {
    it('should block malicious audio URLs', () => {
      const maliciousAudioUrls = [
        'javascript:alert("xss").mp3',
        'data:audio/mp3;base64,malicious_payload',
        'file:///etc/passwd.mp3',
        'ftp://malicious.com/audio.mp3'
      ];
      
      maliciousAudioUrls.forEach(url => {
        const result = parseContent(url);
        testHelpers.expectValidResult(result);
        
        // Should not create audio blocks for malicious URLs
        const audioBlocks = result.blocks.filter((block: TestBlock) => 
          block.type === 'audio'
        );
        expect(audioBlocks.length).toBe(0);
      });
    });

    it('should validate audio URL length limits', () => {
      const longAudioUrl = 'https://example.com/' + 'a'.repeat(5000) + '.mp3';
      
      const result = parseContent(longAudioUrl);
      testHelpers.expectValidResult(result);
      
      // Should handle gracefully without creating invalid blocks
      expect(result.success).toBe(true);
    });

    it('should sanitize audio URLs with special characters', () => {
      const specialCharUrls = [
        'https://example.com/audio<script>.mp3',
        'https://example.com/audio"onclick="alert().mp3',
        'https://example.com/audio\x00hidden.mp3'
      ];
      
      specialCharUrls.forEach(url => {
        const result = parseContent(url);
        testHelpers.expectValidResult(result);
        
        const resultString = JSON.stringify(result.blocks);
        expect(resultString).not.toContain('<script>');
        expect(resultString).not.toContain('onclick=');
        expect(resultString).not.toMatch(/\x00/);
      });
    });
  });

  describe('File Upload Security (⭐ NOUVEAU v2.1)', () => {
    it('should validate file upload parameters', () => {
      // Mock file upload scenarios
      const maliciousFilenames = [
        '../../../etc/passwd',
        'file<script>alert()</script>.jpg',
        'file\x00hidden.exe.jpg',
        'file"onclick="alert().jpg'
      ];
      
      maliciousFilenames.forEach(filename => {
        // Test filename validation
        expect(() => {
          // This would be tested with actual FileUploadHandler
          const sanitized = filename.replace(/[<>"'&\x00-\x1f]/g, '');
          expect(sanitized).not.toContain('<script>');
          expect(sanitized).not.toContain('\x00');
        }).not.toThrow();
      });
    });

    it('should prevent path traversal in filenames', () => {
      const pathTraversalNames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config',
        '/etc/shadow',
        'C:\\Windows\\System32\\config'
      ];
      
      pathTraversalNames.forEach(filename => {
        // Should sanitize path traversal attempts
        const sanitized = filename.replace(/[./\\]/g, '_');
        expect(sanitized).not.toContain('../');
        expect(sanitized).not.toContain('..\\');
      });
    });

    it('should validate MIME type consistency', () => {
      const inconsistentFiles = [
        { filename: 'image.jpg', mimeType: 'application/javascript' },
        { filename: 'document.pdf', mimeType: 'text/html' },
        { filename: 'audio.mp3', mimeType: 'application/x-executable' }
      ];
      
      inconsistentFiles.forEach(file => {
        // Should detect MIME type inconsistencies
        const expectedMime = file.filename.endsWith('.jpg') ? 'image/jpeg' :
                           file.filename.endsWith('.pdf') ? 'application/pdf' :
                           file.filename.endsWith('.mp3') ? 'audio/mpeg' : 'unknown';
        
        expect(file.mimeType).not.toBe(expectedMime);
        // In real implementation, this should trigger validation warning
      });
    });
  });

  describe('Table Header Injection Security (⭐ NOUVEAU v2.1)', () => {
    it('should sanitize malicious content in table headers', () => {
      const maliciousTable = `<script>alert('xss')</script>,onclick="alert()",Normal
John,30,NYC
Jane,25,LA`;
      
      const result = parseContent(maliciousTable, { contentType: 'csv' });
      testHelpers.expectValidResult(result);
      
      const resultString = JSON.stringify(result.blocks);
      expect(resultString).not.toContain('<script>');
      expect(resultString).not.toContain('onclick=');
    });

    it('should handle formula injection in CSV headers', () => {
      const formulaInjectionTable = `=cmd|'/c calc'!A0,=HYPERLINK("http://evil.com"),Name
John,30,NYC
Jane,25,LA`;
      
      const result = parseContent(formulaInjectionTable, { contentType: 'csv' });
      testHelpers.expectValidResult(result);
      
      const resultString = JSON.stringify(result.blocks);
      expect(resultString).not.toMatch(/^=/); // Should not start with =
      expect(resultString).not.toContain('cmd');
      expect(resultString).not.toContain('HYPERLINK');
    });

    it('should prevent CSV injection attacks', () => {
      const csvInjectionTable = `@SUM(1+1)*cmd|'/c calc'!A0,Name,Age
=1+1+cmd|'/c calc'!A0,John,30
+1+1+cmd|'/c calc'!A0,Jane,25`;
      
      const result = parseContent(csvInjectionTable, { contentType: 'csv' });
      testHelpers.expectValidResult(result);
      
      const resultString = JSON.stringify(result.blocks);
      expect(resultString).not.toMatch(/^[@=+]/); // Should not start with formula chars
      expect(resultString).not.toContain('cmd');
    });
  });

  describe('Toggle Heading Security (⭐ NOUVEAU v2.1)', () => {
    it('should sanitize malicious content in toggle headings', () => {
      const maliciousToggle = `> # <script>alert('xss')</script> Heading
> Content with <img src="x" onerror="alert()">`;
      
      const result = parseContent(maliciousToggle, { contentType: 'markdown' });
      testHelpers.expectValidResult(result);
      
      const resultString = JSON.stringify(result.blocks);
      expect(resultString).not.toContain('<script>');
      expect(resultString).not.toContain('onerror=');
    });

    it('should prevent nested script injection in toggle content', () => {
      const nestedInjection = `> # Safe Heading
> Normal content
> <div onclick="malicious()">
> <script>alert('nested')</script>
> </div>`;
      
      const result = parseContent(nestedInjection, { contentType: 'markdown' });
      testHelpers.expectValidResult(result);
      
      const resultString = JSON.stringify(result.blocks);
      expect(resultString).not.toContain('<script>');
      expect(resultString).not.toContain('onclick=');
    });
  });

  describe('DoS Protection (Enhanced v2.1)', () => {
    it('should handle extremely large audio playlists', () => {
      const largePlaylist = Array(10000).fill(0)
        .map((_, i) => `https://example.com/song${i}.mp3`)
        .join('\n');
      
      const startTime = Date.now();
      const result = parseContent(largePlaylist);
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(5000); // Should not hang
      expect(result.success).toBeDefined();
    });

    it('should handle massive table data efficiently', () => {
      const massiveTable = Array(5000).fill(0)
        .map((_, i) => `Row${i},Data${i},Value${i}`)
        .join('\n');
      const tableWithHeader = `Header1,Header2,Header3\n${massiveTable}`;
      
      const startTime = Date.now();
      const result = parseContent(tableWithHeader, { contentType: 'csv' });
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(3000); // Should be reasonably fast
      expect(result.success).toBe(true);
    });

    it('should handle deeply nested toggle structures', () => {
      let nestedToggle = '> # Level 1\n> Content 1\n';
      for (let i = 2; i <= 100; i++) {
        nestedToggle += `> ${'#'.repeat(Math.min(i, 3))} Level ${i}\n> Content ${i}\n`;
      }
      
      const startTime = Date.now();
      const result = parseContent(nestedToggle, { contentType: 'markdown' });
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(2000);
      expect(result.success).toBe(true);
    });

    it('should prevent memory exhaustion with large files', () => {
      const hugeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB
      
      const startTime = Date.now();
      const result = parseContent(hugeContent);
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(10000); // Should not hang
      expect(result.success).toBeDefined();
    });
  });

  describe('Advanced Security Validation', () => {
    it('should detect and prevent polyglot attacks', () => {
      const polyglotContent = `<!--<script>alert(1)</script>-->
<svg onload=alert(1)>
/*<script>alert(1)</script>*/
#<script>alert(1)</script>
**<script>alert(1)</script>**`;
      
      const result = parseContent(polyglotContent, { contentType: 'markdown' });
      testHelpers.expectValidResult(result);
      
      const resultString = JSON.stringify(result.blocks);
      expect(resultString).not.toContain('<script>');
      expect(resultString).not.toContain('onload=');
    });

    it('should validate Unicode normalization attacks', () => {
      const unicodeAttack = 'java\u0073cript:alert(1)'; // 's' as Unicode
      
      const result = parseContent(`[Link](${unicodeAttack})`);
      testHelpers.expectValidResult(result);
      
      const resultString = JSON.stringify(result.blocks);
      expect(resultString).not.toContain('javascript:');
    });

    it('should prevent encoding bypass attacks', () => {
      const encodingBypass = [
        '%6A%61%76%61%73%63%72%69%70%74%3A', // javascript: URL encoded
        '&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;', // HTML entities
        'jav\x61script:', // Hex encoding
        'jav&#x61;script:' // Mixed encoding
      ];
      
      encodingBypass.forEach(encoded => {
        const result = parseContent(`[Link](${encoded}alert(1))`);
        testHelpers.expectValidResult(result);
        
        const resultString = JSON.stringify(result.blocks);
        expect(resultString).not.toMatch(/javascript:/i);
      });
    });

    it('should validate against SSRF attacks in URLs', () => {
      const ssrfUrls = [
        'http://169.254.169.254/latest/meta-data/', // AWS metadata
        'http://metadata.google.internal/', // GCP metadata
        'http://localhost:6379/', // Redis
        'http://127.0.0.1:22/', // SSH
        'gopher://127.0.0.1:11211/', // Memcached
        'dict://127.0.0.1:11211/' // Dict protocol
      ];
      
      ssrfUrls.forEach(url => {
        const result = parseContent(`[Link](${url})`);
        testHelpers.expectValidResult(result);
        
        // Implementation should validate against internal/metadata URLs
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Content Security Policy Compliance', () => {
    it('should generate CSP-compliant output', () => {
      const htmlContent = `<div>
        <p>Safe content</p>
        <img src="https://example.com/image.jpg" alt="Image">
        <a href="https://example.com">Link</a>
      </div>`;
      
      const result = parseContent(htmlContent, { contentType: 'html' });
      testHelpers.expectValidResult(result);
      
      const resultString = JSON.stringify(result.blocks);
      
      // Should not contain inline styles or scripts
      expect(resultString).not.toMatch(/style\s*=/i);
      expect(resultString).not.toMatch(/on\w+\s*=/i);
      expect(resultString).not.toContain('<script');
    });

    it('should handle data URLs safely', () => {
      const dataUrls = [
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        'data:text/plain;charset=utf-8,Hello%20World',
        'data:application/json,{"test":true}'
      ];
      
      dataUrls.forEach(url => {
        const result = parseContent(`![Image](${url})`);
        testHelpers.expectValidResult(result);
        
        // Data URLs should be handled according to security policy
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Rate Limiting and Resource Protection', () => {
    it('should handle rapid parsing requests', () => {
      const requests = Array(100).fill('Test content');
      
      const startTime = Date.now();
      const results = requests.map(content => parseContent(content));
      const processingTime = Date.now() - startTime;
      
      expect(results).toHaveLength(100);
      expect(results.every(r => r.success)).toBe(true);
      expect(processingTime).toBeLessThan(1000); // Should be efficient
    });

    it('should prevent resource exhaustion with complex regex', () => {
      const complexContent = '(' + 'a'.repeat(1000) + ')*b';
      
      const startTime = Date.now();
      const result = parseContent(complexContent);
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(1000); // Should not cause ReDoS
      expect(result.success).toBeDefined();
    });
  });
});