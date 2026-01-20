import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fs module at the top level
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    promises: {
      readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
      readdir: vi.fn().mockResolvedValue([]),
      access: vi.fn().mockRejectedValue(new Error('ENOENT')),
      stat: vi.fn().mockResolvedValue({ isDirectory: () => true }),
    },
  };
});

describe('handleResearchPlugins', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error for invalid project path', async () => {
    // Mock validateProjectPath to throw ValidationError
    vi.doMock('../../utils/sanitize.js', () => ({
      validateProjectPath: vi.fn().mockRejectedValue(
        Object.assign(new Error('Path does not exist'), { name: 'ValidationError' })
      ),
    }));

    const { handleResearchPlugins } = await import('../plugins.js');
    const result = await handleResearchPlugins({ projectPath: '/nonexistent' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error');
    expect(result.content[0].text).toContain('Path does not exist');
  });

  it('should return recommendations for valid project with Firebase', async () => {
    // Mock validateProjectPath to succeed
    vi.doMock('../../utils/sanitize.js', () => ({
      validateProjectPath: vi.fn().mockResolvedValue('/test/project'),
    }));

    // Mock detectProjectSignals to return Firebase signal
    vi.doMock('../../plugins/signals.js', () => ({
      detectProjectSignals: vi.fn().mockResolvedValue([
        {
          category: 'service',
          name: 'firebase',
          source: 'GoogleService-Info.plist',
          confidence: 'high',
        },
      ]),
    }));

    // Mock getPluginRecommendations
    vi.doMock('../../plugins/registry.js', () => ({
      getPluginRecommendations: vi.fn().mockReturnValue([
        {
          plugin: {
            name: 'fastlane-plugin-firebase_app_distribution',
            description: 'Distribute builds via Firebase App Distribution',
            source: 'rubygems',
            homepage: 'https://github.com/fastlane/fastlane-plugin-firebase_app_distribution',
          },
          reason: 'Your project uses Firebase',
          relevantSignals: ['firebase'],
          priority: 'high',
        },
      ]),
      parsePluginfile: vi.fn().mockReturnValue([]),
      filterInstalledPlugins: vi.fn().mockImplementation((recs) => recs),
    }));

    // Mock listProjectFiles
    vi.doMock('../../discovery/analyze.js', () => ({
      listProjectFiles: vi.fn().mockResolvedValue(['GoogleService-Info.plist']),
    }));

    // Mock capabilities
    vi.doMock('../../discovery/capabilities.js', () => ({
      detectCapabilitiesFromFiles: vi.fn().mockReturnValue({
        platforms: ['ios'],
        build: [],
        distribution: [],
        metadata: [],
        signing: [],
      }),
      detectCapabilitiesFromFastfile: vi.fn().mockReturnValue({
        platforms: [],
        build: [],
        distribution: [],
        metadata: [],
        signing: [],
      }),
      mergeCapabilities: vi.fn().mockReturnValue({
        platforms: ['ios'],
        build: [],
        distribution: [],
        metadata: [],
        signing: [],
      }),
      createEmptyCapabilities: vi.fn().mockReturnValue({
        platforms: [],
        build: [],
        distribution: [],
        metadata: [],
        signing: [],
      }),
    }));

    const { handleResearchPlugins } = await import('../plugins.js');
    const result = await handleResearchPlugins({ projectPath: '/test/project' });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('## Plugin Recommendations');
    expect(result.content[0].text).toContain('fastlane-plugin-firebase_app_distribution');
    expect(result.content[0].text).toContain('High Priority');
  });

  it('should filter out installed plugins by default', async () => {
    vi.doMock('../../utils/sanitize.js', () => ({
      validateProjectPath: vi.fn().mockResolvedValue('/test/project'),
    }));

    vi.doMock('../../plugins/signals.js', () => ({
      detectProjectSignals: vi.fn().mockResolvedValue([
        { category: 'service', name: 'firebase', source: 'file.plist', confidence: 'high' },
      ]),
    }));

    vi.doMock('../../plugins/registry.js', () => ({
      getPluginRecommendations: vi.fn().mockReturnValue([
        {
          plugin: {
            name: 'fastlane-plugin-firebase_app_distribution',
            description: 'Firebase distribution',
            source: 'rubygems',
          },
          reason: 'Firebase detected',
          relevantSignals: ['firebase'],
          priority: 'high',
        },
        {
          plugin: {
            name: 'fastlane-plugin-versioning',
            description: 'Version management',
            source: 'rubygems',
          },
          reason: 'Xcode detected',
          relevantSignals: ['xcode'],
          priority: 'medium',
        },
      ]),
      parsePluginfile: vi.fn().mockReturnValue(['fastlane-plugin-versioning']),
      filterInstalledPlugins: vi.fn().mockImplementation((recs, installed) => {
        const installedSet = new Set(installed.map((p: string) => p.toLowerCase()));
        return recs.filter(
          (rec: { plugin: { name: string } }) => !installedSet.has(rec.plugin.name.toLowerCase())
        );
      }),
    }));

    vi.doMock('../../discovery/analyze.js', () => ({
      listProjectFiles: vi.fn().mockResolvedValue([]),
    }));

    vi.doMock('../../discovery/capabilities.js', () => ({
      detectCapabilitiesFromFiles: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      detectCapabilitiesFromFastfile: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      mergeCapabilities: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      createEmptyCapabilities: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
    }));

    // Mock fs.readFile to return Pluginfile content
    const fsMock = await import('fs');
    vi.mocked(fsMock.promises.readFile).mockImplementation(async (filepath: unknown) => {
      const pathStr = String(filepath);
      if (pathStr.includes('Pluginfile')) {
        return "gem 'fastlane-plugin-versioning'";
      }
      throw new Error('ENOENT');
    });

    const { handleResearchPlugins } = await import('../plugins.js');
    const result = await handleResearchPlugins({ projectPath: '/test/project' });

    // Should only show firebase plugin, not versioning (which is installed)
    expect(result.content[0].text).toContain('fastlane-plugin-firebase_app_distribution');
    expect(result.content[0].text).not.toContain('**fastlane-plugin-versioning**');
  });

  it('should include installed plugins when includeInstalled is true', async () => {
    vi.doMock('../../utils/sanitize.js', () => ({
      validateProjectPath: vi.fn().mockResolvedValue('/test/project'),
    }));

    vi.doMock('../../plugins/signals.js', () => ({
      detectProjectSignals: vi.fn().mockResolvedValue([]),
    }));

    vi.doMock('../../plugins/registry.js', () => ({
      getPluginRecommendations: vi.fn().mockReturnValue([]),
      parsePluginfile: vi.fn().mockReturnValue(['fastlane-plugin-versioning']),
      filterInstalledPlugins: vi.fn().mockImplementation((recs) => recs),
    }));

    vi.doMock('../../discovery/analyze.js', () => ({
      listProjectFiles: vi.fn().mockResolvedValue([]),
    }));

    vi.doMock('../../discovery/capabilities.js', () => ({
      detectCapabilitiesFromFiles: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      detectCapabilitiesFromFastfile: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      mergeCapabilities: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      createEmptyCapabilities: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
    }));

    // Mock fs.readFile to return Pluginfile content
    const fsMock = await import('fs');
    vi.mocked(fsMock.promises.readFile).mockImplementation(async (filepath: unknown) => {
      const pathStr = String(filepath);
      if (pathStr.includes('Pluginfile')) {
        return "gem 'fastlane-plugin-versioning'";
      }
      throw new Error('ENOENT');
    });

    const { handleResearchPlugins } = await import('../plugins.js');
    const result = await handleResearchPlugins({
      projectPath: '/test/project',
      includeInstalled: true,
    });

    expect(result.content[0].text).toContain('Already Installed');
    expect(result.content[0].text).toContain('fastlane-plugin-versioning');
    expect(result.content[0].text).toContain('already in Pluginfile');
  });

  it('should show no recommendations message when none found', async () => {
    vi.doMock('../../utils/sanitize.js', () => ({
      validateProjectPath: vi.fn().mockResolvedValue('/test/project'),
    }));

    vi.doMock('../../plugins/signals.js', () => ({
      detectProjectSignals: vi.fn().mockResolvedValue([]),
    }));

    vi.doMock('../../plugins/registry.js', () => ({
      getPluginRecommendations: vi.fn().mockReturnValue([]),
      parsePluginfile: vi.fn().mockReturnValue([]),
      filterInstalledPlugins: vi.fn().mockImplementation((recs) => recs),
    }));

    vi.doMock('../../discovery/analyze.js', () => ({
      listProjectFiles: vi.fn().mockResolvedValue([]),
    }));

    vi.doMock('../../discovery/capabilities.js', () => ({
      detectCapabilitiesFromFiles: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      detectCapabilitiesFromFastfile: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      mergeCapabilities: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      createEmptyCapabilities: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
    }));

    const { handleResearchPlugins } = await import('../plugins.js');
    const result = await handleResearchPlugins({ projectPath: '/test/project' });

    expect(result.content[0].text).toContain('No plugin recommendations found');
  });

  it('should handle analysis errors gracefully', async () => {
    vi.doMock('../../utils/sanitize.js', () => ({
      validateProjectPath: vi.fn().mockResolvedValue('/test/project'),
    }));

    vi.doMock('../../plugins/signals.js', () => ({
      detectProjectSignals: vi.fn().mockRejectedValue(new Error('Signal detection failed')),
    }));

    vi.doMock('../../discovery/analyze.js', () => ({
      listProjectFiles: vi.fn().mockResolvedValue([]),
    }));

    vi.doMock('../../discovery/capabilities.js', () => ({
      detectCapabilitiesFromFiles: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      detectCapabilitiesFromFastfile: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      mergeCapabilities: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      createEmptyCapabilities: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
    }));

    const { handleResearchPlugins } = await import('../plugins.js');
    const result = await handleResearchPlugins({ projectPath: '/test/project' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error researching plugins');
    expect(result.content[0].text).toContain('Signal detection failed');
  });

  it('should group recommendations by priority', async () => {
    vi.doMock('../../utils/sanitize.js', () => ({
      validateProjectPath: vi.fn().mockResolvedValue('/test/project'),
    }));

    vi.doMock('../../plugins/signals.js', () => ({
      detectProjectSignals: vi.fn().mockResolvedValue([
        { category: 'service', name: 'firebase', source: 'file', confidence: 'high' },
      ]),
    }));

    vi.doMock('../../plugins/registry.js', () => ({
      getPluginRecommendations: vi.fn().mockReturnValue([
        {
          plugin: { name: 'plugin-high', description: 'High priority', source: 'rubygems' },
          reason: 'reason',
          relevantSignals: ['firebase'],
          priority: 'high',
        },
        {
          plugin: { name: 'plugin-medium', description: 'Medium priority', source: 'rubygems' },
          reason: 'reason',
          relevantSignals: ['signal'],
          priority: 'medium',
        },
        {
          plugin: { name: 'plugin-low', description: 'Low priority', source: 'rubygems' },
          reason: 'reason',
          relevantSignals: ['signal'],
          priority: 'low',
        },
      ]),
      parsePluginfile: vi.fn().mockReturnValue([]),
      filterInstalledPlugins: vi.fn().mockImplementation((recs) => recs),
    }));

    vi.doMock('../../discovery/analyze.js', () => ({
      listProjectFiles: vi.fn().mockResolvedValue([]),
    }));

    vi.doMock('../../discovery/capabilities.js', () => ({
      detectCapabilitiesFromFiles: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      detectCapabilitiesFromFastfile: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      mergeCapabilities: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      createEmptyCapabilities: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
    }));

    const { handleResearchPlugins } = await import('../plugins.js');
    const result = await handleResearchPlugins({ projectPath: '/test/project' });

    const text = result.content[0].text;
    expect(text).toContain('### High Priority');
    expect(text).toContain('### Medium Priority');
    expect(text).toContain('### Low Priority');

    // Verify order: High should come before Medium, Medium before Low
    const highIdx = text.indexOf('### High Priority');
    const mediumIdx = text.indexOf('### Medium Priority');
    const lowIdx = text.indexOf('### Low Priority');
    expect(highIdx).toBeLessThan(mediumIdx);
    expect(mediumIdx).toBeLessThan(lowIdx);
  });
});

describe('handleResearchPluginsJson', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return JSON output for valid project', async () => {
    vi.doMock('../../utils/sanitize.js', () => ({
      validateProjectPath: vi.fn().mockResolvedValue('/test/project'),
    }));

    vi.doMock('../../plugins/signals.js', () => ({
      detectProjectSignals: vi.fn().mockResolvedValue([
        { category: 'service', name: 'firebase', source: 'file.plist', confidence: 'high' },
      ]),
    }));

    vi.doMock('../../plugins/registry.js', () => ({
      getPluginRecommendations: vi.fn().mockReturnValue([
        {
          plugin: {
            name: 'fastlane-plugin-firebase_app_distribution',
            description: 'Firebase distribution',
            source: 'rubygems',
            homepage: 'https://github.com/example',
          },
          reason: 'Firebase detected',
          relevantSignals: ['firebase'],
          priority: 'high',
        },
      ]),
      parsePluginfile: vi.fn().mockReturnValue([]),
      filterInstalledPlugins: vi.fn().mockImplementation((recs) => recs),
    }));

    vi.doMock('../../discovery/analyze.js', () => ({
      listProjectFiles: vi.fn().mockResolvedValue([]),
    }));

    vi.doMock('../../discovery/capabilities.js', () => ({
      detectCapabilitiesFromFiles: vi.fn().mockReturnValue({
        platforms: ['ios'], build: ['gym'], distribution: [], metadata: [], signing: [],
      }),
      detectCapabilitiesFromFastfile: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      mergeCapabilities: vi.fn().mockReturnValue({
        platforms: ['ios'], build: ['gym'], distribution: [], metadata: [], signing: [],
      }),
      createEmptyCapabilities: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
    }));

    const { handleResearchPluginsJson } = await import('../plugins.js');
    const result = await handleResearchPluginsJson({ projectPath: '/test/project' });

    expect(result.isError).toBeUndefined();

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.recommendations).toHaveLength(1);
    expect(parsed.recommendations[0].name).toBe('fastlane-plugin-firebase_app_distribution');
    expect(parsed.recommendations[0].priority).toBe('high');
    expect(parsed.recommendations[0].installCommand).toBe(
      "gem 'fastlane-plugin-firebase_app_distribution'"
    );
    expect(parsed.signals).toHaveLength(1);
    expect(parsed.signals[0].name).toBe('firebase');
    expect(parsed.capabilities.platforms).toContain('ios');
    expect(parsed.capabilities.build).toContain('gym');
  });

  it('should return JSON error for invalid path', async () => {
    vi.doMock('../../utils/sanitize.js', () => ({
      validateProjectPath: vi.fn().mockRejectedValue(
        Object.assign(new Error('Path does not exist'), { name: 'ValidationError' })
      ),
    }));

    const { handleResearchPluginsJson } = await import('../plugins.js');
    const result = await handleResearchPluginsJson({ projectPath: '/nonexistent' });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('Path does not exist');
  });

  it('should return JSON error for analysis failures', async () => {
    vi.doMock('../../utils/sanitize.js', () => ({
      validateProjectPath: vi.fn().mockResolvedValue('/test/project'),
    }));

    vi.doMock('../../plugins/signals.js', () => ({
      detectProjectSignals: vi.fn().mockRejectedValue(new Error('Analysis failed')),
    }));

    vi.doMock('../../discovery/analyze.js', () => ({
      listProjectFiles: vi.fn().mockResolvedValue([]),
    }));

    vi.doMock('../../discovery/capabilities.js', () => ({
      detectCapabilitiesFromFiles: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      detectCapabilitiesFromFastfile: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      mergeCapabilities: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      createEmptyCapabilities: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
    }));

    const { handleResearchPluginsJson } = await import('../plugins.js');
    const result = await handleResearchPluginsJson({ projectPath: '/test/project' });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe('Analysis failed');
  });

  it('should include installed plugins in JSON output', async () => {
    vi.doMock('../../utils/sanitize.js', () => ({
      validateProjectPath: vi.fn().mockResolvedValue('/test/project'),
    }));

    vi.doMock('../../plugins/signals.js', () => ({
      detectProjectSignals: vi.fn().mockResolvedValue([]),
    }));

    vi.doMock('../../plugins/registry.js', () => ({
      getPluginRecommendations: vi.fn().mockReturnValue([]),
      parsePluginfile: vi.fn().mockReturnValue([
        'fastlane-plugin-versioning',
        'fastlane-plugin-badge',
      ]),
      filterInstalledPlugins: vi.fn().mockImplementation((recs) => recs),
    }));

    vi.doMock('../../discovery/analyze.js', () => ({
      listProjectFiles: vi.fn().mockResolvedValue([]),
    }));

    vi.doMock('../../discovery/capabilities.js', () => ({
      detectCapabilitiesFromFiles: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      detectCapabilitiesFromFastfile: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      mergeCapabilities: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
      createEmptyCapabilities: vi.fn().mockReturnValue({
        platforms: [], build: [], distribution: [], metadata: [], signing: [],
      }),
    }));

    // Mock fs.readFile to return Pluginfile content
    const fsMock = await import('fs');
    vi.mocked(fsMock.promises.readFile).mockImplementation(async (filepath: unknown) => {
      const pathStr = String(filepath);
      if (pathStr.includes('Pluginfile')) {
        return "gem 'fastlane-plugin-versioning'\ngem 'fastlane-plugin-badge'";
      }
      throw new Error('ENOENT');
    });

    const { handleResearchPluginsJson } = await import('../plugins.js');
    const result = await handleResearchPluginsJson({ projectPath: '/test/project' });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.installedPlugins).toHaveLength(2);
    expect(parsed.installedPlugins).toContain('fastlane-plugin-versioning');
    expect(parsed.installedPlugins).toContain('fastlane-plugin-badge');
  });
});
