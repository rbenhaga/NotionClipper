import React from 'react';
import { motion } from 'framer-motion';
import { X, Image as ImageIcon } from 'lucide-react';

interface ImagePreviewProps {
  src: string;
  alt?: string;
  onRemove?: () => void;
  className?: string;
}

/**
 * Composant pour prévisualiser une image du clipboard
 * Extrait de ContentEditor.jsx de l'app Electron
 */
export function ImagePreview({ 
  src, 
  alt = 'Image preview', 
  onRemove,
  className = ''
}: ImagePreviewProps) {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}
    >
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {imageError ? (
        <div className="flex flex-col items-center justify-center p-8 text-gray-400">
          <ImageIcon size={48} className="mb-3" />
          <p className="text-sm">Erreur de chargement</p>
          <p className="text-xs text-gray-400 mt-1">Impossible d'afficher l'image</p>
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
          className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
          title="Supprimer l'image"
        >
          <X size={16} />
        </button>
      )}
    </motion.div>
  );
}