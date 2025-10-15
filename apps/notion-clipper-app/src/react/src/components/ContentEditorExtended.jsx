// apps/notion-clipper-app/src/react/src/components/ContentEditorExtended.jsx
import React from 'react';
import { ContentEditor } from '@notion-clipper/ui';
import { Upload } from 'lucide-react';

export function ContentEditorExtended({
    onOpenFileUpload,
    ...props
}) {
    return (
        <div className="h-full flex flex-col">
            {/* Barre d'outils avec bouton d'upload */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-medium text-gray-900">Éditeur de contenu</h3>

                <button
                    onClick={onOpenFileUpload}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Upload className="w-4 h-4" />
                    Upload fichier
                </button>
            </div>

            {/* ContentEditor original */}
            <div className="flex-1">
                <ContentEditor {...props} />
            </div>
        </div>
    );
}