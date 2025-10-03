/**
 * Storage abstraction interface
 * Allows different storage implementations (Electron Store, Chrome Storage, LocalStorage)
 */
export interface IStorage {
  /**
   * Get a value from storage
   */
  get<T>(key: string): Promise<T | null>;
  
  /**
   * Set a value in storage
   */
  set<T>(key: string, value: T): Promise<void>;
  
  /**
   * Remove a value from storage
   */
  remove(key: string): Promise<void>;
  
  /**
   * Clear all storage
   */
  clear(): Promise<void>;
  
  /**
   * Check if storage supports encryption
   */
  readonly encrypted?: boolean;
  
  /**
   * Get all keys
   */
  keys(): Promise<string[]>;
  
  /**
   * Check if key exists
   */
  has(key: string): Promise<boolean>;
}
