// packages/ui/src/lib/utils/logger.ts
// ✅ NOUVEAU: Système de logging centralisé et configurable

type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

interface LoggerConfig {
  level?: LogLevel;
  prefix?: string;
  timestamp?: boolean;
  colors?: boolean;
}

class Logger {
  private level: LogLevel;
  private prefix: string;
  private timestamp: boolean;
  private colors: boolean;

  private readonly levels: Record<LogLevel, number> = {
    silent: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4
  };

  private readonly levelColors: Record<LogLevel, string> = {
    silent: '',
    error: '\x1b[31m', // Rouge
    warn: '\x1b[33m',  // Jaune
    info: '\x1b[36m',  // Cyan
    debug: '\x1b[90m'  // Gris
  };

  private readonly resetColor = '\x1b[0m';

  constructor(config: LoggerConfig = {}) {
    this.level = config.level || (process.env.NODE_ENV === 'production' ? 'error' : 'info');
    this.prefix = config.prefix || '';
    this.timestamp = config.timestamp ?? true;
    this.colors = config.colors ?? true;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] <= this.levels[this.level];
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    let formatted = '';

    if (this.timestamp) {
      const now = new Date().toISOString();
      formatted += `[${now}] `;
    }

    if (this.prefix) {
      formatted += `[${this.prefix}] `;
    }

    if (this.colors) {
      formatted = `${this.levelColors[level]}${formatted}${level.toUpperCase()}: ${message}${this.resetColor}`;
    } else {
      formatted += `${level.toUpperCase()}: ${message}`;
    }

    return formatted;
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message), ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message), ...args);
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }
}

// ============================================
// LOGGERS PRÉCONFIGURÉS PAR MODULE
// ============================================

// Logger principal de l'application
export const appLogger = new Logger({
  level: process.env.NODE_ENV === 'production' ? 'error' : 'info',
  prefix: 'APP',
  timestamp: true,
  colors: true
});

// Logger pour les hooks React
export const hooksLogger = new Logger({
  level: process.env.NODE_ENV === 'production' ? 'silent' : 'warn',
  prefix: 'HOOKS',
  timestamp: false,
  colors: true
});

// Logger pour l'initialisation
export const initLogger = new Logger({
  level: process.env.NODE_ENV === 'production' ? 'error' : 'info',
  prefix: 'INIT',
  timestamp: true,
  colors: true
});

// Logger pour le polling
export const pollingLogger = new Logger({
  level: process.env.NODE_ENV === 'production' ? 'silent' : 'error',
  prefix: 'POLLING',
  timestamp: true,
  colors: true
});

// Logger pour les erreurs réseau
export const networkLogger = new Logger({
  level: process.env.NODE_ENV === 'production' ? 'error' : 'warn',
  prefix: 'NETWORK',
  timestamp: true,
  colors: true
});

// Logger pour le clipboard
export const clipboardLogger = new Logger({
  level: process.env.NODE_ENV === 'production' ? 'silent' : 'warn',
  prefix: 'CLIPBOARD',
  timestamp: false,
  colors: true
});

// ============================================
// CONFIGURATION GLOBALE
// ============================================

export function setGlobalLogLevel(level: LogLevel): void {
  appLogger.setLevel(level);
  hooksLogger.setLevel(level);
  initLogger.setLevel(level);
  pollingLogger.setLevel(level);
  networkLogger.setLevel(level);
  clipboardLogger.setLevel(level);
}

// ✅ Configuration automatique basée sur l'environnement
if (process.env.NODE_ENV === 'production') {
  setGlobalLogLevel('error'); // Production: seulement les erreurs
} else if (process.env.LOG_LEVEL) {
  setGlobalLogLevel(process.env.LOG_LEVEL as LogLevel);
}

export default Logger;