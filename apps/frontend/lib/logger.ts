/**
 * Client-side logger utility
 *
 * Security: Prevents information disclosure in production
 * Only logs to console in development environment
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.log('User logged in');
 *   logger.error('Failed to fetch data', error);
 *   logger.warn('Deprecated API call');
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Log informational messages (development only)
   */
  log: (...args: any[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log error messages (development only)
   * In production, consider sending to error tracking service (Sentry)
   */
  error: (...args: any[]): void => {
    if (isDevelopment) {
      console.error(...args);
    }
    // TODO: In production, send to error tracking service
    // if (!isDevelopment && typeof window !== 'undefined') {
    //   Sentry.captureException(args[0]);
    // }
  },

  /**
   * Log warning messages (development only)
   */
  warn: (...args: any[]): void => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Log debug messages (development only)
   */
  debug: (...args: any[]): void => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Log informational messages (development only)
   */
  info: (...args: any[]): void => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
};
