// FileUploadZone.tsx - Design System Notion/Apple
import React, { useState, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv, MotionButton, MotionMain, MotionAside } from '../common/MotionWrapper';
import {
  Upload, X, File, Image as ImageIcon, Film, Music, FileText, AlertCircle
} from 'lucide-react';

interface FileUploadZoneProps {
  onFileSelect: (files: File[]) => void;
  maxSize?: number;
  allowedTypes?: string[];
  multiple?: boolean;
  compact?: boolean;
}

export function FileUploadZone({
  onFileSelect,
  maxSize = 20 * 1024 * 1024,
  allowedTypes = [],
  multiple = false,
  compact = false
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const getFileIcon = (file: File) => {
    const type = file.type.split('/')[0];
    if (type === 'image') return <ImageIcon size={18} className="text-blue-500" strokeWidth={2} />;
    if (type === 'video') return <Film size={18} className="text-purple-500" strokeWidth={2} />;
    if (type === 'audio') return <Music size={18} className="text-green-500" strokeWidth={2} />;
    if (file.type === 'application/pdf') return <FileText size={18} className="text-red-500" strokeWidth={2} />;
    return <File size={18} className="text-gray-500" strokeWidth={2} />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFiles = (files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      if (file.size > maxSize) {
        errors.push(`${file.name}: Trop volumineux (max ${formatFileSize(maxSize)})`);
        return;
      }
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Type non autorisé`);
        return;
      }
      valid.push(file);
    });

    return { valid, errors };
  };

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const { valid, errors } = validateFiles(fileArray);

    if (errors.length > 0) {
      setError(errors.join(', '));
      setTimeout(() => setError(null), 5000);
    }

    if (valid.length > 0) {
      if (multiple) {
        setSelectedFiles(prev => [...prev, ...valid]);
      } else {
        setSelectedFiles(valid);
      }
      onFileSelect(valid);
    }
  }, [multiple, onFileSelect]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (compact) {
    return (
      <>
        <button
          onClick={handleClick}
          className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Upload size={14} strokeWidth={2} />
          <span>Joindre</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          className="hidden"
          multiple={multiple}
          accept={allowedTypes.join(',')}
        />
      </>
    );
  }

  return (
    <div className="space-y-3">
      {/* Zone drag & drop */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 cursor-pointer ${
          isDragging
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 mb-3">
            <Upload size={20} className={isDragging ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'} strokeWidth={2} />
          </div>

          <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100 mb-1">
            {isDragging ? 'Déposez les fichiers' : 'Glissez ou cliquez'}
          </p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">
            {multiple ? 'Plusieurs fichiers' : 'Un fichier'} · Max {formatFileSize(maxSize)}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          className="hidden"
          multiple={multiple}
          accept={allowedTypes.join(',')}
        />
      </div>

      {/* Erreur */}
      <AnimatePresence>
        {error && (
          <MotionDiv
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400"
          >
            <AlertCircle size={14} strokeWidth={2} />
            <span className="text-[12px]">{error}</span>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Liste fichiers */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <MotionDiv
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <p className="text-[12px] font-medium text-gray-700 dark:text-gray-300">
              {selectedFiles.length} fichier{selectedFiles.length > 1 ? 's' : ''}
            </p>
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex-shrink-0">{getFileIcon(file)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">
                    {file.name}
                  </p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            ))}
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}