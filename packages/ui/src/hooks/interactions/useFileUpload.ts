import { useState, useCallback } from 'react';

export interface UseFileUploadOptions {
  maxSize?: number;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
}

export interface UploadProgress {
  progress: number;
  uploading: boolean;
}

export interface FileUploadState {
  uploading: boolean;
  progress: number;
  error: Error | null;
}

export type UploadMethod = 'drag' | 'click' | 'paste';

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = useCallback(async (
    file: File,
    config: any,
    pageId: string
  ) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Validation
      if (options.maxSize && file.size > options.maxSize) {
        throw new Error(`File too large. Max size: ${options.maxSize / (1024 * 1024)}MB`);
      }

      // Simuler la progression
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Upload via Electron API
      const result = await (window as any).electronAPI.file.upload(
        {
          name: file.name,
          size: file.size,
          type: file.type,
          path: (file as any).path || '' // Pour Electron
        },
        config,
        pageId
      );

      clearInterval(progressInterval);
      setProgress(100);

      if (result.success) {
        options.onSuccess?.(result.data);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      options.onError?.(error);
      throw error;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, [options]);

  return {
    uploadFile,
    uploading,
    progress,
    error
  };
}