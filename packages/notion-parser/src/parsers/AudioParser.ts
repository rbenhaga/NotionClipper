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
    const urls = this.extractUrls(content);
    const audioUrls = urls.filter(url => this.isAudioUrl(url));
    
    return audioUrls.map(url => this.createAudioNode(url));
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
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      
      // Vérifier l'extension
      const extension = pathname.split('.').pop();
      if (extension && AudioParser.SUPPORTED_FORMATS.includes(extension)) {
        return true;
      }
      
      // Vérifier les services audio connus
      const audioServices = [
        'soundcloud.com',
        'spotify.com',
        'apple.com/music',
        'music.youtube.com',
        'bandcamp.com'
      ];
      
      return audioServices.some(service => urlObj.hostname.includes(service));
    } catch {
      return false;
    }
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