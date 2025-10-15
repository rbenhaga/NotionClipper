// packages/ui/src/components/editor/FileUploadPanel.tsx
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
  Link,
  Check,
  AlertCircle
} from 'lucide-react';

export interface FileUploadConfig {
  type: 'file' | 'image' | 'video' | 'audio' | 'pdf';
  mode: 'upload' | 'embed' | 'external';
  caption?: string;
}

interface FileUploadPanelProps {
  onFileSelect: (file: File, config: FileUploadConfig) => Promise<void>;
  onCancel: () => void;
  maxSize?: number;
  allowedTypes?: string[];
  currentPage?: any;
}

export function FileUploadPanel({
  onFileSelect,
  onCancel,
  maxSize = 20 * 1024 * 1024, // 20MB
  allowedTypes = [],
  currentPage
}: FileUploadPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'upload' | 'embed' | 'external'>('upload');
  const [caption, setCaption] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect file type
  const getFileType = (file: File): FileUploadConfig['type'] => {
    const type = file.type.split('/')[0];
    if (type === 'image') return 'image';
    if (type === 'video') return 'video';
    if (type === 'audio') return 'audio';
    if (file.type === 'application/pdf') return 'pdf';
    return 'file';
  };

  // Get file icon
  const getFileIcon = (file: File) => {
    const type = getFileType(file);
    switch (type) {
      case 'image': return <ImageIcon size={48} className="text-blue-500" />;
      case 'video': return <Film size={48} className="text-purple-500" />;
      case 'audio': return <Music size={48} className="text-green-500" />;
      case 'pdf': return <FileText size={48} className="text-red-500" />;
      default: return <File size={48} className="text-gray-500" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Validate file
  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `Fichier trop volumineux. Maximum : ${formatFileSize(maxSize)}`;
    }
    
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return 'Type de fichier non autorisé';
    }
    
    return null;
  };

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setSelectedFile(file);
    setError(null);
    
    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }, [maxSize, allowedTypes]);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile && mode !== 'external') return;
    
    setUploading(true);
    setError(null);
    
    try {
      if (mode === 'external' && externalUrl) {
        // TODO: Handle external URL
        console.log('External URL:', externalUrl);
      } else if (selectedFile) {
        const config: FileUploadConfig = {
          type: getFileType(selectedFile),
          mode,
          caption
        };
        
        await onFileSelect(selectedFile, config);
      }
      
      onCancel(); // Close panel on success
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Joindre un fichier
            </h3>
            {currentPage && (
              <p className="text-sm text-gray-500 mt-1">
                Destination : {currentPage.title}
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode selector */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex gap-2">
            <ModeButton
              active={mode === 'upload'}
              onClick={() => setMode('upload')}
              icon={<Upload size={16} />}
              label="Upload"
              description="Héberger sur Notion"
            />
            <ModeButton
              active={mode === 'embed'}
              onClick={() => setMode('embed')}
              icon={<Link size={16} />}
              label="Embed"
              description="Intégrer depuis URL"
            />
            <ModeButton
              active={mode === 'external'}
              onClick={() => setMode('external')}
              icon={<Link size={16} />}
              label="Lien externe"
              description="Lien vers le fichier"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {mode === 'external' ? (
            // External URL input
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL du fichier
              </label>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://example.com/file.pdf"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ) : selectedFile ? (
            // File preview
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded"
                  />
                ) : (
                  getFileIcon(selectedFile)
                )}
                
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview(null);
                  }}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              {/* Caption input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Légende (optionnel)
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Ajouter une description..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          ) : (
            // Drop zone
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-12
                cursor-pointer transition-all
                ${isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }
              `}
            >
              <div className="text-center">
                <Upload
                  size={48}
                  className={`mx-auto mb-4 ${
                    isDragging ? 'text-blue-500' : 'text-gray-400'
                  }`}
                />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Glissez un fichier ici ou cliquez pour parcourir
                </p>
                <p className="text-sm text-gray-500">
                  Maximum : {formatFileSize(maxSize)}
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileInputChange}
                className="hidden"
                accept={allowedTypes.join(',')}
              />
            </div>
          )}

          {/* Error message */}
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={uploading}
          >
            Annuler
          </button>
          <button
            onClick={handleUpload}
            disabled={
              uploading ||
              (mode !== 'external' && !selectedFile) ||
              (mode === 'external' && !externalUrl)
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Upload en cours...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Valider</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Helper component for mode buttons
function ModeButton({
  active,
  onClick,
  icon,
  label,
  description
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 p-3 rounded-lg border-2 transition-all text-left
        ${active
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }
      `}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={active ? 'text-blue-600' : 'text-gray-600'}>
          {icon}
        </div>
        <span className={`font-medium ${active ? 'text-blue-900' : 'text-gray-900'}`}>
          {label}
        </span>
      </div>
      <p className="text-xs text-gray-600">{description}</p>
    </button>
  );
}