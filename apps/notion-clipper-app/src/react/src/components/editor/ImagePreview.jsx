import React from 'react';
import { Image as ImageIcon, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const ImagePreview = ({ imageData, size }) => {
  // Convertir Buffer en data URL pour affichage
  const getPreviewUrl = () => {
    if (imageData?.preview) {
      return imageData.preview;
    }
    if (typeof imageData === 'string' && imageData.startsWith('data:')) {
      return imageData;
    }
    return null;
  };

  const previewUrl = getPreviewUrl();
  const sizeKB = size ? (size / 1024).toFixed(2) : 
                 imageData?.bufferSize ? (imageData.bufferSize / 1024).toFixed(2) : '?';

  if (!previewUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-xl overflow-hidden border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg"
    >
      {/* Badge "Image" en haut */}
      <div className="absolute top-3 left-3 z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-md border border-gray-200">
          <ImageIcon size={14} className="text-blue-600" />
          <span className="text-xs font-semibold text-gray-700">Image</span>
          <span className="text-xs text-gray-500">{sizeKB} KB</span>
        </div>
      </div>

      {/* Checkmark de validation */}
      <div className="absolute top-3 right-3 z-10">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md"
        >
          <Check size={14} className="text-white" />
        </motion.div>
      </div>

      {/* Image preview */}
      <div className="relative w-full" style={{ maxHeight: '400px' }}>
        <img
          src={previewUrl}
          alt="Aperçu"
          className="w-full h-auto object-contain"
          style={{ maxHeight: '400px' }}
        />
        
        {/* Gradient overlay subtil */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
      </div>

      {/* Footer avec info */}
      <div className="px-4 py-3 bg-white/80 backdrop-blur-sm border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600">Prêt à envoyer</span>
          </div>
          {imageData?.size?.width && imageData?.size?.height && (
            <div className="text-xs text-gray-400">
              {imageData.size.width} × {imageData.size.height}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ImagePreview;
