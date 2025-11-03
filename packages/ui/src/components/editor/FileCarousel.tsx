// FileCarousel.tsx - Design System Notion/Apple
import React, { useState, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv, MotionButton } from '../common/MotionWrapper';
import {
  X, File, Image as ImageIcon, Film, Music, FileText,
  ChevronLeft, ChevronRight, ExternalLink
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

export function FileCarousel({ files, onRemove, onView }: FileCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setShowLeftArrow(container.scrollLeft > 0);
    setShowRightArrow(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  };

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 280;
    const newPosition = direction === 'left'
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount;

    container.scrollTo({ left: newPosition, behavior: 'smooth' });
    setTimeout(checkScroll, 300);
  };

  const getFileIcon = (file: AttachedFile) => {
    const type = file.type.split('/')[0];
    if (type === 'image') return <ImageIcon size={18} className="text-blue-500" strokeWidth={2} />;
    if (type === 'video') return <Film size={18} className="text-purple-500" strokeWidth={2} />;
    if (type === 'audio') return <Music size={18} className="text-green-500" strokeWidth={2} />;
    if (file.type === 'application/pdf') return <FileText size={18} className="text-red-500" strokeWidth={2} />;
    return <File size={18} className="text-gray-500" strokeWidth={2} />;
  };

  const formatSize = (bytes: number | undefined): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (files.length === 0) return null;

  return (
    <div className="relative">
      {/* Flèches */}
      <AnimatePresence>
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft size={14} className="text-gray-600 dark:text-gray-400" strokeWidth={2} />
          </button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight size={14} className="text-gray-600 dark:text-gray-400" strokeWidth={2} />
          </button>
        )}
      </AnimatePresence>

      {/* Scroll container */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
      >
        {files.map((file, index) => (
          <div
            key={file.id}
            className="flex-shrink-0 group"
          >
            {/* Preview */}
            <div className="relative w-28 h-28 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
              {file.preview ? (
                <img
                  src={file.preview}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
                  {getFileIcon(file)}
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 text-center line-clamp-2">
                    {file.name}
                  </span>
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                {onView && (
                  <button
                    onClick={() => onView(file)}
                    className="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
                  >
                    <ExternalLink size={14} className="text-gray-700 dark:text-gray-300" strokeWidth={2} />
                  </button>
                )}
                <button
                  onClick={() => onRemove(file.id)}
                  className="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={14} className="text-gray-700 dark:text-gray-300" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="mt-2 px-0.5">
              <p className="text-[12px] font-medium text-gray-900 dark:text-gray-100 truncate max-w-[112px]">
                {file.name}
              </p>
              {file.size && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {formatSize(file.size)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>


    </div>
  );
}