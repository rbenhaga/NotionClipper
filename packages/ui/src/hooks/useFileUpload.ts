// packages/ui/src/hooks/useFileUpload.ts
import { useState, useCallback, useRef } from 'react';

// Types pour les méthodes d'upload (remplace l'ancien FileIntegrationType)
export type UploadMethod = 'notion' | 'embed' | 'external';

export interface UploadProgress {
  fileId: string;
  filename: string;
  progress: number;
  status: 'queued' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface UseFileUploadOptions {
  maxFileSize?: number;
  allowedTypes?: string[];
  maxConcurrent?: number;
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (fileId: string, result: any) => void;
  onError?: (fileId: string, error: string) => void;
}

export interface FileUploadState {
  uploads: Map<string, UploadProgress>;
  isUploading: boolean;
  totalProgress: number;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [state, setState] = useState<FileUploadState>({
    uploads: new Map(),
    isUploading: false,
    totalProgress: 0
  });
  
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  
  const {
    maxFileSize = 20 * 1024 * 1024, // 20MB
    allowedTypes,
    maxConcurrent = 3,
    onProgress,
    onComplete,
    onError
  } = options;
  
  // Validate file before upload
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    if (file.size > maxFileSize) {
      return {
        valid: false,
        error: `Fichier trop volumineux. Taille maximale : ${Math.round(maxFileSize / (1024 * 1024))}MB`
      };
    }
    
    if (allowedTypes && !allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Type de fichier non autorisé : ${file.type}`
      };
    }
    
    return { valid: true };
  }, [maxFileSize, allowedTypes]);
  
  // Generate unique file ID
  const generateFileId = useCallback((): string => {
    return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);
  
  // Update upload progress
  const updateProgress = useCallback((fileId: string, updates: Partial<UploadProgress>) => {
    setState(prev => {
      const newUploads = new Map(prev.uploads);
      const current = newUploads.get(fileId);
      
      if (current) {
        const updated = { ...current, ...updates };
        newUploads.set(fileId, updated);
        
        // Notify progress callback
        if (onProgress) {
          onProgress(updated);
        }
        
        // Calculate total progress
        const allUploads = Array.from(newUploads.values());
        const totalProgress = allUploads.length > 0
          ? allUploads.reduce((sum, upload) => sum + upload.progress, 0) / allUploads.length
          : 0;
        
        const isUploading = allUploads.some(upload => 
          upload.status === 'queued' || upload.status === 'uploading'
        );
        
        return {
          uploads: newUploads,
          isUploading,
          totalProgress
        };
      }
      
      return prev;
    });
  }, [onProgress]);
  
  // Simulate file upload (replace with actual upload logic)
  const simulateUpload = useCallback(async (
    fileId: string,
    file: File,
    method: UploadMethod,
    abortSignal: AbortSignal
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      let progress = 0;
      
      const interval = setInterval(() => {
        if (abortSignal.aborted) {
          clearInterval(interval);
          reject(new Error('Upload cancelled'));
          return;
        }
        
        progress += Math.random() * 15;
        
        if (progress >= 100) {
          clearInterval(interval);
          
          // Simulate success/failure
          if (Math.random() > 0.1) { // 90% success rate
            resolve({
              success: true,
              url: `https://example.com/files/${fileId}`,
              publicId: fileId,
              fileId,
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type,
              uploadTime: Date.now(),
              method
            });
          } else {
            reject(new Error('Upload failed: Server error'));
          }
        } else {
          updateProgress(fileId, { progress: Math.min(progress, 100) });
        }
      }, 200);
    });
  }, [updateProgress]);
  
  // Upload single file
  const uploadFile = useCallback(async (
    file: File,
    method: UploadMethod = 'notion'
  ): Promise<string> => {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    const fileId = generateFileId();
    
    // Initialize upload progress
    const initialProgress: UploadProgress = {
      fileId,
      filename: file.name,
      progress: 0,
      status: 'queued'
    };
    
    setState(prev => ({
      ...prev,
      uploads: new Map(prev.uploads).set(fileId, initialProgress),
      isUploading: true
    }));
    
    // Create abort controller
    const abortController = new AbortController();
    abortControllers.current.set(fileId, abortController);
    
    try {
      // Update status to uploading
      updateProgress(fileId, { status: 'uploading' });
      
      // Perform upload
      const result = await simulateUpload(fileId, file, method, abortController.signal);
      
      // Update status to completed
      updateProgress(fileId, { 
        status: 'completed', 
        progress: 100 
      });
      
      if (onComplete) {
        onComplete(fileId, result);
      }
      
      return fileId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      updateProgress(fileId, { 
        status: 'error', 
        error: errorMessage 
      });
      
      if (onError) {
        onError(fileId, errorMessage);
      }
      
      throw error;
    } finally {
      abortControllers.current.delete(fileId);
    }
  }, [validateFile, generateFileId, updateProgress, simulateUpload, onComplete, onError]);
  
  // Upload multiple files
  const uploadFiles = useCallback(async (
    files: File[],
    method: UploadMethod = 'notion',
    options?: any
  ): Promise<string[]> => {
    const fileIds: string[] = [];
    const uploadPromises: Promise<string>[] = [];
    
    // Process files in batches based on maxConcurrent
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(file => 
        uploadFile(file, method).catch(error => {
          console.error(`Failed to upload ${file.name}:`, error);
          return ''; // Return empty string for failed uploads
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      fileIds.push(...batchResults.filter(id => id !== ''));
    }
    
    return fileIds;
  }, [uploadFile, maxConcurrent]);
  
  // Cancel upload
  const cancelUpload = useCallback((fileId: string) => {
    const abortController = abortControllers.current.get(fileId);
    if (abortController) {
      abortController.abort();
      abortControllers.current.delete(fileId);
    }
    
    updateProgress(fileId, { 
      status: 'error', 
      error: 'Upload cancelled' 
    });
  }, [updateProgress]);
  
  // Cancel all uploads
  const cancelAllUploads = useCallback(() => {
    abortControllers.current.forEach((controller, fileId) => {
      controller.abort();
      updateProgress(fileId, { 
        status: 'error', 
        error: 'Upload cancelled' 
      });
    });
    
    abortControllers.current.clear();
  }, [updateProgress]);
  
  // Clear completed uploads
  const clearCompleted = useCallback(() => {
    setState(prev => {
      const newUploads = new Map();
      
      prev.uploads.forEach((upload, fileId) => {
        if (upload.status !== 'completed') {
          newUploads.set(fileId, upload);
        }
      });
      
      const allUploads = Array.from(newUploads.values());
      const isUploading = allUploads.some(upload => 
        upload.status === 'queued' || upload.status === 'uploading'
      );
      
      return {
        uploads: newUploads,
        isUploading,
        totalProgress: prev.totalProgress
      };
    });
  }, []);
  
  // Clear all uploads
  const clearAll = useCallback(() => {
    cancelAllUploads();
    
    setState({
      uploads: new Map(),
      isUploading: false,
      totalProgress: 0
    });
  }, [cancelAllUploads]);
  
  // Get upload by ID
  const getUpload = useCallback((fileId: string): UploadProgress | undefined => {
    return state.uploads.get(fileId);
  }, [state.uploads]);
  
  // Get all uploads as array
  const getAllUploads = useCallback((): UploadProgress[] => {
    return Array.from(state.uploads.values());
  }, [state.uploads]);
  
  // Get uploads by status
  const getUploadsByStatus = useCallback((status: UploadProgress['status']): UploadProgress[] => {
    return Array.from(state.uploads.values()).filter(upload => upload.status === status);
  }, [state.uploads]);
  
  return {
    // State
    uploads: state.uploads,
    isUploading: state.isUploading,
    totalProgress: state.totalProgress,
    
    // Actions
    uploadFile,
    uploadFiles,
    cancelUpload,
    cancelAllUploads,
    clearCompleted,
    clearAll,
    
    // Getters
    getUpload,
    getAllUploads,
    getUploadsByStatus,
    
    // Utils
    validateFile
  };
}