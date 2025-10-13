import { NotionConverter } from '../../src/converters/NotionConverter';
import type { ASTNode } from '../../src/types';

describe('Audio vs Video - Validation Différenciée', () => {
  let converter: NotionConverter;

  beforeEach(() => {
    converter = new NotionConverter();
  });

  describe('Audio: Validation Permissive', () => {
    test('Audio: Accepter fichiers .mp3 réels', () => {
      const validAudioUrls = [
        'https://cdn.example.org/podcast.mp3',
        'https://soundcloud.com/track.mp3',
        'https://storage.googleapis.com/audio.wav',
        'https://mysite.com/music.ogg',
        'https://cdn.mycompany.com/audio.m4a'
      ];

      validAudioUrls.forEach(url => {
        const node: ASTNode = {
          type: 'audio',
          content: '',
          metadata: { url }
        };

        const result = converter.convert([node]);
        expect(result[0].type).toBe('audio');
        expect((result[0] as any).audio.external.url).toBe(url);
      });
    });

    test('Audio: Rejeter URLs invalides', () => {
      const invalidAudioUrls = [
        'https://example.com/test.mp3',  // example.com
        'http://localhost/audio.mp3',     // localhost
        'https://127.0.0.1/audio.wav',   // IP locale
        'file:///path/to/audio.mp3',     // protocole file
        'https://test.com/music.ogg'     // test.com
      ];

      invalidAudioUrls.forEach(url => {
        const node: ASTNode = {
          type: 'audio',
          content: '',
          metadata: { url }
        };

        const result = converter.convert([node]);
        expect(result[0].type).toBe('bookmark');
        expect((result[0] as any).bookmark.url).toBe(url);
      });
    });

    test('Audio: Rejeter extensions non-audio', () => {
      const nonAudioUrls = [
        'https://mysite.com/video.mp4',
        'https://cdn.example.org/document.pdf',
        'https://storage.com/image.jpg'
      ];

      nonAudioUrls.forEach(url => {
        const node: ASTNode = {
          type: 'audio',
          content: '',
          metadata: { url }
        };

        const result = converter.convert([node]);
        expect(result[0].type).toBe('bookmark');
      });
    });
  });

  describe('Video: Validation Stricte', () => {
    test('Video: SEULEMENT plateformes d\'embedding', () => {
      const validVideoUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://vimeo.com/123456789',
        'https://www.vimeo.com/123456789',
        'https://dailymotion.com/video/x123456',
        'https://www.dailymotion.com/video/x123456',
        'https://twitch.tv/videos/123456789',
        'https://www.twitch.tv/videos/123456789'
      ];

      validVideoUrls.forEach(url => {
        const node: ASTNode = {
          type: 'video',
          content: '',
          metadata: { url }
        };

        const result = converter.convert([node]);
        expect(result[0].type).toBe('video');
        expect((result[0] as any).video.external.url).toBe(url);
      });
    });

    test('Video: REJETER fichiers .mp4 directs', () => {
      const invalidVideoUrls = [
        'https://storage.com/video.mp4',  // Fichier direct
        'https://cdn.example.com/movie.mp4',
        'https://www.mysite.com/video.mov',
        'https://s3.amazonaws.com/bucket/video.mp4'
      ];

      invalidVideoUrls.forEach(url => {
        const node: ASTNode = {
          type: 'video',
          content: '',
          metadata: { url }
        };

        const result = converter.convert([node]);
        // ❌ Rejeté car MP4 direct = problèmes potentiels
        expect(result[0].type).toBe('bookmark');
        expect((result[0] as any).bookmark.url).toBe(url);
      });
    });

    test('Video: REJETER domaines non-autorisés', () => {
      const invalidVideoUrls = [
        'https://facebook.com/video/123',
        'https://instagram.com/p/video123',
        'https://tiktok.com/@user/video/123',
        'https://mysite.com/embed/video'
      ];

      invalidVideoUrls.forEach(url => {
        const node: ASTNode = {
          type: 'video',
          content: '',
          metadata: { url }
        };

        const result = converter.convert([node]);
        expect(result[0].type).toBe('bookmark');
      });
    });
  });

  describe('Logique de Fallback', () => {
    test('URL ambiguë: Audio détecté en premier', () => {
      // URL qui pourrait être audio ou autre chose
      const audioUrl = 'https://cdn.mysite.com/content.mp3';
      
      const node: ASTNode = {
        type: 'file', // Type générique
        content: '',
        metadata: { url: audioUrl }
      };

      const result = converter.convert([node]);
      // Doit être détecté comme audio car extension .mp3
      expect(result[0].type).toBe('audio');
    });

    test('URL ambiguë: Video détecté après audio', () => {
      const videoUrl = 'https://youtube.com/watch?v=test';
      
      const node: ASTNode = {
        type: 'file', // Type générique
        content: '',
        metadata: { url: videoUrl }
      };

      const result = converter.convert([node]);
      // Doit être détecté comme video car domaine YouTube
      expect(result[0].type).toBe('video');
    });

    test('URL invalide: Fallback vers bookmark', () => {
      const invalidUrl = 'https://unknown-site.com/unknown-file.xyz';
      
      const node: ASTNode = {
        type: 'file',
        content: '',
        metadata: { url: invalidUrl }
      };

      const result = converter.convert([node]);
      // Ni audio ni video valide → bookmark
      expect(result[0].type).toBe('bookmark');
      expect((result[0] as any).bookmark.url).toBe(invalidUrl);
    });
  });

  describe('Conservation des Captions', () => {
    test('Audio avec caption', () => {
      const node: ASTNode = {
        type: 'audio',
        content: '',
        metadata: { 
          url: 'https://mysite.com/podcast.mp3',
          caption: 'Mon podcast favori'
        }
      };

      const result = converter.convert([node]);
      expect(result[0].type).toBe('audio');
      expect((result[0] as any).audio.caption).toEqual([{
        type: 'text',
        text: { content: 'Mon podcast favori' }
      }]);
    });

    test('Bookmark avec caption (fallback)', () => {
      const node: ASTNode = {
        type: 'video',
        content: '',
        metadata: { 
          url: 'https://invalid-site.com/video.mp4',
          caption: 'Vidéo rejetée'
        }
      };

      const result = converter.convert([node]);
      expect(result[0].type).toBe('bookmark');
      expect((result[0] as any).bookmark.caption).toEqual([{
        type: 'text',
        text: { content: 'Vidéo rejetée' }
      }]);
    });
  });
});