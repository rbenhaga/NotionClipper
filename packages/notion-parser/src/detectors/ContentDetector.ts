import type { DetectionOptions } from '../types';
import { MarkdownDetector } from './MarkdownDetector';

export type ContentType = 'markdown' | 'html' | 'code' | 'table' | 'csv' | 'tsv' | 'url' | 'latex' | 'json' | 'text';

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
      if (latexResult.confidence > 0.5) {
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
      if (codeResult.confidence > 0.7) {
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

    return results.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
  }

  private detectUrl(content: string): DetectionResult {
    const trimmed = content.trim();
    
    // Single URL
    if (this.isValidUrl(trimmed)) {
      return {
        type: 'url',
        confidence: 0.95,
        metadata: { url: trimmed }
      };
    }

    // Multiple URLs
    const urls = trimmed.split(/\s+/).filter(line => this.isValidUrl(line));
    if (urls.length > 0 && urls.length === trimmed.split(/\s+/).length) {
      return {
        type: 'url',
        confidence: 0.85,
        metadata: { urls }
      };
    }

    return { type: 'url', confidence: 0.0 };
  }

  private detectCode(content: string): DetectionResult {
    const lines = content.split('\n');
    let codeIndicators = 0;
    let totalLines = lines.length;

    // Code block markers
    if (content.includes('```')) {
      codeIndicators += 0.4;
    }

    // Indentation patterns
    const indentedLines = lines.filter(line => 
      line.match(/^[ ]{2,}/) || line.match(/^\t/)
    ).length;
    
    if (indentedLines / totalLines > 0.3) {
      codeIndicators += 0.3;
    }

    // Programming language keywords
    const codeKeywords = [
      'function', 'const', 'let', 'var', 'class', 'import', 'export',
      'if', 'else', 'for', 'while', 'return', 'try', 'catch',
      'def', 'class', 'import', 'from', 'return', 'if', 'else',
      'public', 'private', 'static', 'void', 'int', 'string'
    ];

    const keywordMatches = codeKeywords.filter(keyword => 
      content.includes(keyword)
    ).length;

    if (keywordMatches > 2) {
      codeIndicators += 0.3;
    }

    // Brackets and semicolons
    const brackets = (content.match(/[{}[\]()]/g) || []).length;
    const semicolons = (content.match(/;/g) || []).length;
    
    if (brackets > totalLines * 0.5 || semicolons > totalLines * 0.3) {
      codeIndicators += 0.2;
    }

    return {
      type: 'code',
      confidence: Math.min(codeIndicators, 1.0),
      metadata: { 
        language: this.detectLanguage(content)
      }
    };
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

    return 'plain text';
  }

  private detectLatex(content: string): DetectionResult {
    let confidence = 0;
    const trimmed = content.trim();

    // LaTeX delimiters
    const inlineLatex = (trimmed.match(/\$[^$]+\$/g) || []).length;
    const blockLatex = (trimmed.match(/\$\$[\s\S]+?\$\$/g) || []).length;
    const environments = (trimmed.match(/\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g) || []).length;

    if (blockLatex > 0) confidence += 0.4;
    if (inlineLatex > 0) confidence += 0.3;
    if (environments > 0) confidence += 0.4;

    // LaTeX commands
    const latexCommands = [
      '\\frac', '\\sum', '\\int', '\\sqrt', '\\alpha', '\\beta', '\\gamma',
      '\\theta', '\\lambda', '\\mu', '\\sigma', '\\pi', '\\infty',
      '\\partial', '\\nabla', '\\times', '\\cdot', '\\leq', '\\geq',
      '\\neq', '\\approx', '\\equiv', '\\rightarrow', '\\leftarrow'
    ];

    const commandMatches = latexCommands.filter(cmd => 
      trimmed.includes(cmd)
    ).length;

    if (commandMatches > 0) confidence += Math.min(commandMatches * 0.1, 0.3);

    // Math environments
    const mathEnvs = ['equation', 'align', 'matrix', 'cases', 'split'];
    const envMatches = mathEnvs.filter(env => 
      trimmed.includes(`\\begin{${env}}`) || trimmed.includes(`\\end{${env}}`)
    ).length;

    if (envMatches > 0) confidence += 0.3;

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
}