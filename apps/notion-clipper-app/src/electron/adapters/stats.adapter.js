const { app } = require('electron');
const fs = require('fs').promises;
const path = require('path');

class ElectronStatsAdapter {
  constructor() {
    this.statsPath = path.join(app.getPath('userData'), 'stats');
    this.statsFile = path.join(this.statsPath, 'stats.json');
    this.stats = {
      totalClips: 0,
      totalNotionSends: 0,
      favoritePages: {},
      usageByType: { text: 0, image: 0, html: 0, code: 0, url: 0 },
      lastUsed: {},
      dailyStats: {},
      firstUse: null,
      lastUse: null
    };
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.statsPath, { recursive: true });

      try {
        const data = await fs.readFile(this.statsFile, 'utf8');
        this.stats = { ...this.stats, ...JSON.parse(data) };
        console.log('[OK] Stats loaded');
      } catch (error) {
        console.log('[INFO] Initializing empty stats');
      }

      this.initialized = true;
    } catch (error) {
      console.error('[ERROR] Error initializing stats:', error);
      throw error;
    }
  }

  async persist() {
    try {
      await fs.writeFile(this.statsFile, JSON.stringify(this.stats, null, 2));
      return true;
    } catch (error) {
      console.error('[ERROR] Error persisting stats:', error);
      return false;
    }
  }

  async getAll() {
    if (!this.initialized) await this.initialize();
    return { ...this.stats };
  }

  async incrementClips() {
    if (!this.initialized) await this.initialize();
    this.stats.totalClips++;
    this.stats.lastUse = Date.now();
    if (!this.stats.firstUse) this.stats.firstUse = Date.now();
    await this.persist();
    return this.stats.totalClips;
  }

  async incrementNotionSends() {
    if (!this.initialized) await this.initialize();
    this.stats.totalNotionSends++;
    await this.persist();
    return this.stats.totalNotionSends;
  }

  async incrementUsageByType(type) {
    if (!this.initialized) await this.initialize();
    if (!this.stats.usageByType[type]) {
      this.stats.usageByType[type] = 0;
    }
    this.stats.usageByType[type]++;
    await this.persist();
    return this.stats.usageByType[type];
  }

  async recordPageUsage(pageId, pageName) {
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

  async getTopPages(limit = 5) {
    if (!this.initialized) await this.initialize();
    
    return Object.entries(this.stats.favoritePages)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async reset() {
    if (!this.initialized) await this.initialize();
    
    this.stats = {
      totalClips: 0,
      totalNotionSends: 0,
      favoritePages: {},
      usageByType: { text: 0, image: 0, html: 0, code: 0, url: 0 },
      lastUsed: {},
      dailyStats: {},
      firstUse: Date.now(),
      lastUse: null
    };
    
    await this.persist();
    return true;
  }

  async getSummary() {
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

module.exports = ElectronStatsAdapter;