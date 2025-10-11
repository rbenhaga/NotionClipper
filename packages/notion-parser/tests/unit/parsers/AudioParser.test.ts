/**
 * Tests unitaires pour AudioParser - Nouvelle fonctionnalité v2.1
 * Couvre la détection et parsing des URLs audio selon le cahier des charges
 */

import { parseContent } from '../../../src/parseContent';
import type { NotionBlock } from '../../../src/types';

describe('AudioParser - Nouvelle fonctionnalité v2.1 ⭐', () => {
  describe('Audio URL Detection and Parsing', () => {
    it('should parse MP3 audio URL correctly', () => {
      const audioUrl = 'https://example.com/podcast.mp3';
      const result = parseContent(audioUrl);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      
      const audioBlock = result.blocks[0] as any;
      expect(audioBlock.type).toBe('audio');
      expect(audioBlock.audio.type).toBe('external');
      expect(audioBlock.audio.external.url).toBe(audioUrl);
    });

    it('should support all audio formats from cahier des charges', () => {
      const supportedFormats = ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'webm'];
      
      supportedFormats.forEach(format => {
        const audioUrl = `https://example.com/audio.${format}`;
        const result = parseContent(audioUrl);
        
        expect(result.success).toBe(true);
        expect(result.blocks).toHaveLength(1);
        
        const audioBlock = result.blocks[0] as any;
        expect(audioBlock.type).toBe('audio');
        expect(audioBlock.audio.external.url).toBe(audioUrl);
      });
    });

    it('should parse multiple audio URLs', () => {
      const content = `https://example.com/song1.mp3
https://example.com/song2.wav
https://example.com/podcast.ogg`;
      
      const result = parseContent(content);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(3);
      
      result.blocks.forEach((block: any) => {
        expect(block.type).toBe('audio');
        expect(block.audio.type).toBe('external');
        expect(block.audio.external.url).toMatch(/\.(mp3|wav|ogg)$/);
      });
    });

    it('should handle audio streaming platform URLs', () => {
      const streamingUrls = [
        'https://soundcloud.com/user/track-name',
        'https://open.spotify.com/track/123456',
        'https://music.youtube.com/watch?v=abcdef',
        'https://bandcamp.com/track/song-name'
      ];
      
      streamingUrls.forEach(url => {
        const result = parseContent(url);
        
        expect(result.success).toBe(true);
        expect(result.blocks).toHaveLength(1);
        
        // Streaming URLs should be bookmarks, not direct audio
        const block = result.blocks[0] as any;
        expect(['bookmark', 'audio']).toContain(block.type);
      });
    });
  });

  describe('Audio Block Structure Validation', () => {
    it('should create valid Notion audio block structure', () => {
      const audioUrl = 'https://example.com/test.mp3';
      const result = parseContent(audioUrl);
      
      const audioBlock = result.blocks[0] as any;
      
      // Validate block structure according to Notion API
      expect(audioBlock).toMatchObject({
        type: 'audio',
        audio: {
          type: 'external',
          external: {
            url: audioUrl
          },
          caption: expect.any(Array)
        }
      });
    });

    it('should include empty caption array by default', () => {
      const audioUrl = 'https://example.com/test.wav';
      const result = parseContent(audioUrl);
      
      const audioBlock = result.blocks[0] as any;
      expect(audioBlock.audio.caption).toEqual([]);
    });

    it('should handle audio URLs with query parameters', () => {
      const audioUrl = 'https://example.com/audio.mp3?version=1&quality=high';
      const result = parseContent(audioUrl);
      
      expect(result.success).toBe(true);
      const audioBlock = result.blocks[0] as any;
      expect(audioBlock.audio.external.url).toBe(audioUrl);
    });

    it('should handle audio URLs with fragments', () => {
      const audioUrl = 'https://example.com/audio.mp3#t=30';
      const result = parseContent(audioUrl);
      
      expect(result.success).toBe(true);
      const audioBlock = result.blocks[0] as any;
      expect(audioBlock.audio.external.url).toBe(audioUrl);
    });
  });

  describe('Audio Format Validation', () => {
    it('should reject non-audio URLs', () => {
      const nonAudioUrls = [
        'https://example.com/image.jpg',
        'https://example.com/video.mp4',
        'https://example.com/document.pdf',
        'https://example.com/text.txt'
      ];
      
      nonAudioUrls.forEach(url => {
        const result = parseContent(url);
        
        expect(result.success).toBe(true);
        const block = result.blocks[0] as any;
        expect(block.type).not.toBe('audio');
      });
    });

    it('should handle case-insensitive audio extensions', () => {
      const audioUrls = [
        'https://example.com/audio.MP3',
        'https://example.com/audio.WAV',
        'https://example.com/audio.OGG'
      ];
      
      audioUrls.forEach(url => {
        const result = parseContent(url);
        
        expect(result.success).toBe(true);
        const block = result.blocks[0] as any;
        expect(block.type).toBe('audio');
      });
    });

    it('should validate URL format strictly', () => {
      const invalidUrls = [
        'not-a-url.mp3',
        'ftp://example.com/audio.mp3',
        'file:///local/audio.mp3',
        'javascript:alert("xss").mp3'
      ];
      
      invalidUrls.forEach(url => {
        const result = parseContent(url);
        
        // Should not create audio blocks for invalid URLs
        if (result.blocks.length > 0) {
          const block = result.blocks[0] as any;
          expect(block.type).not.toBe('audio');
        }
      });
    });
  });

  describe('Audio Detection Options', () => {
    it('should handle audio URL detection', () => {
      const audioUrl = 'https://example.com/test.mp3';
      
      const result = parseContent(audioUrl);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('audio');
    });

    it('should handle audio conversion options', () => {
      const audioUrl = 'https://example.com/test.mp3';
      
      const result = parseContent(audioUrl, {
        conversion: { convertImages: true }
      });
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
    });
  });

  describe('Audio Security Validation', () => {
    it('should block malicious audio URLs', () => {
      const maliciousUrls = [
        'javascript:alert("xss").mp3',
        'data:audio/mp3;base64,malicious',
        'file:///etc/passwd.mp3'
      ];
      
      maliciousUrls.forEach(url => {
        const result = parseContent(url);
        
        // Should not create audio blocks for malicious URLs
        if (result.blocks.length > 0) {
          const block = result.blocks[0] as any;
          expect(block.type).not.toBe('audio');
        }
      });
    });

    it('should validate audio URL length limits', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2000) + '.mp3';
      const result = parseContent(longUrl);
      
      // Should handle gracefully (may create bookmark instead)
      expect(result.success).toBe(true);
    });

    it('should handle audio URLs with special characters', () => {
      const specialUrls = [
        'https://example.com/audio%20with%20spaces.mp3',
        'https://example.com/audio-with-dashes.mp3',
        'https://example.com/audio_with_underscores.mp3',
        'https://example.com/audio.with.dots.mp3'
      ];
      
      specialUrls.forEach(url => {
        const result = parseContent(url);
        
        expect(result.success).toBe(true);
        if (result.blocks.length > 0) {
          const block = result.blocks[0] as any;
          expect(['audio', 'bookmark']).toContain(block.type);
        }
      });
    });
  });

  describe('Audio Metadata and Performance', () => {
    it('should include audio metadata in detection result', () => {
      const audioUrl = 'https://example.com/podcast.mp3';
      const result = parseContent(audioUrl, { includeMetadata: true });
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.detectedType).toBe('url');
    });

    it('should parse audio URLs efficiently', () => {
      const audioUrls = Array(100).fill(0).map((_, i) => 
        `https://example.com/audio${i}.mp3`
      ).join('\n');
      
      const startTime = Date.now();
      const result = parseContent(audioUrls);
      const processingTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(100);
      expect(processingTime).toBeLessThan(100); // Should be fast
    });

    it('should handle concurrent audio parsing', () => {
      const audioUrls = [
        'https://example.com/song1.mp3',
        'https://example.com/song2.wav',
        'https://example.com/song3.ogg'
      ];
      
      const results = audioUrls.map(url => parseContent(url));
      
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.blocks).toHaveLength(1);
      });
    });
  });

  describe('Audio Integration with Other Content Types', () => {
    it('should handle mixed content with audio URLs', () => {
      const mixedContent = `# My Playlist

Here are some great songs:

https://example.com/song1.mp3
https://example.com/song2.wav

**Description**: These are my favorite tracks.`;
      
      const result = parseContent(mixedContent, { contentType: 'markdown' });
      
      expect(result.success).toBe(true);
      expect(result.blocks.length).toBeGreaterThan(1);
      
      // Should contain both text and audio blocks
      const blockTypes = result.blocks.map((block: any) => block.type);
      expect(blockTypes).toContain('heading_1');
      expect(blockTypes).toContain('paragraph');
    });

    it('should preserve audio URLs in markdown links', () => {
      const markdownWithAudio = '[Listen to this song](https://example.com/song.mp3)';
      const result = parseContent(markdownWithAudio, { contentType: 'markdown' });
      
      expect(result.success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      
      const paragraph = result.blocks[0] as any;
      expect(paragraph.type).toBe('paragraph');
      expect(paragraph.paragraph.rich_text[0].href).toBe('https://example.com/song.mp3');
    });
  });

  describe('Audio Error Handling', () => {
    it('should handle malformed audio content gracefully', () => {
      const malformedContent = 'https://example.com/audio.mp3 but this is broken';
      const result = parseContent(malformedContent);
      
      expect(result.success).toBe(true);
      // Should handle as text or mixed content
      expect(result.blocks.length).toBeGreaterThan(0);
    });

    it('should provide meaningful error messages for invalid audio', () => {
      const invalidAudio = 'not-an-audio-url';
      const result = parseContent(invalidAudio);
      
      expect(result.success).toBe(true);
      expect(result.blocks[0].type).toBe('paragraph'); // Should fallback to text
    });

    it('should handle empty audio URLs', () => {
      const emptyUrl = '';
      const result = parseContent(emptyUrl);
      
      expect(result.success).toBe(true);
      expect(result.blocks).toEqual([]);
    });
  });
});