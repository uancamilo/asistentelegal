import { LoggerService, Injectable, Scope } from '@nestjs/common';

/**
 * Log levels supported by the structured logger
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Base structure for all log entries
 */
export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  msg: string;
  [key: string]: unknown;
}

/**
 * StructuredLogger - JSON-formatted logging service
 *
 * This logger outputs logs in JSON format for easy parsing by log aggregators
 * like CloudWatch, Datadog, ELK Stack, etc.
 *
 * Features:
 * - JSON output format
 * - Contextual metadata support
 * - Consistent timestamp format (ISO 8601)
 * - Support for additional structured data
 *
 * @example
 * ```typescript
 * const logger = new StructuredLogger('RAGService');
 * logger.log('Query processed', { executionMs: 1234, chunksUsed: 4 });
 * // Output: {"timestamp":"2024-...","level":"info","context":"RAGService","msg":"Query processed","executionMs":1234,"chunksUsed":4}
 * ```
 */
@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger implements LoggerService {
  private context: string = 'Application';

  constructor(context?: string) {
    if (context) {
      this.context = context;
    }
  }

  /**
   * Set the context for this logger instance
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Log an informational message
   */
  log(message: string, data?: Record<string, unknown>): void {
    this.writeLog('info', message, data);
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    if (process.env['NODE_ENV'] === 'production') return;
    this.writeLog('debug', message, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.writeLog('warn', message, data);
  }

  /**
   * Log an error message
   */
  error(message: string, trace?: string, data?: Record<string, unknown>): void {
    this.writeLog('error', message, { ...data, trace });
  }

  /**
   * Log a verbose message (maps to debug)
   */
  verbose(message: string, data?: Record<string, unknown>): void {
    this.debug(message, data);
  }

  /**
   * Internal method to write structured log entry
   */
  private writeLog(
    level: LogLevel,
    msg: string,
    data?: Record<string, unknown>,
  ): void {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      msg,
      ...data,
    };

    // Remove undefined values
    const cleanEntry = Object.fromEntries(
      Object.entries(entry).filter(([, v]) => v !== undefined),
    );

    const output = JSON.stringify(cleanEntry);

    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'debug':
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: string): StructuredLogger {
    return new StructuredLogger(`${this.context}:${additionalContext}`);
  }
}

/**
 * Factory function to create a structured logger with context
 */
export function createStructuredLogger(context: string): StructuredLogger {
  return new StructuredLogger(context);
}
