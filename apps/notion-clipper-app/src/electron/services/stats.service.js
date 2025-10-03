const EventEmitter = require('events');
const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

class StatsService extends EventEmitter {
  constructor() {
    super();
    
    // Base de données pour persistance
    const dbPath = path.join(app.getPath('userData'), 'notion-stats.db');
    this.db = new Database(dbPath);
    
    this.initDatabase();
    
    // Compteurs en mémoire (identiques au Python)
    this.counters = {
      api_calls: 0,
      cache_hits: 0,
      cache_misses: 0,
      successful_sends: 0,
      failed_sends: 0,
      content_processed: 0,
      errors: 0,
      clipboard_reads: 0,
      pages_fetched: 0,
      pages_created: 0,
      images_uploaded: 0,
      changes_detected: 0,
      clipboard_clears: 0
    };
    
    // Stats par type de contenu
    this.contentTypeStats = {};
    
    // Historique des erreurs (limite 100 comme Python)
    this.errorLog = [];
    this.maxErrorLogSize = 100;
    
    // Performance
    this.performanceMetrics = {
      avgProcessingTime: 0,
      avgApiResponseTime: 0,
      totalProcessingTime: 0,
      processingCount: 0
    };
    
    // Stats horaires (24h rotation comme Python)
    this.hourlyStats = {};
    
    // Timestamp de démarrage
    this.startTime = Date.now();
    
    // Charger les stats depuis la DB
    this.loadStats();
    
    // Sauvegarder périodiquement (toutes les 5 min comme Python)
    this.startAutoSave();
  }

  initDatabase() {
    // Créer les tables identiques au Python
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS counters (
        name TEXT PRIMARY KEY,
        value INTEGER DEFAULT 0
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS content_types (
        type TEXT PRIMARY KEY,
        count INTEGER DEFAULT 0
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hourly_stats (
        hour TEXT PRIMARY KEY,
        data TEXT NOT NULL
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS error_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        error TEXT NOT NULL,
        context TEXT,
        stack TEXT
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS performance_metrics (
        metric TEXT PRIMARY KEY,
        value REAL DEFAULT 0
      )
    `);
  }

  // Incrémenter un compteur (thread-safe via SQLite)
  increment(metric, value = 1) {
    if (this.counters.hasOwnProperty(metric)) {
      this.counters[metric] += value;
      
      // Enregistrer dans les stats horaires
      const hour = new Date().toISOString().slice(0, 13) + ':00';
      if (!this.hourlyStats[hour]) {
        this.hourlyStats[hour] = { ...this.emptyHourlyStats() };
      }
      this.hourlyStats[hour][metric] = (this.hourlyStats[hour][metric] || 0) + value;
      
      // Nettoyer les vieilles stats (>24h)
      this.cleanOldHourlyStats();
      
      // Émettre un événement
      this.emit('stat-updated', { metric, value, total: this.counters[metric] });
    }
  }

  // Enregistrer le type de contenu
  recordContentType(type) {
    this.contentTypeStats[type] = (this.contentTypeStats[type] || 0) + 1;
    this.increment('content_processed');
  }

  // Enregistrer une erreur (comme Python)
  recordError(error, context = '') {
    const errorEntry = {
      timestamp: Date.now(),
      error: error.message || String(error),
      context,
      stack: error.stack || ''
    };

    this.errorLog.push(errorEntry);
    
    // Limiter la taille (100 comme Python)
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog.shift();
    }

    // Sauvegarder dans la DB
    try {
      this.db.prepare(`
        INSERT INTO error_log (timestamp, error, context, stack)
        VALUES (?, ?, ?, ?)
      `).run(errorEntry.timestamp, errorEntry.error, errorEntry.context, errorEntry.stack);
    } catch (dbError) {
      console.error('Error log save failed:', dbError);
    }

    this.increment('errors');
  }

  // Enregistrer le temps de traitement
  recordProcessingTime(startTime, type = 'general') {
    const duration = Date.now() - startTime;
    this.performanceMetrics.totalProcessingTime += duration;
    this.performanceMetrics.processingCount++;
    this.performanceMetrics.avgProcessingTime = 
      this.performanceMetrics.totalProcessingTime / this.performanceMetrics.processingCount;
    
    // Enregistrer par type si nécessaire
    if (type === 'api') {
      this.performanceMetrics.avgApiResponseTime = 
        (this.performanceMetrics.avgApiResponseTime * 0.9) + (duration * 0.1); // Moving average
    }
  }

  // Nettoyer les stats horaires > 24h
  cleanOldHourlyStats() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 13) + ':00';
    Object.keys(this.hourlyStats).forEach(hour => {
      if (hour < cutoff) {
        delete this.hourlyStats[hour];
      }
    });
  }

  // Obtenir toutes les stats (comme Python get_all_stats)
  getAllStats() {
    const uptime = Date.now() - this.startTime;
    
    return {
      uptime,
      uptimeFormatted: this.formatUptime(uptime / 1000),
      counters: { ...this.counters },
      contentTypes: { ...this.contentTypeStats },
      performance: { ...this.performanceMetrics },
      errorCount: this.errorLog.length,
      recentErrors: this.errorLog.slice(-10),
      hourlyData: this.getHourlyData(),
      rates: {
        cacheHitRate: this.calculateCacheHitRate(),
        successRate: this.calculateSuccessRate()
      }
    };
  }

  // Obtenir un résumé (comme Python get_summary)
  getSummary() {
    const totalSends = this.counters.successful_sends + this.counters.failed_sends;
    
    return {
      totalApiCalls: this.counters.api_calls,
      totalContentProcessed: this.counters.content_processed,
      cacheHitRate: this.calculateCacheHitRate(),
      successRate: this.calculateSuccessRate(),
      totalSends,
      totalErrors: this.counters.errors,
      uptimeHours: (Date.now() - this.startTime) / 3600000
    };
  }

  // Méthodes de calcul (identiques au Python)
  calculateCacheHitRate() {
    const total = this.counters.cache_hits + this.counters.cache_misses;
    return total > 0 ? (this.counters.cache_hits / total) * 100 : 0;
  }

  calculateSuccessRate() {
    const total = this.counters.successful_sends + this.counters.failed_sends;
    return total > 0 ? (this.counters.successful_sends / total) * 100 : 100;
  }

  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }

  // Stats horaires (comme Python)
  getHourlyData(hoursBack = 24) {
    const data = [];
    const now = new Date();
    
    for (let i = 0; i < hoursBack; i++) {
      const hour = new Date(now - i * 60 * 60 * 1000);
      const hourKey = hour.toISOString().slice(0, 13) + ':00';
      
      data.unshift({
        hour: hourKey,
        ...(this.hourlyStats[hourKey] || this.emptyHourlyStats())
      });
    }
    
    return data;
  }

  emptyHourlyStats() {
    return Object.keys(this.counters).reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});
  }

  // Export/Import (comme Python)
  exportStats() {
    return {
      exportDate: new Date().toISOString(),
      startTime: this.startTime,
      stats: this.getAllStats(),
      contentTypes: this.contentTypeStats,
      errorLog: this.errorLog,
      hourlyStats: this.hourlyStats,
      performance: this.performanceMetrics
    };
  }

  importStats(data) {
    if (data.counters) {
      Object.assign(this.counters, data.counters);
    }
    if (data.contentTypes) {
      Object.assign(this.contentTypeStats, data.contentTypes);
    }
    if (data.hourlyStats) {
      Object.assign(this.hourlyStats, data.hourlyStats);
    }
    if (data.performance) {
      Object.assign(this.performanceMetrics, data.performance);
    }
    if (data.errorLog) {
      this.errorLog = data.errorLog.slice(-this.maxErrorLogSize);
    }
    
    this.saveStats();
  }

  // Sauvegarde automatique
  startAutoSave() {
    setInterval(() => {
      this.saveStats();
    }, 5 * 60 * 1000); // 5 minutes comme Python
  }

  saveStats() {
    try {
      const transaction = this.db.transaction(() => {
        // Sauvegarder les compteurs
        const counterStmt = this.db.prepare(
          'INSERT OR REPLACE INTO counters (name, value) VALUES (?, ?)'
        );
        
        Object.entries(this.counters).forEach(([name, value]) => {
          counterStmt.run(name, value);
        });

        // Sauvegarder les types
        const typeStmt = this.db.prepare(
          'INSERT OR REPLACE INTO content_types (type, count) VALUES (?, ?)'
        );
        
        Object.entries(this.contentTypeStats).forEach(([type, count]) => {
          typeStmt.run(type, count);
        });

        // Sauvegarder les métriques de performance
        const perfStmt = this.db.prepare(
          'INSERT OR REPLACE INTO performance_metrics (metric, value) VALUES (?, ?)'
        );
        
        Object.entries(this.performanceMetrics).forEach(([metric, value]) => {
          perfStmt.run(metric, value);
        });

        // Sauvegarder les stats horaires (garder 48h pour sécurité)
        const hourlyStmt = this.db.prepare(
          'INSERT OR REPLACE INTO hourly_stats (hour, data) VALUES (?, ?)'
        );
        
        Object.entries(this.hourlyStats).forEach(([hour, data]) => {
          hourlyStmt.run(hour, JSON.stringify(data));
        });
      });

      transaction();
    } catch (error) {
      console.error('Stats save error:', error);
    }
  }

  loadStats() {
    try {
      // Charger les compteurs
      const counters = this.db.prepare('SELECT * FROM counters').all();
      counters.forEach(row => {
        if (this.counters.hasOwnProperty(row.name)) {
          this.counters[row.name] = row.value;
        }
      });

      // Charger les types
      const types = this.db.prepare('SELECT * FROM content_types').all();
      types.forEach(row => {
        this.contentTypeStats[row.type] = row.count;
      });

      // Charger les erreurs récentes
      const errors = this.db.prepare(
        'SELECT * FROM error_log ORDER BY id DESC LIMIT ?'
      ).all(this.maxErrorLogSize);
      
      this.errorLog = errors.reverse();

      // Charger les métriques
      const metrics = this.db.prepare('SELECT * FROM performance_metrics').all();
      metrics.forEach(row => {
        if (this.performanceMetrics.hasOwnProperty(row.metric)) {
          this.performanceMetrics[row.metric] = row.value;
        }
      });

      // Charger les stats horaires
      const hourlyData = this.db.prepare('SELECT * FROM hourly_stats').all();
      hourlyData.forEach(row => {
        try {
          this.hourlyStats[row.hour] = JSON.parse(row.data);
        } catch (e) {
          console.error('Error parsing hourly stats:', e);
        }
      });

      // Nettoyer les vieilles données
      this.cleanOldHourlyStats();
    } catch (error) {
      console.error('Stats load error:', error);
    }
  }

  // Reset
  reset() {
    Object.keys(this.counters).forEach(key => {
      this.counters[key] = 0;
    });
    
    this.contentTypeStats = {};
    this.errorLog = [];
    this.hourlyStats = {};
    this.performanceMetrics = {
      avgProcessingTime: 0,
      avgApiResponseTime: 0,
      totalProcessingTime: 0,
      processingCount: 0
    };

    // Nettoyer la DB
    this.db.exec('DELETE FROM counters');
    this.db.exec('DELETE FROM content_types');
    this.db.exec('DELETE FROM hourly_stats');
    this.db.exec('DELETE FROM error_log');
    this.db.exec('DELETE FROM performance_metrics');
    
    this.startTime = Date.now();
  }
}

module.exports = new StatsService();