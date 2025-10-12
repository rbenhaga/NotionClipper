// packages/ui/src/components/layout/ResizableLayout.tsx
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
 * Layout redimensionnable avec deux panels
 * Utilise react-resizable-panels pour une UX fluide
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

      {/* Handle de redimensionnement */}
      <PanelResizeHandle className="group relative w-1 bg-gray-200 hover:bg-gray-300 transition-colors duration-150 flex items-center justify-center">
        <div className="absolute inset-y-0 -inset-x-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <GripVertical className="w-3 h-3 text-gray-400" />
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