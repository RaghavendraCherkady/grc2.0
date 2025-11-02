export interface LogEvent {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, any>;
  timestamp: string;
  userId?: string;
}

class MonitoringService {
  private logs: LogEvent[] = [];
  private maxLogs = 1000;

  log(level: LogEvent['level'], message: string, context?: Record<string, any>, userId?: string) {
    const event: LogEvent = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      userId,
    };

    this.logs.push(event);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (level === 'error') {
      console.error(`[${level.toUpperCase()}]`, message, context);
    } else if (level === 'warn') {
      console.warn(`[${level.toUpperCase()}]`, message, context);
    } else {
      console.log(`[${level.toUpperCase()}]`, message, context);
    }

    this.sendToBackend(event);
  }

  info(message: string, context?: Record<string, any>, userId?: string) {
    this.log('info', message, context, userId);
  }

  warn(message: string, context?: Record<string, any>, userId?: string) {
    this.log('warn', message, context, userId);
  }

  error(message: string, context?: Record<string, any>, userId?: string) {
    this.log('error', message, context, userId);
  }

  debug(message: string, context?: Record<string, any>, userId?: string) {
    this.log('debug', message, context, userId);
  }

  private async sendToBackend(event: LogEvent) {
    if (event.level === 'error' || event.level === 'warn') {
      try {
        const response = await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });

        if (!response.ok) {
          console.warn('Failed to send log to backend');
        }
      } catch (error) {
        console.warn('Error sending log to backend:', error);
      }
    }
  }

  getLogs(): LogEvent[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  trackPerformance(metricName: string, duration: number, metadata?: Record<string, any>) {
    this.info(`Performance: ${metricName}`, {
      duration,
      ...metadata,
    });
  }
}

export const monitoring = new MonitoringService();

export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorMessage: string = 'Operation failed'
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error: any) {
      monitoring.error(errorMessage, {
        error: error.message,
        stack: error.stack,
        args,
      });
      throw error;
    }
  }) as T;
}
