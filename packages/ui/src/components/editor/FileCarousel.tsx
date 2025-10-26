// packages/ui/src/components/editor/FileCarousel.tsx
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  File,
  Image as ImageIcon,
  Film,
  Music,
  FileText,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export interface AttachedFile {
  id: string;
  file?: File;
  url?: string;
  name: string;
  type: string;
  size?: number;
  preview?: string;
}

interface FileCarouselProps {
  files: AttachedFile[];
  onRemove: (id: string) => void;
  onView?: (file: AttachedFile) => void;
}

/**
 * Carousel élégant pour afficher les fichiers joints
 * Design minimaliste style Notion/Apple
 */
export function FileCarousel({ files, onRemove, onView }: FileCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Vérifier si on peut scroller
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setShowLeftArrow(container.scrollLeft > 0);
    setShowRightArrow(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  };

  // Scroller
  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 300;
    const newPosition = direction === 'left'
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newPosition,
      behavior: 'smooth'
    });

    setTimeout(checkScroll, 300);
  };

  // Obtenir l'icône selon le type
  const getFileIcon = (file: AttachedFile) => {
    const type = file.type.split('/')[0];
    if (type === 'image') return <ImageIcon size={20} className="text-blue-500" />;
    if (type === 'video') return <Film size={20} className="text-purple-500" />;
    if (type === 'audio') return <Music size={20} className="text-green-500" />;
    if (file.type === 'application/pdf') return <FileText size={20} className="text-red-500" />;
    return <File size={20} className="text-gray-500" />;
  };

  // Formater la taille
  const formatSize = (bytes: number | undefined): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (files.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="relative"
    >
      {/* Flèche gauche */}
      <AnimatePresence>
        {showLeftArrow && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft size={16} className="text-gray-600 dark:text-gray-400" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Flèche droite */}
      <AnimatePresence>
        {showRightArrow && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight size={16} className="text-gray-600 dark:text-gray-400" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Container avec scroll horizontal */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {files.map((file, index) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -20 }}
            transition={{ delay: index * 0.05 }}
            className="flex-shrink-0 group relative"
          >
            {/* Image preview ou icône */}
            <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all">
              {file.preview ? (
                // Preview image
                <img
                  src={file.preview}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                // Icône fichier
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  {getFileIcon(file)}
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium px-2 text-center line-clamp-2">
                    {file.name}
                  </span>
                </div>
              )}

              {/* Overlay au hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {onView && (
                  <button
                    onClick={() => onView(file)}
                    className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
                  >
                    <ExternalLink size={16} className="text-gray-700 dark:text-gray-300" />
                  </button>
                )}
                <button
                  onClick={() => onRemove(file.id)}
                  className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={16} className="text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            </div>

            {/* Info sous l'image */}
            <div className="mt-2 px-1">
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate max-w-[128px]">
                {file.name}
              </p>
              {file.size && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatSize(file.size)}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}