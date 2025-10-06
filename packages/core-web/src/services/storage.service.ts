export class StorageService {
    async set<T>(key: string, value: T): Promise<void> {
        if (typeof browser !== 'undefined' && browser.storage) {
            await browser.storage.local.set({ [key]: value });
        } else if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise((resolve) => {
                chrome.storage.local.set({ [key]: value }, () => resolve());
            });
        } else {
            localStorage.setItem(key, JSON.stringify(value));
        }
    }

    async get<T>(key: string): Promise<T | null> {
        if (typeof browser !== 'undefined' && browser.storage) {
            const result = await browser.storage.local.get(key);
            return result[key] as T || null;
        } else if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise((resolve) => {
                chrome.storage.local.get(key, (result) => {
                    resolve(result[key] as T || null);
                });
            });
        } else {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        }
    }

    async remove(key: string): Promise<void> {
        if (typeof browser !== 'undefined' && browser.storage) {
            await browser.storage.local.remove(key);
        } else if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise((resolve) => {
                chrome.storage.local.remove(key, () => resolve());
            });
        } else {
            localStorage.removeItem(key);
        }
    }

    async clear(): Promise<void> {
        if (typeof browser !== 'undefined' && browser.storage) {
            await browser.storage.local.clear();
        } else if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise((resolve) => {
                chrome.storage.local.clear(() => resolve());
            });
        } else {
            localStorage.clear();
        }
    }
}