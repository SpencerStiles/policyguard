/**
 * logger.ts — Structured application logger.
 *
 * In production: emits newline-delimited JSON to stdout so log aggregators
 * (Datadog, Logtail, CloudWatch, etc.) can parse and index fields natively.
 *
 * In development: emits colour-coded human-readable lines to the terminal.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

const ANSI: Record<LogLevel, string> = {
  debug: '\x1b[37m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};

function log(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  // Use the appropriate console method so log-level filters work in hosted
  // environments that honour stderr vs stdout distinction.
  const consoleFn =
    level === 'debug' ? console.log : (console[level] as typeof console.log);

  if (process.env.NODE_ENV === 'production') {
    consoleFn(JSON.stringify(entry));
  } else {
    const color = ANSI[level];
    consoleFn(
      `${color}[${level.toUpperCase()}]\x1b[0m ${message}`,
      meta ?? '',
    );
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) =>
    log('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) =>
    log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) =>
    log('error', msg, meta),
};
