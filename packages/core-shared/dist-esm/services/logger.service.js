export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (LogLevel = {}));
export class Logger {
    constructor(level = LogLevel.INFO, context) {
        this.level = level;
        this.context = context;
    }
    log(level, message, data, error) {
        if (level < this.level)
            return;
        const entry = {
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
    debug(message, data) {
        this.log(LogLevel.DEBUG, message, data);
    }
    info(message, data) {
        this.log(LogLevel.INFO, message, data);
    }
    warn(message, data) {
        this.log(LogLevel.WARN, message, data);
    }
    error(message, error, data) {
        this.log(LogLevel.ERROR, message, data, error);
    }
    createChild(context) {
        const childContext = this.context ? `${this.context}:${context}` : context;
        return new Logger(this.level, childContext);
    }
}
// Instance globale
export const logger = new Logger(process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG);
// Loggers spécialisés
export const clipboardLogger = logger.createChild('CLIPBOARD');
export const notionLogger = logger.createChild('NOTION');
export const configLogger = logger.createChild('CONFIG');
export const uiLogger = logger.createChild('UI');
