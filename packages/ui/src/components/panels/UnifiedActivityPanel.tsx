// packages/ui/src/components/panels/UnifiedActivityPanel.tsx
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '../common/MotionWrapper';
import { X } from 'lucide-react';
import { UnifiedQueueHistory, type UnifiedEntry } from '../unified/UnifiedQueueHistory';
import { useTranslation } from '@notion-clipper/i18n';

interface UnifiedActivityPanelProps {
    isOpen: boolean;
    onClose: () => void;
    entries: UnifiedEntry[];
    onRetry: (id: string) => void;
    onDelete: (id: string) => void;
    onClear?: () => void;
    isOnline: boolean;
}



export function UnifiedActivityPanel({
    isOpen,
    onClose,
    entries,
    onRetry,
    onDelete,
    onClear,
    isOnline
}: UnifiedActivityPanelProps) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <MotionDiv
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <MotionDiv
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 10 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-white dark:bg-[#191919] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Minimal header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                        <div>
                            <h2 className="text-[17px] font-semibold text-gray-900 dark:text-gray-100">
                                {t('common.activity')}
                            </h2>
                            <p className="text-[13px] text-gray-600 dark:text-gray-400 mt-0.5">
                                {entries.length} {entries.length > 1 ? t('common.elements') : t('common.element')}
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X size={18} className="text-gray-600 dark:text-gray-400" strokeWidth={2} />
                        </button>
                    </div>

                    {/* Content with subtle scrollbar */}
                    <div className="overflow-y-auto max-h-[calc(85vh-80px)] notion-scrollbar">
                        <div className="p-6">
                            <UnifiedQueueHistory
                                entries={entries}
                                onRetry={onRetry}
                                onDelete={onDelete}
                                onClear={onClear}
                                isOnline={isOnline}
                            />
                        </div>
                    </div>
                </MotionDiv>
            </MotionDiv>
        </AnimatePresence>
    );
}