// packages/ui/src/components/editor/FileUploadModal.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  File as FileIcon,
  Film
} from 'lucide-react';
import { FileUploadZone } from './FileUploadZone';

export type UploadMode = 'local' | 'url';

export interface FileUploadConfig {
  mode: UploadMode;
  files?: File[];
  url?: string;
  caption?: string;
}

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (config: FileUploadConfig) => void;
  maxSize?: number;
  allowedTypes?: string[];
}

/**
 * Modal d'upload minimaliste - Style Notion/Apple
 * Ajoute simplement les fichiers à la liste (pas d'envoi direct)
 */
export function FileUploadModal({
  isOpen,
  onClose,
  onAdd,
  maxSize = 20 * 1024 * 1024,
  allowedTypes = []
}: FileUploadModalProps) {
  const [mode, setMode] = useState<UploadMode>('local');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [url, setUrl] = useState('');

  // Réinitialiser
  const resetForm = () => {
    setSelectedFiles([]);
    setUrl('');
  };

  // Fermer
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Ajouter les fichiers
  const handleAdd = () => {
    const config: FileUploadConfig = { mode };

    if (mode === 'local') {
      if (selectedFiles.length === 0) return;
      config.files = selectedFiles;
    } else {
      if (!url.trim()) return;
      config.url = url.trim();
    }

    onAdd(config);
    handleClose();
  };

  // Peut ajouter ?
  const canAdd = mode === 'local' 
    ? selectedFiles.length > 0 
    : url.trim().length > 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#202020] rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header minimaliste */}
          <div className="relative px-6 pt-6 pb-4">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Ajouter un fichier
            </h2>
          </div>

          {/* Sélecteur mode - Minimaliste */}
          <div className="px-6 pb-4">
            <div className="inline-flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <button
                onClick={() => setMode('local')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md
                  font-medium text-sm transition-all duration-200
                  ${mode === 'local'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }
                `}
              >
                <Upload size={16} />
                <span>Importer</span>
              </button>
              <button
                onClick={() => setMode('url')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md
                  font-medium text-sm transition-all duration-200
                  ${mode === 'url'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }
                `}
              >
                <LinkIcon size={16} />
                <span>Lien</span>
              </button>
            </div>
          </div>

          {/* Contenu */}
          <div className="px-6 pb-6">
            <AnimatePresence mode="wait">
              {mode === 'local' ? (
                <motion.div
                  key="local"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                >
                  <FileUploadZone
                    onFileSelect={setSelectedFiles}
                    maxSize={maxSize}
                    allowedTypes={allowedTypes}
                    multiple={true}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="url"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  {/* Input URL minimaliste */}
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Coller le lien du fichier..."
                    autoFocus
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-gray-700 focus:border-gray-300 dark:focus:border-gray-600 focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 transition-all outline-none"
                  />
                  
                  {/* Suggestions de types */}
                  {!url && (
                    <div className="flex items-center gap-2 px-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500">Types supportés:</span>
                      <div className="flex items-center gap-1.5">
                        <ImageIcon size={14} className="text-gray-400 dark:text-gray-500" />
                        <Film size={14} className="text-gray-400 dark:text-gray-500" />
                        <FileIcon size={14} className="text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer minimaliste */}
          <div className="flex items-center justify-end gap-3 px-6 pb-6">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
            
            <motion.button
              onClick={handleAdd}
              disabled={!canAdd}
              className={`
                px-5 py-2 text-sm font-medium rounded-lg
                transition-all duration-200
                ${canAdd
                  ? 'bg-gray-900 dark:bg-gray-700 text-white hover:bg-gray-800 dark:hover:bg-gray-600 shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }
              `}
              whileHover={canAdd ? { scale: 1.02 } : {}}
              whileTap={canAdd ? { scale: 0.98 } : {}}
            >
              Ajouter
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}