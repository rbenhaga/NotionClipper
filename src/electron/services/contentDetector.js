// Module UNIQUE de détection de type de contenu

class ContentDetector {
  constructor() {
    this.patterns = {
      url: /^https?:\/\/[^\s]+$/i,
      youtube: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
      vimeo: /vimeo\.com\/(\d+)/,
      imageExtension: /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff?)$/i,
      imageDataUrl: /^data:image\//,
      videoExtension: /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)$/i,
      audioExtension: /\.(mp3|wav|ogg|m4a|flac|aac|wma)$/i,
      documentExtension: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|odt)$/i,
      javascript: [ /^(function|const|let|var|class|import|export)\s/m, /=>\s*{/, /console\.(log|error|warn)/ ],
      python: [ /^(def|class|import|from)\s/m, /if\s+__name__\s*==/, /print\s*\(/ ],
      java: [ /^(public|private|protected)\s+(class|interface)/m, /System\.out\.println/, /import\s+java\./ ],
      cpp: [ /^#include\s*[<"]/m, /std::/, /cout\s*<</ ],
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
      html: /<(!DOCTYPE|html|head|body|div|span|p|a|img)/i,
      csv: /^[^,\n]+,[^,\n]+/,
      tsv: /^[^\t\n]+\t[^\t\n]+/
    };
  }

  detect(content) {
    if (!content) return { type: 'empty', subtype: null, confidence: 1 };
    if (Buffer.isBuffer(content) || (typeof Blob !== 'undefined' && content instanceof Blob)) {
      return { type: 'image', subtype: 'binary', confidence: 0.9 };
    }
    const text = typeof content === 'string' ? content : String(content);
    const trimmed = text.trim();

    if (this.patterns.imageDataUrl.test(trimmed)) {
      return { type: 'image', subtype: 'dataurl', confidence: 1 };
    }

    if (this.patterns.url.test(trimmed)) {
      return this.detectUrlType(trimmed);
    }

    const structured = this.detectStructuredData(trimmed);
    if (structured) return structured;

    const code = this.detectCode(trimmed);
    if (code) return code;

    const mdScore = this.getMarkdownScore(trimmed);
    if (mdScore > 0.5) return { type: 'markdown', subtype: null, confidence: mdScore };

    const table = this.detectTable(trimmed);
    if (table) return table;

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
    if (this.patterns.imageExtension.test(url)) return { type: 'url', subtype: 'image', confidence: 0.9 };
    if (this.patterns.videoExtension.test(url)) return { type: 'url', subtype: 'video', confidence: 0.9 };
    if (this.patterns.audioExtension.test(url)) return { type: 'url', subtype: 'audio', confidence: 0.9 };
    if (this.patterns.documentExtension.test(url)) return { type: 'url', subtype: 'document', confidence: 0.9 };
    return { type: 'url', subtype: 'generic', confidence: 0.8 };
  }

  detectStructuredData(content) {
    if (this.patterns.json.test(content)) {
      try { JSON.parse(content); return { type: 'json', subtype: null, confidence: 1 }; } catch {}
    }
    if (this.patterns.xml.test(content)) return { type: 'xml', subtype: null, confidence: 0.9 };
    if (this.patterns.html.test(content)) {
      const tagCount = (content.match(/<[^>]+>/g) || []).length;
      if (tagCount > 5) return { type: 'html', subtype: null, confidence: Math.min(tagCount / 10, 1) };
    }
    return null;
  }

  detectCode(content) {
    const languages = { javascript: this.patterns.javascript, python: this.patterns.python, java: this.patterns.java, cpp: this.patterns.cpp };
    let bestMatch = null; let bestScore = 0;
    for (const [language, patterns] of Object.entries(languages)) {
      let score = 0;
      for (const pattern of patterns) if (pattern.test(content)) score++;
      if (score > bestScore) { bestScore = score; bestMatch = language; }
    }
    if (bestMatch && bestScore >= 2) return { type: 'code', subtype: bestMatch, confidence: bestScore / 3 };
    const hasCodeStructure = /[{}\[\]();]/.test(content) && content.split('\n').some(line => line.startsWith('  ') || line.startsWith('\t'));
    if (hasCodeStructure) return { type: 'code', subtype: 'generic', confidence: 0.6 };
    return null;
  }

  getMarkdownScore(content) {
    let score = 0; let tests = 0;
    if (this.patterns.markdownHeader.test(content)) { score += 2; tests += 2; }
    if (this.patterns.markdownList.test(content)) { score += 1; tests += 1; }
    if (this.patterns.markdownBold.test(content)) { score += 1; tests += 1; }
    if (this.patterns.markdownLink.test(content)) { score += 1; tests += 1; }
    if (this.patterns.markdownCodeBlock.test(content)) { score += 2; tests += 2; }
    if (this.patterns.markdownTable.test(content)) { score += 1; tests += 1; }
    return tests > 0 ? score / tests : 0;
  }

  detectTable(content) {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) return null;
    if (this.patterns.csv.test(content)) {
      const firstLineCommas = (lines[0].match(/,/g) || []).length;
      if (firstLineCommas > 0 && lines.every(line => (line.match(/,/g) || []).length === firstLineCommas)) {
        return { type: 'table', subtype: 'csv', confidence: 0.9 };
      }
    }
    if (this.patterns.tsv.test(content)) {
      const firstLineTabs = (lines[0].match(/\t/g) || []).length;
      if (firstLineTabs > 0 && lines.every(line => (line.match(/\t/g) || []).length === firstLineTabs)) {
        return { type: 'table', subtype: 'tsv', confidence: 0.95 };
      }
    }
    if (this.patterns.markdownTable.test(content)) return { type: 'table', subtype: 'markdown', confidence: 0.8 };
    return null;
  }

  getType(content) { return this.detect(content).type; }
  getSubtype(content) { return this.detect(content).subtype; }
}

module.exports = new ContentDetector();


