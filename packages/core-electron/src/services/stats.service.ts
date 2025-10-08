// packages/core-electron/src/services/stats.service.ts
import { EventEmitter } from 'events';

/**
 * Statistics data structure
 */
export interface Stats {
    totalClips: number;
    totalNotionSends: number;
    favoritePages: Record<string, PageStats>;
    usageByType: Record<string, number>;
    lastUsed: Record<string, number>;
    dailyStats: Record<string, DailyStats>;
    firstUse: number | null;
    lastUse: number | null;
}

export interface PageStats {
    name: string;
    count: number;
    lastUsed?: number;
}

export interface DailyStats {
    date: string;
    clips: number;
    sends: number;
}

export interface StatsSummary {
    total: {
        clips: number;
        sends: number;
    };
    byType: Record<string, number>;
    topPages: Array<{ id: string; name: string; count: number; lastUsed?: number }>;
    period: {
        firstUse: number | null;
        lastUse: number | null;
    };
}

/**
 * Stats service interface for adapters
 */
export interface IStatsAdapter {
    initialize(): Promise<void>;
    persist(): Promise<boolean>;
    getAll(): Promise<Stats>;
    incrementClips(): Promise<number>;
    incrementNotionSends(): Promise<number>;
    incrementUsageByType(type: string): Promise<number>;
    recordPageUsage(pageId: string, pageName: string): Promise<PageStats>;
    getTopPages(limit?: number): Promise<Array<{ id: string } & PageStats>>;
    reset(): Promise<boolean>;
    getSummary(): Promise<StatsSummary>;
}

/**
 * Stats service for tracking usage statistics
 * Electron-specific implementation using Node.js file system
 */
export class ElectronStatsService extends EventEmitter {
    private adapter: IStatsAdapter;
    private autoSaveInterval?: NodeJS.Timeout;
    private readonly AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes

    constructor(adapter: IStatsAdapter) {
        super();
        this.adapter = adapter;
    }

    /**
     * Initialize the stats service
     */
    async initialize(): Promise<void> {
        await this.adapter.initialize();
        this.startAutoSave();
        this.emit('initialized');
    }

    /**
     * Start auto-save interval
     */
    private startAutoSave(): void {
        if (this.autoSaveInterval) return;

        this.autoSaveInterval = setInterval(async () => {
            try {
                await this.adapter.persist();
                this.emit('auto-saved');
            } catch (error) {
                console.error('[STATS] Auto-save failed:', error);
                this.emit('error', error);
            }
        }, this.AUTO_SAVE_INTERVAL);
    }

    /**
     * Stop auto-save interval
     */
    stopAutoSave(): void {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = undefined;
        }
    }

    /**
     * Get all statistics
     */
    async getAll(): Promise<Stats> {
        return await this.adapter.getAll();
    }

    /**
     * Increment total clips counter
     */
    async incrementClips(): Promise<number> {
        const count = await this.adapter.incrementClips();
        this.emit('clips-incremented', count);
        return count;
    }

    /**
     * Increment Notion sends counter
     */
    async incrementNotionSends(): Promise<number> {
        const count = await this.adapter.incrementNotionSends();
        this.emit('sends-incremented', count);
        return count;
    }

    /**
     * Increment usage by content type
     */
    async incrementUsageByType(type: string): Promise<number> {
        const count = await this.adapter.incrementUsageByType(type);
        this.emit('type-incremented', { type, count });
        return count;
    }

    /**
     * Record page usage
     */
    async recordPageUsage(pageId: string, pageName: string): Promise<PageStats> {
        const stats = await this.adapter.recordPageUsage(pageId, pageName);
        this.emit('page-used', { pageId, pageName, stats });
        return stats;
    }

    /**
     * Get top pages by usage
     */
    async getTopPages(limit = 5): Promise<Array<{ id: string } & PageStats>> {
        return await this.adapter.getTopPages(limit);
    }

    /**
     * Get statistics summary
     */
    async getSummary(): Promise<StatsSummary> {
        return await this.adapter.getSummary();
    }

    /**
     * Reset all statistics
     */
    async reset(): Promise<boolean> {
        const success = await this.adapter.reset();
        if (success) {
            this.emit('reset');
        }
        return success;
    }

    /**
     * Force persist statistics to disk
     */
    async persist(): Promise<boolean> {
        return await this.adapter.persist();
    }

    /**
     * Cleanup and stop service
     */
    async cleanup(): Promise<void> {
        this.stopAutoSave();
        await this.adapter.persist();
        this.removeAllListeners();
    }
}