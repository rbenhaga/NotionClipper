// packages/ui/src/examples/NewFeaturesDemo.tsx
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Header,
  DynamicIsland,
  FileUploadPanel,
  HistoryPanel,
  QueuePanel,
  useHistory,
  useQueue,
  useNetworkStatus,
  useFileUpload
} from '../index';

// Exemple d'utilisation complète des nouvelles fonctionnalités
export function NewFeaturesDemo() {
  // États pour les panels
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showQueuePanel, setShowQueuePanel] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  // Hooks personnalisés
  const { history, stats: historyStats, loadHistory, retry, deleteEntry, clear: clearHistory } = useHistory();
  const { queue, stats: queueStats, retry: retryQueue, remove: removeQueue, clear: clearQueue } = useQueue();
  const { isOnline } = useNetworkStatus();
  const { uploadFile, uploading, error: uploadError } = useFileUpload({
    maxSize: 20 * 1024 * 1024,
    onSuccess: (result) => {
      console.log('Upload successful:', result);
      setShowFileUpload(false);
    },
    onError: (error) => {
      console.error('Upload failed:', error);
    }
  });

  // Actions du Dynamic Island
  const handleSend = async () => {
    setSendingStatus('processing');
    
    try {
      // Simuler l'envoi
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSendingStatus('success');
      
      // Reset après 2 secondes
      setTimeout(() => setSendingStatus('idle'), 2000);
    } catch (error) {
      setSendingStatus('error');
      setTimeout(() => setSendingStatus('idle'), 3000);
    }
  };

  const handleFileUpload = async (file: File, config: any) => {
    try {
      await uploadFile(file, config, 'example-page-id');
    } catch (error) {
      console.error('File upload error:', error);
    }
  };

  // Actions du Header
  const headerProps = {
    isConnected: isOnline,
    queueCount: queueStats?.queued || 0,
    historyCount: historyStats?.total || 0,
    sendingStatus,
    onSend: handleSend,
    onOpenHistory: () => setShowHistoryPanel(true),
    onOpenQueue: () => setShowQueuePanel(true),
    onOpenFileUpload: () => setShowFileUpload(true),
    onToggleSidebar: () => console.log('Toggle sidebar'),
    onOpenConfig: () => console.log('Open config'),
    onMinimize: () => console.log('Minimize'),
    onMaximize: () => console.log('Maximize'),
    onClose: () => console.log('Close')
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header avec Dynamic Island intégré */}
      <Header {...headerProps} />

      {/* Contenu principal */}
      <div className="flex-1 flex">
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Nouvelles Fonctionnalités
              </h1>
              <p className="text-gray-600 mb-8">
                Démonstration des nouvelles fonctionnalités : Dynamic Island, Upload de fichiers, 
                Historique et File d'attente offline
              </p>
            </div>

            {/* Statut réseau */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h2 className="text-lg font-semibold mb-4">Statut réseau</h2>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm">
                  {isOnline ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Historique</h3>
                <div className="text-2xl font-bold text-gray-900">
                  {historyStats?.total || 0}
                </div>
                <div className="text-sm text-gray-500">
                  {historyStats?.success || 0} réussis, {historyStats?.failed || 0} échoués
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h3 className="text-sm font-medium text-gray-500 mb-2">File d'attente</h3>
                <div className="text-2xl font-bold text-gray-900">
                  {queueStats?.total || 0}
                </div>
                <div className="text-sm text-gray-500">
                  {queueStats?.queued || 0} en attente, {queueStats?.processing || 0} en cours
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Envois</h3>
                <div className="text-2xl font-bold text-gray-900">
                  {sendingStatus === 'processing' ? '⏳' : 
                   sendingStatus === 'success' ? '✅' : 
                   sendingStatus === 'error' ? '❌' : '💤'}
                </div>
                <div className="text-sm text-gray-500 capitalize">
                  {sendingStatus === 'idle' ? 'En attente' : sendingStatus}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h2 className="text-lg font-semibold mb-4">Actions</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSend}
                  disabled={sendingStatus === 'processing'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingStatus === 'processing' ? 'Envoi...' : 'Envoyer'}
                </button>
                
                <button
                  onClick={() => setShowFileUpload(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Upload fichier
                </button>
                
                <button
                  onClick={() => setShowHistoryPanel(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Voir historique
                </button>
                
                <button
                  onClick={() => setShowQueuePanel(true)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Voir file d'attente
                </button>
              </div>
            </div>

            {/* Dynamic Island standalone */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h2 className="text-lg font-semibold mb-4">Dynamic Island (standalone)</h2>
              <div className="flex justify-center">
                <DynamicIsland
                  actions={[
                    {
                      id: 'send',
                      label: 'Envoyer',
                      icon: <span>📤</span>,
                      onClick: handleSend
                    },
                    {
                      id: 'queue',
                      label: 'File',
                      icon: <span>📋</span>,
                      onClick: () => setShowQueuePanel(true),
                      badge: queueStats?.queued || 0
                    },
                    {
                      id: 'history',
                      label: 'Historique',
                      icon: <span>🕐</span>,
                      onClick: () => setShowHistoryPanel(true),
                      badge: historyStats?.total || 0
                    }
                  ]}
                  status={sendingStatus}
                  queueCount={queueStats?.queued || 0}
                  historyCount={historyStats?.total || 0}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Queue Panel */}
        {showQueuePanel && queueStats && (
          <QueuePanel
            queue={queue}
            stats={queueStats}
            onClose={() => setShowQueuePanel(false)}
            onRetry={retryQueue}
            onRemove={removeQueue}
            onClear={clearQueue}
            isOnline={isOnline}
          />
        )}
      </div>

      {/* Panels */}
      <AnimatePresence>
        {showHistoryPanel && (
          <HistoryPanel
            onClose={() => setShowHistoryPanel(false)}
            onRetry={retry}
            onDelete={deleteEntry}
            getHistory={loadHistory}
            getStats={async () => historyStats || {
              total: 0,
              success: 0,
              failed: 0,
              pending: 0,
              totalSize: 0,
              byType: {},
              byPage: {}
            }}
          />
        )}

        {showFileUpload && (
          <FileUploadPanel
            onFileSelect={handleFileUpload}
            onCancel={() => setShowFileUpload(false)}
            maxSize={20 * 1024 * 1024}
          />
        )}
      </AnimatePresence>
    </div>
  );
}