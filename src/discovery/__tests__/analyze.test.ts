import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('detectSigningMethod', () => {
  it('should detect match signing from Matchfile', async () => {
    const { detectSigningMethod } = await import('../analyze.js');

    const files = ['fastlane/Matchfile', 'ios/App.xcodeproj'];
    const method = detectSigningMethod(files, 'ios');

    expect(method).toBe('match');
  });

  it('should detect manual signing from exportOptions.plist', async () => {
    const { detectSigningMethod } = await import('../analyze.js');

    const files = ['ios/App.xcodeproj', 'ios/exportOptions.plist'];
    const method = detectSigningMethod(files, 'ios');

    expect(method).toBe('manual');
  });

  it('should detect manual signing from mobileprovision file', async () => {
    const { detectSigningMethod } = await import('../analyze.js');

    const files = ['ios/App.xcodeproj', 'profiles/MyApp.mobileprovision'];
    const method = detectSigningMethod(files, 'ios');

    expect(method).toBe('manual');
  });

  it('should return unknown when no signing indicators found for iOS', async () => {
    const { detectSigningMethod } = await import('../analyze.js');

    const files = ['ios/App.xcodeproj', 'fastlane/Fastfile'];
    const method = detectSigningMethod(files, 'ios');

    expect(method).toBe('unknown');
  });

  it('should detect manual signing for Android from keystore', async () => {
    const { detectSigningMethod } = await import('../analyze.js');

    const files = ['android/app/build.gradle', 'android/release.keystore'];
    const method = detectSigningMethod(files, 'android');

    expect(method).toBe('manual');
  });

  it('should detect manual signing for Android from jks file', async () => {
    const { detectSigningMethod } = await import('../analyze.js');

    const files = ['android/app/build.gradle', 'keystore/release.jks'];
    const method = detectSigningMethod(files, 'android');

    expect(method).toBe('manual');
  });

  it('should return unknown when no signing indicators found for Android', async () => {
    const { detectSigningMethod } = await import('../analyze.js');

    const files = ['android/app/build.gradle', 'fastlane/Fastfile'];
    const method = detectSigningMethod(files, 'android');

    expect(method).toBe('unknown');
  });

  it('should prioritize match over manual for iOS', async () => {
    const { detectSigningMethod } = await import('../analyze.js');

    // Both Matchfile and manual indicators present
    const files = [
      'fastlane/Matchfile',
      'ios/App.xcodeproj',
      'ios/exportOptions.plist',
    ];
    const method = detectSigningMethod(files, 'ios');

    expect(method).toBe('match');
  });
});

describe('detectDestinations', () => {
  it('should detect TestFlight from pilot capability', async () => {
    const { detectDestinations } = await import('../analyze.js');

    const capabilities = {
      platforms: ['ios'] as ('ios' | 'android')[],
      build: ['gym'],
      distribution: ['pilot'],
      metadata: [],
      signing: [],
    };

    const destinations = detectDestinations(capabilities, 'ios');

    expect(destinations).toContain('testflight');
  });

  it('should detect App Store from deliver capability', async () => {
    const { detectDestinations } = await import('../analyze.js');

    const capabilities = {
      platforms: ['ios'] as ('ios' | 'android')[],
      build: ['gym'],
      distribution: ['deliver'],
      metadata: [],
      signing: [],
    };

    const destinations = detectDestinations(capabilities, 'ios');

    expect(destinations).toContain('app_store');
  });

  it('should detect Play Store from supply capability', async () => {
    const { detectDestinations } = await import('../analyze.js');

    const capabilities = {
      platforms: ['android'] as ('ios' | 'android')[],
      build: ['gradle'],
      distribution: ['supply'],
      metadata: [],
      signing: [],
    };

    const destinations = detectDestinations(capabilities, 'android');

    expect(destinations).toContain('play_store');
  });

  it('should detect Firebase for iOS', async () => {
    const { detectDestinations } = await import('../analyze.js');

    const capabilities = {
      platforms: ['ios'] as ('ios' | 'android')[],
      build: ['gym'],
      distribution: ['firebase_app_distribution'],
      metadata: [],
      signing: [],
    };

    const destinations = detectDestinations(capabilities, 'ios');

    expect(destinations).toContain('firebase');
  });

  it('should detect Firebase for Android', async () => {
    const { detectDestinations } = await import('../analyze.js');

    const capabilities = {
      platforms: ['android'] as ('ios' | 'android')[],
      build: ['gradle'],
      distribution: ['firebase_app_distribution'],
      metadata: [],
      signing: [],
    };

    const destinations = detectDestinations(capabilities, 'android');

    expect(destinations).toContain('firebase');
  });

  it('should detect multiple destinations', async () => {
    const { detectDestinations } = await import('../analyze.js');

    const capabilities = {
      platforms: ['ios'] as ('ios' | 'android')[],
      build: ['gym'],
      distribution: ['pilot', 'deliver', 'firebase_app_distribution'],
      metadata: [],
      signing: [],
    };

    const destinations = detectDestinations(capabilities, 'ios');

    expect(destinations).toContain('testflight');
    expect(destinations).toContain('app_store');
    expect(destinations).toContain('firebase');
    expect(destinations).toHaveLength(3);
  });

  it('should return empty array when no distribution capabilities', async () => {
    const { detectDestinations } = await import('../analyze.js');

    const capabilities = {
      platforms: ['ios'] as ('ios' | 'android')[],
      build: ['gym'],
      distribution: [],
      metadata: [],
      signing: [],
    };

    const destinations = detectDestinations(capabilities, 'ios');

    expect(destinations).toEqual([]);
  });

  it('should not include iOS destinations for Android platform', async () => {
    const { detectDestinations } = await import('../analyze.js');

    const capabilities = {
      platforms: ['ios', 'android'] as ('ios' | 'android')[],
      build: ['gym', 'gradle'],
      distribution: ['pilot', 'deliver', 'supply'],
      metadata: [],
      signing: [],
    };

    const destinations = detectDestinations(capabilities, 'android');

    expect(destinations).toContain('play_store');
    expect(destinations).not.toContain('testflight');
    expect(destinations).not.toContain('app_store');
  });
});

describe('generateSuggestedActions', () => {
  it('should suggest gym build action', async () => {
    const { generateSuggestedActions } = await import('../analyze.js');

    const capabilities = {
      platforms: ['ios'] as ('ios' | 'android')[],
      build: ['gym'],
      distribution: [],
      metadata: [],
      signing: [],
    };

    const actions = generateSuggestedActions(capabilities);

    expect(actions).toContain('Build iOS app with gym');
  });

  it('should suggest gradle build action', async () => {
    const { generateSuggestedActions } = await import('../analyze.js');

    const capabilities = {
      platforms: ['android'] as ('ios' | 'android')[],
      build: ['gradle'],
      distribution: [],
      metadata: [],
      signing: [],
    };

    const actions = generateSuggestedActions(capabilities);

    expect(actions).toContain('Build Android app with gradle');
  });

  it('should suggest scan test action', async () => {
    const { generateSuggestedActions } = await import('../analyze.js');

    const capabilities = {
      platforms: ['ios'] as ('ios' | 'android')[],
      build: ['scan'],
      distribution: [],
      metadata: [],
      signing: [],
    };

    const actions = generateSuggestedActions(capabilities);

    expect(actions).toContain('Run tests with scan');
  });

  it('should suggest snapshot action', async () => {
    const { generateSuggestedActions } = await import('../analyze.js');

    const capabilities = {
      platforms: ['ios'] as ('ios' | 'android')[],
      build: ['snapshot'],
      distribution: [],
      metadata: [],
      signing: [],
    };

    const actions = generateSuggestedActions(capabilities);

    expect(actions).toContain('Capture screenshots with snapshot');
  });

  it('should suggest TestFlight upload action', async () => {
    const { generateSuggestedActions } = await import('../analyze.js');

    const capabilities = {
      platforms: ['ios'] as ('ios' | 'android')[],
      build: [],
      distribution: ['pilot'],
      metadata: [],
      signing: [],
    };

    const actions = generateSuggestedActions(capabilities);

    expect(actions).toContain('Upload to TestFlight');
  });

  it('should suggest App Store upload action', async () => {
    const { generateSuggestedActions } = await import('../analyze.js');

    const capabilities = {
      platforms: ['ios'] as ('ios' | 'android')[],
      build: [],
      distribution: ['deliver'],
      metadata: [],
      signing: [],
    };

    const actions = generateSuggestedActions(capabilities);

    expect(actions).toContain('Upload to App Store');
  });

  it('should suggest Play Store upload action', async () => {
    const { generateSuggestedActions } = await import('../analyze.js');

    const capabilities = {
      platforms: ['android'] as ('ios' | 'android')[],
      build: [],
      distribution: ['supply'],
      metadata: [],
      signing: [],
    };

    const actions = generateSuggestedActions(capabilities);

    expect(actions).toContain('Upload to Play Store');
  });

  it('should suggest Firebase distribution action', async () => {
    const { generateSuggestedActions } = await import('../analyze.js');

    const capabilities = {
      platforms: ['ios'] as ('ios' | 'android')[],
      build: [],
      distribution: ['firebase_app_distribution'],
      metadata: [],
      signing: [],
    };

    const actions = generateSuggestedActions(capabilities);

    expect(actions).toContain('Distribute via Firebase App Distribution');
  });

  it('should suggest match sync action', async () => {
    const { generateSuggestedActions } = await import('../analyze.js');

    const capabilities = {
      platforms: ['ios'] as ('ios' | 'android')[],
      build: [],
      distribution: [],
      metadata: [],
      signing: ['match'],
    };

    const actions = generateSuggestedActions(capabilities);

    expect(actions).toContain('Sync certificates with match');
  });

  it('should suggest metadata upload action', async () => {
    const { generateSuggestedActions } = await import('../analyze.js');

    const capabilities = {
      platforms: ['ios'] as ('ios' | 'android')[],
      build: [],
      distribution: [],
      metadata: ['deliver'],
      signing: [],
    };

    const actions = generateSuggestedActions(capabilities);

    expect(actions).toContain('Upload App Store metadata');
  });

  it('should suggest frameit action', async () => {
    const { generateSuggestedActions } = await import('../analyze.js');

    const capabilities = {
      platforms: ['ios'] as ('ios' | 'android')[],
      build: [],
      distribution: [],
      metadata: ['frameit'],
      signing: [],
    };

    const actions = generateSuggestedActions(capabilities);

    expect(actions).toContain('Frame screenshots with frameit');
  });

  it('should generate multiple actions based on full capabilities', async () => {
    const { generateSuggestedActions } = await import('../analyze.js');

    const capabilities = {
      platforms: ['ios'] as ('ios' | 'android')[],
      build: ['gym', 'snapshot'],
      distribution: ['pilot'],
      metadata: ['deliver'],
      signing: ['match'],
    };

    const actions = generateSuggestedActions(capabilities);

    expect(actions).toContain('Build iOS app with gym');
    expect(actions).toContain('Capture screenshots with snapshot');
    expect(actions).toContain('Upload to TestFlight');
    expect(actions).toContain('Sync certificates with match');
    expect(actions).toContain('Upload App Store metadata');
  });

  it('should return empty array when no capabilities', async () => {
    const { generateSuggestedActions } = await import('../analyze.js');

    const capabilities = {
      platforms: [] as ('ios' | 'android')[],
      build: [],
      distribution: [],
      metadata: [],
      signing: [],
    };

    const actions = generateSuggestedActions(capabilities);

    expect(actions).toEqual([]);
  });
});

describe('listProjectFiles', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should list files in a directory', async () => {
    const mockReaddir = vi.fn().mockResolvedValue([
      { name: 'Fastfile', isDirectory: () => false },
      { name: 'Appfile', isDirectory: () => false },
    ]);

    vi.doMock('fs', () => ({
      promises: {
        readdir: mockReaddir,
      },
    }));

    const { listProjectFiles } = await import('../analyze.js');
    const files = await listProjectFiles('/test/project');

    expect(files).toContain('Fastfile');
    expect(files).toContain('Appfile');
  });

  it('should skip node_modules and .git directories', async () => {
    const mockReaddir = vi.fn().mockImplementation((dir) => {
      if (dir === '/test/project') {
        return Promise.resolve([
          { name: 'src', isDirectory: () => true },
          { name: 'node_modules', isDirectory: () => true },
          { name: '.git', isDirectory: () => true },
        ]);
      }
      if (dir === '/test/project/src') {
        return Promise.resolve([
          { name: 'index.ts', isDirectory: () => false },
        ]);
      }
      return Promise.resolve([]);
    });

    vi.doMock('fs', () => ({
      promises: {
        readdir: mockReaddir,
      },
    }));

    const { listProjectFiles } = await import('../analyze.js');
    const files = await listProjectFiles('/test/project');

    expect(files).toContain('src/');
    expect(files).toContain('src/index.ts');
    expect(files).not.toContain('node_modules/');
    expect(files).not.toContain('.git/');
  });

  it('should handle directory read errors gracefully', async () => {
    const mockReaddir = vi.fn().mockRejectedValue(new Error('Permission denied'));

    vi.doMock('fs', () => ({
      promises: {
        readdir: mockReaddir,
      },
    }));

    const { listProjectFiles } = await import('../analyze.js');
    const files = await listProjectFiles('/test/project');

    expect(files).toEqual([]);
  });
});

describe('analyzeProject', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return correct structure for empty project', async () => {
    vi.doMock('fs', () => ({
      promises: {
        readdir: vi.fn().mockResolvedValue([]),
        readFile: vi.fn().mockRejectedValue({ code: 'ENOENT' }),
      },
    }));

    const { analyzeProject } = await import('../analyze.js');
    const analysis = await analyzeProject('/empty/project');

    expect(analysis).toHaveProperty('platforms');
    expect(analysis).toHaveProperty('environment');
    expect(analysis).toHaveProperty('capabilities');
    expect(analysis).toHaveProperty('suggestedActions');
    expect(analysis.platforms).toEqual([]);
    expect(analysis.environment.status).toBe('ready');
  });

  it('should detect iOS platform and analyze correctly', async () => {
    vi.doMock('fs', () => ({
      promises: {
        readdir: vi.fn().mockImplementation((dir, opts) => {
          if (dir.endsWith('/test/project')) {
            return Promise.resolve([
              { name: 'ios', isDirectory: () => true },
              { name: 'fastlane', isDirectory: () => true },
            ]);
          }
          if (dir.endsWith('ios')) {
            return Promise.resolve([
              { name: 'App.xcodeproj', isDirectory: () => true },
            ]);
          }
          if (dir.endsWith('fastlane')) {
            return Promise.resolve([
              { name: 'Fastfile', isDirectory: () => false },
              { name: 'Matchfile', isDirectory: () => false },
            ]);
          }
          return Promise.resolve([]);
        }),
        readFile: vi.fn().mockImplementation((path) => {
          if (path.includes('Fastfile')) {
            return Promise.resolve(`
              platform :ios do
                desc "Build the app"
                lane :build do
                  gym
                end

                lane :beta do
                  pilot
                end
              end
            `);
          }
          return Promise.reject({ code: 'ENOENT' });
        }),
      },
    }));

    const { analyzeProject } = await import('../analyze.js');
    const analysis = await analyzeProject('/test/project');

    expect(analysis.platforms).toContain('ios');
    expect(analysis.ios).toBeDefined();
    expect(analysis.ios?.signing).toBe('match');
    expect(analysis.ios?.destinations).toContain('testflight');
    expect(analysis.capabilities.build).toContain('gym');
    expect(analysis.capabilities.distribution).toContain('pilot');
  });

  it('should detect Android platform and analyze correctly', async () => {
    vi.doMock('fs', () => ({
      promises: {
        readdir: vi.fn().mockImplementation((dir, opts) => {
          if (dir.endsWith('/test/project')) {
            return Promise.resolve([
              { name: 'android', isDirectory: () => true },
              { name: 'fastlane', isDirectory: () => true },
            ]);
          }
          if (dir.endsWith('android')) {
            return Promise.resolve([
              { name: 'build.gradle', isDirectory: () => false },
              { name: 'release.keystore', isDirectory: () => false },
            ]);
          }
          if (dir.endsWith('fastlane')) {
            return Promise.resolve([
              { name: 'Fastfile', isDirectory: () => false },
            ]);
          }
          return Promise.resolve([]);
        }),
        readFile: vi.fn().mockImplementation((path) => {
          if (path.includes('Fastfile')) {
            return Promise.resolve(`
              platform :android do
                lane :build do
                  gradle(task: "assembleRelease")
                end

                lane :deploy do
                  supply
                end
              end
            `);
          }
          return Promise.reject({ code: 'ENOENT' });
        }),
      },
    }));

    const { analyzeProject } = await import('../analyze.js');
    const analysis = await analyzeProject('/test/project');

    expect(analysis.platforms).toContain('android');
    expect(analysis.android).toBeDefined();
    expect(analysis.android?.signing).toBe('manual');
    expect(analysis.android?.destinations).toContain('play_store');
    expect(analysis.capabilities.build).toContain('gradle');
    expect(analysis.capabilities.distribution).toContain('supply');
  });

  it('should detect both platforms in cross-platform project', async () => {
    vi.doMock('fs', () => ({
      promises: {
        readdir: vi.fn().mockImplementation((dir, opts) => {
          if (dir.endsWith('/test/project')) {
            return Promise.resolve([
              { name: 'ios', isDirectory: () => true },
              { name: 'android', isDirectory: () => true },
            ]);
          }
          if (dir.endsWith('ios')) {
            return Promise.resolve([
              { name: 'App.xcodeproj', isDirectory: () => true },
            ]);
          }
          if (dir.endsWith('android')) {
            return Promise.resolve([
              { name: 'build.gradle', isDirectory: () => false },
            ]);
          }
          return Promise.resolve([]);
        }),
        readFile: vi.fn().mockRejectedValue({ code: 'ENOENT' }),
      },
    }));

    const { analyzeProject } = await import('../analyze.js');
    const analysis = await analyzeProject('/test/project');

    expect(analysis.platforms).toContain('ios');
    expect(analysis.platforms).toContain('android');
    expect(analysis.ios).toBeDefined();
    expect(analysis.android).toBeDefined();
  });

  it('should detect metadata directory for iOS', async () => {
    vi.doMock('fs', () => ({
      promises: {
        readdir: vi.fn().mockImplementation((dir, opts) => {
          if (dir.endsWith('/test/project')) {
            return Promise.resolve([
              { name: 'ios', isDirectory: () => true },
              { name: 'fastlane', isDirectory: () => true },
            ]);
          }
          if (dir.endsWith('ios')) {
            return Promise.resolve([
              { name: 'App.xcodeproj', isDirectory: () => true },
            ]);
          }
          if (dir.endsWith('fastlane')) {
            return Promise.resolve([
              { name: 'metadata', isDirectory: () => true },
              { name: 'Fastfile', isDirectory: () => false },
            ]);
          }
          return Promise.resolve([]);
        }),
        readFile: vi.fn().mockRejectedValue({ code: 'ENOENT' }),
      },
    }));

    const { analyzeProject } = await import('../analyze.js');
    const analysis = await analyzeProject('/test/project');

    expect(analysis.ios?.hasMetadata).toBe(true);
  });

  it('should detect Deliverfile for metadata', async () => {
    vi.doMock('fs', () => ({
      promises: {
        readdir: vi.fn().mockImplementation((dir, opts) => {
          if (dir.endsWith('/test/project')) {
            return Promise.resolve([
              { name: 'ios', isDirectory: () => true },
              { name: 'fastlane', isDirectory: () => true },
            ]);
          }
          if (dir.endsWith('ios')) {
            return Promise.resolve([
              { name: 'App.xcodeproj', isDirectory: () => true },
            ]);
          }
          if (dir.endsWith('fastlane')) {
            return Promise.resolve([
              { name: 'Deliverfile', isDirectory: () => false },
            ]);
          }
          return Promise.resolve([]);
        }),
        readFile: vi.fn().mockRejectedValue({ code: 'ENOENT' }),
      },
    }));

    const { analyzeProject } = await import('../analyze.js');
    const analysis = await analyzeProject('/test/project');

    expect(analysis.ios?.hasMetadata).toBe(true);
  });

  it('should filter lanes by platform', async () => {
    vi.doMock('fs', () => ({
      promises: {
        readdir: vi.fn().mockImplementation((dir, opts) => {
          if (dir.endsWith('/test/project')) {
            return Promise.resolve([
              { name: 'ios', isDirectory: () => true },
              { name: 'android', isDirectory: () => true },
              { name: 'fastlane', isDirectory: () => true },
            ]);
          }
          if (dir.endsWith('ios')) {
            return Promise.resolve([
              { name: 'App.xcodeproj', isDirectory: () => true },
            ]);
          }
          if (dir.endsWith('android')) {
            return Promise.resolve([
              { name: 'build.gradle', isDirectory: () => false },
            ]);
          }
          if (dir.endsWith('fastlane')) {
            return Promise.resolve([
              { name: 'Fastfile', isDirectory: () => false },
            ]);
          }
          return Promise.resolve([]);
        }),
        readFile: vi.fn().mockImplementation((path) => {
          if (path.includes('Fastfile')) {
            return Promise.resolve(`
              platform :ios do
                lane :ios_build do
                  gym
                end
              end

              platform :android do
                lane :android_build do
                  gradle
                end
              end

              lane :shared_lane do
                puts "shared"
              end
            `);
          }
          return Promise.reject({ code: 'ENOENT' });
        }),
      },
    }));

    const { analyzeProject } = await import('../analyze.js');
    const analysis = await analyzeProject('/test/project');

    // iOS lanes should include ios_build and shared_lane
    const iosLaneNames = analysis.ios?.lanes.map(l => l.name) || [];
    expect(iosLaneNames).toContain('ios_build');
    expect(iosLaneNames).toContain('shared_lane');
    expect(iosLaneNames).not.toContain('android_build');

    // Android lanes should include android_build and shared_lane
    const androidLaneNames = analysis.android?.lanes.map(l => l.name) || [];
    expect(androidLaneNames).toContain('android_build');
    expect(androidLaneNames).toContain('shared_lane');
    expect(androidLaneNames).not.toContain('ios_build');
  });
});

describe('ProjectAnalysis interface', () => {
  it('should have correct structure', async () => {
    vi.doMock('fs', () => ({
      promises: {
        readdir: vi.fn().mockResolvedValue([]),
        readFile: vi.fn().mockRejectedValue({ code: 'ENOENT' }),
      },
    }));

    const { analyzeProject } = await import('../analyze.js');
    const analysis = await analyzeProject('/test/project');

    // Verify top-level structure
    expect(analysis).toHaveProperty('platforms');
    expect(analysis).toHaveProperty('environment');
    expect(analysis).toHaveProperty('capabilities');
    expect(analysis).toHaveProperty('suggestedActions');

    // Verify environment structure
    expect(analysis.environment).toHaveProperty('status');
    expect(analysis.environment).toHaveProperty('issues');
    expect(Array.isArray(analysis.environment.issues)).toBe(true);

    // Verify capabilities structure
    expect(analysis.capabilities).toHaveProperty('platforms');
    expect(analysis.capabilities).toHaveProperty('build');
    expect(analysis.capabilities).toHaveProperty('distribution');
    expect(analysis.capabilities).toHaveProperty('metadata');
    expect(analysis.capabilities).toHaveProperty('signing');

    // Verify types
    expect(Array.isArray(analysis.platforms)).toBe(true);
    expect(Array.isArray(analysis.suggestedActions)).toBe(true);
  });
});

describe('PlatformAnalysis interface', () => {
  it('should have correct structure when platform is detected', async () => {
    vi.doMock('fs', () => ({
      promises: {
        readdir: vi.fn().mockImplementation((dir, opts) => {
          if (dir.endsWith('/test/project')) {
            return Promise.resolve([
              { name: 'ios', isDirectory: () => true },
            ]);
          }
          if (dir.endsWith('ios')) {
            return Promise.resolve([
              { name: 'App.xcodeproj', isDirectory: () => true },
            ]);
          }
          return Promise.resolve([]);
        }),
        readFile: vi.fn().mockRejectedValue({ code: 'ENOENT' }),
      },
    }));

    const { analyzeProject } = await import('../analyze.js');
    const analysis = await analyzeProject('/test/project');

    expect(analysis.ios).toBeDefined();
    expect(analysis.ios).toHaveProperty('lanes');
    expect(analysis.ios).toHaveProperty('signing');
    expect(analysis.ios).toHaveProperty('destinations');
    expect(analysis.ios).toHaveProperty('hasMetadata');

    expect(Array.isArray(analysis.ios?.lanes)).toBe(true);
    expect(Array.isArray(analysis.ios?.destinations)).toBe(true);
    expect(typeof analysis.ios?.hasMetadata).toBe('boolean');
    expect(['match', 'manual', 'unknown']).toContain(analysis.ios?.signing);
  });
});
