// ImagePreview.tsx - Design System Notion/Apple
import React, { useState } from 'react';
import { Loader, X, Image as ImageIcon } from 'lucide-react';

interface ImagePreviewProps {
  src: string;
  alt?: string;
  onRemove?: () => void;
  className?: string;
}

export function ImagePreview({ 
  src, 
  alt = 'Image', 
  onRemove,
  className = ''
}: ImagePreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div className={`relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden ${className}`}>
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
          <Loader className="w-6 h-6 text-gray-400 dark:text-gray-500 animate-spin" strokeWidth={2} />
        </div>
      )}

      {imageError ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-2">
            <ImageIcon size={16} strokeWidth={2} />
          </div>
          <p className="text-[13px]">Erreur de chargement</p>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className="w-full h-auto max-h-96 object-contain"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}

      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-colors"
          title="Supprimer"
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}