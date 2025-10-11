/**
 * Utilitaires pour le traitement de texte
 */

export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }

  const truncateLength = maxLength - suffix.length;
  let truncated = text.substring(0, truncateLength);
  
  // Essayer de couper à un espace pour éviter de couper les mots
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  if (lastSpaceIndex > truncateLength * 0.8) {
    truncated = truncated.substring(0, lastSpaceIndex);
  }
  
  return truncated + suffix;
}

export function splitTextIntoChunks(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remainingText = text;

  while (remainingText.length > 0) {
    if (remainingText.length <= maxLength) {
      chunks.push(remainingText);
      break;
    }

    let chunk = remainingText.substring(0, maxLength);
    
    // Essayer de couper à un paragraphe
    const lastDoubleNewline = chunk.lastIndexOf('\n\n');
    if (lastDoubleNewline > maxLength * 0.5) {
      chunk = chunk.substring(0, lastDoubleNewline);
    }
    // Sinon, essayer de couper à une phrase
    else {
      const lastSentenceEnd = Math.max(
        chunk.lastIndexOf('. '),
        chunk.lastIndexOf('! '),
        chunk.lastIndexOf('? ')
      );
      if (lastSentenceEnd > maxLength * 0.7) {
        chunk = chunk.substring(0, lastSentenceEnd + 1);
      }
      // Sinon, couper à un espace
      else {
        const lastSpace = chunk.lastIndexOf(' ');
        if (lastSpace > maxLength * 0.8) {
          chunk = chunk.substring(0, lastSpace);
        }
      }
    }

    chunks.push(chunk);
    remainingText = remainingText.substring(chunk.length).trim();
  }

  return chunks;
}

export function cleanHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/[ ]+/g, ' ')
    .trim();
}

export function removeEmptyLines(text: string): string {
  return text
    .split('\n')
    .filter(line => line.trim())
    .join('\n');
}

export function isValidUrl(text: string): boolean {
  try {
    const urlPattern = /^https?:\/\/[^\s<>"{}|\\^`[\]]+$/;
    return urlPattern.test(text) && text.includes('.');
  } catch {
    return false;
  }
}

export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  return text.match(urlRegex) || [];
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

export function countLines(text: string): number {
  return text.split('\n').length;
}

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function unescapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™'
  };

  return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
    return htmlEntities[entity] || entity;
  });
}