import type { IStorage } from '@notion-clipper/core-shared';

export interface WebStats {
    totalClips: number;
    totalNotionSends: number;
    favoritePages: Record<string, { name: string; count: number }>;
    usageByType: Record<string, number>;
    dailyStats: Record<string, { clips: number; sends: number }>;
    firstUse: number | null;
    lastUse: number | null;
}

export class WebStatsService {
    private storage: IStorage;
    private stats: WebStats | null = null;
    private readonly STORAGE_KEY = 'notion_clipper_stats';
    constructor(storage: IStorage) { this.storage = storage; }
    async initialize(): Promise<void> {
        await this.loadStats();
        if (!this.stats) { this.stats = this.createEmptyStats(); await this.persist(); }
    }
    private createEmptyStats(): WebStats {
        return { totalClips: 0, totalNotionSends: 0, favoritePages: {}, usageByType: {}, dailyStats: {}, firstUse: null, lastUse: null };
    }
    private async loadStats(): Promise<void> {
        try { this.stats = await this.storage.get<WebStats>(this.STORAGE_KEY); } catch (error) { this.stats = null; }
    }
    private async persist(): Promise<void> {
        if (!this.stats) return;
        try { await this.storage.set(this.STORAGE_KEY, this.stats); } catch (error) { }
    }
    private updateTimestamps(): void {
        if (!this.stats) return;
        const now = Date.now();
        this.stats.lastUse = now;
        if (!this.stats.firstUse) { this.stats.firstUse = now; }
    }
    private getTodayKey(): string { return new Date().toISOString().split('T')[0]; }
    async incrementClips(): Promise<void> {
        if (!this.stats) await this.initialize();
        if (!this.stats) return;
        this.stats.totalClips++;
        this.updateTimestamps();
        const today = this.getTodayKey();
        if (!this.stats.dailyStats[today]) { this.stats.dailyStats[today] = { clips: 0, sends: 0 }; }
        this.stats.dailyStats[today].clips++;
        await this.persist();
    }
    async incrementNotionSends(): Promise<void> {
        if (!this.stats) await this.initialize();
        if (!this.stats) return;
        this.stats.totalNotionSends++;
        this.updateTimestamps();
        const today = this.getTodayKey();
        if (!this.stats.dailyStats[today]) { this.stats.dailyStats[today] = { clips: 0, sends: 0 }; }
        this.stats.dailyStats[today].sends++;
        await this.persist();
    }
    async incrementUsageByType(type: string): Promise<void> {
        if (!this.stats) await this.initialize();
        if (!this.stats) return;
        this.stats.usageByType[type] = (this.stats.usageByType[type] || 0) + 1;
        this.updateTimestamps();
        await this.persist();
    }
    async recordPageUsage(pageId: string, pageName: string): Promise<void> {
        if (!this.stats) await this.initialize();
        if (!this.stats) return;
        if (!this.stats.favoritePages[pageId]) { this.stats.favoritePages[pageId] = { name: pageName, count: 0 }; }
        this.stats.favoritePages[pageId].count++;
        this.updateTimestamps();
        await this.persist();
    }
    async getAll(): Promise<WebStats> {
        if (!this.stats) await this.initialize();
        return this.stats || this.createEmptyStats();
    }
    async getTopPages(limit: number = 5): Promise<Array<{ id: string; name: string; count: number }>> {
        if (!this.stats) await this.initialize();
        if (!this.stats) return [];
        return Object.entries(this.stats.favoritePages).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.count - a.count).slice(0, limit);
    }
    async getSummary(): Promise<{ total: { clips: number; sends: number }; byType: Record<string, number>; topPages: Array<{ id: string; name: string; count: number }>; period: { firstUse: number | null; lastUse: number | null }; }> {
        if (!this.stats) await this.initialize();
        if (!this.stats) return { total: { clips: 0, sends: 0 }, byType: {}, topPages: [], period: { firstUse: null, lastUse: null } };
        return { total: { clips: this.stats.totalClips, sends: this.stats.totalNotionSends }, byType: this.stats.usageByType, topPages: await this.getTopPages(5), period: { firstUse: this.stats.firstUse, lastUse: this.stats.lastUse } };
    }
    async reset(): Promise<void> {
        this.stats = this.createEmptyStats();
        await this.persist();
    }
}
