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
        onboardingCompleted: false,
        theme: 'light' // ✅ Thème par défaut: clair
    });

    const loadConfig = useCallback(async (): Promise<ClipperConfig> => {
        try {
            if (loadConfigFn) {
                const loadedConfig = await loadConfigFn();
                setConfig(loadedConfig);
                return loadedConfig;
            }
            // Retourner la config par défaut si pas de fonction de chargement
            const defaultConfig = {
                notionToken: '',
                onboardingCompleted: false,
                theme: 'light' // ✅ Thème par défaut: clair
            };
            return defaultConfig;
        } catch (error) {
            console.error('Error loading config:', error);
            // Retourner la config par défaut en cas d'erreur
            const defaultConfig = {
                notionToken: '',
                onboardingCompleted: false,
                theme: 'light' // ✅ Thème par défaut: clair
            };
            return defaultConfig;
        }
    }, []); // ✅ FIX: Supprimer les dépendances problématiques

    const updateConfig = useCallback(async (newConfig: Partial<ClipperConfig>) => {
        console.log('🔧 useConfig updateConfig called with:', newConfig);
        
        // Utiliser une fonction de mise à jour pour éviter la dépendance sur config
        setConfig(currentConfig => {
            const updatedConfig = { ...currentConfig, ...newConfig };
            console.log('🔧 Current config:', currentConfig);
            console.log('🔧 Updated config:', updatedConfig);
            
            // Sauvegarder de manière asynchrone
            if (saveConfigFn) {
                console.log('💾 Calling saveConfigFn...');
                saveConfigFn(updatedConfig).then(() => {
                    console.log('✅ Config saved successfully');
                }).catch(error => {
                    console.error('❌ Error saving config:', error);
                });
            } else {
                console.warn('⚠️ No saveConfigFn provided');
            }
            
            return updatedConfig;
        });
    }, []); // ✅ FIX: Supprimer les dépendances problématiques

    const validateNotionToken = useCallback(async (token: string): Promise<{ success: boolean; error?: string }> => {
        if (validateTokenFn) {
            return await validateTokenFn(token);
        }
        return { success: true };
    }, []); // ✅ FIX: Supprimer les dépendances problématiques

    return {
        config,
        updateConfig,
        loadConfig,
        validateNotionToken
    };
}