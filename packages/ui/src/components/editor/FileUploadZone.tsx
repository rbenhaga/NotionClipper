// packages/ui/src/components/editor/FileUploadZone.tsx
import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  File,
  Image as ImageIcon,
  Film,
  Music,
  FileText,
  CheckCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface FileUploadZoneProps {
  onFileSelect: (files: File[]) => void;
  maxSize?: number;
  allowedTypes?: string[];
  multiple?: boolean;
  compact?: boolean;
}

/**
 * Zone d'upload optimisée avec drag & drop
 * S'intègre parfaitement dans le ContentEditor
 * Design inspiré de Notion
 */
export function FileUploadZone({
  onFileSelect,
  maxSize = 20 * 1024 * 1024, // 20MB
  allowedTypes = [],
  multiple = false,
  compact = false
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Obtenir l'icône selon le type de fichier
  const getFileIcon = (file: File) => {
    const type = file.type.split('/')[0];
    if (type === 'image') return <ImageIcon size={20} className="text-blue-500" />;
    if (type === 'video') return <Film size={20} className="text-purple-500" />;
    if (type === 'audio') return <Music size={20} className="text-green-500" />;
    if (file.type === 'application/pdf') return <FileText size={20} className="text-red-500" />;
    return <File size={20} className="text-gray-500" />;
  };

  // Formater la taille du fichier
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Valider les fichiers
  const validateFiles = (files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      // Vérifier la taille
      if (file.size > maxSize) {
        errors.push(`${file.name}: Trop volumineux (max ${formatFileSize(maxSize)})`);
        return;
      }

      // Vérifier le type
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Type non autorisé`);
        return;
      }

      valid.push(file);
    });

    return { valid, errors };
  };

  // Gérer la sélection de fichiers
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
  }, [multiple, onFileSelect, allowedTypes, maxSize]);

  // Événements drag & drop
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

    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [handleFiles]);

  // Clic sur la zone
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Changement de l'input file
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  // Retirer un fichier
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Mode compact (juste un bouton)
  if (compact) {
    return (
      <>
        <button
          onClick={handleClick}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Upload size={16} />
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
      {/* Zone de drag & drop */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-xl p-8
          transition-all duration-200 cursor-pointer
          ${isDragging
            ? 'border-blue-500 bg-blue-50 scale-[1.02]'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
      >
        <div className="text-center">
          <motion.div
            animate={{
              scale: isDragging ? [1, 1.1, 1] : 1
            }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4"
          >
            <Upload
              size={32}
              className={`${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
            />
          </motion.div>

          <p className="text-base font-medium text-gray-900 mb-1">
            {isDragging
              ? 'Déposez vos fichiers ici'
              : 'Glissez des fichiers ou cliquez pour parcourir'
            }
          </p>
          <p className="text-sm text-gray-500">
            {multiple ? 'Plusieurs fichiers' : 'Un fichier'} • Maximum {formatFileSize(maxSize)}
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

      {/* Message d'erreur */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700"
          >
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste des fichiers sélectionnés */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <p className="text-sm font-medium text-gray-700">
              Fichiers sélectionnés ({selectedFiles.length})
            </p>
            {selectedFiles.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
              >
                <div className="flex-shrink-0">
                  {getFileIcon(file)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}