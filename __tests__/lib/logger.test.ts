import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { logger, createContextLogger, LogLevel } from '@/lib/logger';

/**
 * Logger Tests
 * @covers US-017 - Structured Logging
 */

// Mock console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

describe('Logger', () => {
  beforeEach(() => {
    // Mock console methods before each test
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    // Override NODE_ENV to allow logging in tests
    Object.defineProperty(process, 'env', { 
      value: { ...process.env, NODE_ENV: 'development' },
      writable: true 
    });
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    // Restore NODE_ENV
    Object.defineProperty(process, 'env', { 
      value: { ...process.env, NODE_ENV: 'test' },
      writable: true 
    });
  });

  describe('Basic Logging', () => {
    it('should log info messages', () => {
      logger.info('Test info message');
      expect(console.log).toHaveBeenCalled();
    });

    it('should log warning messages', () => {
      logger.warn('Test warning');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      logger.error('Test error', new Error('Test'));
      expect(console.error).toHaveBeenCalled();
    });

    it('should include metadata in logs', () => {
      logger.info('User action', { userId: '123', action: 'login' });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/User action.*userId.*123.*action.*login/)
      );
    });
  });

  describe('Error Logging', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringMatching(/Error occurred.*Test error/)
      );
    });

    it('should handle non-Error objects', () => {
      logger.error('Error occurred', { message: 'Custom error' });
      expect(console.error).toHaveBeenCalled();
    });

    it('should include metadata with errors', () => {
      const error = new Error('Test');
      logger.error('Error with context', error, { userId: '123' });
      expect(console.error).toHaveBeenCalledWith(
        expect.stringMatching(/Error with context.*userId.*123/)
      );
    });
  });

  describe('Context Logger', () => {
    it('should create context logger with module name', () => {
      const contextLogger = createContextLogger('TestModule');
      contextLogger.info('Test message');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[TestModule]')
      );
    });

    it('should include context in all logs', () => {
      const contextLogger = createContextLogger('Auth');
      contextLogger.warn('Warning message', { userId: '123' });
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringMatching(/\[Auth\].*Warning message.*userId.*123/)
      );
    });
  });

  describe('Log Levels', () => {
    it('should have correct log level values', () => {
      expect(LogLevel.DEBUG).toBe(LogLevel.DEBUG);
      expect(LogLevel.INFO).toBe(LogLevel.INFO);
      expect(LogLevel.WARN).toBe(LogLevel.WARN);
      expect(LogLevel.ERROR).toBe(LogLevel.ERROR);
    });
  });

  describe('Message Formatting', () => {
    it('should include timestamp', () => {
      logger.info('Test');
      const calls = (console.log as jest.Mock).mock.calls;
      expect(calls[0][0]).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include log level', () => {
      logger.info('Test');
      const call = (console.log as jest.Mock).mock.calls[0][0];
      expect(call).toContain('[INFO]');
    });

    it('should format error level correctly', () => {
      logger.error('Error test', new Error('test'));
      const call = (console.error as jest.Mock).mock.calls[0][0];
      expect(call).toContain('[ERROR]');
    });
  });
});
