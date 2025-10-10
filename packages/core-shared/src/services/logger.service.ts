export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  data?: any;
  error?: Error;
  context?: string;
}

export class Logger {
  private level: LogLevel;
  private context?: string;

  constructor(level: LogLevel = LogLevel.INFO, context?: string) {
    this.level = level;
    this.context = context;
  }

  private log(level: LogLevel, message: string, data?: any, error?: Error) {
    if (level < this.level) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      data,
      error,
      context: this.context
    };

    const prefix = this.context ? `[${this.context}]` : '';
    const timestamp = new Date().toISOString();

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`${timestamp} ${prefix} [DEBUG] ${message}`, data);
        break;
      case LogLevel.INFO:
        console.info(`${timestamp} ${prefix} [INFO] ${message}`, data);
        break;
      case LogLevel.WARN:
        console.warn(`${timestamp} ${prefix} [WARN] ${message}`, data);
        break;
      case LogLevel.ERROR:
        console.error(`${timestamp} ${prefix} [ERROR] ${message}`, error || data);
        // TODO: Envoyer à un service de monitoring (Sentry)
        break;
    }
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error, data?: any) {
    this.log(LogLevel.ERROR, message, data, error);
  }

  createChild(context: string): Logger {
    const childContext = this.context ? `${this.context}:${context}` : context;
    return new Logger(this.level, childContext);
  }
}

// Instance globale
export const logger = new Logger(
  process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG
);

// Loggers spécialisés
export const clipboardLogger = logger.createChild('CLIPBOARD');
export const notionLogger = logger.createChild('NOTION');
export const configLogger = logger.createChild('CONFIG');
export const uiLogger = logger.createChild('UI');