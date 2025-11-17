/**
 * FileUploadZone - Quota Checks Tests
 *
 * Tests unitaires pour les quota checks dans FileUploadZone
 * Vérifie comportement FREE vs PREMIUM, visual states, et blocages
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FileUploadZone } from '../FileUploadZone';

// Mock useTranslation
jest.mock('@notion-clipper/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.dropFiles': 'Déposez vos fichiers',
        'common.dragOrClick': 'Glissez ou cliquez pour uploader',
        'common.multipleFiles': 'Plusieurs fichiers acceptés',
        'common.oneFile': 'Un fichier accepté',
      };
      return translations[key] || key;
    },
  }),
}));

describe('FileUploadZone - Quota Checks', () => {
  const mockOnFileSelect = jest.fn();
  const mockOnQuotaExceeded = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Quota Check Integration', () => {
    it('should call onQuotaCheck before allowing upload', async () => {
      const mockOnQuotaCheck = jest.fn().mockResolvedValue({
        canUpload: true,
        quotaReached: false,
        remaining: 5,
      });

      render(
        <FileUploadZone
          onFileSelect={mockOnFileSelect}
          onQuotaCheck={mockOnQuotaCheck}
          quotaRemaining={5}
          quotaLimit={10}
        />
      );

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOnQuotaCheck).toHaveBeenCalledWith(1);
      });
    });

    it('should block upload when quota check returns canUpload: false', async () => {
      const mockOnQuotaCheck = jest.fn().mockResolvedValue({
        canUpload: false,
        quotaReached: true,
        remaining: 0,
      });

      render(
        <FileUploadZone
          onFileSelect={mockOnFileSelect}
          onQuotaCheck={mockOnQuotaCheck}
          onQuotaExceeded={mockOnQuotaExceeded}
          quotaRemaining={0}
          quotaLimit={10}
        />
      );

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOnQuotaCheck).toHaveBeenCalledWith(1);
        expect(mockOnQuotaExceeded).toHaveBeenCalled();
        expect(mockOnFileSelect).not.toHaveBeenCalled();
      });
    });

    it('should pass through upload when no quota check provided', async () => {
      render(
        <FileUploadZone
          onFileSelect={mockOnFileSelect}
        />
      );

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith([file]);
      });
    });
  });

  describe('Visual States - Quota Display', () => {
    it('should show normal state when quota is healthy (> 20%)', () => {
      render(
        <FileUploadZone
          onFileSelect={mockOnFileSelect}
          quotaRemaining={8}
          quotaLimit={10}
        />
      );

      expect(screen.getByText(/8\/10 restants/i)).toBeInTheDocument();
      expect(screen.queryByText(/quota.*atteint/i)).not.toBeInTheDocument();
    });

    it('should show warning state when quota < 20%', () => {
      render(
        <FileUploadZone
          onFileSelect={mockOnFileSelect}
          quotaRemaining={1}
          quotaLimit={10}
        />
      );

      expect(screen.getByText(/plus que 1 fichier ce mois-ci/i)).toBeInTheDocument();
    });

    it('should show exhausted state when quota = 0', () => {
      render(
        <FileUploadZone
          onFileSelect={mockOnFileSelect}
          quotaRemaining={0}
          quotaLimit={10}
        />
      );

      expect(screen.getByText(/quota fichiers atteint/i)).toBeInTheDocument();
      expect(screen.getByText(/plus de fichiers disponibles/i)).toBeInTheDocument();
    });

    it('should show unlimited state (Premium) when quotaRemaining is null', () => {
      render(
        <FileUploadZone
          onFileSelect={mockOnFileSelect}
          quotaRemaining={null}
          quotaLimit={null}
        />
      );

      expect(screen.queryByText(/restants/i)).not.toBeInTheDocument();
      expect(screen.getByText(/glissez ou cliquez/i)).toBeInTheDocument();
    });
  });

  describe('Multiple Files Upload - Quota Check', () => {
    it('should check quota for correct number of files when uploading multiple', async () => {
      const mockOnQuotaCheck = jest.fn().mockResolvedValue({
        canUpload: true,
        quotaReached: false,
        remaining: 3,
      });

      render(
        <FileUploadZone
          onFileSelect={mockOnFileSelect}
          onQuotaCheck={mockOnQuotaCheck}
          multiple={true}
          quotaRemaining={5}
          quotaLimit={10}
        />
      );

      const files = [
        new File(['test1'], 'test1.txt', { type: 'text/plain' }),
        new File(['test2'], 'test2.txt', { type: 'text/plain' }),
        new File(['test3'], 'test3.txt', { type: 'text/plain' }),
      ];

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files } });

      await waitFor(() => {
        expect(mockOnQuotaCheck).toHaveBeenCalledWith(3);
      });
    });

    it('should block when trying to upload more files than remaining quota', async () => {
      const mockOnQuotaCheck = jest.fn().mockResolvedValue({
        canUpload: false,
        quotaReached: true,
        remaining: 1,
      });

      render(
        <FileUploadZone
          onFileSelect={mockOnFileSelect}
          onQuotaCheck={mockOnQuotaCheck}
          onQuotaExceeded={mockOnQuotaExceeded}
          multiple={true}
          quotaRemaining={1}
          quotaLimit={10}
        />
      );

      const files = [
        new File(['test1'], 'test1.txt', { type: 'text/plain' }),
        new File(['test2'], 'test2.txt', { type: 'text/plain' }),
      ];

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files } });

      await waitFor(() => {
        expect(mockOnQuotaCheck).toHaveBeenCalledWith(2);
        expect(mockOnQuotaExceeded).toHaveBeenCalled();
        expect(mockOnFileSelect).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle quota check errors gracefully', async () => {
      const mockOnQuotaCheck = jest.fn().mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <FileUploadZone
          onFileSelect={mockOnFileSelect}
          onQuotaCheck={mockOnQuotaCheck}
        />
      );

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOnQuotaCheck).toHaveBeenCalled();
        // Should not crash, error handled gracefully
      });

      consoleSpy.mockRestore();
    });

    it('should respect file size limits independently of quota', async () => {
      const mockOnQuotaCheck = jest.fn().mockResolvedValue({
        canUpload: true,
        quotaReached: false,
        remaining: 5,
      });

      render(
        <FileUploadZone
          onFileSelect={mockOnFileSelect}
          onQuotaCheck={mockOnQuotaCheck}
          maxSize={1024} // 1KB
          quotaRemaining={5}
          quotaLimit={10}
        />
      );

      // 2KB file exceeds maxSize
      const largeFile = new File(['x'.repeat(2048)], 'large.txt', { type: 'text/plain' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [largeFile] } });

      await waitFor(() => {
        // Quota check should not be called if file size validation fails first
        expect(screen.getByText(/fichier trop volumineux/i)).toBeInTheDocument();
      });
    });
  });

  describe('Drag & Drop - Quota Integration', () => {
    it('should check quota on drag & drop', async () => {
      const mockOnQuotaCheck = jest.fn().mockResolvedValue({
        canUpload: true,
        quotaReached: false,
        remaining: 5,
      });

      const { container } = render(
        <FileUploadZone
          onFileSelect={mockOnFileSelect}
          onQuotaCheck={mockOnQuotaCheck}
          quotaRemaining={5}
          quotaLimit={10}
        />
      );

      const dropZone = container.querySelector('div[class*="border-dashed"]') as HTMLElement;
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      const dataTransfer = {
        files: [file],
        items: [{ kind: 'file', type: 'text/plain' }],
        types: ['Files'],
      };

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(mockOnQuotaCheck).toHaveBeenCalledWith(1);
      });
    });

    it('should prevent drop when quota exhausted', async () => {
      const mockOnQuotaCheck = jest.fn().mockResolvedValue({
        canUpload: false,
        quotaReached: true,
        remaining: 0,
      });

      const { container } = render(
        <FileUploadZone
          onFileSelect={mockOnFileSelect}
          onQuotaCheck={mockOnQuotaCheck}
          onQuotaExceeded={mockOnQuotaExceeded}
          quotaRemaining={0}
          quotaLimit={10}
        />
      );

      const dropZone = container.querySelector('div[class*="border-dashed"]') as HTMLElement;
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      const dataTransfer = {
        files: [file],
        items: [{ kind: 'file', type: 'text/plain' }],
        types: ['Files'],
      };

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(mockOnQuotaExceeded).toHaveBeenCalled();
        expect(mockOnFileSelect).not.toHaveBeenCalled();
      });
    });
  });

  describe('CSS Classes - Visual Feedback', () => {
    it('should apply exhausted styles when quota = 0', () => {
      const { container } = render(
        <FileUploadZone
          onFileSelect={mockOnFileSelect}
          quotaRemaining={0}
          quotaLimit={10}
        />
      );

      const dropZone = container.querySelector('div[class*="border-dashed"]') as HTMLElement;
      expect(dropZone.className).toContain('border-red-300');
      expect(dropZone.className).toContain('cursor-not-allowed');
      expect(dropZone.className).toContain('opacity-60');
    });

    it('should apply warning styles when quota < 20%', () => {
      const { container } = render(
        <FileUploadZone
          onFileSelect={mockOnFileSelect}
          quotaRemaining={1}
          quotaLimit={10}
        />
      );

      const dropZone = container.querySelector('div[class*="border-dashed"]') as HTMLElement;
      expect(dropZone.className).toContain('border-orange-300');
    });

    it('should apply normal styles when quota healthy', () => {
      const { container } = render(
        <FileUploadZone
          onFileSelect={mockOnFileSelect}
          quotaRemaining={8}
          quotaLimit={10}
        />
      );

      const dropZone = container.querySelector('div[class*="border-dashed"]') as HTMLElement;
      expect(dropZone.className).toContain('border-gray-300');
      expect(dropZone.className).toContain('cursor-pointer');
    });
  });
});
