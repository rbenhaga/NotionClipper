// packages/ui/src/components/auth/WebAuthScreen.tsx
/**
 * WebAuthScreen - Redirects to website for authentication
 * 
 * This component replaces the in-app authentication forms with a simple
 * redirect to the website. This provides:
 * - Better security (no password handling in desktop app)
 * - Unified auth experience
 * - Easier maintenance
 */

import React, { useState, useEffect, useRef } from 'react';
import { MotionDiv } from '../common/MotionWrapper';
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useTranslation } from '@notion-clipper/i18n';
import { ClipperProLogo } from '../../assets/icons';

// Get website URL from global config
const getWebsiteUrl = (): string => {
  if (typeof window !== 'undefined' && (window as any).__WEBSITE_URL__) {
    return (window as any).__WEBSITE_URL__;
  }
  return 'http://localhost:5173';
};

// Get backend API URL from global config
const getBackendApiUrl = (): string => {
  if (typeof window !== 'undefined' && (window as any).__BACKEND_API_URL__) {
    return (window as any).__BACKEND_API_URL__;
  }
  return 'http://localhost:3001/api';
};

export interface NotionData {
  token: string;
  workspace: { id: string; name: string; icon?: string };
}

export interface WebAuthScreenProps {
  onAuthSuccess: (userId: string, email: string, token: string, notionData?: NotionData) => void;
  onError: (error: string) => void;
}

export function WebAuthScreen({ onAuthSuccess, onError }: WebAuthScreenProps) {
  const { t } = useTranslation();
  const [waitingForAuth, setWaitingForAuth] = useState(false);
  const [processingAuth, setProcessingAuth] = useState(false); // 🔧 FIX: New state for processing after callback
  const [error, setError] = useState('');
  
  // 🔧 FIX: Prevent multiple callback handling
  const hasHandledCallback = useRef(false);

  // Listen for deep link auth callback
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.on) return;

    const handleAuthCallback = async (data: { 
      token?: string; 
      userId?: string; 
      email?: string; 
      error?: string;
      // 🔧 FIX: New fields from deep link callback (from /api/user/app-data)
      hasNotionWorkspace?: boolean;
      notionWorkspace?: { id: string; name: string; icon?: string };
      notionToken?: string;
      subscription?: { tier: string; status: string };
    }) => {
      // 🔧 FIX: Prevent multiple handling of the same callback
      if (hasHandledCallback.current) {
        console.log('[WebAuth] ⚠️ Callback already handled, ignoring duplicate');
        return;
      }
      
      console.log('[WebAuth] Received auth callback:', {
        ...data,
        token: data.token ? '***' : undefined,
        notionToken: data.notionToken ? '***' : undefined
      });
      
      if (data.error) {
        setError(data.error);
        setWaitingForAuth(false);
        onError(data.error);
        return;
      }

      if (data.token && data.userId && data.email) {
        // 🔧 FIX: Mark as handled immediately and show processing state
        hasHandledCallback.current = true;
        setWaitingForAuth(false);
        setProcessingAuth(true); // Show "Finalizing..." instead of auth button
        
        // Store token in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user_id', data.userId);
        localStorage.setItem('user_email', data.email);
        
        // 🔧 FIX: Use Notion data from deep link callback (already fetched by main.ts)
        // Use notionToken directly from callback if available
        let notionData: NotionData | undefined;
        
        if (data.hasNotionWorkspace && data.notionWorkspace && data.notionToken) {
          // Notion data was included in the deep link callback with token
          console.log('[WebAuth] ✅ Notion data received from deep link:', data.notionWorkspace.name);
          notionData = {
            token: data.notionToken,
            workspace: data.notionWorkspace
          };
        } else if (data.hasNotionWorkspace && data.notionWorkspace) {
          // Workspace exists but token not in callback - try to get from config
          console.log('[WebAuth] ⚠️ Workspace exists but no token in callback, checking config...');
          try {
            const savedNotionToken = await electronAPI?.invoke?.('config:get', 'notionToken');
            if (savedNotionToken) {
              notionData = {
                token: savedNotionToken,
                workspace: data.notionWorkspace
              };
              console.log('[WebAuth] ✅ Notion token retrieved from Electron config');
            }
          } catch (err) {
            console.error('[WebAuth] Error getting Notion token from config:', err);
          }
        } else {
          console.log('[WebAuth] ℹ️ No Notion workspace in callback (user may have used Google auth)');
        }
        
        // Call success handler (this triggers the rest of onboarding)
        onAuthSuccess(data.userId, data.email, data.token, notionData);
      }
    };

    console.log('[WebAuth] 👂 Setting up auth:callback listener');
    electronAPI.on('auth:callback', handleAuthCallback);

    return () => {
      // 🔧 FIX: Cleanup listener to prevent multiple calls
      console.log('[WebAuth] 🧹 Cleaning up auth:callback listener');
      electronAPI.off?.('auth:callback', handleAuthCallback);
    };
  }, [onAuthSuccess, onError]);

  const handleOpenWebAuth = async () => {
    setWaitingForAuth(true);
    setError('');

    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI?.invoke) {
        throw new Error('Electron API not available');
      }

      const websiteUrl = getWebsiteUrl();
      // Add source=app to indicate this is from the desktop app
      // The website will redirect back with the token via deep link
      // AuthPage.tsx on the website will check if user is already logged in
      // and redirect immediately via deep link if so
      const authUrl = `${websiteUrl}/auth?source=app&redirect=notion-clipper://auth/callback`;
      
      console.log('[WebAuth] Opening auth in browser:', authUrl);
      await electronAPI.invoke('open-external', authUrl);
      
    } catch (err) {
      console.error('[WebAuth] Error opening auth:', err);
      setError(err instanceof Error ? err.message : 'Failed to open browser');
      setWaitingForAuth(false);
    }
  };

  const handleRetry = () => {
    setError('');
    setWaitingForAuth(false);
  };

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[400px] p-8"
    >
      {/* Logo */}
      <div className="mb-8">
        <ClipperProLogo className="w-16 h-16" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
        {t('auth.welcomeTitle')}
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-md">
        {t('auth.webAuthDescription')}
      </p>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm max-w-md">
          {error}
        </div>
      )}

      {/* Main Action */}
      {processingAuth ? (
        // 🔧 FIX: Show processing state after callback received
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="font-medium text-lg">Finalisation...</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
            Chargement de votre workspace...
          </p>
        </div>
      ) : waitingForAuth ? (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">{t('auth.waitingForAuth')}</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
            {t('auth.completeInBrowser')}
          </p>
          <button
            onClick={handleRetry}
            className="mt-4 flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t('auth.tryAgain')}
          </button>
        </div>
      ) : (
        <button
          onClick={handleOpenWebAuth}
          className="flex items-center gap-3 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-purple-500/25"
        >
          <ExternalLink className="w-5 h-5" />
          {t('auth.signInOnWebsite')}
        </button>
      )}

      {/* Security Note */}
      <p className="mt-8 text-xs text-gray-400 dark:text-gray-500 text-center max-w-sm">
        {t('auth.securityNote')}
      </p>
    </MotionDiv>
  );
}

export default WebAuthScreen;
