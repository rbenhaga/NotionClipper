// packages/adapters/electron/src/stats.adapter.ts
import type { IStatsAdapter, Stats, PageStats, DailyStats, StatsSummary } from '@notion-clipper/core-electron';
import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Electron Stats Adapter using JSON file persistence
 */
export class ElectronStatsAdapter implements IStatsAdapter {
    private statsPath: string;
    private statsFile: string;
    private stats: Stats;
    private initialized = false;

    constructor() {
        this.statsPath = path.join(app.getPath('userData'), 'stats');
        this.statsFile = path.join(this.statsPath, 'stats.json');
        this.stats = this.getDefaultStats();
    }

    /**
     * Get default stats structure
     */
    private getDefaultStats(): Stats {
        return {
            totalClips: 0,
            totalNotionSends: 0,
            favoritePages: {},
            usageByType: { text: 0, image: 0, html: 0, code: 0, url: 0 },
            lastUsed: {},
            dailyStats: {},
            firstUse: null,
            lastUse: null
        };
    }

    /**
     * Initialize stats - load from disk
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            await fs.mkdir(this.statsPath, { recursive: true });

            try {
                const data = await fs.readFile(this.statsFile, 'utf8');
                this.stats = { ...this.getDefaultStats(), ...JSON.parse(data) };
                console.log('[STATS] Loaded from disk');
            } catch {
                console.log('[STATS] Initializing empty stats');
            }

            this.initialized = true;
        } catch (error) {
            console.error('[STATS] Initialization error:', error);
            throw error;
        }
    }

    /**
     * Persist stats to disk
     */
    async persist(): Promise<boolean> {
        try {
            await fs.writeFile(this.statsFile, JSON.stringify(this.stats, null, 2));
            return true;
        } catch (error) {
            console.error('[STATS] Persist error:', error);
            return false;
        }
    }

    /**
     * Get all statistics
     */
    async getAll(): Promise<Stats> {
        if (!this.initialized) await this.initialize();
        return { ...this.stats };
    }

    /**
     * Increment clips counter
     */
    async incrementClips(): Promise<number> {
        if (!this.initialized) await this.initialize();

        this.stats.totalClips++;
        this.stats.lastUse = Date.now();

        if (!this.stats.firstUse) {
            this.stats.firstUse = Date.now();
        }

        await this.persist();
        return this.stats.totalClips;
    }

    /**
     * Increment Notion sends counter
     */
    async incrementNotionSends(): Promise<number> {
        if (!this.initialized) await this.initialize();

        this.stats.totalNotionSends++;
        await this.persist();
        return this.stats.totalNotionSends;
    }

    /**
     * Increment usage by type
     */
    async incrementUsageByType(type: string): Promise<number> {
        if (!this.initialized) await this.initialize();

        if (!this.stats.usageByType[type]) {
            this.stats.usageByType[type] = 0;
        }

        this.stats.usageByType[type]++;
        await this.persist();
        return this.stats.usageByType[type];
    }

    /**
     * Record page usage
     */
    async recordPageUsage(pageId: string, pageName: string): Promise<PageStats> {
        if (!this.initialized) await this.initialize();

        if (!this.stats.favoritePages[pageId]) {
            this.stats.favoritePages[pageId] = { name: pageName, count: 0 };
        }

        this.stats.favoritePages[pageId].count++;
        this.stats.favoritePages[pageId].lastUsed = Date.now();
        this.stats.lastUsed[pageId] = Date.now();

        await this.persist();
        return this.stats.favoritePages[pageId];
    }

    /**
     * Get top pages by usage
     */
    async getTopPages(limit = 5): Promise<Array<{ id: string } & PageStats>> {
        if (!this.initialized) await this.initialize();
    
        return Object.entries(this.stats.favoritePages)
            .map(([id, data]: [string, PageStats]) => ({
                id,
                name: data.name,
                count: data.count,
                lastUsed: data.lastUsed
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Reset all statistics
     */
    async reset(): Promise<boolean> {
        if (!this.initialized) await this.initialize();

        this.stats = {
            ...this.getDefaultStats(),
            firstUse: Date.now(),
            lastUse: null
        };

        await this.persist();
        return true;
    }

    /**
     * Get statistics summary
     */
    async getSummary(): Promise<StatsSummary> {
        if (!this.initialized) await this.initialize();

        const topPages = await this.getTopPages(5);

        return {
            total: {
                clips: this.stats.totalClips,
                sends: this.stats.totalNotionSends
            },
            byType: this.stats.usageByType,
            topPages,
            period: {
                firstUse: this.stats.firstUse,
                lastUse: this.stats.lastUse
            }
        };
    }
}