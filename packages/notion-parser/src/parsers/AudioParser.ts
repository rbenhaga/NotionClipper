/**
 * Parser spécialisé pour les fichiers audio
 */

import { BaseParser } from './BaseParser';
import type { ASTNode } from '../types/ast';
import type { ParseOptions } from '../types/options';
import type { AudioBlock } from '../types/notion';

export class AudioParser extends BaseParser {
  private static readonly SUPPORTED_FORMATS = [
    'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'
  ];

  private static readonly AUDIO_MIME_TYPES = [
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 
    'audio/aac', 'audio/flac', 'audio/webm'
  ];

  constructor(options: ParseOptions = {}) {
    super(options);
  }

  parse(content: string): ASTNode[] {
    const lines = content.split('\n').filter(line => line.trim());
    const nodes: ASTNode[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Détecter une URL (avec ou sans paramètres)
      if (trimmed.match(/^https?:\/\/[^\s]+$/i)) {
        try {
          const node = this.parseAudioUrl(trimmed);
          nodes.push(node);
        } catch (error) {
          // Si ce n'est pas une audio valide, créer un paragraph
          nodes.push({
            type: 'paragraph',
            content: trimmed,
            metadata: {},
            children: []
          });
        }
      } else {
        // Texte normal
        nodes.push({
          type: 'paragraph',
          content: trimmed,
          metadata: {},
          children: []
        });
      }
    }
    
    return nodes;
  }

  private parseAudioUrl(url: string): ASTNode {
    // Valider que c'est une URL
    if (!url.match(/^https?:\/\//i)) {
      throw new Error('Invalid audio URL: must start with http:// or https://');
    }
    
    // Vérifier d'abord les plateformes de streaming (priorité)
    const isStreamingPlatform = this.isStreamingPlatform(url);
    if (isStreamingPlatform) {
      // Les plateformes de streaming deviennent des bookmarks
      return {
        type: 'bookmark',
        content: url,
        metadata: { url },
        children: []
      };
    }
    
    // Ensuite vérifier si c'est un fichier audio direct
    const isDirectAudio = this.isAudioUrl(url);
    if (isDirectAudio) {
      return {
        type: 'audio',
        content: url,
        metadata: { url, isExternal: true },
        children: []
      };
    }
    
    // URL non audio -> paragraph pour préserver le contenu
    return {
      type: 'paragraph',
      content: url,
      metadata: {},
      children: []
    };
  }

  private extractUrls(content: string): string[] {
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    const matches = content.match(urlPattern) || [];
    
    return matches.filter(url => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });
  }

  private isAudioUrl(url: string): boolean {
    // Extraire l'URL sans query params et fragments
    const cleanUrl = url.split(/[?#]/)[0];
    
    const audioExtensions = [
      '.mp3', '.wav', '.ogg', '.oga', '.m4a', 
      '.aac', '.flac', '.webm', '.opus', '.wma'
    ];
    
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

  private createAudioNode(url: string): ASTNode {
    return {
      type: 'audio',
      content: url,
      metadata: {
        url,
        format: this.detectAudioFormat(url),
        isExternal: true
      },
      children: []
    };
  }

  private detectAudioFormat(url: string): string {
    try {
      const urlObj = new URL(url);
      const extension = urlObj.pathname.toLowerCase().split('.').pop();
      
      if (extension && AudioParser.SUPPORTED_FORMATS.includes(extension)) {
        return extension;
      }
      
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Valide si un fichier audio est supporté
   */
  static validateAudioFile(file: File): boolean {
    // Vérifier le type MIME
    if (AudioParser.AUDIO_MIME_TYPES.includes(file.type)) {
      return true;
    }
    
    // Vérifier l'extension
    const extension = file.name.toLowerCase().split('.').pop();
    return extension ? AudioParser.SUPPORTED_FORMATS.includes(extension) : false;
  }

  /**
   * Crée un bloc audio Notion depuis une URL
   */
  static createAudioBlock(url: string, caption?: string): AudioBlock {
    return {
      type: 'audio',
      audio: {
        type: 'external',
        external: {
          url
        },
        caption: caption ? [{
          type: 'text',
          text: {
            content: caption
          },
          annotations: {},
          plain_text: caption,
          href: null
        }] : []
      }
    };
  }
}