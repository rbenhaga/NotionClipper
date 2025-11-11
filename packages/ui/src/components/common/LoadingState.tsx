import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv, MotionButton, MotionMain } from '../common/MotionWrapper';
import { useTranslation } from '@notion-clipper/i18n';

export interface LoadingStateProps {
    message?: string;
}

export function LoadingState({ message }: LoadingStateProps) {
    const { t } = useTranslation();

    return (
        <MotionDiv
            className="flex flex-col items-center justify-center h-64 text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mb-3"></div>
            <p className="text-sm">{message || t('common.loadingPages')}</p>
        </MotionDiv>
    );
}