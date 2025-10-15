// packages/ui/src/hooks/useFileUpload.ts
import { useState, useCallback } from 'react';
import type { FileUploadConfig } from '@notion-clipper/core-shared';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadState {
  uploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
}

export type UploadMethod = 'upload' | 'embed' | 'external';

export interface UseFileUploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [state, setState] = useState<FileUploadState>({
    uploading: false,
    progress: null,
    error: null
  });

  const {
    maxSize = 20 * 1024 * 1024, // 20MB
    allowedTypes = [],
    onSuccess,
    onError
  } = options;

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxSize) {
      return `Fichier trop volumineux. Maximum : ${(maxSize / 1024 / 1024).toFixed(0)}MB`;
    }
    
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return 'Type de fichier non autorisé';
    }
    
    return null;
  }, [maxSize, allowedTypes]);

  // Upload file
  const uploadFile = useCallback(async (
    file: File,
    config: FileUploadConfig,
    pageId: string
  ) => {
    if (!window.electronAPI) {
      const error = 'API Electron non disponible';
      setState(prev => ({ ...prev, error }));
      onError?.(error);
      return;
    }

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setState(prev => ({ ...prev, error: validationError }));
      onError?.(validationError);
      return;
    }

    setState({
      uploading: true,
      progress: { loaded: 0, total: file.size, percentage: 0 },
      error: null
    });

    try {
      // Convert file to buffer for IPC
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Array.from(new Uint8Array(arrayBuffer));

      const result = await window.electronAPI?.invoke?.('file:upload', {
        fileName: file.name,
        fileBuffer: buffer,
        config,
        pageId
      });

      if (result.success) {
        setState({
          uploading: false,
          progress: { loaded: file.size, total: file.size, percentage: 100 },
          error: null
        });
        onSuccess?.(result);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setState({
        uploading: false,
        progress: null,
        error: errorMessage
      });
      onError?.(errorMessage);
    }
  }, [validateFile, onSuccess, onError]);

  // Upload from URL
  const uploadFromUrl = useCallback(async (
    url: string,
    config: FileUploadConfig,
    pageId: string
  ) => {
    if (!window.electronAPI) {
      const error = 'API Electron non disponible';
      setState(prev => ({ ...prev, error }));
      onError?.(error);
      return;
    }

    setState({
      uploading: true,
      progress: null,
      error: null
    });

    try {
      const result = await window.electronAPI?.invoke?.('file:upload-url', {
        url,
        config,
        pageId
      });

      if (result.success) {
        setState({
          uploading: false,
          progress: null,
          error: null
        });
        onSuccess?.(result);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setState({
        uploading: false,
        progress: null,
        error: errorMessage
      });
      onError?.(errorMessage);
    }
  }, [onSuccess, onError]);

  // Pick file using system dialog
  const pickFile = useCallback(async () => {
    if (!window.electronAPI) return null;

    try {
      const result = await window.electronAPI?.invoke?.('file:pick');
      if (result.success) {
        return {
          name: result.fileName,
          size: result.fileSize,
          path: result.filePath
        };
      }
      return null;
    } catch (error) {
      console.error('Error picking file:', error);
      return null;
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setState({
      uploading: false,
      progress: null,
      error: null
    });
  }, []);

  return {
    ...state,
    uploadFile,
    uploadFromUrl,
    pickFile,
    validateFile,
    reset
  };
}