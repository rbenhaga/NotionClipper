/**
 * Safe cross-browser storage wrapper
 * Uses webextension-polyfill for compatibility
 */
import browser from 'webextension-polyfill';

export const storage = {
  /**
   * Get a value from storage
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const result = await browser.storage.local.get(key);
      return result[key] as T | undefined;
    } catch (error) {
      console.error(`Storage get error for key "${key}":`, error);
      return undefined;
    }
  },

  /**
   * Set a value in storage
   */
  async set<T>(key: string, value: T): Promise<boolean> {
    try {
      await browser.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      console.error(`Storage set error for key "${key}":`, error);
      return false;
    }
  },

  /**
   * Remove a value from storage
   */
  async remove(key: string): Promise<boolean> {
    try {
      await browser.storage.local.remove(key);
      return true;
    } catch (error) {
      console.error(`Storage remove error for key "${key}":`, error);
      return false;
    }
  },

  /**
   * Clear all storage
   */
  async clear(): Promise<boolean> {
    try {
      await browser.storage.local.clear();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  },

  /**
   * Watch for storage changes
   */
  watch<T>(
    key: string,
    callback: (oldValue: T | undefined, newValue: T | undefined) => void
  ): () => void {
    const listener = (
      changes: { [key: string]: browser.Storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes[key]) {
        callback(changes[key].oldValue as T, changes[key].newValue as T);
      }
    };

    browser.storage.onChanged.addListener(listener);

    // Return unsubscribe function
    return () => {
      browser.storage.onChanged.removeListener(listener);
    };
  }
};

// Export aussi browser pour utilisation directe si besoin
export { browser };