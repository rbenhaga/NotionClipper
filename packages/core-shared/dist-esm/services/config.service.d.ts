import type { IConfig } from '../interfaces/config.interface';
export declare class ConfigService {
    private adapter;
    constructor(adapter: IConfig);
    getAll(): Promise<Record<string, any>>;
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    getNotionToken(): Promise<string | null>;
    setNotionToken(token: string): Promise<void>;
    getFavorites(): Promise<string[]>;
    addFavorite(pageId: string): Promise<void>;
    removeFavorite(pageId: string): Promise<void>;
    isConfigured(): Promise<boolean>;
    validate(): Promise<boolean>;
}
//# sourceMappingURL=config.service.d.ts.map