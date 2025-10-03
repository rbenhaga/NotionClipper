/**
 * Configuration abstraction interface
 * Allows different config implementations (Electron Store, Environment Variables, etc.)
 */
export interface IConfig {
    /**
     * Get configuration value
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set configuration value
     */
    set<T>(key: string, value: T): Promise<void>;
    /**
     * Remove configuration value
     */
    remove(key: string): Promise<void>;
    /**
     * Get all configuration
     */
    getAll(): Promise<Record<string, any>>;
    /**
     * Reset to defaults
     */
    reset(): Promise<void>;
    /**
     * Watch for configuration changes
     */
    watch?(key: string, callback: (value: any) => void): () => void;
    /**
     * Validate configuration
     */
    validate(): Promise<boolean>;
    /**
     * Get Notion token
     */
    getNotionToken(): Promise<string | null>;
    /**
     * Set Notion token
     */
    setNotionToken(token: string): Promise<void>;
    /**
     * Check if configured
     */
    isConfigured(): Promise<boolean>;
    /**
     * Check if first run
     */
    isFirstRun(): Promise<boolean>;
    /**
     * Get favorites
     */
    getFavorites(): Promise<string[]>;
    /**
     * Add favorite
     */
    addFavorite(pageId: string): Promise<void>;
    /**
     * Remove favorite
     */
    removeFavorite(pageId: string): Promise<void>;
}
//# sourceMappingURL=config.interface.d.ts.map