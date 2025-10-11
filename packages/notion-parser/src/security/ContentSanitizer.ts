/**
 * ContentSanitizer - Sécurité pour le Cahier des Charges v2.1
 * Sanitise le contenu malveillant (XSS, injection, etc.)
 */

export class ContentSanitizer {
  private static readonly DANGEROUS_PROTOCOLS = [
    'javascript:',
    'vbscript:',
    'data:text/html',
    'data:application/javascript'
  ];

  private static readonly DANGEROUS_TAGS = [
    '<script',
    '</script>',
    '<iframe',
    '</iframe>',
    '<object',
    '</object>',
    '<embed',
    '</embed>'
  ];

  private static readonly DANGEROUS_ATTRIBUTES = [
    'onclick',
    'onload',
    'onerror',
    'onmouseover',
    'onfocus',
    'onblur',
    'onchange',
    'onsubmit'
  ];

  private static readonly FORMULA_PREFIXES = [
    '=',
    '+',
    '-',
    '@'
  ];

  /**
   * Sanitise le contenu texte
   */
  static sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    let sanitized = text;

    // Supprimer les balises dangereuses (plus agressif)
    this.DANGEROUS_TAGS.forEach(tag => {
      const regex = new RegExp(tag.replace('<', '\\<').replace('>', '\\>'), 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    // Supprimer les attributs dangereux (plus agressif)
    this.DANGEROUS_ATTRIBUTES.forEach(attr => {
      const regex = new RegExp(`${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
      sanitized = sanitized.replace(regex, '');
      // Aussi sans quotes
      const regex2 = new RegExp(`${attr}\\s*=\\s*[^\\s>]*`, 'gi');
      sanitized = sanitized.replace(regex2, '');
    });

    // Supprimer les caractères de contrôle
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

    // Supprimer les balises HTML complètes
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    return sanitized;
  }

  /**
   * Sanitise une URL
   */
  static sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      return '';
    }

    const lowerUrl = url.toLowerCase();

    // Bloquer les protocoles dangereux
    for (const protocol of this.DANGEROUS_PROTOCOLS) {
      if (lowerUrl.startsWith(protocol)) {
        return ''; // URL bloquée
      }
    }

    // Valider que c'est une URL HTTP/HTTPS valide
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return '';
      }
      return url;
    } catch {
      return ''; // URL invalide
    }
  }

  /**
   * Sanitise le contenu d'une cellule de table (protection CSV injection)
   */
  static sanitizeTableCell(cell: string): string {
    if (!cell || typeof cell !== 'string') {
      return '';
    }

    let sanitized = this.sanitizeText(cell);

    // Supprimer les préfixes de formule dangereux
    if (this.FORMULA_PREFIXES.some(prefix => sanitized.startsWith(prefix))) {
      sanitized = sanitized.substring(1); // Supprimer le premier caractère
    }

    // Supprimer les commandes dangereuses
    const dangerousCommands = ['cmd', 'calc', 'HYPERLINK', 'SUM', 'EXEC'];
    dangerousCommands.forEach(cmd => {
      const regex = new RegExp(cmd, 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    return sanitized;
  }

  /**
   * Sanitise le contenu complet (utilisé par les parsers)
   */
  static sanitizeContent(content: string): string {
    if (!content || typeof content !== 'string') {
      return '';
    }

    let sanitized = content;

    // Sanitisation générale du texte
    sanitized = this.sanitizeText(sanitized);

    // Normalisation Unicode pour éviter les bypasses
    sanitized = sanitized.normalize('NFC');

    return sanitized;
  }

  /**
   * Vérifie si une URL est sûre
   */
  static isUrlSafe(url: string): boolean {
    return this.sanitizeUrl(url) === url;
  }

  /**
   * Vérifie si le contenu contient des éléments dangereux
   */
  static containsDangerousContent(content: string): boolean {
    if (!content || typeof content !== 'string') {
      return false;
    }

    const lowerContent = content.toLowerCase();

    // Vérifier les balises dangereuses
    if (this.DANGEROUS_TAGS.some(tag => lowerContent.includes(tag))) {
      return true;
    }

    // Vérifier les attributs dangereux
    if (this.DANGEROUS_ATTRIBUTES.some(attr => lowerContent.includes(attr))) {
      return true;
    }

    // Vérifier les protocoles dangereux
    if (this.DANGEROUS_PROTOCOLS.some(protocol => lowerContent.includes(protocol))) {
      return true;
    }

    return false;
  }
}