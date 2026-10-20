export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
}

class Logger {
  private format(level: LogLevel, message: string, context?: string, data?: any): StructuredLog {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
    };
  }

  info(message: string, context?: string, data?: any): void {
    const log = this.format('info', message, context, data);
    console.info(
      `[${log.timestamp}] [INFO]${context ? ` [${context}]` : ''} ${message}`,
      data !== undefined ? data : ''
    );
  }

  warn(message: string, context?: string, data?: any): void {
    const log = this.format('warn', message, context, data);
    console.warn(
      `[${log.timestamp}] [WARN]${context ? ` [${context}]` : ''} ${message}`,
      data !== undefined ? data : ''
    );
  }

  error(message: string, context?: string, data?: any): void {
    const log = this.format('error', message, context, data);
    console.error(
      `[${log.timestamp}] [ERROR]${context ? ` [${context}]` : ''} ${message}`,
      data !== undefined ? data : ''
    );
  }

  debug(message: string, context?: string, data?: any): void {
    const log = this.format('debug', message, context, data);
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[${log.timestamp}] [DEBUG]${context ? ` [${context}]` : ''} ${message}`,
        data !== undefined ? data : ''
      );
    }
  }
}

export const logger = new Logger();
