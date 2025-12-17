// packages/ui/src/components/layout/ResizableLayout.tsx
// 🎨 Design System Notion/Apple - Layout redimensionnable ultra épuré
import React, { useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { GripVertical } from 'lucide-react';

export interface ResizableLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftSize?: number;
  minLeftSize?: number;
  minRightSize?: number;
  onResize?: (sizes: number[]) => void;
  storageKey?: string;
}

/**
 * Layout redimensionnable avec design Notion/Apple
 * - Handle ultra fin et subtil
 * - Micro-interactions élégantes
 * - Zone de hit élargie pour meilleure UX
 */
export function ResizableLayout({
  leftPanel,
  rightPanel,
  defaultLeftSize = 35,
  minLeftSize = 25,
  minRightSize = 35,
  onResize,
  storageKey = 'resizable-layout'
}: ResizableLayoutProps) {

  const handleResize = useCallback((sizes: number[]) => {
    onResize?.(sizes);
  }, [onResize]);

  return (
    <PanelGroup
      direction="horizontal"
      onLayout={handleResize}
      storage={storageKey ? {
        getItem: (name: string) => {
          const value = localStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name: string, value: any) => {
          localStorage.setItem(name, JSON.stringify(value));
        }
      } : undefined}
      className="flex-1 flex app-main"
    >
      {/* Panel gauche */}
      <Panel
        defaultSize={defaultLeftSize}
        minSize={minLeftSize}
        className="flex flex-col"
      >
        {leftPanel}
      </Panel>

      {/* Handle de redimensionnement - Style Notion/Apple */}
      <PanelResizeHandle className="group relative w-px bg-gray-200 dark:bg-gray-800 transition-colors duration-200 flex items-center justify-center outline-none focus:outline-none">
        {/* Zone de hit élargie invisible pour meilleure UX */}
        <div className="absolute inset-y-0 -inset-x-2 cursor-col-resize" />
        
        {/* Ligne de feedback au hover */}
        <div className="absolute inset-y-0 w-px bg-gray-300 dark:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        
        {/* Icône grip - apparaît subtilement au hover */}
        <div className="relative z-10 flex items-center justify-center w-6 h-12 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200 shadow-sm">
          <GripVertical 
            size={14} 
            className="text-gray-400 dark:text-gray-500" 
            strokeWidth={2}
          />
        </div>
      </PanelResizeHandle>

      {/* Panel droit */}
      <Panel
        minSize={minRightSize}
        className="flex flex-col"
      >
        {rightPanel}
      </Panel>
    </PanelGroup>
  );
}