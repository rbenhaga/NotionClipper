/**
 * Storage abstraction interface
 */
export interface IStorage {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    readonly encrypted?: boolean;
    keys(): Promise<string[]>;
    has(key: string): Promise<boolean>;
}
//# sourceMappingURL=storage.interface.d.ts.map