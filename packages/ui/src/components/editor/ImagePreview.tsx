// ImagePreview.tsx - Design System Apple/Notion Premium
import React, { useState, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '../common/MotionWrapper';
import {
  Loader, X, Maximize2, Copy, Download,
  Image as ImageIcon, CheckCircle, AlertCircle
} from 'lucide-react';
import { useTranslation } from '@notion-clipper/i18n';

interface ImagePreviewProps {
  src: string;
  alt?: string;
  onRemove?: () => void;
  onZoom?: () => void;
  className?: string;
  showActions?: boolean;
  size?: number;
  aspectRatio?: 'auto' | 'square' | '16:9' | '4:3';
}

export function ImagePreview({
  src,
  alt = 'Image',
  onRemove,
  onZoom,
  className = '',
  showActions = true,
  size,
  aspectRatio = 'auto'
}: ImagePreviewProps) {
  const { t } = useTranslation();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // Copier l'image dans le presse-papiers
  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      if (imageRef.current) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = imageRef.current;
        
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx?.drawImage(img, 0, 0);
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
          }
        });
      }
    } catch (error) {
      console.error('Failed to copy image:', error);
    }
  }, []);

  // Télécharger l'image
  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    const link = document.createElement('a');
    link.href = src;
    link.download = alt || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [src, alt]);

  // Aspect ratio classes
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square': return 'aspect-square';
      case '16:9': return 'aspect-video';
      case '4:3': return 'aspect-[4/3]';
      default: return '';
    }
  };

  return (
    <MotionDiv
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative bg-gradient-to-br from-gray-50 to-gray-100 
        dark:from-gray-900 dark:to-gray-800 
        border border-gray-200 dark:border-gray-700 
        rounded-xl overflow-hidden
        transition-all duration-300
        ${isHovered ? 'shadow-lg shadow-gray-900/10 dark:shadow-black/30 scale-[1.01]' : 'shadow-sm'}
        ${className}
      `}
      style={{ width: size ? `${size}px` : undefined }}
    >
      {/* Conteneur de l'image avec aspect ratio */}
      <div className={`relative ${getAspectRatioClass()}`}>
        {/* État de chargement */}
        <AnimatePresence>
          {!imageLoaded && !imageError && (
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {/* Spinner avec effet Apple */}
                  <div className="w-10 h-10 border-[3px] border-gray-200 dark:border-gray-700 rounded-full" />
                  <div className="absolute inset-0 w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
                  {t('common.imageLoading')}
                </p>
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>

        {/* État d'erreur */}
        <AnimatePresence>
          {imageError && (
            <MotionDiv
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 flex items-center justify-center mb-4 shadow-sm">
                <AlertCircle size={24} className="text-red-500 dark:text-red-400" strokeWidth={2} />
              </div>
              <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {t('common.imageLoadError')}
              </p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">
                {t('common.imageLoadErrorDetails')}
              </p>
            </MotionDiv>
          )}
        </AnimatePresence>

        {/* Image */}
        {!imageError && (
          <img
            ref={imageRef}
            src={src}
            alt={alt}
            className={`
              w-full h-full object-contain
              transition-all duration-300
              ${imageLoaded ? 'opacity-100' : 'opacity-0'}
              ${isHovered && onZoom ? 'cursor-zoom-in' : ''}
            `}
            onLoad={() => {
              setImageLoaded(true);
              setImageError(false);
            }}
            onError={() => {
              setImageLoaded(false);
              setImageError(true);
            }}
            onClick={onZoom}
          />
        )}

        {/* Overlay gradient subtil au hover */}
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none"
        />

        {/* Actions au hover */}
        {showActions && imageLoaded && !imageError && (
          <AnimatePresence>
            {isHovered && (
              <MotionDiv
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1.5 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-lg shadow-lg border border-gray-200/50 dark:border-gray-700/50"
              >
                {/* Zoom */}
                {onZoom && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onZoom();
                    }}
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group/btn"
                    title={t('common.enlarge')}
                  >
                    <Maximize2 
                      size={14} 
                      className="text-gray-600 dark:text-gray-400 group-hover/btn:text-gray-900 dark:group-hover/btn:text-gray-100" 
                      strokeWidth={2}
                    />
                  </button>
                )}

                {/* Copier */}
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group/btn relative"
                  title={t('common.copy')}
                >
                  <AnimatePresence mode="wait">
                    {copySuccess ? (
                      <MotionDiv
                        key="success"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <CheckCircle size={14} className="text-green-500" strokeWidth={2} />
                      </MotionDiv>
                    ) : (
                      <MotionDiv
                        key="idle"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Copy 
                          size={14} 
                          className="text-gray-600 dark:text-gray-400 group-hover/btn:text-gray-900 dark:group-hover/btn:text-gray-100" 
                          strokeWidth={2}
                        />
                      </MotionDiv>
                    )}
                  </AnimatePresence>
                </button>

                {/* Télécharger */}
                <button
                  onClick={handleDownload}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group/btn"
                  title={t('common.download')}
                >
                  <Download 
                    size={14} 
                    className="text-gray-600 dark:text-gray-400 group-hover/btn:text-gray-900 dark:group-hover/btn:text-gray-100" 
                    strokeWidth={2}
                  />
                </button>

                {/* Divider */}
                {onRemove && (
                  <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />
                )}

                {/* Supprimer */}
                {onRemove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove();
                    }}
                    className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors group/btn"
                    title={t('common.delete')}
                  >
                    <X 
                      size={14} 
                      className="text-gray-600 dark:text-gray-400 group-hover/btn:text-red-500 dark:group-hover/btn:text-red-400" 
                      strokeWidth={2}
                    />
                  </button>
                )}
              </MotionDiv>
            )}
          </AnimatePresence>
        )}

        {/* Badge de succès de copie */}
        <AnimatePresence>
          {copySuccess && (
            <MotionDiv
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="absolute top-3 right-3 px-3 py-1.5 bg-green-500 text-white text-[12px] font-medium rounded-lg shadow-lg flex items-center gap-1.5"
            >
              <CheckCircle size={12} strokeWidth={2} />
              <span>{t('common.copied')}</span>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>

      {/* Métadonnées optionnelles */}
      {imageLoaded && !imageError && imageRef.current && (
        <div className="px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
            {imageRef.current.naturalWidth} × {imageRef.current.naturalHeight} px
          </p>
        </div>
      )}
    </MotionDiv>
  );
}