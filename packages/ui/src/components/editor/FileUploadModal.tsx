// FileUploadModal.tsx - Design System Notion/Apple
import React, { useState } from 'react';
import { useTranslation } from '@notion-clipper/i18n';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv, MotionButton, MotionMain } from '../common/MotionWrapper';
import { X, Upload, Link as LinkIcon } from 'lucide-react';
import { FileUploadZone } from './FileUploadZone';

export type UploadMode = 'local' | 'url';

export interface FileUploadConfig {
  mode: UploadMode;
  files?: File[];
  url?: string;
}

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (config: FileUploadConfig) => void;
  maxSize?: number;
  allowedTypes?: string[];
  // 🆕 Quota checks freemium
  onQuotaCheck?: (filesCount: number) => Promise<{ canUpload: boolean; quotaReached: boolean; remaining?: number }>;
  onQuotaExceeded?: () => void;
}

export function FileUploadModal({
  isOpen,
  onClose,
  onAdd,
  maxSize = 20 * 1024 * 1024,
  allowedTypes = [],
  onQuotaCheck,
  onQuotaExceeded
}: FileUploadModalProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<UploadMode>('local');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [url, setUrl] = useState('');

  const resetForm = () => {
    setSelectedFiles([]);
    setUrl('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

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

  const canAdd = mode === 'local' ? selectedFiles.length > 0 : url.trim().length > 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay */}
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        />

        {/* Modal */}
        <MotionDiv
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">
                {t('common.addFile')}
              </h2>
              <button
                onClick={handleClose}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Mode selector */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div className="inline-flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <button
                onClick={() => setMode('local')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-[13px] transition-colors ${
                  mode === 'local'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Upload size={14} strokeWidth={2} />
                <span>{t('common.import')}</span>
              </button>
              <button
                onClick={() => setMode('url')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-[13px] transition-colors ${
                  mode === 'url'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <LinkIcon size={14} strokeWidth={2} />
                <span>{t('common.link')}</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            <AnimatePresence mode="wait">
              {mode === 'local' ? (
                <MotionDiv
                  key="local"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <FileUploadZone
                    onFileSelect={setSelectedFiles}
                    maxSize={maxSize}
                    allowedTypes={allowedTypes}
                    multiple={true}
                    onQuotaCheck={onQuotaCheck}
                    onQuotaExceeded={onQuotaExceeded}
                  />
                </MotionDiv>
              ) : (
                <MotionDiv
                  key="url"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={t('common.pasteLinkPlaceholder')}
                    autoFocus
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:border-gray-300 dark:focus:border-gray-600 transition-colors outline-none"
                  />
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {t('common.cancel')}
            </button>

            <button
              onClick={handleAdd}
              disabled={!canAdd}
              className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-colors ${
                canAdd
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              {t('common.add')}
            </button>
          </div>
        </MotionDiv>
      </div>
    </AnimatePresence>
  );
}