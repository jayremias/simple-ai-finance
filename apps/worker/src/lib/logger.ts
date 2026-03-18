import { env } from '@/env';

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  if (env.NODE_ENV === 'production') {
    return JSON.stringify(entry);
  }

  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${entry.timestamp}] ${level.toUpperCase()} ${message}${metaStr}`;
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.log(formatLog('info', message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(formatLog('warn', message, meta));
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(formatLog('error', message, meta));
  },
};
