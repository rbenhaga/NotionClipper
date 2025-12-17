/**
 * MediaUrlParser - Service for parsing and detecting media URLs
 * Extracted from NotionClipboardEditor.tsx (lines 4030-4250)
 * 
 * Supports: YouTube, Spotify, Vimeo, SoundCloud, Google Drive, Figma, Loom, GitHub Gist, Google Maps
 */

import { MediaType, MediaMetadata, SpotifyData, GoogleDriveData, GistData } from './types';

export class MediaUrlParser {
  // ============================================
  // MAIN PARSE METHOD
  // ============================================

  /**
   * Parse a URL and return metadata if it's a recognized media URL
   */
  static parse(url: string): MediaMetadata | null {
    if (!url || typeof url !== 'string') return null;
    
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return null;

    // YouTube
    if (MediaUrlParser.isYouTubeUrl(trimmedUrl)) {
      const id = MediaUrlParser.extractYouTubeId(trimmedUrl);
      if (id) {
        return {
          type: MediaType.YOUTUBE,
          id,
          url: trimmedUrl,
          embedUrl: MediaUrlParser.generateYouTubeEmbedUrl(id),
          thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
        };
      }
    }

    // Vimeo
    if (MediaUrlParser.isVimeoUrl(trimmedUrl)) {
      const id = MediaUrlParser.extractVimeoId(trimmedUrl);
      if (id) {
        return {
          type: MediaType.VIMEO,
          id,
          url: trimmedUrl,
          embedUrl: MediaUrlParser.generateVimeoEmbedUrl(id)
        };
      }
    }

    // Spotify
    if (MediaUrlParser.isSpotifyUrl(trimmedUrl)) {
      const data = MediaUrlParser.extractSpotifyData(trimmedUrl);
      if (data) {
        return {
          type: MediaType.SPOTIFY,
          id: data.id,
          url: trimmedUrl,
          embedUrl: MediaUrlParser.generateSpotifyEmbedUrl(data)
        };
      }
    }

    // SoundCloud
    if (MediaUrlParser.isSoundCloudUrl(trimmedUrl)) {
      return {
        type: MediaType.SOUNDCLOUD,
        id: trimmedUrl, // SoundCloud doesn't have simple IDs
        url: trimmedUrl
      };
    }

    // Google Drive
    if (MediaUrlParser.isGoogleDriveUrl(trimmedUrl)) {
      const data = MediaUrlParser.extractGoogleDriveData(trimmedUrl);
      if (data) {
        return {
          type: MediaType.GOOGLE_DRIVE,
          id: data.fileId,
          url: trimmedUrl,
          embedUrl: MediaUrlParser.generateGoogleDriveEmbedUrl(data)
        };
      }
    }

    // Figma
    if (MediaUrlParser.isFigmaUrl(trimmedUrl)) {
      const key = MediaUrlParser.extractFigmaKey(trimmedUrl);
      if (key) {
        return {
          type: MediaType.FIGMA,
          id: key,
          url: trimmedUrl,
          embedUrl: MediaUrlParser.generateFigmaEmbedUrl(trimmedUrl)
        };
      }
    }

    // Loom
    if (MediaUrlParser.isLoomUrl(trimmedUrl)) {
      const id = MediaUrlParser.extractLoomId(trimmedUrl);
      if (id) {
        return {
          type: MediaType.LOOM,
          id,
          url: trimmedUrl,
          embedUrl: MediaUrlParser.generateLoomEmbedUrl(id)
        };
      }
    }

    // GitHub Gist
    if (MediaUrlParser.isGitHubGistUrl(trimmedUrl)) {
      const data = MediaUrlParser.extractGistData(trimmedUrl);
      if (data) {
        return {
          type: MediaType.GIST,
          id: data.gistId,
          url: trimmedUrl,
          embedUrl: `${trimmedUrl}.js`
        };
      }
    }

    // Google Maps
    if (MediaUrlParser.isGoogleMapsUrl(trimmedUrl)) {
      const embedUrl = MediaUrlParser.extractGoogleMapsEmbedUrl(trimmedUrl);
      return {
        type: MediaType.GOOGLE_MAPS,
        id: trimmedUrl,
        url: trimmedUrl,
        embedUrl: embedUrl || undefined
      };
    }

    // PDF
    if (MediaUrlParser.isPdfUrl(trimmedUrl)) {
      return {
        type: MediaType.PDF,
        id: trimmedUrl,
        url: trimmedUrl
      };
    }

    return null;
  }

  // ============================================
  // YOUTUBE METHODS
  // ============================================

  /**
   * Check if URL is a YouTube video URL
   */
  static isYouTubeUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)/.test(url);
  }

  /**
   * Extract YouTube video ID from URL
   */
  static extractYouTubeId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Generate YouTube embed URL
   */
  static generateYouTubeEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  // ============================================
  // VIMEO METHODS
  // ============================================

  /**
   * Check if URL is a Vimeo video URL
   */
  static isVimeoUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?vimeo\.com\/\d+/.test(url);
  }

  /**
   * Extract Vimeo video ID from URL
   */
  static extractVimeoId(url: string): string | null {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Generate Vimeo embed URL
   */
  static generateVimeoEmbedUrl(videoId: string): string {
    return `https://player.vimeo.com/video/${videoId}`;
  }

  // ============================================
  // SPOTIFY METHODS
  // ============================================

  /**
   * Check if URL is a Spotify URL
   */
  static isSpotifyUrl(url: string): boolean {
    return /^https?:\/\/(open\.)?spotify\.com\/(track|album|playlist|artist|episode|show)\//.test(url);
  }

  /**
   * Extract Spotify type and ID from URL
   */
  static extractSpotifyData(url: string): SpotifyData | null {
    const match = url.match(/spotify\.com\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/);
    if (match) {
      return { type: match[1] as SpotifyData['type'], id: match[2] };
    }
    return null;
  }

  /**
   * Generate Spotify embed URL
   */
  static generateSpotifyEmbedUrl(data: SpotifyData): string {
    return `https://open.spotify.com/embed/${data.type}/${data.id}`;
  }

  // ============================================
  // SOUNDCLOUD METHODS
  // ============================================

  /**
   * Check if URL is a SoundCloud URL
   */
  static isSoundCloudUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?soundcloud\.com\//.test(url);
  }

  // ============================================
  // GOOGLE DRIVE METHODS
  // ============================================

  /**
   * Check if URL is a Google Drive URL
   */
  static isGoogleDriveUrl(url: string): boolean {
    return /^https?:\/\/(drive\.google\.com|docs\.google\.com)\/(file|document|spreadsheets|presentation|forms)/.test(url);
  }

  /**
   * Extract Google Drive file ID and type from URL
   */
  static extractGoogleDriveData(url: string): GoogleDriveData | null {
    // Handle drive.google.com/file/d/{fileId}/view
    const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      return { fileId: fileMatch[1], type: 'file' };
    }
    
    // Handle docs.google.com/document/d/{fileId}
    const docMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (docMatch) {
      return { fileId: docMatch[1], type: 'document' };
    }
    
    // Handle docs.google.com/spreadsheets/d/{fileId}
    const sheetMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (sheetMatch) {
      return { fileId: sheetMatch[1], type: 'spreadsheet' };
    }
    
    // Handle docs.google.com/presentation/d/{fileId}
    const slideMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (slideMatch) {
      return { fileId: slideMatch[1], type: 'presentation' };
    }
    
    // Handle docs.google.com/forms/d/{fileId}
    const formMatch = url.match(/docs\.google\.com\/forms\/d\/([a-zA-Z0-9_-]+)/);
    if (formMatch) {
      return { fileId: formMatch[1], type: 'form' };
    }
    
    return null;
  }

  /**
   * Generate Google Drive embed URL
   */
  static generateGoogleDriveEmbedUrl(data: GoogleDriveData): string {
    switch (data.type) {
      case 'file':
        return `https://drive.google.com/file/d/${data.fileId}/preview`;
      case 'document':
        return `https://docs.google.com/document/d/${data.fileId}/preview`;
      case 'spreadsheet':
        return `https://docs.google.com/spreadsheets/d/${data.fileId}/preview`;
      case 'presentation':
        return `https://docs.google.com/presentation/d/${data.fileId}/preview`;
      case 'form':
        return `https://docs.google.com/forms/d/${data.fileId}/viewform?embedded=true`;
      default:
        return `https://drive.google.com/file/d/${data.fileId}/preview`;
    }
  }

  // ============================================
  // FIGMA METHODS
  // ============================================

  /**
   * Check if URL is a Figma URL
   */
  static isFigmaUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?figma\.com\/(file|proto|design)\//.test(url);
  }

  /**
   * Extract Figma file key from URL
   */
  static extractFigmaKey(url: string): string | null {
    const match = url.match(/figma\.com\/(file|proto|design)\/([a-zA-Z0-9]+)/);
    return match ? match[2] : null;
  }

  /**
   * Generate Figma embed URL
   */
  static generateFigmaEmbedUrl(url: string): string {
    return `https://www.figma.com/embed?embed_host=notion&url=${encodeURIComponent(url)}`;
  }

  // ============================================
  // LOOM METHODS
  // ============================================

  /**
   * Check if URL is a Loom URL
   */
  static isLoomUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?loom\.com\/(share|embed)\//.test(url);
  }

  /**
   * Extract Loom video ID from URL
   */
  static extractLoomId(url: string): string | null {
    const match = url.match(/loom\.com\/(share|embed)\/([a-zA-Z0-9]+)/);
    return match ? match[2] : null;
  }

  /**
   * Generate Loom embed URL
   */
  static generateLoomEmbedUrl(videoId: string): string {
    return `https://www.loom.com/embed/${videoId}`;
  }

  // ============================================
  // GITHUB GIST METHODS
  // ============================================

  /**
   * Check if URL is a GitHub Gist URL
   */
  static isGitHubGistUrl(url: string): boolean {
    return /^https?:\/\/gist\.github\.com\//.test(url);
  }

  /**
   * Extract GitHub Gist ID from URL
   */
  static extractGistData(url: string): GistData | null {
    const match = url.match(/gist\.github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9]+)/);
    if (match) {
      return { user: match[1], gistId: match[2] };
    }
    return null;
  }

  // ============================================
  // GOOGLE MAPS METHODS
  // ============================================

  /**
   * Check if URL is a Google Maps URL
   */
  static isGoogleMapsUrl(url: string): boolean {
    return /^https?:\/\/(www\.)?(google\.com\/maps|maps\.google\.com|goo\.gl\/maps)/.test(url);
  }

  /**
   * Extract Google Maps embed URL
   */
  static extractGoogleMapsEmbedUrl(url: string): string | null {
    // Handle google.com/maps/place/... URLs
    if (url.includes('google.com/maps')) {
      // Extract coordinates from URL
      const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      
      if (coordMatch) {
        const lat = coordMatch[1];
        const lng = coordMatch[2];
        return `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1000!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1`;
      }
      
      // Extract place from URL
      const placeMatch = url.match(/place\/([^\/]+)/);
      if (placeMatch) {
        const place = encodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
        return `https://www.google.com/maps/embed/v1/place?key=GOOGLE_MAPS_API_KEY_PLACEHOLDER&q=${place}`;
      }
    }
    
    return null;
  }

  // ============================================
  // PDF METHODS
  // ============================================

  /**
   * Check if URL is a PDF URL
   */
  static isPdfUrl(url: string): boolean {
    return /\.pdf(\?.*)?$/i.test(url) || /^https?:\/\/.*\/.*\.pdf/i.test(url);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Generate embed URL for any supported media type
   */
  static generateEmbedUrl(metadata: MediaMetadata): string | null {
    if (metadata.embedUrl) return metadata.embedUrl;

    switch (metadata.type) {
      case MediaType.YOUTUBE:
        return MediaUrlParser.generateYouTubeEmbedUrl(metadata.id);
      case MediaType.VIMEO:
        return MediaUrlParser.generateVimeoEmbedUrl(metadata.id);
      case MediaType.LOOM:
        return MediaUrlParser.generateLoomEmbedUrl(metadata.id);
      default:
        return null;
    }
  }

  /**
   * Extract domain from URL for display purposes
   */
  static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }
}
