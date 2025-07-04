// src/react/src/components/layout/Header.jsx
import React from 'react';
import { 
  Zap, 
  WifiOff,
  Minus,
  Square,
  X
} from 'lucide-react';

export default function Header({ 
  isOnline,
  isBackendConnected,
  onMinimize,
  onMaximize,
  onClose
}) {
  return (
    <div className="bg-white border-b border-notion-gray-200 flex items-center justify-between px-4 py-2 drag-region">
      <div className="flex items-center gap-3 no-drag">
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
        <h1 className="text-sm font-semibold text-notion-gray-900">
          Notion Clipper Pro
        </h1>
      </div>

      <div className="flex items-center gap-1 no-drag">
        <button
          onClick={onMinimize}
          className="p-1.5 hover:bg-notion-gray-100 rounded transition-colors"
        >
          <Minus size={14} className="text-notion-gray-600" />
        </button>
        <button
          onClick={onMaximize}
          className="p-1.5 hover:bg-notion-gray-100 rounded transition-colors"
        >
          <Square size={12} className="text-notion-gray-600" />
        </button>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-red-100 rounded transition-colors"
        >
          <X size={14} className="text-notion-gray-600 hover:text-red-600" />
        </button>
      </div>
    </div>
  );
}