// packages/core-web/src/services/stats.service.ts
/**
 * Web Stats Service
 * Browser-only implementation using localStorage or chrome.storage
 */

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
    private storage: Storage | any; // localStorage or chrome.storage
    private stats: WebStats | null = null;
    private readonly STORAGE_KEY = 'notion_clipper_stats';

    constructor(storage: Storage | any = localStorage) {
        this.storage = storage;
    }

    /**
     * Initialize and load stats
     */
    async initialize(): Promise<void> {
        await this.loadStats();
        if (!this.stats) {
            this.stats = this.createEmptyStats();
            await this.persist();
        }
    }

    /**
     * Create empty stats structure
     */
    private createEmptyStats(): WebStats {
        return {
            totalClips: 0,
            totalNotionSends: 0,
            favoritePages: {},
            usageByType: {},
            dailyStats: {},
            firstUse: null,
            lastUse: null
        };
    }

    /**
     * Load stats from storage
     */
    private async loadStats(): Promise<void> {
        try {
            // Check if we're using chrome.storage (extension)
            if (this.storage.get && typeof this.storage.get === 'function') {
                // Chrome storage API
                const result = await this.storage.get(this.STORAGE_KEY);
                this.stats = result[this.STORAGE_KEY] || null;
            } else {
                // localStorage API
                const stored = this.storage.getItem(this.STORAGE_KEY);
                this.stats = stored ? JSON.parse(stored) : null;
            }
        } catch (error) {
            console.error('[STATS] Error loading:', error);
            this.stats = this.createEmptyStats();
        }
    }

    /**
     * Persist stats to storage
     */
    private async persist(): Promise<void> {
        if (!this.stats) return;

        try {
            if (this.storage.set && typeof this.storage.set === 'function') {
                // Chrome storage API
                await this.storage.set({ [this.STORAGE_KEY]: this.stats });
            } else {
                // localStorage API
                this.storage.setItem(this.STORAGE_KEY, JSON.stringify(this.stats));
            }
        } catch (error) {
            console.error('[STATS] Error persisting:', error);
        }
    }

    /**
     * Update last use timestamp
     */
    private updateTimestamps(): void {
        if (!this.stats) return;

        const now = Date.now();
        this.stats.lastUse = now;
        if (!this.stats.firstUse) {
            this.stats.firstUse = now;
        }
    }

    /**
     * Get today's date key
     */
    private getTodayKey(): string {
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    }

    /**
     * Increment clips counter
     */
    async incrementClips(): Promise<void> {
        if (!this.stats) await this.initialize();
        if (!this.stats) return;

        this.stats.totalClips++;
        this.updateTimestamps();

        // Update daily stats
        const today = this.getTodayKey();
        if (!this.stats.dailyStats[today]) {
            this.stats.dailyStats[today] = { clips: 0, sends: 0 };
        }
        this.stats.dailyStats[today].clips++;

        await this.persist();
    }

    /**
     * Increment Notion sends counter
     */
    async incrementNotionSends(): Promise<void> {
        if (!this.stats) await this.initialize();
        if (!this.stats) return;

        this.stats.totalNotionSends++;
        this.updateTimestamps();

        // Update daily stats
        const today = this.getTodayKey();
        if (!this.stats.dailyStats[today]) {
            this.stats.dailyStats[today] = { clips: 0, sends: 0 };
        }
        this.stats.dailyStats[today].sends++;

        await this.persist();
    }

    /**
     * Increment usage by type
     */
    async incrementUsageByType(type: string): Promise<void> {
        if (!this.stats) await this.initialize();
        if (!this.stats) return;

        this.stats.usageByType[type] = (this.stats.usageByType[type] || 0) + 1;
        this.updateTimestamps();
        await this.persist();
    }

    /**
     * Record page usage
     */
    async recordPageUsage(pageId: string, pageName: string): Promise<void> {
        if (!this.stats) await this.initialize();
        if (!this.stats) return;

        if (!this.stats.favoritePages[pageId]) {
            this.stats.favoritePages[pageId] = { name: pageName, count: 0 };
        }
        this.stats.favoritePages[pageId].count++;
        this.updateTimestamps();
        await this.persist();
    }

    /**
     * Get all stats
     */
    async getAll(): Promise<WebStats> {
        if (!this.stats) await this.initialize();
        return this.stats || this.createEmptyStats();
    }

    /**
     * Get top pages
     */
    async getTopPages(limit: number = 5): Promise<Array<{ id: string; name: string; count: number }>> {
        if (!this.stats) await this.initialize();
        if (!this.stats) return [];

        return Object.entries(this.stats.favoritePages)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Get stats summary
     */
    async getSummary(): Promise<{
        total: { clips: number; sends: number };
        byType: Record<string, number>;
        topPages: Array<{ id: string; name: string; count: number }>;
        period: { firstUse: number | null; lastUse: number | null };
    }> {
        if (!this.stats) await this.initialize();
        if (!this.stats) return {
            total: { clips: 0, sends: 0 },
            byType: {},
            topPages: [],
            period: { firstUse: null, lastUse: null }
        };

        return {
            total: {
                clips: this.stats.totalClips,
                sends: this.stats.totalNotionSends
            },
            byType: this.stats.usageByType,
            topPages: await this.getTopPages(5),
            period: {
                firstUse: this.stats.firstUse,
                lastUse: this.stats.lastUse
            }
        };
    }

    /**
     * Reset all stats
     */
    async reset(): Promise<void> {
        this.stats = this.createEmptyStats();
        await this.persist();
    }
}