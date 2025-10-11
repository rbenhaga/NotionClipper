export declare enum LogLevel {
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
export declare class Logger {
    private level;
    private context?;
    constructor(level?: LogLevel, context?: string);
    private log;
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: Error, data?: any): void;
    createChild(context: string): Logger;
}
export declare const logger: Logger;
export declare const clipboardLogger: Logger;
export declare const notionLogger: Logger;
export declare const configLogger: Logger;
export declare const uiLogger: Logger;
//# sourceMappingURL=logger.service.d.ts.map