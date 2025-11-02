// apps/notion-clipper-app/src/react/src/App.tsx - VERSION OPTIMISÉE ET MODULAIRE
import React, { memo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import './App.css';

// Imports depuis packages/ui
import {
    Onboarding,
    Layout,
    Header,
    ContentArea,
    PageList,
    ContentEditor,
    ConfigPanel,
    NotificationManager,
    ErrorBoundary,
    SkeletonPageList,
    ResizableLayout,
    MinimalistView,
    UnifiedWorkspace,
    ShortcutsModal,
    FileUploadModal,
    UnifiedActivityPanel,
    useAppState
} from '@notion-clipper/ui';

// Composants mémorisés
const MemoizedPageList = memo(PageList);
const MemoizedMinimalistView = memo(MinimalistView);

/**
 * Composant principal de l'application Notion Clipper
 * Version optimisée utilisant le hook composite useAppState
 */
function App() {
    // 🎯 UN SEUL HOOK QUI GÈRE TOUT L'ÉTAT DE L'APP
    const {
        // États UI
        showOnboarding,
        setShowOnboarding,
        onboardingCompleted,
        isOAuthCallback,
        setIsOAuthCallback,
        showConfig,
        setShowConfig,
        sidebarCollapsed,
        setSidebarCollapsed,
        multiSelectMode,
        selectedPages,
        selectedPage,
        loading,
        showPreview,
        setShowPreview,
        sending,
        sendingStatus,
        contentProperties,
        hasUserEditedContent,
        showFileUpload,
        setShowFileUpload,
        showHistoryPanel,
        setShowHistoryPanel,
        showQueuePanel,
        setShowQueuePanel,
        attachedFiles,
        showShortcuts,
        setShowShortcuts,

        // Références
        fileInputRef,

        // Hooks
        windowPreferences,
        notifications,
        config,
        pages,
        clipboard,
        history,
        queue,
        networkStatus,
        theme,

        // Handlers
        handleCompleteOnboarding,
        handleResetApp,
        handleEditContent,
        handleClearClipboard,
        handlePageSelect,
        handleToggleMultiSelect,
        handleDeselectAll,
        handleDeselectPage,
        handleUpdateProperties,
        handleAttachedFilesChange,
        handleSend,

        // Raccourcis
        shortcuts,

        // 🆕 Sections sélectionnées
        selectedSections,
        onSectionSelect,
        onSectionDeselect,
        clearSelectedSections,
        unifiedQueueHistory,

        // Utilitaires
        canSend
    } = useAppState();

    // 🆕 État pour le panneau d'activité unifié
    const [showActivityPanel, setShowActivityPanel] = useState(false);

    // ============================================
    // HANDLERS SPÉCIFIQUES À L'APP
    // ============================================

    // Fonction vide - les fichiers sont gérés via attachedFiles dans handleSend
    const handleFileUpload = async (config: any) => {
        // Ne rien faire - les fichiers sont automatiquement envoyés via handleSend
        console.log('[App] File upload handled via attachedFiles, config:', config);
    };

    // 🆕 Handler pour ouvrir le panneau d'activité
    const handleStatusClick = () => {
        setShowActivityPanel(true);
    };

    // 🆕 Calculer les statistiques pour l'indicateur de statut
    const pendingCount = unifiedQueueHistory.entries.filter((e: any) =>
        e.status === 'pending' || e.status === 'offline'
    ).length;

    const errorCount = unifiedQueueHistory.entries.filter((e: any) =>
        e.status === 'error'
    ).length;

    // ============================================
    // HANDLERS POUR CONFIG PANEL
    // ============================================

    const handleClearCache = async () => {
        try {
            if (!window.electronAPI) {
                throw new Error('ElectronAPI not available');
            }
            
            console.log('[App] 🧹 Starting complete cache clear...');
            
            // 1. Clear Electron cache
            await window.electronAPI.invoke('cache:clear');
            
            // 2. Clear localStorage manually (double sécurité)
            localStorage.clear();
            
            // 3. Clear specific keys if needed
            const keysToRemove = [
                'offline-queue',
                'offline-history', 
                'windowPreferences',
                'notion-clipper-config',
                'notion-clipper-cache'
            ];
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
            
            console.log('[App] ✅ Complete cache clear finished');
            notifications.showNotification('Cache complètement vidé avec succès', 'success');
            
            // Recharger les pages après vidage du cache
            await pages.loadPages();
            
            // Force refresh des hooks qui utilisent localStorage
            window.location.reload();
        } catch (error: any) {
            console.error('[handleClearCache] Error:', error);
            notifications.showNotification(`Erreur lors du vidage du cache: ${error.message}`, 'error');
        }
    };

    const handleDisconnect = async () => {
        try {
            if (!window.electronAPI) {
                throw new Error('ElectronAPI not available');
            }
            
            console.log('[App] 🧹 Starting complete disconnect...');
            
            // 1. Reset configuration complète (inclut cache, history, queue)
            await window.electronAPI.invoke('config:reset');
            
            // 2. Clear localStorage manuellement (double sécurité)
            localStorage.clear();
            
            // 3. Clear specific keys
            const keysToRemove = [
                'offline-queue',
                'offline-history', 
                'windowPreferences',
                'notion-clipper-config',
                'notion-clipper-cache'
            ];
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
            
            // 4. Clear session storage aussi
            sessionStorage.clear();
            
            console.log('[App] ✅ Complete disconnect finished');
            notifications.showNotification('Déconnecté avec succès - Toutes les données effacées', 'success');

            // Forcer le rechargement de l'application pour revenir à l'onboarding
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error: any) {
            console.error('[handleDisconnect] Error:', error);
            notifications.showNotification(`Erreur lors de la déconnexion: ${error.message}`, 'error');
        }
    };

    // ============================================
    // RENDU CONDITIONNEL - OAUTH CALLBACK
    // ============================================

    if (isOAuthCallback) {
        return (
            <ErrorBoundary>
                <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check size={32} className="text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Connexion réussie !</h2>
                        <p className="text-gray-600 mb-6">Votre workspace Notion est maintenant connecté</p>
                        <button
                            onClick={() => {
                                setIsOAuthCallback(false);
                                setShowOnboarding(false);
                            }}
                            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all"
                        >
                            Continuer
                        </button>
                    </div>
                </div>
            </ErrorBoundary>
        );
    }

    // ============================================
    // RENDU CONDITIONNEL - MODE MINIMALISTE
    // ============================================

    if (windowPreferences.isMinimalist) {
        return (
            <ErrorBoundary>
                <Layout loading={loading}>
                    <Header
                        isConnected={networkStatus.isOnline}
                        isPinned={windowPreferences.isPinned}
                        onTogglePin={windowPreferences.togglePin}
                        isMinimalist={windowPreferences.isMinimalist}
                        onToggleMinimalist={windowPreferences.toggleMinimalist}
                        onMinimize={window.electronAPI?.minimizeWindow}
                        onMaximize={window.electronAPI?.maximizeWindow}
                        onClose={window.electronAPI?.closeWindow}
                        onOpenConfig={() => setShowConfig(true)}
                        pendingCount={pendingCount}
                        errorCount={errorCount}
                        onStatusClick={handleStatusClick}
                        selectedPage={selectedPage}
                    />

                    <MemoizedMinimalistView
                        clipboard={clipboard.clipboard}
                        editedClipboard={clipboard.editedClipboard}
                        onEditContent={handleEditContent}
                        selectedPage={selectedPage}
                        pages={pages.pages}
                        onPageSelect={handlePageSelect}
                        onSend={handleSend}
                        onClearClipboard={handleClearClipboard}
                        onExitMinimalist={windowPreferences.toggleMinimalist}
                        sending={sending}
                        canSend={canSend}
                        attachedFiles={attachedFiles}
                        onFilesChange={handleAttachedFilesChange}
                        onFileUpload={handleFileUpload}
                    />

                    <NotificationManager
                        notifications={notifications.notifications}
                        onClose={notifications.closeNotification}
                    />

                    <ConfigPanelModal />
                    <ShortcutsModalComponent />
                    <FileInputHidden />
                </Layout>
            </ErrorBoundary>
        );
    }

    // ============================================
    // RENDU CONDITIONNEL - ONBOARDING
    // ============================================

    if (showOnboarding) {
        return (
            <ErrorBoundary>
                <Layout>
                    <Onboarding
                        onComplete={handleCompleteOnboarding}
                        onValidateToken={async (token: string) => {
                            const result = await config.validateNotionToken(token);
                            return result.success;
                        }}
                    />
                </Layout>
            </ErrorBoundary>
        );
    }

    // ============================================
    // RENDU CONDITIONNEL - CHARGEMENT
    // ============================================

    if (loading && !onboardingCompleted) {
        return (
            <ErrorBoundary>
                <Layout loading={true}>
                    <Header
                        isConnected={networkStatus.isOnline}
                        isPinned={windowPreferences.isPinned}
                        onTogglePin={windowPreferences.togglePin}
                        isMinimalist={windowPreferences.isMinimalist}
                        onToggleMinimalist={windowPreferences.toggleMinimalist}
                        onMinimize={window.electronAPI?.minimizeWindow}
                        onMaximize={window.electronAPI?.maximizeWindow}
                        onClose={window.electronAPI?.closeWindow}
                        pendingCount={pendingCount}
                        errorCount={errorCount}
                        onStatusClick={handleStatusClick}
                        selectedPage={selectedPage}
                    />

                    <div className="flex-1 flex">
                        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'w-0' : 'w-80'}`}>
                            <SkeletonPageList />
                        </div>
                        <ContentArea>
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="loading-spinner w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full mx-auto mb-4"></div>
                                    <p className="text-gray-600">Chargement...</p>
                                </div>
                            </div>
                        </ContentArea>
                    </div>
                </Layout>
            </ErrorBoundary>
        );
    }

    // ============================================
    // RENDU PRINCIPAL - INTERFACE COMPLÈTE
    // ============================================

    return (
        <ErrorBoundary>
            <Layout>
                <Header
                    onOpenConfig={() => setShowConfig(true)}
                    onToggleSidebar={() => setSidebarCollapsed((prev: boolean) => !prev)}
                    sidebarCollapsed={sidebarCollapsed}
                    isPinned={windowPreferences.isPinned}
                    onTogglePin={windowPreferences.togglePin}
                    isMinimalist={windowPreferences.isMinimalist}
                    onToggleMinimalist={windowPreferences.toggleMinimalist}
                    onMinimize={window.electronAPI?.minimizeWindow}
                    onMaximize={window.electronAPI?.maximizeWindow}
                    onClose={window.electronAPI?.closeWindow}
                    isConnected={networkStatus.isOnline}
                    pendingCount={pendingCount}
                    errorCount={errorCount}
                    onStatusClick={handleStatusClick}
                    selectedPage={selectedPage}
                />

                <div className="flex-1 flex overflow-hidden">
                    {!sidebarCollapsed ? (
                        <ResizableLayout
                            leftPanel={
                                <MemoizedPageList
                                    filteredPages={pages.filteredPages}
                                    selectedPage={selectedPage}
                                    selectedPages={selectedPages}
                                    multiSelectMode={multiSelectMode}
                                    favorites={pages.favorites}
                                    searchQuery={pages.searchQuery}
                                    activeTab={pages.activeTab}
                                    onPageSelect={handlePageSelect}
                                    onToggleFavorite={pages.toggleFavorite}
                                    onSearchChange={pages.setSearchQuery}
                                    onTabChange={pages.setActiveTab}
                                    loading={pages.pagesLoading}
                                    loadingMore={pages.loadingMore}
                                    hasMorePages={pages.hasMorePages}
                                    onLoadMore={pages.loadMorePages}
                                    onDeselectAll={handleDeselectAll}
                                />
                            }
                            rightPanel={
                                <UnifiedWorkspace
                                    selectedPage={selectedPage}
                                    onPageSelect={handlePageSelect}
                                    pages={pages.pages}
                                    onSend={handleSend}
                                    canSend={canSend}
                                    // 🆕 Nouvelles props unifiées
                                    unifiedEntries={unifiedQueueHistory.entries}
                                    onRetryEntry={unifiedQueueHistory.retry}
                                    onDeleteEntry={unifiedQueueHistory.remove}
                                    onClearAll={unifiedQueueHistory.clear}
                                    isOnline={networkStatus.isOnline}
                                    // Legacy props (fallback)
                                    queueItems={queue.queue || []}
                                    onRetryQueue={queue.retry}
                                    onRemoveFromQueue={queue.remove}
                                    historyItems={history.history || []}
                                    onRetryHistory={history.retry}
                                    onDeleteHistory={history.deleteEntry}
                                >
                                    <ContentEditor
                                        clipboard={clipboard.clipboard}
                                        editedClipboard={clipboard.editedClipboard}
                                        onEditContent={handleEditContent}
                                        onClearClipboard={handleClearClipboard}
                                        selectedPage={selectedPage}
                                        selectedPages={selectedPages}
                                        multiSelectMode={multiSelectMode}
                                        sending={sending}
                                        onSend={handleSend}
                                        canSend={canSend}
                                        contentProperties={contentProperties}
                                        onUpdateProperties={handleUpdateProperties}
                                        showNotification={notifications.showNotification}
                                        pages={pages.pages}
                                        onDeselectPage={handleDeselectPage}
                                        config={config.config}
                                        attachedFiles={attachedFiles}
                                        onFilesChange={handleAttachedFilesChange}
                                        onFileUpload={handleFileUpload}
                                        maxFileSize={5 * 1024 * 1024}
                                        allowedFileTypes={[
                                            'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
                                            'image/webp', 'image/bmp', 'image/svg+xml',
                                            'video/mp4', 'video/mov', 'video/webm',
                                            'audio/mp3', 'audio/wav', 'audio/ogg',
                                            'application/pdf'
                                        ]}
                                        selectedSections={selectedSections}
                                        onSectionSelect={onSectionSelect}

                                    />
                                </UnifiedWorkspace>
                            }
                            defaultLeftSize={35}
                            minLeftSize={25}
                            minRightSize={35}
                        />
                    ) : (
                        <div className="flex-1 overflow-hidden">
                            <UnifiedWorkspace
                                selectedPage={selectedPage}
                                onPageSelect={handlePageSelect}
                                pages={pages.pages}
                                onSend={handleSend}
                                canSend={canSend}
                                // 🆕 Nouvelles props unifiées
                                unifiedEntries={unifiedQueueHistory.entries}
                                onRetryEntry={unifiedQueueHistory.retry}
                                onDeleteEntry={unifiedQueueHistory.remove}
                                onClearAll={unifiedQueueHistory.clear}
                                isOnline={networkStatus.isOnline}
                                // Legacy props (fallback)
                                queueItems={queue.queue || []}
                                onRetryQueue={queue.retry}
                                onRemoveFromQueue={queue.remove}
                                historyItems={history.history || []}
                                onRetryHistory={history.retry}
                                onDeleteHistory={history.deleteEntry}
                            >
                                <ContentEditor
                                    clipboard={clipboard.clipboard}
                                    editedClipboard={clipboard.editedClipboard}
                                    onEditContent={handleEditContent}
                                    onClearClipboard={handleClearClipboard}
                                    selectedPage={selectedPage}
                                    selectedPages={selectedPages}
                                    multiSelectMode={multiSelectMode}
                                    sending={sending}
                                    onSend={handleSend}
                                    canSend={canSend}
                                    contentProperties={contentProperties}
                                    onUpdateProperties={handleUpdateProperties}
                                    showNotification={notifications.showNotification}
                                    pages={pages.pages}
                                    onDeselectPage={handleDeselectPage}
                                    config={config.config}
                                    attachedFiles={attachedFiles}
                                    onFilesChange={handleAttachedFilesChange}
                                    onFileUpload={handleFileUpload}
                                    maxFileSize={5 * 1024 * 1024}
                                    allowedFileTypes={[
                                        'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
                                        'image/webp', 'image/bmp', 'image/svg+xml',
                                        'video/mp4', 'video/mov', 'video/webm',
                                        'audio/mp3', 'audio/wav', 'audio/ogg',
                                        'application/pdf'
                                    ]}
                                    selectedSections={selectedSections}
                                    onSectionSelect={onSectionSelect}

                                />
                            </UnifiedWorkspace>
                        </div>
                    )}
                </div>

                {/* Modales et panels */}
                <ConfigPanelModal />
                <FileUploadModalComponent />
                <HistoryPanelModal />
                <QueuePanelModal />
                <NotificationManager
                    notifications={notifications.notifications}
                    onClose={notifications.closeNotification}
                />
                <ShortcutsModalComponent />
                <FileInputHidden />

                {/* 🆕 Panneau d'activité unifié */}
                <UnifiedActivityPanel
                    isOpen={showActivityPanel}
                    onClose={() => setShowActivityPanel(false)}
                    entries={unifiedQueueHistory.entries}
                    onRetry={unifiedQueueHistory.retry}
                    onDelete={unifiedQueueHistory.remove}
                    onClear={unifiedQueueHistory.clear}
                    isOnline={networkStatus.isOnline}
                />
            </Layout>
        </ErrorBoundary>
    );

    // ============================================
    // COMPOSANTS INTERNES POUR ÉVITER LA RÉPÉTITION
    // ============================================

    function ConfigPanelModal() {
        return (
            <AnimatePresence>
                {showConfig && (
                    <ConfigPanel
                        isOpen={showConfig}
                        config={config.config}
                        onClose={() => setShowConfig(false)}
                        showNotification={notifications.showNotification}
                        onClearCache={handleClearCache}
                        onDisconnect={handleDisconnect}
                        theme={theme.theme}
                        onThemeChange={theme.setTheme}
                    />
                )}
            </AnimatePresence>
        );
    }

    function FileUploadModalComponent() {
        return (
            <AnimatePresence>
                {showFileUpload && (
                    <FileUploadModal
                        isOpen={showFileUpload}
                        onClose={() => setShowFileUpload(false)}
                        onAdd={(config) => {
                            handleFileUpload(config);
                            setShowFileUpload(false);
                        }}
                        maxSize={20 * 1024 * 1024}
                        allowedTypes={[
                            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                            'video/mp4', 'video/webm',
                            'audio/mp3', 'audio/wav',
                            'application/pdf', 'text/plain'
                        ]}
                    />
                )}
            </AnimatePresence>
        );
    }

    function HistoryPanelModal() {
        return (
            <AnimatePresence>
                {showHistoryPanel && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                            <div className="p-4 border-b flex justify-between items-center">
                                <h2 className="text-lg font-semibold">Historique</h2>
                                <button
                                    onClick={() => setShowHistoryPanel(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        );
    }

    function QueuePanelModal() {
        if (!showQueuePanel) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="text-lg font-semibold">File d'attente</h2>
                        <button
                            onClick={() => setShowQueuePanel(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    function ShortcutsModalComponent() {
        return (
            <ShortcutsModal
                isOpen={showShortcuts}
                onClose={() => setShowShortcuts(false)}
                shortcuts={shortcuts}
            />
        );
    }

    function FileInputHidden() {
        return (
            <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                        const newFiles = files.map(file => ({
                            id: Date.now() + Math.random(),
                            file,
                            name: file.name,
                            type: file.type,
                            size: file.size
                        }));
                        handleAttachedFilesChange([...attachedFiles, ...newFiles]);
                    }
                    e.target.value = '';
                }}
            />
        );
    }
}

export default App;