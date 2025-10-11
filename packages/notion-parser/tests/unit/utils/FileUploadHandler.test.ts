/**
 * Tests unitaires pour FileUploadHandler - Upload natif Notion v2.1 ⭐
 * Couvre l'upload de fichiers via l'API Notion native /v1/file_uploads
 */

import { FileUploadHandler, uploadFileAndParse } from '../../../src/utils/FileUploadHandler';
import type { FileUploadResult } from '../../../src/utils/FileUploadHandler';

// Mock fetch pour les tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('FileUploadHandler - Upload natif Notion v2.1 ⭐', () => {
  let handler: FileUploadHandler;
  const mockOptions = {
    notionToken: 'secret_test_token_123',
    maxFileSize: 20 * 1024 * 1024
  };

  beforeEach(() => {
    handler = new FileUploadHandler(mockOptions);
    mockFetch.mockClear();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with Notion token', () => {
      expect(handler).toBeDefined();
      expect(() => new FileUploadHandler({ notionToken: '' })).toThrow();
    });

    it('should use default options', () => {
      const defaultHandler = new FileUploadHandler(mockOptions);
      expect(defaultHandler).toBeDefined();
    });

    it('should accept custom options', () => {
      const customHandler = new FileUploadHandler({
        ...mockOptions,
        maxFileSize: 50 * 1024 * 1024
      });
      expect(customHandler).toBeDefined();
    });
  });

  describe('File Validation', () => {
    it('should validate file size limits', async () => {
      // Create a mock file that exceeds size limit
      const largeFile = new Blob(['x'.repeat(100 * 1024 * 1024)], { type: 'image/jpeg' }); // 100MB
      
      const result = await handler.uploadFile(largeFile, 'large.jpg');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('volumineux');
    });

    it('should validate allowed file types', async () => {
      const restrictedHandler = new FileUploadHandler({
        ...mockOptions,
        allowedTypes: ['image/jpeg', 'image/png']
      });
      
      const file = new Blob(['test'], { type: 'text/plain' });
      const result = await restrictedHandler.uploadFile(file, 'test.txt');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('non autorisé');
    });

    it('should validate required parameters', async () => {
      const file = new Blob(['test'], { type: 'image/jpeg' });
      
      const result = await handler.uploadFile(file);
      
      // Should handle gracefully with default filename
      expect(result).toBeDefined();
    });

    it('should handle file validation gracefully', async () => {
      const file = new Blob(['test'], { type: 'image/jpeg' });
      
      const result = await handler.uploadFile(file, 'test.jpg');
      
      // Should handle gracefully
      expect(result).toBeDefined();
    });
  });

  describe('File Upload Process', () => {
    it('should upload small file successfully', async () => {
      const file = new Blob(['test content'], { type: 'image/jpeg' });
      
      // Mock successful responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'file_upload_123',
            status: 'pending'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({})
        });

      const result = await handler.uploadFile(file, 'test.jpg');

      expect(result.success).toBe(true);
      expect(result.publicId).toBe('file_upload_123');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle upload API errors', async () => {
      const file = new Blob(['test'], { type: 'image/jpeg' });
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request'
      });

      const result = await handler.uploadFile(file, 'test.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      const file = new Blob(['test'], { type: 'image/jpeg' });
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await handler.uploadFile(file, 'test.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should call progress callback if provided', async () => {
      const file = new Blob(['test'], { type: 'image/jpeg' });
      const progressCallback = jest.fn();
      
      const handlerWithProgress = new FileUploadHandler({
        ...mockOptions,
        onProgress: progressCallback
      });
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'file_upload_123',
            status: 'pending'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({})
        });

      await handlerWithProgress.uploadFile(file, 'test.jpg');

      // Progress callback should be called during upload process
      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('Large File Handling', () => {
    it('should handle large files within size limits', async () => {
      const largeFile = new Blob(['x'.repeat(15 * 1024 * 1024)], { type: 'image/jpeg' }); // 15MB
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'file_upload_123',
            status: 'pending'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({})
        });

      const result = await handler.uploadFile(largeFile, 'large.jpg');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should reject files exceeding size limit', async () => {
      const tooLargeFile = new Blob(['x'.repeat(25 * 1024 * 1024)], { type: 'image/jpeg' }); // 25MB
      
      const result = await handler.uploadFile(tooLargeFile, 'toolarge.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toContain('volumineux');
    });
  });

  describe('Block Creation', () => {
    it('should create image block correctly', () => {
      const uploadResult: FileUploadResult = {
        success: true,
        publicId: 'file_upload_123',
        metadata: {
          originalName: 'test.jpg',
          size: 1024,
          type: 'image/jpeg'
        }
      };
      
      const block = handler.createNotionBlock('image', uploadResult);
      
      expect(block.type).toBe('image');
      expect((block as any).image.type).toBe('file_upload');
      expect((block as any).image.file_upload.id).toBe('file_upload_123');
    });

    it('should create video block correctly', () => {
      const uploadResult: FileUploadResult = {
        success: true,
        publicId: 'file_upload_456',
        metadata: {
          originalName: 'test.mp4',
          size: 2048,
          type: 'video/mp4'
        }
      };
      
      const block = handler.createNotionBlock('video', uploadResult);
      
      expect(block.type).toBe('video');
      expect((block as any).video.type).toBe('file_upload');
      expect((block as any).video.file_upload.id).toBe('file_upload_456');
    });

    it('should create audio block correctly', () => {
      const uploadResult: FileUploadResult = {
        success: true,
        publicId: 'file_upload_789',
        metadata: {
          originalName: 'test.mp3',
          size: 3072,
          type: 'audio/mp3'
        }
      };
      
      const block = handler.createNotionBlock('audio', uploadResult);
      
      expect(block.type).toBe('audio');
      expect((block as any).audio.type).toBe('file_upload');
      expect((block as any).audio.file_upload.id).toBe('file_upload_789');
    });

    it('should create file block for unknown types', () => {
      const uploadResult: FileUploadResult = {
        success: true,
        publicId: 'file_upload_000',
        metadata: {
          originalName: 'document.pdf',
          size: 4096,
          type: 'application/pdf'
        }
      };
      
      const block = handler.createNotionBlock('file', uploadResult);
      
      expect(block.type).toBe('file');
      expect((block as any).file.type).toBe('file_upload');
      expect((block as any).file.file_upload.id).toBe('file_upload_000');
    });
  });

  describe('Notion Block Creation', () => {
    it('should create blocks from upload results', () => {
      const uploadResult: FileUploadResult = {
        success: true,
        publicId: 'file_upload_123',
        metadata: {
          originalName: 'test.jpg',
          size: 1024,
          type: 'image/jpeg'
        }
      };
      
      const block = handler.createNotionBlock('image', uploadResult);
      
      expect(block.type).toBe('image');
      expect((block as any).image.type).toBe('file_upload');
      expect((block as any).image.file_upload.id).toBe('file_upload_123');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const file = new Blob(['test'], { type: 'image/jpeg' });
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await handler.uploadFile(file, 'test.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle invalid Notion token', async () => {
      const file = new Blob(['test'], { type: 'image/jpeg' });
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      });

      const result = await handler.uploadFile(file, 'test.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toContain('401');
    });

    it('should handle empty files', async () => {
      const emptyFile = new Blob([], { type: 'text/plain' });
      
      const result = await handler.uploadFile(emptyFile, 'empty.txt');

      // Should handle gracefully
      expect(result).toBeDefined();
    });

    it('should handle special characters in filename', async () => {
      const file = new Blob(['test'], { type: 'image/jpeg' });
      const specialFilename = 'tëst fîlé with spéciàl chars.jpg';
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'file_upload_123',
          status: 'pending'
        })
      });

      const result = await handler.uploadFile(file, specialFilename);

      expect(result.success).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should work with uploadFileAndParse function', async () => {
      const file = new Blob(['test image content'], { type: 'image/jpeg' });
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'file_upload_123',
          status: 'uploaded'
        })
      });

      const result = await uploadFileAndParse(file, {
        upload: mockOptions
      });

      expect(result.uploadResult.success).toBe(true);
      expect(result.block).toBeDefined();
      expect(result.block?.type).toBe('image');
    });
  });
});