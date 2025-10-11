import type { DetectionOptions } from '../types';
import { MarkdownDetector } from './MarkdownDetector';

export type ContentType = 'markdown' | 'html' | 'code' | 'table' | 'csv' | 'tsv' | 'url' | 'latex' | 'json' | 'audio' | 'text';

export interface DetectionResult {
  type: ContentType;
  confidence: number;
  metadata?: Record<string, any>;
}

export class ContentDetector {
  private markdownDetector = new MarkdownDetector();

  detect(content: string, options: DetectionOptions = {}): DetectionResult {
    if (!content?.trim()) {
      return { type: 'text', confidence: 1.0 };
    }

    const results: DetectionResult[] = [];

    // Audio Detection (before general URL detection)
    if (options.enableAudioDetection !== false) {
      const audioResult = this.detectAudio(content);
      if (audioResult && audioResult.confidence > 0.8) {
        results.push(audioResult);
      }
    }

    // URL Detection
    if (options.enableUrlDetection !== false) {
      const urlResult = this.detectUrl(content);
      if (urlResult.confidence > 0.8) {
        results.push(urlResult);
      }
    }

    // LaTeX Detection
    if (options.enableLatexDetection !== false) {
      const latexResult = this.detectLatex(content);
      if (latexResult && latexResult.confidence > 0.5) { // Seuil plus strict pour éviter les faux positifs
        results.push(latexResult);
      }
    }

    // JSON Detection
    if (options.enableJsonDetection !== false) {
      const jsonResult = this.detectJson(content);
      if (jsonResult.confidence > 0.7) {
        results.push(jsonResult);
      }
    }

    // Code Detection
    if (options.enableCodeDetection !== false) {
      const codeResult = this.detectCode(content);
      if (codeResult && codeResult.confidence > 0.3) {
        results.push(codeResult);
      }
    }

    // Table Detection
    if (options.enableTableDetection !== false) {
      const tableResult = this.detectTable(content);
      if (tableResult.confidence > 0.6) {
        results.push(tableResult);
      }
    }

    // HTML Detection
    if (options.enableHtmlDetection !== false) {
      const htmlResult = this.detectHtml(content);
      if (htmlResult.confidence > 0.5) {
        results.push(htmlResult);
      }
    }

    // Markdown Detection
    if (options.enableMarkdownDetection !== false) {
      const markdownResult = this.markdownDetector.detect(content);
      if (markdownResult.confidence > 0.4) {
        results.push(markdownResult);
      }
    }

    // Return highest confidence result or default to text
    if (results.length === 0) {
      return { type: 'text', confidence: 1.0 };
    }

    // Logique de priorisation intelligente
    // Markdown a la priorité si il a une confiance décente (>0.4) car il peut contenir d'autres types
    const markdownResult = results.find(r => r.type === 'markdown');
    if (markdownResult && markdownResult.confidence > 0.4) {
      // Si Markdown est détecté avec une bonne confiance, l'utiliser même si d'autres types ont une confiance plus élevée
      return markdownResult;
    }

    // Sinon, prendre le type avec la plus haute confiance
    return results.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );
  }

  private detectUrl(content: string): DetectionResult {
    const urlPattern = /^https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=]+$/i;

    if (urlPattern.test(content.trim())) {
      // Si c'est une URL audio, ne pas la traiter comme URL générique
      if (this.isAudioUrl(content.trim())) {
        return { type: 'url', confidence: 0.0 }; // Laisser detectAudio s'en occuper
      }

      return {
        type: 'url',
        confidence: 1.0,
        metadata: {
          url: content.trim(),
          isAudio: false
        }
      };
    }

    return { type: 'url', confidence: 0.0 };
  }

  private detectCode(content: string): DetectionResult {
    const codePatterns = [
      // JavaScript/TypeScript
      { pattern: /function\s+\w+\s*\(/, weight: 0.4 },
      { pattern: /const\s+\w+\s*=/, weight: 0.4 },
      { pattern: /let\s+\w+\s*=/, weight: 0.4 },
      { pattern: /var\s+\w+\s*=/, weight: 0.4 },
      { pattern: /(?:class|interface)\s+\w+/, weight: 0.4 },
      { pattern: /import\s+.*\s+from/, weight: 0.4 },
      { pattern: /export\s+(?:default\s+)?(?:class|function|const)/, weight: 0.4 },

      // Python
      { pattern: /def\s+\w+\s*\(/, weight: 0.4 },
      { pattern: /class\s+\w+\s*\(/, weight: 0.4 },
      { pattern: /import\s+\w+/, weight: 0.3 },
      { pattern: /from\s+\w+\s+import/, weight: 0.3 },
      { pattern: /print\s*\(/, weight: 0.3 },

      // Java/C#
      { pattern: /public\s+(?:class|interface|static)/, weight: 0.4 },
      { pattern: /private\s+(?:class|interface|static)/, weight: 0.4 },
      { pattern: /protected\s+(?:class|interface|static)/, weight: 0.4 },

      // SQL
      { pattern: /SELECT\s+.*\s+FROM/i, weight: 0.6 },
      { pattern: /INSERT\s+INTO/i, weight: 0.6 },
      { pattern: /UPDATE\s+.*\s+SET/i, weight: 0.6 },
      { pattern: /DELETE\s+FROM/i, weight: 0.6 },
      { pattern: /\bFROM\b/i, weight: 0.2 },
      { pattern: /\bWHERE\b/i, weight: 0.2 },

      // PHP
      { pattern: /<\?php/, weight: 0.4 },

      // Structures communes
      { pattern: /if\s*\(.*\)\s*{/, weight: 0.3 },
      { pattern: /for\s*\(.*\)\s*{/, weight: 0.3 },
      { pattern: /while\s*\(.*\)\s*{/, weight: 0.3 },
      { pattern: /return\s+/, weight: 0.3 },
      { pattern: /console\.\w+/, weight: 0.3 },
      { pattern: /\w+\.\w+\(/, weight: 0.2 } // Appels de méthodes
    ];

    let confidence = 0;
    for (const { pattern, weight } of codePatterns) {
      if (pattern.test(content)) {
        confidence += weight;
      }
    }

    // Bonus pour présence de { } et ;
    if (content.includes('{') && content.includes('}')) confidence += 0.3;
    if ((content.match(/;/g) || []).length >= 1) confidence += 0.3;

    // Bonus pour indentation (signe de code structuré)
    const lines = content.split('\n');
    const indentedLines = lines.filter(line => line.match(/^\s{2,}/)).length;
    if (indentedLines > 0) confidence += 0.3;

    // Bonus pour parenthèses (très commun en code)
    if (content.includes('(') && content.includes(')')) confidence += 0.2;

    confidence = Math.min(confidence, 1.0);

    if (confidence >= 0.3) { // Seuil abaissé pour être plus permissif
      return {
        type: 'code',
        confidence,
        metadata: { language: this.detectLanguage(content) }
      };
    }

    return { type: 'code', confidence: 0.0 };
  }

  private detectTable(content: string): DetectionResult {
    const lines = content.split('\n').filter(line => line.trim());

    // CSV detection
    if (this.detectCsv(content)) {
      return {
        type: 'csv',
        confidence: 0.8,
        metadata: { delimiter: ',' }
      };
    }

    // TSV detection
    if (this.detectTsv(content)) {
      return {
        type: 'tsv',
        confidence: 0.8,
        metadata: { delimiter: '\t' }
      };
    }

    // Markdown table detection
    const pipeLines = lines.filter(line => line.includes('|')).length;
    if (pipeLines >= 2 && pipeLines / lines.length > 0.5) {
      // Check for header separator
      const hasHeaderSeparator = lines.some(line =>
        line.match(/^\|?[\s]*:?-+:?[\s]*\|/)
      );

      return {
        type: 'table',
        confidence: hasHeaderSeparator ? 0.9 : 0.6,
        metadata: { format: 'markdown' }
      };
    }

    return { type: 'table', confidence: 0.0 };
  }

  private detectHtml(content: string): DetectionResult {
    const htmlTags = content.match(/<[^>]+>/g) || [];
    const totalLength = content.length;

    if (htmlTags.length === 0) {
      return { type: 'html', confidence: 0.0 };
    }

    // Calculate tag density
    const tagDensity = htmlTags.length / (totalLength / 100);

    // Check for common HTML structures
    const hasHtmlStructure = content.includes('<html>') ||
      content.includes('<!DOCTYPE') ||
      content.includes('<head>') ||
      content.includes('<body>');

    const hasCommonTags = ['<div>', '<p>', '<span>', '<a>', '<img>']
      .some(tag => content.includes(tag));

    let confidence = 0;

    if (hasHtmlStructure) confidence += 0.4;
    if (hasCommonTags) confidence += 0.3;
    if (tagDensity > 2) confidence += 0.3;

    return {
      type: 'html',
      confidence: Math.min(confidence, 1.0)
    };
  }

  private detectCsv(content: string): boolean {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return false;

    const commaLines = lines.filter(line => line.includes(',')).length;
    return commaLines / lines.length > 0.7;
  }

  private detectTsv(content: string): boolean {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return false;

    const tabLines = lines.filter(line => line.includes('\t')).length;
    return tabLines / lines.length > 0.7;
  }

  private detectLanguage(content: string): string {
    // Simple language detection based on patterns
    if (content.includes('function') && content.includes('{')) {
      if (content.includes('const') || content.includes('let')) {
        return 'javascript';
      }
      return 'javascript';
    }

    if (content.includes('def ') && content.includes(':')) {
      return 'python';
    }

    if (content.includes('public class') || content.includes('import java')) {
      return 'java';
    }

    if (content.includes('#include') || content.includes('int main')) {
      return 'c++';
    }

    if (content.includes('<?php')) {
      return 'php';
    }

    if (/SELECT\s+.*\s+FROM/i.test(content) ||
      /INSERT\s+INTO/i.test(content) ||
      /UPDATE\s+.*\s+SET/i.test(content) ||
      /DELETE\s+FROM/i.test(content)) {
      return 'sql';
    }

    return 'plain text';
  }

  private detectLatex(content: string): DetectionResult {
    let confidence = 0;
    const trimmed = content.trim();

    // LaTeX delimiters
    const inlineLatex = (trimmed.match(/\$[^$\n]+\$/g) || []).length;
    const blockLatex = (trimmed.match(/\$\$[\s\S]+?\$\$/g) || []).length;
    const environments = (trimmed.match(/\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g) || []).length;

    // Plus généreux pour les délimiteurs
    if (blockLatex > 0) confidence += 0.6;
    if (inlineLatex > 0) confidence += 0.5; // Augmenté pour inline
    if (environments > 0) confidence += 0.6;

    // LaTeX commands (plus de commandes communes)
    const latexCommands = [
      '\\frac', '\\sum', '\\int', '\\sqrt', '\\alpha', '\\beta', '\\gamma',
      '\\theta', '\\lambda', '\\mu', '\\sigma', '\\pi', '\\infty',
      '\\partial', '\\nabla', '\\times', '\\cdot', '\\leq', '\\geq',
      '\\neq', '\\approx', '\\equiv', '\\rightarrow', '\\leftarrow',
      // Ajout de commandes plus simples
      '\\mathbf', '\\mathrm', '\\text', '\\left', '\\right', '\\over'
    ];

    const commandMatches = latexCommands.filter(cmd =>
      trimmed.includes(cmd)
    ).length;

    if (commandMatches > 0) confidence += Math.min(commandMatches * 0.15, 0.4);

    // Math environments
    const mathEnvs = ['equation', 'align', 'matrix', 'cases', 'split', 'array'];
    const envMatches = mathEnvs.filter(env =>
      trimmed.includes(`\\begin{${env}}`) || trimmed.includes(`\\end{${env}}`)
    ).length;

    if (envMatches > 0) confidence += 0.4;

    // Bonus pour exposants/indices simples SEULEMENT si dans un contexte mathématique
    // Éviter les faux positifs avec Markdown (_ pour italique) et URLs (^ dans certains cas)
    if ((trimmed.includes('^') && /\$.*\^.*\$/.test(trimmed)) ||
      (trimmed.includes('_') && /\$.*_.*\$/.test(trimmed))) {
      confidence += 0.2;
    }

    // Bonus pour caractères mathématiques
    if (/[∫∑∏∆∇∂∞≤≥≠≈±×÷]/.test(trimmed)) confidence += 0.3;

    return {
      type: 'latex',
      confidence: Math.min(confidence, 1.0),
      metadata: {
        hasInlineLatex: inlineLatex > 0,
        hasBlockLatex: blockLatex > 0,
        hasEnvironments: environments > 0
      }
    };
  }

  private detectJson(content: string): DetectionResult {
    const trimmed = content.trim();

    try {
      // Try to parse as JSON
      const parsed = JSON.parse(trimmed);

      // Check if it's a meaningful JSON structure
      if (typeof parsed === 'object' && parsed !== null) {
        const isArray = Array.isArray(parsed);
        const isObject = !isArray && typeof parsed === 'object';

        let confidence = 0.8;

        // Boost confidence for complex structures
        if (isArray && parsed.length > 0) {
          confidence += 0.1;
        }

        if (isObject && Object.keys(parsed).length > 0) {
          confidence += 0.1;
        }

        return {
          type: 'json',
          confidence: Math.min(confidence, 1.0),
          metadata: {
            isArray,
            isObject,
            itemCount: isArray ? parsed.length : Object.keys(parsed).length
          }
        };
      }
    } catch {
      // Not valid JSON, check for JSON-like patterns
      let confidence = 0;

      // Check for JSON-like structure patterns
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        confidence += 0.3;
      }

      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        confidence += 0.3;
      }

      // Check for JSON-like key-value patterns
      const keyValuePattern = /"[^"]+"\s*:\s*[^,}]+/g;
      const keyValueMatches = (trimmed.match(keyValuePattern) || []).length;

      if (keyValueMatches > 0) {
        confidence += Math.min(keyValueMatches * 0.1, 0.4);
      }

      return {
        type: 'json',
        confidence: Math.min(confidence, 0.6), // Max 0.6 for invalid JSON
        metadata: {
          isValidJson: false,
          hasJsonLikeStructure: confidence > 0
        }
      };
    }

    return { type: 'json', confidence: 0.0 };
  }

  private isValidUrl(text: string): boolean {
    try {
      // Simple URL validation using regex
      const urlPattern = /^https?:\/\/[^\s<>"{}|\\^`[\]]+$/;
      return urlPattern.test(text) && text.includes('.');
    } catch {
      return false;
    }
  }

  private detectAudio(content: string): DetectionResult | null {
    const trimmed = content.trim();

    // Vérifier si c'est une URL
    if (!this.isValidUrl(trimmed)) {
      return null;
    }

    // Vérifier d'abord si c'est une plateforme de streaming (priorité aux bookmarks)
    if (this.isStreamingPlatform(trimmed)) {
      return null; // Laisser detectUrl s'en occuper
    }

    // Vérifier si c'est une URL audio directe
    if (this.isAudioUrl(trimmed)) {
      return {
        type: 'audio',
        confidence: 0.95, // Plus élevé que detectUrl pour avoir priorité
        metadata: {
          url: trimmed,
          isAudio: true
        }
      };
    }

    return null;
  }

  private isAudioUrl(url: string): boolean {
    // Extraire l'URL sans query params et fragments
    const cleanUrl = url.split(/[?#]/)[0];
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.oga', '.m4a', '.aac', '.flac', '.webm', '.opus', '.wma'];
    const lowerUrl = cleanUrl.toLowerCase();
    return audioExtensions.some(ext => lowerUrl.endsWith(ext));
  }

  private isStreamingPlatform(url: string): boolean {
    const platforms = [
      'spotify.com',
      'soundcloud.com',
      'apple.com/music',
      'youtube.com',
      'youtu.be',
      'deezer.com',
      'tidal.com'
    ];

    return platforms.some(platform => url.includes(platform));
  }
}