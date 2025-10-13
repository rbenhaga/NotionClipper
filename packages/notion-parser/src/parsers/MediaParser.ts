import type { TokenStream } from '../types/tokens';
import type { ASTNode } from '../types/ast';
import { BaseBlockParser } from './BlockParser';

/**
 * Parser pour les médias (images, vidéos, audio, bookmarks)
 */
export class MediaParser extends BaseBlockParser {
  priority = 85;

  canParse(stream: TokenStream): boolean {
    const token = stream.peek();
    return token?.type === 'IMAGE' || 
           token?.type === 'VIDEO' || 
           token?.type === 'AUDIO' || 
           token?.type === 'BOOKMARK';
  }

  parse(stream: TokenStream): ASTNode | null {
    const token = this.consumeToken(stream);
    if (!token) return null;

    const url = token.metadata?.url || token.content;
    const alt = token.metadata?.alt || '';
    const title = token.metadata?.title || '';

    switch (token.type) {
      case 'IMAGE':
        return this.createImageNode(url, alt, title);
      
      case 'VIDEO':
        return this.createVideoNode(url, title);
      
      case 'AUDIO':
        return this.createAudioNode(url, title);
      
      case 'BOOKMARK':
        return this.createBookmarkNode(url, title);
      
      default:
        return null;
    }
  }

  private createImageNode(url: string, alt: string, title: string): ASTNode {
    return this.createNode('image', '', {
      url: this.sanitizeUrl(url),
      alt,
      title,
      mediaType: 'image'
    });
  }

  private createVideoNode(url: string, title: string): ASTNode {
    const videoType = this.detectVideoType(url);
    
    return this.createNode('video', '', {
      url: this.sanitizeUrl(url),
      title,
      mediaType: 'video',
      videoType,
      isEmbeddable: this.isEmbeddableVideo(url)
    });
  }

  private createAudioNode(url: string, title: string): ASTNode {
    return this.createNode('audio', '', {
      url: this.sanitizeUrl(url),
      title,
      mediaType: 'audio',
      isStreamable: this.isStreamableAudio(url)
    });
  }

  private createBookmarkNode(url: string, title: string): ASTNode {
    return this.createNode('bookmark', '', {
      url: this.sanitizeUrl(url),
      title: title || url,
      mediaType: 'bookmark'
    });
  }

  /**
   * Détecte le type de vidéo
   */
  private detectVideoType(url: string): string {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.includes('vimeo.com')) {
      return 'vimeo';
    }
    if (url.includes('dailymotion.com')) {
      return 'dailymotion';
    }
    if (url.match(/\.(mp4|webm|ogg|avi|mov)(\?|$)/i)) {
      return 'direct';
    }
    return 'unknown';
  }

  /**
   * Vérifie si la vidéo est embeddable
   */
  private isEmbeddableVideo(url: string): boolean {
    const embeddableHosts = [
      'youtube.com', 'youtu.be',
      'vimeo.com',
      'dailymotion.com',
      'twitch.tv'
    ];
    
    return embeddableHosts.some(host => url.includes(host));
  }

  /**
   * Vérifie si l'audio est streamable
   */
  private isStreamableAudio(url: string): boolean {
    // La plupart des formats audio modernes sont streamables
    return url.match(/\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i) !== null;
  }

  /**
   * Sanitize une URL
   */
  private sanitizeUrl(url: string): string {
    try {
      // Validation basique de l'URL
      const urlObj = new URL(url);
      
      // Vérifier le protocole
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return '';
      }
      
      return urlObj.toString();
    } catch {
      // URL invalide
      return '';
    }
  }
}

/**
 * Parser spécialisé pour les images inline ![alt](url)
 */
export class InlineImageParser extends BaseBlockParser {
  priority = 90;

  canParse(stream: TokenStream): boolean {
    const token = stream.peek();
    return token?.type === 'IMAGE' && this.isInlineContext(stream);
  }

  parse(stream: TokenStream): ASTNode | null {
    const token = this.consumeToken(stream);
    if (!token) return null;

    const url = token.metadata?.url || token.content;
    const alt = token.metadata?.alt || '';

    // Pour les images inline, créer un nœud texte avec l'image en markdown
    // Sera traité par RichTextBuilder
    return this.createNode('text', `![${alt}](${url})`);
  }

  private isInlineContext(stream: TokenStream): boolean {
    // Vérifier si on est dans un contexte inline (paragraphe, liste, etc.)
    // Pour l'instant, toujours retourner false pour traiter comme bloc
    return false;
  }
}