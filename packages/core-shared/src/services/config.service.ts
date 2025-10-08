// packages/core-shared/src/services/config.service.ts
import type { IConfig } from '../interfaces/config.interface';

export class ConfigService {
    constructor(private adapter: IConfig) { }

    async getAll(): Promise<Record<string, any>> {
        return await this.adapter.getAll();
    }

    async get<T>(key: string): Promise<T | null> {
        return await this.adapter.get<T>(key);
    }

    async set<T>(key: string, value: T): Promise<void> {
        return await this.adapter.set(key, value);
    }

    async getNotionToken(): Promise<string | null> {
        return await this.adapter.getNotionToken();
    }

    async setNotionToken(token: string): Promise<void> {
        return await this.adapter.setNotionToken(token);
    }

    async getFavorites(): Promise<string[]> {
        return await this.adapter.getFavorites();
    }

    async addFavorite(pageId: string): Promise<void> {
        return await this.adapter.addFavorite(pageId);
    }

    async removeFavorite(pageId: string): Promise<void> {
        return await this.adapter.removeFavorite(pageId);
    }

    async isConfigured(): Promise<boolean> {
        return await this.adapter.isConfigured();
    }

    async validate(): Promise<boolean> {
        return await this.adapter.validate();
    }
}