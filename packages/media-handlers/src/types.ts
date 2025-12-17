/**
 * Supported media types for URL parsing
 */
export enum MediaType {
  YOUTUBE = 'youtube',
  VIMEO = 'vimeo',
  SPOTIFY = 'spotify',
  SOUNDCLOUD = 'soundcloud',
  GOOGLE_DRIVE = 'google-drive',
  FIGMA = 'figma',
  LOOM = 'loom',
  GIST = 'gist',
  GOOGLE_MAPS = 'google-maps',
  PDF = 'pdf',
  UNKNOWN = 'unknown'
}

/**
 * Metadata extracted from a media URL
 */
export interface MediaMetadata {
  type: MediaType;
  id: string;
  url: string;
  embedUrl?: string;
  title?: string;
  thumbnail?: string;
}

/**
 * Spotify-specific data with resource type
 */
export interface SpotifyData {
  type: 'track' | 'album' | 'playlist' | 'artist' | 'episode' | 'show';
  id: string;
}

/**
 * Google Drive-specific data with file type
 */
export interface GoogleDriveData {
  fileId: string;
  type: 'file' | 'document' | 'spreadsheet' | 'presentation' | 'form';
}

/**
 * GitHub Gist-specific data
 */
export interface GistData {
  user: string;
  gistId: string;
}
