// packages/ui/src/components/common/LoadingScreen.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Chargement...' 
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="text-center">
        {/* Spinner et message */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <Loader2 className="w-5 h-5 text-gray-600 dark:text-gray-400 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
            {message}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes loading-bar {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
