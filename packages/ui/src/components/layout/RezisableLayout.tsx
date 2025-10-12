// packages/ui/src/components/layout/ResizableLayout.tsx
import React, { ReactNode, useEffect, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { GripVertical } from 'lucide-react';

interface ResizableLayoutProps {
    leftPanel: ReactNode;
    rightPanel: ReactNode;
    defaultLeftSize?: number;
    minLeftSize?: number;
    minRightSize?: number;
    onResize?: (sizes: number[]) => void;
    storageKey?: string;
}

/**
 * ResizableLayout - Layout avec panels redimensionnables
 * 
 * Utilise react-resizable-panels pour permettre le redimensionnement fluide
 * entre la liste des pages et l'éditeur de contenu.
 * 
 * Features:
 * - Drag handle avec indicateur visuel
 * - Persistance des tailles via localStorage
 * - Animations fluides style Notion
 * - Limites min/max configurables
 */
export function ResizableLayout({
    leftPanel,
    rightPanel,
    defaultLeftSize = 35,
    minLeftSize = 20,
    minRightSize = 30,
    onResize,
    storageKey = 'notion-clipper-panel-sizes'
}: ResizableLayoutProps) {
    const [sizes, setSizes] = useState<number[]>([defaultLeftSize, 100 - defaultLeftSize]);

    // Charger les tailles sauvegardées
    useEffect(() => {
        if (storageKey) {
            try {
                const saved = localStorage.getItem(storageKey);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length === 2) {
                        setSizes(parsed);
                    }
                }
            } catch (error) {
                console.error('Error loading panel sizes:', error);
            }
        }
    }, [storageKey]);

    const handleResize = (newSizes: number[]) => {
        setSizes(newSizes);

        // Sauvegarder
        if (storageKey) {
            try {
                localStorage.setItem(storageKey, JSON.stringify(newSizes));
            } catch (error) {
                console.error('Error saving panel sizes:', error);
            }
        }

        // Callback
        if (onResize) {
            onResize(newSizes);
        }
    };

    return (
        <PanelGroup
            direction="horizontal"
            onLayout={handleResize}
            className="flex-1 overflow-hidden"
        >
            {/* Panel gauche - Liste des pages */}
            <Panel
                defaultSize={sizes[0]}
                minSize={minLeftSize}
                className="relative"
            >
                {leftPanel}
            </Panel>

            {/* Handle de redimensionnement */}
            <PanelResizeHandle className="relative w-1 group hover:w-2 transition-all duration-150">
                <div className="absolute inset-0 bg-gray-200 group-hover:bg-gray-300 transition-colors" />

                {/* Indicateur visuel au hover */}
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-gray-800 text-white rounded-full p-1 shadow-lg">
                        <GripVertical size={14} />
                    </div>
                </div>
            </PanelResizeHandle>

            {/* Panel droit - Éditeur de contenu */}
            <Panel
                defaultSize={sizes[1]}
                minSize={minRightSize}
                className="relative"
            >
                {rightPanel}
            </Panel>
        </PanelGroup>
    );
}