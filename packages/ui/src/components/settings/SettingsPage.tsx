/**
 * SettingsPage Premium - Apple/Notion/Linear inspired design
 * Glassmorphism, depth, spring animations, premium feel
 */

import React, { useState, useCallback, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Link2,
  Crown,
  Palette,
  Globe,
  Type,
  Keyboard,
  Database,
  Info,
  ChevronRight,
} from 'lucide-react';

import { ClipperProLogo } from '../../assets/icons';
import { AccountSection } from './sections/AccountSection';
import { ConnectionsSection } from './sections/ConnectionsSection';
import { SubscriptionSection } from './sections/SubscriptionSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { LanguageSection } from './sections/LanguageSection';
import { EditorSection } from './sections/EditorSection';
import { ShortcutsSection } from './sections/ShortcutsSection';
import { DataSection } from './sections/DataSection';
import { AboutSection } from './sections/AboutSection';

export type SettingsSection = 
  | 'account' | 'connections' | 'subscription' | 'appearance' 
  | 'language' | 'editor' | 'shortcuts' | 'data' | 'about';

export interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: SettingsSection;
  config: {
    notionToken?: string;
    userName?: string;
    userEmail?: string;
    userAvatar?: string;
    theme?: 'light' | 'dark' | 'system';
    [key: string]: any;
  };
  theme?: 'light' | 'dark' | 'system';
  onThemeChange?: (theme: 'light' | 'dark' | 'system') => void;
  onClearCache?: () => Promise<void>;
  onDisconnect?: () => Promise<void>;
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

// Navigation items with groups for better organization
const navigationGroups = [
  {
    label: 'Personnel',
    items: [
      { id: 'account' as SettingsSection, icon: User, label: 'Compte' },
      { id: 'subscription' as SettingsSection, icon: Crown, label: 'Abonnement' },
    ]
  },
  {
    label: 'Préférences',
    items: [
      { id: 'appearance' as SettingsSection, icon: Palette, label: 'Apparence' },
      { id: 'language' as SettingsSection, icon: Globe, label: 'Langue' },
      { id: 'editor' as SettingsSection, icon: Type, label: 'Éditeur' },
      { id: 'shortcuts' as SettingsSection, icon: Keyboard, label: 'Raccourcis' },
    ]
  },
  {
    label: 'Système',
    items: [
      { id: 'connections' as SettingsSection, icon: Link2, label: 'Connexions' },
      { id: 'data' as SettingsSection, icon: Database, label: 'Données' },
      { id: 'about' as SettingsSection, icon: Info, label: 'À propos' },
    ]
  }
];

// Flat list for search
const navigationItems = navigationGroups.flatMap(g => g.items);

function SettingsPageComponent({
  isOpen,
  onClose,
  initialSection = 'account',
  config,
  theme = 'system',
  onThemeChange,
  onClearCache,
  onDisconnect,
  showNotification
}: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);

  useEffect(() => {
    if (isOpen) {
      setActiveSection(initialSection);
    }
  }, [isOpen, initialSection]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);



  const renderSectionContent = useCallback(() => {
    const props = { config, theme, onThemeChange, onClearCache, onDisconnect, showNotification };
    switch (activeSection) {
      case 'account': return <AccountSection {...props} />;
      case 'connections': return <ConnectionsSection {...props} />;
      case 'subscription': return <SubscriptionSection {...props} />;
      case 'appearance': return <AppearanceSection {...props} />;
      case 'language': return <LanguageSection {...props} />;
      case 'editor': return <EditorSection {...props} />;
      case 'shortcuts': return <ShortcutsSection {...props} />;
      case 'data': return <DataSection {...props} />;
      case 'about': return <AboutSection {...props} />;
      default: return <AccountSection {...props} />;
    }
  }, [activeSection, config, theme, onThemeChange, onClearCache, onDisconnect, showNotification]);

  const currentSection = navigationItems.find(n => n.id === activeSection);

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop - Enhanced with better blur */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Container - Premium elevation */}
          <motion.div
            className="relative w-full max-w-4xl max-h-[88vh] bg-white dark:bg-[#0a0a0a] rounded-2xl overflow-hidden flex border border-gray-200/50 dark:border-white/[0.08] elevation-5"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ 
              duration: 0.35, 
              ease: [0.32, 0.72, 0, 1],
              opacity: { duration: 0.25 }
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar - Design System V2 avec tokens */}
            <motion.div 
              className="ds-sidebar w-64 flex-shrink-0 relative flex flex-col"
              style={{
                background: 'var(--ds-sidebar-bg)',
                borderRight: '1px solid var(--ds-sidebar-border)'
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
            >
              {/* Header - Logo */}
              <div className="p-4 border-b" style={{ borderColor: 'var(--ds-sidebar-divider)' }}>
                <div className="flex items-center gap-2.5">
                  <ClipperProLogo size={24} />
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--ds-sidebar-item-text)' }}>Clipper Pro</p>
                    <p className="text-[10px]" style={{ color: 'var(--ds-sidebar-item-text-muted)' }}>Paramètres</p>
                  </div>
                </div>
              </div>

              {/* Nav - Design System V2 avec tokens sidebar */}
              <nav className="flex-1 overflow-y-auto px-3 py-4 ds-scrollbar">
                {navigationGroups.map((group, groupIndex) => (
                  <motion.div 
                    key={group.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      duration: 0.3, 
                      delay: 0.15 + (groupIndex * 0.05),
                      ease: [0.32, 0.72, 0, 1]
                    }}
                  >
                    {/* Separator between groups */}
                    {groupIndex > 0 && (
                      <div className="ds-sidebar-divider" />
                    )}
                    
                    {/* Group label - Design System */}
                    <div className="ds-sidebar-group-title">
                      {group.label}
                    </div>
                    
                    {/* Group items */}
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        
                        return (
                          <motion.button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            whileTap={{ scale: 0.98 }}
                            className={`ds-sidebar-item ${isActive ? 'ds-sidebar-item-active' : ''}`}
                          >
                            <Icon 
                              size={16} 
                              strokeWidth={1.5}
                              className="ds-sidebar-item-icon"
                            />
                            <span className="ds-sidebar-item-label">
                              {item.label}
                            </span>
                            {!isActive && (
                              <ChevronRight 
                                size={14} 
                                strokeWidth={2}
                                className="ds-sidebar-item-chevron"
                              />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </nav>

              {/* Version - Minimal footer */}
              <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--ds-sidebar-divider)' }}>
                <p className="text-[10px]" style={{ color: 'var(--ds-sidebar-item-text-muted)' }}>
                  Version 1.0.0
                </p>
              </div>
            </motion.div>

            {/* Content - Design System V2 */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[var(--ds-bg-subtle)]">
              {/* Header - Sticky with blur */}
              <motion.div 
                className="sticky top-0 z-20 flex items-center justify-between px-8 py-5 border-b border-[var(--ds-border)] bg-[var(--ds-bg)]/95 backdrop-blur-xl"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <div>
                  <h2 className="text-[17px] font-semibold text-[var(--ds-fg)]">
                    {currentSection?.label}
                  </h2>
                  <p className="text-[12px] text-[var(--ds-fg-muted)] mt-0.5">
                    Gérez vos préférences
                  </p>
                </div>
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.05, rotate: 90 }}
                  whileTap={{ scale: 0.95 }}
                  className="ds-btn ds-btn-icon ds-btn-ghost"
                >
                  <X size={18} strokeWidth={1.5} />
                </motion.button>
              </motion.div>

              {/* Content Area - Enhanced spacing */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSection}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                    className="p-8"
                  >
                    {renderSectionContent()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const SettingsPage = memo(SettingsPageComponent);
