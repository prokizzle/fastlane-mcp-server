import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Logger', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should write info messages to stderr, not stdout', async () => {
    const { Logger } = await import('../logger.js');
    const logger = new Logger('Test');

    logger.info('test message');

    expect(stderrSpy).toHaveBeenCalled();
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('should write error messages to stderr', async () => {
    const { Logger } = await import('../logger.js');
    const logger = new Logger('Test');

    logger.error('error message');

    expect(stderrSpy).toHaveBeenCalled();
    expect(stdoutSpy).not.toHaveBeenCalled();
  });
});
