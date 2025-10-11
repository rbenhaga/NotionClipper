export interface ICacheAdapter {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    has(key: string): Promise<boolean>;
    keys(): Promise<string[]>;
}
export interface CacheStats {
    total: number;
    valid: number;
    expired: number;
    maxSize: number;
    usage: string;
}
export declare class CacheService {
    private adapter;
    constructor(adapter: ICacheAdapter);
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    has(key: string): Promise<boolean>;
    keys(): Promise<string[]>;
}
//# sourceMappingURL=cache.service.d.ts.map