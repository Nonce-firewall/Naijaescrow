import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';

describe('Logger', () => {
  let consoleInfoSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs info with message and context', () => {
    logger.info('Test info message', 'AuthContext', { userId: '123' });
    expect(consoleInfoSpy).toHaveBeenCalledOnce();
    const [msg, data] = consoleInfoSpy.mock.calls[0];
    expect(msg).toContain('[INFO] [AuthContext] Test info message');
    expect(data).toEqual({ userId: '123' });
  });

  it('logs warn with message', () => {
    logger.warn('Warning encountered');
    expect(consoleWarnSpy).toHaveBeenCalledOnce();
    const [msg] = consoleWarnSpy.mock.calls[0];
    expect(msg).toContain('[WARN] Warning encountered');
  });

  it('logs error with message and details', () => {
    logger.error('Failed to connect to database', 'Database', { code: '500' });
    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const [msg, data] = consoleErrorSpy.mock.calls[0];
    expect(msg).toContain('[ERROR] [Database] Failed to connect to database');
    expect(data).toEqual({ code: '500' });
  });

  it('logs debug when not in production', () => {
    logger.debug('Debug trace');
    expect(consoleLogSpy).toHaveBeenCalled();
  });
});
