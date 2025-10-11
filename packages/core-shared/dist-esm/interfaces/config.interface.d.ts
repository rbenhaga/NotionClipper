/**
 * Configuration abstraction interface
 */
export interface IConfig {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    remove(key: string): Promise<void>;
    getAll(): Promise<Record<string, any>>;
    reset(): Promise<void>;
    watch?(key: string, callback: (value: any) => void): () => void;
    validate(): Promise<boolean>;
    getNotionToken(): Promise<string | null>;
    setNotionToken(token: string): Promise<void>;
    isConfigured(): Promise<boolean>;
    isFirstRun(): Promise<boolean>;
    getFavorites(): Promise<string[]>;
    addFavorite(pageId: string): Promise<void>;
    removeFavorite(pageId: string): Promise<void>;
}
//# sourceMappingURL=config.interface.d.ts.map