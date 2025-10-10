import { useState, useCallback } from 'react';

export interface ClipperConfig {
    notionToken: string;
    onboardingCompleted?: boolean;
    [key: string]: any;
}

export interface UseConfigReturn {
    config: ClipperConfig;
    updateConfig: (newConfig: Partial<ClipperConfig>) => Promise<void>;
    loadConfig: () => Promise<ClipperConfig>;
    validateNotionToken: (token: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Hook pour gérer la configuration de l'application
 * Compatible avec Electron et WebExtension
 */
export function useConfig(
    saveConfigFn?: (config: ClipperConfig) => Promise<void>,
    loadConfigFn?: () => Promise<ClipperConfig>,
    validateTokenFn?: (token: string) => Promise<{ success: boolean; error?: string }>
): UseConfigReturn {
    const [config, setConfig] = useState<ClipperConfig>({
        notionToken: '',
        onboardingCompleted: false
    });

    const loadConfig = useCallback(async (): Promise<ClipperConfig> => {
        try {
            if (loadConfigFn) {
                const loadedConfig = await loadConfigFn();
                setConfig(loadedConfig);
                return loadedConfig;
            }
            return config;
        } catch (error) {
            console.error('Error loading config:', error);
            return config;
        }
    }, [loadConfigFn, config]);

    const updateConfig = useCallback(async (newConfig: Partial<ClipperConfig>) => {
        console.log('🔧 useConfig updateConfig called with:', newConfig);
        console.log('🔧 Current config:', config);
        
        const updatedConfig = { ...config, ...newConfig };
        console.log('🔧 Updated config:', updatedConfig);
        
        setConfig(updatedConfig);

        if (saveConfigFn) {
            console.log('💾 Calling saveConfigFn...');
            await saveConfigFn(updatedConfig);
            console.log('✅ Config saved successfully');
        } else {
            console.warn('⚠️ No saveConfigFn provided');
        }
    }, [config, saveConfigFn]);

    const validateNotionToken = useCallback(async (token: string): Promise<{ success: boolean; error?: string }> => {
        if (validateTokenFn) {
            return await validateTokenFn(token);
        }
        return { success: true };
    }, [validateTokenFn]);

    return {
        config,
        updateConfig,
        loadConfig,
        validateNotionToken
    };
}