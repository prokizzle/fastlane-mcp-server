import { describe, it, expect } from 'vitest';
import type { ProjectSignal } from '../signals.js';
import type { ProjectCapabilities } from '../../discovery/capabilities.js';

describe('PluginInfo interface', () => {
  it('should have correct structure', async () => {
    const { getPluginInfo } = await import('../registry.js');

    const plugin = getPluginInfo('fastlane-plugin-firebase_app_distribution');

    expect(plugin).not.toBeNull();
    expect(plugin).toHaveProperty('name');
    expect(plugin).toHaveProperty('description');
    expect(plugin).toHaveProperty('source');
    expect(typeof plugin!.name).toBe('string');
    expect(typeof plugin!.description).toBe('string');
    expect(['rubygems', 'local', 'git']).toContain(plugin!.source);
  });
});

describe('getPluginInfo', () => {
  it('should return plugin info for known plugin', async () => {
    const { getPluginInfo } = await import('../registry.js');

    const plugin = getPluginInfo('fastlane-plugin-firebase_app_distribution');

    expect(plugin).not.toBeNull();
    expect(plugin!.name).toBe('fastlane-plugin-firebase_app_distribution');
    expect(plugin!.description).toContain('Firebase');
    expect(plugin!.source).toBe('rubygems');
  });

  it('should return null for unknown plugin', async () => {
    const { getPluginInfo } = await import('../registry.js');

    const plugin = getPluginInfo('fastlane-plugin-nonexistent');

    expect(plugin).toBeNull();
  });

  it('should return info for fastlane-plugin-versioning', async () => {
    const { getPluginInfo } = await import('../registry.js');

    const plugin = getPluginInfo('fastlane-plugin-versioning');

    expect(plugin).not.toBeNull();
    expect(plugin!.name).toBe('fastlane-plugin-versioning');
    expect(plugin!.description).toContain('version');
  });

  it('should return info for fastlane-plugin-badge', async () => {
    const { getPluginInfo } = await import('../registry.js');

    const plugin = getPluginInfo('fastlane-plugin-badge');

    expect(plugin).not.toBeNull();
    expect(plugin!.name).toBe('fastlane-plugin-badge');
    expect(plugin!.description).toContain('badge');
  });

  it('should return info for fastlane-plugin-appcenter', async () => {
    const { getPluginInfo } = await import('../registry.js');

    const plugin = getPluginInfo('fastlane-plugin-appcenter');

    expect(plugin).not.toBeNull();
    expect(plugin!.name).toBe('fastlane-plugin-appcenter');
  });
});

describe('searchPlugins', () => {
  it('should find plugins matching keyword', async () => {
    const { searchPlugins } = await import('../registry.js');

    const results = searchPlugins('firebase');

    expect(results.length).toBeGreaterThan(0);
    expect(results.some(p => p.name.includes('firebase'))).toBe(true);
  });

  it('should be case insensitive', async () => {
    const { searchPlugins } = await import('../registry.js');

    const lowerResults = searchPlugins('firebase');
    const upperResults = searchPlugins('FIREBASE');
    const mixedResults = searchPlugins('Firebase');

    expect(lowerResults.length).toBe(upperResults.length);
    expect(lowerResults.length).toBe(mixedResults.length);
  });

  it('should search in description', async () => {
    const { searchPlugins } = await import('../registry.js');

    // Search for a term likely in description
    const results = searchPlugins('distribution');

    expect(results.length).toBeGreaterThan(0);
  });

  it('should return empty array for no matches', async () => {
    const { searchPlugins } = await import('../registry.js');

    const results = searchPlugins('xyznonexistent123');

    expect(results).toEqual([]);
  });

  it('should handle empty query', async () => {
    const { searchPlugins } = await import('../registry.js');

    const results = searchPlugins('');

    // Empty query returns all plugins
    expect(results.length).toBeGreaterThan(0);
  });

  it('should find sentry plugin', async () => {
    const { searchPlugins } = await import('../registry.js');

    const results = searchPlugins('sentry');

    expect(results.length).toBeGreaterThan(0);
    expect(results.some(p => p.name.includes('sentry'))).toBe(true);
  });

  it('should find slack plugin', async () => {
    const { searchPlugins } = await import('../registry.js');

    const results = searchPlugins('slack');

    expect(results.length).toBeGreaterThan(0);
    expect(results.some(p => p.name.includes('slack'))).toBe(true);
  });
});

describe('getPluginRecommendations', () => {
  it('should recommend firebase plugin for firebase signal', async () => {
    const { getPluginRecommendations } = await import('../registry.js');

    const signals: ProjectSignal[] = [
      {
        category: 'service',
        name: 'firebase',
        source: 'GoogleService-Info.plist',
        confidence: 'high',
      },
    ];

    const capabilities: ProjectCapabilities = {
      platforms: ['ios'],
      build: ['gym'],
      distribution: [],
      metadata: [],
      signing: ['match'],
    };

    const recommendations = getPluginRecommendations(signals, capabilities);

    expect(recommendations.length).toBeGreaterThan(0);
    expect(
      recommendations.some(r => r.plugin.name === 'fastlane-plugin-firebase_app_distribution')
    ).toBe(true);
  });

  it('should recommend sentry plugin for sentry signal', async () => {
    const { getPluginRecommendations } = await import('../registry.js');

    const signals: ProjectSignal[] = [
      {
        category: 'service',
        name: 'sentry',
        source: '.sentryclirc',
        confidence: 'high',
      },
    ];

    const capabilities: ProjectCapabilities = {
      platforms: ['ios'],
      build: ['gym'],
      distribution: [],
      metadata: [],
      signing: [],
    };

    const recommendations = getPluginRecommendations(signals, capabilities);

    expect(
      recommendations.some(r => r.plugin.name === 'fastlane-plugin-sentry')
    ).toBe(true);
  });

  it('should recommend appcenter plugin for appcenter signal', async () => {
    const { getPluginRecommendations } = await import('../registry.js');

    const signals: ProjectSignal[] = [
      {
        category: 'service',
        name: 'appcenter',
        source: 'appcenter-config.json',
        confidence: 'high',
      },
    ];

    const capabilities: ProjectCapabilities = {
      platforms: ['android'],
      build: ['gradle'],
      distribution: [],
      metadata: [],
      signing: [],
    };

    const recommendations = getPluginRecommendations(signals, capabilities);

    expect(
      recommendations.some(r => r.plugin.name === 'fastlane-plugin-appcenter')
    ).toBe(true);
  });

  it('should recommend versioning plugin for xcode or gradle', async () => {
    const { getPluginRecommendations } = await import('../registry.js');

    const signals: ProjectSignal[] = [
      {
        category: 'dependency',
        name: 'gradle',
        source: 'build.gradle',
        confidence: 'high',
      },
    ];

    const capabilities: ProjectCapabilities = {
      platforms: ['android'],
      build: ['gradle'],
      distribution: [],
      metadata: [],
      signing: [],
    };

    const recommendations = getPluginRecommendations(signals, capabilities);

    expect(
      recommendations.some(r => r.plugin.name === 'fastlane-plugin-versioning')
    ).toBe(true);
  });

  it('should include reason in recommendation', async () => {
    const { getPluginRecommendations } = await import('../registry.js');

    const signals: ProjectSignal[] = [
      {
        category: 'service',
        name: 'firebase',
        source: 'GoogleService-Info.plist',
        confidence: 'high',
      },
    ];

    const capabilities: ProjectCapabilities = {
      platforms: ['ios'],
      build: [],
      distribution: [],
      metadata: [],
      signing: [],
    };

    const recommendations = getPluginRecommendations(signals, capabilities);

    const firebaseRec = recommendations.find(
      r => r.plugin.name === 'fastlane-plugin-firebase_app_distribution'
    );
    expect(firebaseRec).toBeDefined();
    expect(firebaseRec!.reason).toBeTruthy();
    expect(typeof firebaseRec!.reason).toBe('string');
  });

  it('should include relevant signals in recommendation', async () => {
    const { getPluginRecommendations } = await import('../registry.js');

    const signals: ProjectSignal[] = [
      {
        category: 'service',
        name: 'firebase',
        source: 'GoogleService-Info.plist',
        confidence: 'high',
      },
      {
        category: 'service',
        name: 'crashlytics',
        source: 'GoogleService-Info.plist',
        confidence: 'medium',
      },
    ];

    const capabilities: ProjectCapabilities = {
      platforms: ['ios'],
      build: [],
      distribution: [],
      metadata: [],
      signing: [],
    };

    const recommendations = getPluginRecommendations(signals, capabilities);

    const firebaseRec = recommendations.find(
      r => r.plugin.name === 'fastlane-plugin-firebase_app_distribution'
    );
    expect(firebaseRec).toBeDefined();
    expect(firebaseRec!.relevantSignals).toContain('firebase');
  });

  it('should include priority in recommendation', async () => {
    const { getPluginRecommendations } = await import('../registry.js');

    const signals: ProjectSignal[] = [
      {
        category: 'service',
        name: 'firebase',
        source: 'GoogleService-Info.plist',
        confidence: 'high',
      },
    ];

    const capabilities: ProjectCapabilities = {
      platforms: ['ios'],
      build: [],
      distribution: [],
      metadata: [],
      signing: [],
    };

    const recommendations = getPluginRecommendations(signals, capabilities);

    const firebaseRec = recommendations.find(
      r => r.plugin.name === 'fastlane-plugin-firebase_app_distribution'
    );
    expect(firebaseRec).toBeDefined();
    expect(['high', 'medium', 'low']).toContain(firebaseRec!.priority);
  });

  it('should return empty array when no signals match', async () => {
    const { getPluginRecommendations } = await import('../registry.js');

    const signals: ProjectSignal[] = [];

    const capabilities: ProjectCapabilities = {
      platforms: [],
      build: [],
      distribution: [],
      metadata: [],
      signing: [],
    };

    const recommendations = getPluginRecommendations(signals, capabilities);

    expect(recommendations).toEqual([]);
  });

  it('should recommend based on capabilities', async () => {
    const { getPluginRecommendations } = await import('../registry.js');

    const signals: ProjectSignal[] = [];

    const capabilities: ProjectCapabilities = {
      platforms: ['ios'],
      build: ['gym', 'scan'],
      distribution: ['firebase_app_distribution'],
      metadata: [],
      signing: [],
    };

    const recommendations = getPluginRecommendations(signals, capabilities);

    // Should recommend test_center for scan capability
    expect(
      recommendations.some(r => r.plugin.name === 'fastlane-plugin-test_center')
    ).toBe(true);
  });

  it('should not duplicate recommendations', async () => {
    const { getPluginRecommendations } = await import('../registry.js');

    const signals: ProjectSignal[] = [
      {
        category: 'service',
        name: 'firebase',
        source: 'GoogleService-Info.plist',
        confidence: 'high',
      },
      {
        category: 'service',
        name: 'crashlytics',
        source: 'GoogleService-Info.plist',
        confidence: 'medium',
      },
    ];

    const capabilities: ProjectCapabilities = {
      platforms: ['ios'],
      build: [],
      distribution: ['firebase_app_distribution'],
      metadata: [],
      signing: [],
    };

    const recommendations = getPluginRecommendations(signals, capabilities);

    const firebasePlugins = recommendations.filter(
      r => r.plugin.name === 'fastlane-plugin-firebase_app_distribution'
    );
    expect(firebasePlugins.length).toBeLessThanOrEqual(1);
  });
});

describe('parsePluginfile', () => {
  it('should parse gem declarations from Pluginfile', async () => {
    const { parsePluginfile } = await import('../registry.js');

    const content = `
      # Autogenerated by fastlane
      gem 'fastlane-plugin-firebase_app_distribution'
      gem 'fastlane-plugin-versioning'
    `;

    const plugins = parsePluginfile(content);

    expect(plugins).toContain('fastlane-plugin-firebase_app_distribution');
    expect(plugins).toContain('fastlane-plugin-versioning');
  });

  it('should handle single quotes', async () => {
    const { parsePluginfile } = await import('../registry.js');

    const content = `gem 'fastlane-plugin-badge'`;

    const plugins = parsePluginfile(content);

    expect(plugins).toContain('fastlane-plugin-badge');
  });

  it('should handle double quotes', async () => {
    const { parsePluginfile } = await import('../registry.js');

    const content = `gem "fastlane-plugin-badge"`;

    const plugins = parsePluginfile(content);

    expect(plugins).toContain('fastlane-plugin-badge');
  });

  it('should handle version constraints', async () => {
    const { parsePluginfile } = await import('../registry.js');

    const content = `
      gem 'fastlane-plugin-firebase_app_distribution', '~> 0.7'
      gem 'fastlane-plugin-versioning', '>= 0.5.0'
    `;

    const plugins = parsePluginfile(content);

    expect(plugins).toContain('fastlane-plugin-firebase_app_distribution');
    expect(plugins).toContain('fastlane-plugin-versioning');
  });

  it('should handle git sources', async () => {
    const { parsePluginfile } = await import('../registry.js');

    const content = `
      gem 'fastlane-plugin-custom', git: 'https://github.com/example/fastlane-plugin-custom.git'
    `;

    const plugins = parsePluginfile(content);

    expect(plugins).toContain('fastlane-plugin-custom');
  });

  it('should ignore comments', async () => {
    const { parsePluginfile } = await import('../registry.js');

    const content = `
      # gem 'fastlane-plugin-commented-out'
      gem 'fastlane-plugin-active'
    `;

    const plugins = parsePluginfile(content);

    expect(plugins).not.toContain('fastlane-plugin-commented-out');
    expect(plugins).toContain('fastlane-plugin-active');
  });

  it('should handle empty Pluginfile', async () => {
    const { parsePluginfile } = await import('../registry.js');

    const plugins = parsePluginfile('');

    expect(plugins).toEqual([]);
  });

  it('should handle Pluginfile with only comments', async () => {
    const { parsePluginfile } = await import('../registry.js');

    const content = `
      # Autogenerated by fastlane
      # No plugins installed
    `;

    const plugins = parsePluginfile(content);

    expect(plugins).toEqual([]);
  });

  it('should not duplicate plugin names', async () => {
    const { parsePluginfile } = await import('../registry.js');

    const content = `
      gem 'fastlane-plugin-badge'
      gem 'fastlane-plugin-badge'
    `;

    const plugins = parsePluginfile(content);

    expect(plugins.filter(p => p === 'fastlane-plugin-badge')).toHaveLength(1);
  });
});

describe('filterInstalledPlugins', () => {
  it('should filter out installed plugins from recommendations', async () => {
    const { filterInstalledPlugins, getPluginRecommendations } = await import('../registry.js');

    const signals: ProjectSignal[] = [
      {
        category: 'service',
        name: 'firebase',
        source: 'GoogleService-Info.plist',
        confidence: 'high',
      },
      {
        category: 'service',
        name: 'sentry',
        source: '.sentryclirc',
        confidence: 'high',
      },
    ];

    const capabilities: ProjectCapabilities = {
      platforms: ['ios'],
      build: ['gym'],
      distribution: [],
      metadata: [],
      signing: [],
    };

    const recommendations = getPluginRecommendations(signals, capabilities);
    const installedPlugins = ['fastlane-plugin-firebase_app_distribution'];

    const filtered = filterInstalledPlugins(recommendations, installedPlugins);

    expect(
      filtered.some(r => r.plugin.name === 'fastlane-plugin-firebase_app_distribution')
    ).toBe(false);
    expect(
      filtered.some(r => r.plugin.name === 'fastlane-plugin-sentry')
    ).toBe(true);
  });

  it('should return all recommendations when nothing is installed', async () => {
    const { filterInstalledPlugins, getPluginRecommendations } = await import('../registry.js');

    const signals: ProjectSignal[] = [
      {
        category: 'service',
        name: 'firebase',
        source: 'GoogleService-Info.plist',
        confidence: 'high',
      },
    ];

    const capabilities: ProjectCapabilities = {
      platforms: ['ios'],
      build: [],
      distribution: [],
      metadata: [],
      signing: [],
    };

    const recommendations = getPluginRecommendations(signals, capabilities);
    const filtered = filterInstalledPlugins(recommendations, []);

    expect(filtered.length).toBe(recommendations.length);
  });

  it('should return empty array when all recommended plugins are installed', async () => {
    const { filterInstalledPlugins, getPluginRecommendations } = await import('../registry.js');

    const signals: ProjectSignal[] = [
      {
        category: 'service',
        name: 'firebase',
        source: 'GoogleService-Info.plist',
        confidence: 'high',
      },
    ];

    const capabilities: ProjectCapabilities = {
      platforms: ['ios'],
      build: [],
      distribution: [],
      metadata: [],
      signing: [],
    };

    const recommendations = getPluginRecommendations(signals, capabilities);
    const installedPlugins = recommendations.map(r => r.plugin.name);

    const filtered = filterInstalledPlugins(recommendations, installedPlugins);

    expect(filtered).toEqual([]);
  });

  it('should handle empty recommendations', async () => {
    const { filterInstalledPlugins } = await import('../registry.js');

    const filtered = filterInstalledPlugins([], ['fastlane-plugin-badge']);

    expect(filtered).toEqual([]);
  });
});

describe('PLUGIN_CATALOG completeness', () => {
  it('should include firebase_app_distribution plugin', async () => {
    const { getPluginInfo } = await import('../registry.js');
    expect(getPluginInfo('fastlane-plugin-firebase_app_distribution')).not.toBeNull();
  });

  it('should include appcenter plugin', async () => {
    const { getPluginInfo } = await import('../registry.js');
    expect(getPluginInfo('fastlane-plugin-appcenter')).not.toBeNull();
  });

  it('should include versioning plugin', async () => {
    const { getPluginInfo } = await import('../registry.js');
    expect(getPluginInfo('fastlane-plugin-versioning')).not.toBeNull();
  });

  it('should include badge plugin', async () => {
    const { getPluginInfo } = await import('../registry.js');
    expect(getPluginInfo('fastlane-plugin-badge')).not.toBeNull();
  });

  it('should include changelog plugin', async () => {
    const { getPluginInfo } = await import('../registry.js');
    expect(getPluginInfo('fastlane-plugin-changelog')).not.toBeNull();
  });

  it('should include sonar plugin', async () => {
    const { getPluginInfo } = await import('../registry.js');
    expect(getPluginInfo('fastlane-plugin-sonar')).not.toBeNull();
  });

  it('should include test_center plugin', async () => {
    const { getPluginInfo } = await import('../registry.js');
    expect(getPluginInfo('fastlane-plugin-test_center')).not.toBeNull();
  });

  it('should include slack_upload plugin', async () => {
    const { getPluginInfo } = await import('../registry.js');
    expect(getPluginInfo('fastlane-plugin-slack_upload')).not.toBeNull();
  });

  it('should include jira plugin', async () => {
    const { getPluginInfo } = await import('../registry.js');
    expect(getPluginInfo('fastlane-plugin-jira')).not.toBeNull();
  });

  it('should include sentry plugin', async () => {
    const { getPluginInfo } = await import('../registry.js');
    expect(getPluginInfo('fastlane-plugin-sentry')).not.toBeNull();
  });

  it('should include aws_s3 plugin', async () => {
    const { getPluginInfo } = await import('../registry.js');
    expect(getPluginInfo('fastlane-plugin-aws_s3')).not.toBeNull();
  });

  it('should include xcconfig plugin', async () => {
    const { getPluginInfo } = await import('../registry.js');
    expect(getPluginInfo('fastlane-plugin-xcconfig')).not.toBeNull();
  });

  it('should include match_keychain plugin', async () => {
    const { getPluginInfo } = await import('../registry.js');
    expect(getPluginInfo('fastlane-plugin-match_keychain')).not.toBeNull();
  });
});

describe('PluginRecommendation interface', () => {
  it('should have correct structure', async () => {
    const { getPluginRecommendations } = await import('../registry.js');

    const signals: ProjectSignal[] = [
      {
        category: 'service',
        name: 'firebase',
        source: 'GoogleService-Info.plist',
        confidence: 'high',
      },
    ];

    const capabilities: ProjectCapabilities = {
      platforms: ['ios'],
      build: [],
      distribution: [],
      metadata: [],
      signing: [],
    };

    const recommendations = getPluginRecommendations(signals, capabilities);

    expect(recommendations.length).toBeGreaterThan(0);
    const rec = recommendations[0];

    expect(rec).toHaveProperty('plugin');
    expect(rec).toHaveProperty('reason');
    expect(rec).toHaveProperty('relevantSignals');
    expect(rec).toHaveProperty('priority');

    expect(rec.plugin).toHaveProperty('name');
    expect(rec.plugin).toHaveProperty('description');
    expect(rec.plugin).toHaveProperty('source');
    expect(Array.isArray(rec.relevantSignals)).toBe(true);
    expect(['high', 'medium', 'low']).toContain(rec.priority);
  });
});
