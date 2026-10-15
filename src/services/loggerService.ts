export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  action: string;
  message: string;
  details?: any;
}

class LoggerService {
  private logs: LogEntry[] = [];

  log(level: LogLevel, action: string, message: string, details?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      action,
      message,
      details,
    };
    this.logs.unshift(entry);
    if (this.logs.length > 100) this.logs.pop();

    if (level === 'error') {
      console.error(`[${action}] ${message}`, details ?? '');
    } else if (level === 'warn') {
      console.warn(`[${action}] ${message}`, details ?? '');
    } else {
      console.log(`[${action}] ${message}`, details ?? '');
    }
  }

  info(action: string, message: string, details?: any) {
    this.log('info', action, message, details);
  }

  warn(action: string, message: string, details?: any) {
    this.log('warn', action, message, details);
  }

  error(action: string, message: string, details?: any) {
    this.log('error', action, message, details);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }
}

export const loggerService = new LoggerService();
