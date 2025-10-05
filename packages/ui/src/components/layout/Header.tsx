import { Zap, WifiOff, Minus, Square, X } from 'lucide-react';

interface HeaderProps {
  isOnline?: boolean;
  isBackendConnected?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  title?: string;
}

export const Header = ({ 
  isOnline = true,
  isBackendConnected = true,
  onMinimize,
  onMaximize,
  onClose,
  title = "Notion Clipper Pro"
}: HeaderProps) => {
  return (
    <div className="bg-white border-b border-gray-200 flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Zap 
            size={20} 
            className={`${isOnline && isBackendConnected ? 'text-blue-500' : 'text-gray-400'}`}
            fill={isOnline && isBackendConnected ? 'currentColor' : 'none'}
          />
          {!isOnline && (
            <WifiOff size={12} className="absolute -bottom-1 -right-1 text-red-500" />
          )}
        </div>
        <h1 className="text-sm font-semibold text-gray-900">
          {title}
        </h1>
      </div>

      {(onMinimize || onMaximize || onClose) && (
        <div className="flex items-center gap-1">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            >
              <Minus size={14} className="text-gray-600" />
            </button>
          )}
          {onMaximize && (
            <button
              onClick={onMaximize}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            >
              <Square size={12} className="text-gray-600" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-red-100 rounded transition-colors"
            >
              <X size={14} className="text-gray-600 hover:text-red-600" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};