// src/electron/services/contentDetector.js
// CORRECTIF pour améliorer la détection d'images

class ContentDetector {
  constructor() {
    this.patterns = {
      url: /^https?:\/\/[^\s]+$/i,
      youtube: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
      vimeo: /vimeo\.com\/(\d+)/,
      imageExtension: /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff?)$/i,
      // 🔥 AMÉLIORATION : Meilleure détection des data URLs
      imageDataUrl: /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/i,
      videoExtension: /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)$/i,
      audioExtension: /\.(mp3|wav|ogg|m4a|flac|aac|wma)$/i,
      documentExtension: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|odt)$/i,
      // Code patterns...
      javascript: [ /^(function|const|let|var|class|import|export)\s/m, /=>\s*{/, /console\.(log|error|warn)/ ],
      python: [ /^(def|class|import|from)\s/m, /if\s+__name__\s*==/, /print\s*\(/ ],
      java: [ /^(public|private|protected)\s+(class|interface)/m, /System\.out\.println/, /import\s+java\./ ],
      cpp: [ /^#include\s*[<"]/m, /std::/, /cout\s*<</ ],
      // Markdown patterns...
      markdownHeader: /^#{1,6}\s/m,
      markdownList: /^[\*\-\+]\s|^\d+\.\s/m,
      markdownBold: /\*\*[^*]+\*\*/,
      markdownItalic: /\*[^*\n]+\*/,
      markdownLink: /\[[^\]]+\]\([^)]+\)/,
      markdownImage: /!\[[^\]]*\]\([^)]+\)/,
      markdownQuote: /^>\s/m,
      markdownCodeBlock: /```[\s\S]*?```/,
      markdownTable: /^\|.*\|$/m,
      json: /^[\s]*[\{\[][\s\S]*[\}\]][\s]*$/,
      xml: /^<\?xml|^<[^>]+>/,
      csv: /^[^,\n]+,[^,\n]+/,
      tsv: /^[^\t\n]+\t[^\t\n]+/
    };
  }

  detect(content) {
    if (!content) return { type: 'empty', subtype: null, confidence: 1 };
    
    // 🔥 NOUVEAU : Vérifier Buffer en premier (priorité absolue)
    if (Buffer.isBuffer(content)) {
      console.log('🔍 Buffer détecté (image binaire)');
      return { type: 'image', subtype: 'buffer', confidence: 1 };
    }
    
    if (typeof Blob !== 'undefined' && content instanceof Blob) {
      console.log('🔍 Blob détecté');
      return { type: 'image', subtype: 'blob', confidence: 0.9 };
    }
    
    const text = typeof content === 'string' ? content : String(content);
    const trimmed = text.trim();

    // 🔥 AMÉLIORATION : Détection prioritaire des images data URL
    if (this.patterns.imageDataUrl.test(trimmed)) {
      // Extraire le type MIME
      const mimeMatch = trimmed.match(/^data:image\/([^;]+);base64,/);
      const imageType = mimeMatch ? mimeMatch[1] : 'unknown';
      
      console.log(`🔍 Data URL détecté (${imageType}, ${(trimmed.length / 1024).toFixed(2)} KB)`);
      
      return { 
        type: 'image', 
        subtype: 'dataurl',
        mimeType: `image/${imageType}`,
        confidence: 1,
        metadata: {
          size: trimmed.length,
          format: imageType
        }
      };
    }

    // URL normale
    if (this.patterns.url.test(trimmed)) {
      return this.detectUrlType(trimmed);
    }

    // Structured data
    const structured = this.detectStructuredData(trimmed);
    if (structured) return structured;

    // Code
    const code = this.detectCode(trimmed);
    if (code) return code;

    // Markdown
    const mdScore = this.getMarkdownScore(trimmed);
    if (mdScore > 0.5) {
      console.log('🔍 Markdown détecté (score:', mdScore, ')');
      return { type: 'markdown', subtype: null, confidence: mdScore };
    }

    // Table
    const table = this.detectTable(trimmed);
    if (table) return table;

    // Texte par défaut
    console.log('🔍 Texte simple détecté');
    return { type: 'text', subtype: 'plain', confidence: 0.5 };
  }

  detectUrlType(url) {
    if (this.patterns.youtube.test(url)) {
      const videoId = url.match(this.patterns.youtube)?.[1];
      return { type: 'url', subtype: 'youtube', confidence: 1, metadata: { videoId } };
    }
    if (this.patterns.vimeo.test(url)) {
      const videoId = url.match(this.patterns.vimeo)?.[1];
      return { type: 'url', subtype: 'vimeo', confidence: 1, metadata: { videoId } };
    }
    if (this.patterns.imageExtension.test(url)) {
      return { type: 'url', subtype: 'image', confidence: 0.95 };
    }
    if (this.patterns.videoExtension.test(url)) {
      return { type: 'url', subtype: 'video', confidence: 0.9 };
    }
    return { type: 'url', subtype: 'generic', confidence: 0.8 };
  }

  detectStructuredData(text) {
    // ✅ SÉCURITÉ : Vérifier que c'est bien une string
    if (typeof text !== 'string' || !text || text.length < 2) {
      return null;
    }
    
    // JSON
    if (this.patterns.json && this.patterns.json.test(text)) {
      try {
        JSON.parse(text);
        return { type: 'json', subtype: null, confidence: 1 };
      } catch {
        // Pas du JSON valide
      }
    }
    
    // XML
    if (this.patterns.xml && this.patterns.xml.test(text)) {
      return { type: 'xml', subtype: null, confidence: 0.9 };
    }
    
    // HTML
    if (this.patterns.html && this.patterns.html.test(text)) {
      return { type: 'html', subtype: null, confidence: 0.85 };
    }
    
    return null;
  }

  detectCode(text) {
    // Tester chaque langage
    const languages = [
      { name: 'javascript', patterns: this.patterns.javascript },
      { name: 'python', patterns: this.patterns.python },
      { name: 'java', patterns: this.patterns.java },
      { name: 'cpp', patterns: this.patterns.cpp }
    ];
    
    for (const lang of languages) {
      if (lang.patterns.some(pattern => pattern.test(text))) {
        return { type: 'code', subtype: lang.name, confidence: 0.8 };
      }
    }
    
    return null;
  }

  getMarkdownScore(text) {
    let score = 0;
    const checks = [
      { pattern: this.patterns.markdownHeader, weight: 0.3 },
      { pattern: this.patterns.markdownList, weight: 0.2 },
      { pattern: this.patterns.markdownBold, weight: 0.1 },
      { pattern: this.patterns.markdownLink, weight: 0.2 },
      { pattern: this.patterns.markdownCodeBlock, weight: 0.2 }
    ];
    
    for (const check of checks) {
      if (check.pattern.test(text)) {
        score += check.weight;
      }
    }
    
    return Math.min(score, 1);
  }

  detectTable(text) {
    const lines = text.split('\n');
    if (lines.length < 2) return null;
    
    // CSV
    const commaCounts = lines.map(line => (line.match(/,/g) || []).length);
    if (commaCounts.length > 1 && commaCounts.every((count, idx) => 
      count === commaCounts[0] && count > 0
    )) {
      return { type: 'table', subtype: 'csv', confidence: 0.9 };
    }
    
    // TSV
    const tabCounts = lines.map(line => (line.match(/\t/g) || []).length);
    if (tabCounts.length > 1 && tabCounts.every((count, idx) => 
      count === tabCounts[0] && count > 0
    )) {
      return { type: 'table', subtype: 'tsv', confidence: 0.9 };
    }
    
    // Markdown table
    if (this.patterns.markdownTable.test(text)) {
      return { type: 'table', subtype: 'markdown', confidence: 0.85 };
    }
    
    return null;
  }
}

module.exports = new ContentDetector();