import React from 'react';
import { WifiOff, RefreshCw, Loader } from 'lucide-react';

export default function BackendDisconnected({ onRetry, retrying = false }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff size={40} className="text-red-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Backend déconnecté
        </h2>
        
        <p className="text-gray-600 mb-6">
          Impossible de se connecter au serveur backend. 
          Vérifiez que l'application est correctement lancée.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={onRetry}
            disabled={retrying}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {retrying ? (
              <>
                <Loader size={20} className="animate-spin" />
                Reconnexion...
              </>
            ) : (
              <>
                <RefreshCw size={20} />
                Réessayer
              </>
            )}
          </button>
          
          <p className="text-sm text-gray-500">
            Port backend : 5000
          </p>
        </div>
      </div>
    </div>
  );
} 