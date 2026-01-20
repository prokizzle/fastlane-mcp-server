import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('handleAnalyzeProject', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error for invalid project path', async () => {
    // Mock validateProjectPath to throw
    vi.doMock('../../utils/sanitize.js', () => ({
      validateProjectPath: vi.fn().mockRejectedValue(
        Object.assign(new Error('Path does not exist'), { name: 'ValidationError' })
      ),
      ValidationError: class ValidationError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'ValidationError';
        }
      },
    }));

    const { handleAnalyzeProject } = await import('../analyze.js');
    const result = await handleAnalyzeProject({ projectPath: '/nonexistent' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error');
  });

  it('should return formatted analysis for valid project', async () => {
    // Mock validateProjectPath to succeed
    vi.doMock('../../utils/sanitize.js', () => ({
      validateProjectPath: vi.fn().mockResolvedValue('/test/project'),
      ValidationError: class ValidationError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'ValidationError';
        }
      },
    }));

    // Mock analyzeProject
    vi.doMock('../../discovery/analyze.js', () => ({
      analyzeProject: vi.fn().mockResolvedValue({
        platforms: ['ios'],
        ios: {
          lanes: [{ name: 'build', platform: 'ios', description: 'Build', isPrivate: false }],
          signing: 'match',
          destinations: ['testflight'],
          hasMetadata: true,
        },
        environment: { status: 'ready', issues: [] },
        capabilities: {
          platforms: ['ios'],
          build: ['gym'],
          distribution: ['pilot'],
          metadata: ['deliver'],
          signing: ['match'],
        },
        suggestedActions: ['Build iOS app with gym', 'Upload to TestFlight'],
      }),
    }));

    const { handleAnalyzeProject } = await import('../analyze.js');
    const result = await handleAnalyzeProject({ projectPath: '/test/project' });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('# Project Analysis');
    expect(result.content[0].text).toContain('## Platforms');
    expect(result.content[0].text).toContain('ios');
    expect(result.content[0].text).toContain('## iOS');
    expect(result.content[0].text).toContain('**Signing:** match');
    expect(result.content[0].text).toContain('testflight');
    expect(result.content[0].text).toContain('## Suggested Actions');
    expect(result.content[0].text).toContain('Build iOS app with gym');
  });

  it('should show environment issues when present', async () => {
    vi.doMock('../../utils/sanitize.js', () => ({
      validateProjectPath: vi.fn().mockResolvedValue('/test/project'),
      ValidationError: class ValidationError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'ValidationError';
        }
      },
    }));

    vi.doMock('../../discovery/analyze.js', () => ({
      analyzeProject: vi.fn().mockResolvedValue({
        platforms: ['ios'],
        ios: {
          lanes: [],
          signing: 'match',
          destinations: [],
          hasMetadata: false,
        },
        environment: {
          status: 'issues',
          issues: [
            'Environment variable FASTLANE_USER is not set',
            'Environment variable MATCH_PASSWORD is not set',
          ],
        },
        capabilities: {
          platforms: ['ios'],
          build: [],
          distribution: [],
          metadata: [],
          signing: ['match'],
        },
        suggestedActions: [],
      }),
    }));

    const { handleAnalyzeProject } = await import('../analyze.js');
    const result = await handleAnalyzeProject({ projectPath: '/test/project' });

    expect(result.content[0].text).toContain('**Status:** Issues Found');
    expect(result.content[0].text).toContain('FASTLANE_USER is not set');
    expect(result.content[0].text).toContain('MATCH_PASSWORD is not set');
  });

  it('should handle both platforms in cross-platform project', async () => {
    vi.doMock('../../utils/sanitize.js', () => ({
      validateProjectPath: vi.fn().mockResolvedValue('/test/project'),
      ValidationError: class ValidationError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'ValidationError';
        }
      },
    }));

    vi.doMock('../../discovery/analyze.js', () => ({
      analyzeProject: vi.fn().mockResolvedValue({
        platforms: ['ios', 'android'],
        ios: {
          lanes: [{ name: 'build', platform: 'ios', description: null, isPrivate: false }],
          signing: 'match',
          destinations: ['testflight'],
          hasMetadata: true,
        },
        android: {
          lanes: [{ name: 'build', platform: 'android', description: null, isPrivate: false }],
          signing: 'manual',
          destinations: ['play_store'],
          hasMetadata: false,
        },
        environment: { status: 'ready', issues: [] },
        capabilities: {
          platforms: ['ios', 'android'],
          build: ['gym', 'gradle'],
          distribution: ['pilot', 'supply'],
          metadata: [],
          signing: ['match'],
        },
        suggestedActions: ['Build iOS app with gym', 'Build Android app with gradle'],
      }),
    }));

    const { handleAnalyzeProject } = await import('../analyze.js');
    const result = await handleAnalyzeProject({ projectPath: '/test/project' });

    expect(result.content[0].text).toContain('## iOS');
    expect(result.content[0].text).toContain('## Android');
    expect(result.content[0].text).toContain('ios, android');
  });

  it('should handle empty project gracefully', async () => {
    vi.doMock('../../utils/sanitize.js', () => ({
      validateProjectPath: vi.fn().mockResolvedValue('/test/project'),
      ValidationError: class ValidationError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'ValidationError';
        }
      },
    }));

    vi.doMock('../../discovery/analyze.js', () => ({
      analyzeProject: vi.fn().mockResolvedValue({
        platforms: [],
        environment: { status: 'ready', issues: [] },
        capabilities: {
          platforms: [],
          build: [],
          distribution: [],
          metadata: [],
          signing: [],
        },
        suggestedActions: [],
      }),
    }));

    const { handleAnalyzeProject } = await import('../analyze.js');
    const result = await handleAnalyzeProject({ projectPath: '/test/project' });

    expect(result.content[0].text).toContain('None detected');
    expect(result.content[0].text).toContain('No actions available');
  });
});

describe('handleAnalyzeProjectJson', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return JSON output for valid project', async () => {
    vi.doMock('../../utils/sanitize.js', () => ({
      validateProjectPath: vi.fn().mockResolvedValue('/test/project'),
      ValidationError: class ValidationError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'ValidationError';
        }
      },
    }));

    const mockAnalysis = {
      platforms: ['ios'],
      ios: {
        lanes: [],
        signing: 'match',
        destinations: ['testflight'],
        hasMetadata: true,
      },
      environment: { status: 'ready', issues: [] },
      capabilities: {
        platforms: ['ios'],
        build: ['gym'],
        distribution: ['pilot'],
        metadata: [],
        signing: ['match'],
      },
      suggestedActions: ['Build iOS app with gym'],
    };

    vi.doMock('../../discovery/analyze.js', () => ({
      analyzeProject: vi.fn().mockResolvedValue(mockAnalysis),
    }));

    const { handleAnalyzeProjectJson } = await import('../analyze.js');
    const result = await handleAnalyzeProjectJson({ projectPath: '/test/project' });

    expect(result.isError).toBeUndefined();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.platforms).toEqual(['ios']);
    expect(parsed.ios.signing).toBe('match');
    expect(parsed.suggestedActions).toContain('Build iOS app with gym');
  });

  it('should return JSON error for invalid path', async () => {
    vi.doMock('../../utils/sanitize.js', () => ({
      validateProjectPath: vi.fn().mockRejectedValue(
        Object.assign(new Error('Path does not exist'), { name: 'ValidationError' })
      ),
      ValidationError: class ValidationError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'ValidationError';
        }
      },
    }));

    const { handleAnalyzeProjectJson } = await import('../analyze.js');
    const result = await handleAnalyzeProjectJson({ projectPath: '/nonexistent' });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBeDefined();
  });
});
