// packages/ui/src/components/common/LoadingProgress.tsx
// ✅ NOUVEAU: Indicateur de chargement progressif
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LoadingProgressProps {
  current: number;
  total: number;
  message: string;
}

export function LoadingProgress({ current, total, message }: LoadingProgressProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-800"
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Loader2 size={32} className="text-white animate-spin" />
          </div>
        </div>

        {/* Message */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
          {message}
        </h3>

        {/* Progress Bar */}
        <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
          />
        </div>

        {/* Percentage */}
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          {percentage}%
        </p>
      </motion.div>
    </div>
  );
}