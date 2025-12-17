/**
 * EditorSidePanel - Panneau latéral intégré style Notion
 * Regroupe Destinations, Templates, Files, Voice dans un design épuré
 */

import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '../common/MotionWrapper';
import {
  Send, Sparkles, Paperclip, Mic, ChevronDown, ChevronUp
} from 'lucide-react';

import { DestinationsCarousel } from './DestinationsCarousel';
import { TemplateSelector, Template } from './TemplateSelector';
import { FileCarousel, AttachedFile } from './FileCarousel';
import { VoiceRecorder, VoiceRecording } from './VoiceRecorder';

interface EditorSidePanelProps {
  // Destinations
  selectedPage: any;
  selectedPages: string[];
  multiSelectMode: boolean;
  pages: any[];
  onDeselectPage?: (pageId: string) => void;
  onSectionSelect?: (pageId: string, blockId: string, headingText: string) => void;
  selectedSections?: Array<{ pageId: string; blockId: string; headingText: string }>;

  // Templates
  onTemplateSelect: (template: Template) => void;
  onCreateCustomTemplate?: () => void;

  // Files
  attachedFiles: AttachedFile[];
  onRemoveFile: (id: string) => void;
  onFileUpload: () => void;
  fileQuotaRemaining?: number | null;
  onFileQuotaExceeded?: () => void;
  sending?: boolean;

  // Voice
  onVoiceComplete: (recording: VoiceRecording) => void;
  onTranscription: (text: string) => void;

  // Notifications
  showNotification?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

type ExpandedSection = 'templates' | 'files' | 'voice' | null;

export function EditorSidePanel({
  selectedPage,
  selectedPages,
  multiSelectMode,
  pages,
  onDeselectPage,
  onSectionSelect,
  selectedSections = [],
  onTemplateSelect,
  onCreateCustomTemplate,
  attachedFiles,
  onRemoveFile,
  onFileUpload,
  fileQuotaRemaining,
  onFileQuotaExceeded,
  sending,
  onVoiceComplete,
  onTranscription,
  showNotification,
}: EditorSidePanelProps) {
  const [expanded, setExpanded] = useState<ExpandedSection>(null);

  const toggleSection = (section: ExpandedSection) => {
    setExpanded(expanded === section ? null : section);
  };

  const handleTemplateSelect = useCallback((template: Template) => {
    onTemplateSelect(template);
    setExpanded(null);
    showNotification?.(`Template "${template.name}" applied`, 'success');
  }, [onTemplateSelect, showNotification]);

  const sections = [
    {
      id: 'templates' as const,
      icon: <Sparkles size={16} />,
      title: 'Templates',
      count: null,
      enabled: true,
    },
    {
      id: 'files' as const,
      icon: <Paperclip size={16} />,
      title: 'Files',
      count: attachedFiles.length || null,
      enabled: true,
    },
    {
      id: 'voice' as const,
      icon: <Mic size={16} />,
      title: 'Voice',
      count: null,
      enabled: true,
    },
  ];

  return (
    <div className="w-80 flex-shrink-0 flex flex-col gap-4 pl-6">
      {/* Destinations - Toujours visible */}
      <div className="bg-white dark:bg-[#191919] rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <DestinationsCarousel
          selectedPage={selectedPage}
          selectedPages={selectedPages}
          multiSelectMode={multiSelectMode}
          pages={pages}
          onDeselectPage={onDeselectPage}
          onSectionSelect={onSectionSelect}
          selectedSections={selectedSections}
          className="border-0 rounded-none shadow-none"
        />
      </div>

      {/* Sections repliables - Templates, Files, Voice */}
      <div className="bg-white dark:bg-[#191919] rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {sections.map((section, index) => {
          const isExpanded = expanded === section.id;
          const isLast = index === sections.length - 1;

          return (
            <div key={section.id}>
              {/* Header */}
              <button
                onClick={() => toggleSection(section.id)}
                disabled={!section.enabled}
                className={`
                  w-full px-4 py-3 flex items-center justify-between
                  text-sm font-medium text-gray-700 dark:text-gray-300
                  hover:bg-gray-50 dark:hover:bg-gray-800/50
                  transition-colors
                  ${!isLast && !isExpanded ? 'border-b border-gray-100 dark:border-gray-800' : ''}
                  ${!section.enabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400">{section.icon}</span>
                  <span>{section.title}</span>
                  {section.count !== null && (
                    <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                      {section.count}
                    </span>
                  )}
                </div>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {/* Content */}
              <AnimatePresence>
                {isExpanded && (
                  <MotionDiv
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`overflow-hidden ${!isLast ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}
                  >
                    <div className="p-4 bg-gray-50/50 dark:bg-gray-800/20">
                      {section.id === 'templates' && (
                        <TemplateSelector
                          onSelectTemplate={handleTemplateSelect}
                          onCreateCustom={onCreateCustomTemplate}
                        />
                      )}

                      {section.id === 'files' && (
                        <div className="space-y-3">
                          {attachedFiles.length > 0 ? (
                            <FileCarousel
                              files={attachedFiles}
                              onRemove={onRemoveFile}
                            />
                          ) : (
                            <div className="text-center py-6">
                              <Paperclip size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                              <p className="text-sm text-gray-500 dark:text-gray-400">No files attached</p>
                            </div>
                          )}
                          <button
                            onClick={() => fileQuotaRemaining === 0 ? onFileQuotaExceeded?.() : onFileUpload()}
                            disabled={sending || fileQuotaRemaining === 0}
                            className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add Files
                          </button>
                        </div>
                      )}

                      {section.id === 'voice' && (
                        <VoiceRecorder
                          onRecordingComplete={onVoiceComplete}
                          onTranscriptionComplete={onTranscription}
                          autoTranscribe
                          language="fr-FR"
                        />
                      )}
                    </div>
                  </MotionDiv>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
