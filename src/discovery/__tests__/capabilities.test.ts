import { describe, it, expect } from 'vitest';

describe('detectCapabilitiesFromFiles', () => {
  it('should detect iOS signing capability from Matchfile', async () => {
    const { detectCapabilitiesFromFiles } = await import('../capabilities.js');

    const files = ['fastlane/Matchfile', 'ios/App.xcodeproj'];
    const capabilities = detectCapabilitiesFromFiles(files);

    expect(capabilities.signing).toContain('match');
    expect(capabilities.platforms).toContain('ios');
  });

  it('should detect distribution capability from Deliverfile', async () => {
    const { detectCapabilitiesFromFiles } = await import('../capabilities.js');

    const files = ['fastlane/Deliverfile', 'fastlane/metadata'];
    const capabilities = detectCapabilitiesFromFiles(files);

    expect(capabilities.distribution).toContain('deliver');
    expect(capabilities.metadata).toContain('deliver');
  });

  it('should detect build capabilities from Gymfile', async () => {
    const { detectCapabilitiesFromFiles } = await import('../capabilities.js');

    const files = ['fastlane/Gymfile'];
    const capabilities = detectCapabilitiesFromFiles(files);

    expect(capabilities.build).toContain('gym');
  });

  it('should detect Android platform', async () => {
    const { detectCapabilitiesFromFiles } = await import('../capabilities.js');

    const files = ['android/build.gradle', 'android/fastlane/Fastfile'];
    const capabilities = detectCapabilitiesFromFiles(files);

    expect(capabilities.platforms).toContain('android');
    expect(capabilities.build).toContain('gradle');
  });

  it('should detect Snapfile for snapshot capability', async () => {
    const { detectCapabilitiesFromFiles } = await import('../capabilities.js');

    const files = ['fastlane/Snapfile'];
    const capabilities = detectCapabilitiesFromFiles(files);

    expect(capabilities.build).toContain('snapshot');
  });

  it('should detect Scanfile for scan capability', async () => {
    const { detectCapabilitiesFromFiles } = await import('../capabilities.js');

    const files = ['fastlane/Scanfile'];
    const capabilities = detectCapabilitiesFromFiles(files);

    expect(capabilities.build).toContain('scan');
  });

  it('should detect Precheckfile for precheck capability', async () => {
    const { detectCapabilitiesFromFiles } = await import('../capabilities.js');

    const files = ['fastlane/Precheckfile'];
    const capabilities = detectCapabilitiesFromFiles(files);

    expect(capabilities.metadata).toContain('precheck');
  });

  it('should detect Appfile for appfile capability', async () => {
    const { detectCapabilitiesFromFiles } = await import('../capabilities.js');

    const files = ['fastlane/Appfile'];
    const capabilities = detectCapabilitiesFromFiles(files);

    expect(capabilities.metadata).toContain('appfile');
  });

  it('should detect iOS platform from xcworkspace', async () => {
    const { detectCapabilitiesFromFiles } = await import('../capabilities.js');

    const files = ['MyApp.xcworkspace/contents.xcworkspacedata'];
    const capabilities = detectCapabilitiesFromFiles(files);

    expect(capabilities.platforms).toContain('ios');
  });

  it('should detect iOS platform from Podfile', async () => {
    const { detectCapabilitiesFromFiles } = await import('../capabilities.js');

    const files = ['Podfile', 'Podfile.lock'];
    const capabilities = detectCapabilitiesFromFiles(files);

    expect(capabilities.platforms).toContain('ios');
  });

  it('should detect Android platform from settings.gradle', async () => {
    const { detectCapabilitiesFromFiles } = await import('../capabilities.js');

    const files = ['settings.gradle', 'app/build.gradle'];
    const capabilities = detectCapabilitiesFromFiles(files);

    expect(capabilities.platforms).toContain('android');
    expect(capabilities.build).toContain('gradle');
  });

  it('should detect Android platform from AndroidManifest.xml', async () => {
    const { detectCapabilitiesFromFiles } = await import('../capabilities.js');

    const files = ['app/src/main/AndroidManifest.xml'];
    const capabilities = detectCapabilitiesFromFiles(files);

    expect(capabilities.platforms).toContain('android');
  });

  it('should detect both platforms in cross-platform project', async () => {
    const { detectCapabilitiesFromFiles } = await import('../capabilities.js');

    const files = [
      'ios/App.xcodeproj/project.pbxproj',
      'android/app/build.gradle',
      'fastlane/Fastfile',
    ];
    const capabilities = detectCapabilitiesFromFiles(files);

    expect(capabilities.platforms).toContain('ios');
    expect(capabilities.platforms).toContain('android');
    expect(capabilities.build).toContain('gradle');
  });

  it('should handle empty file list', async () => {
    const { detectCapabilitiesFromFiles } = await import('../capabilities.js');

    const capabilities = detectCapabilitiesFromFiles([]);

    expect(capabilities.platforms).toEqual([]);
    expect(capabilities.build).toEqual([]);
    expect(capabilities.distribution).toEqual([]);
    expect(capabilities.metadata).toEqual([]);
    expect(capabilities.signing).toEqual([]);
  });

  it('should not duplicate capabilities', async () => {
    const { detectCapabilitiesFromFiles } = await import('../capabilities.js');

    const files = [
      'ios/App.xcodeproj',
      'ios/Another.xcodeproj',
      'fastlane/Matchfile',
      'ios/fastlane/Matchfile',
    ];
    const capabilities = detectCapabilitiesFromFiles(files);

    expect(capabilities.platforms.filter(p => p === 'ios')).toHaveLength(1);
    expect(capabilities.signing.filter(s => s === 'match')).toHaveLength(1);
  });
});

describe('detectCapabilitiesFromFastfile', () => {
  it('should detect capabilities from Fastfile content', async () => {
    const { detectCapabilitiesFromFastfile } = await import('../capabilities.js');

    const content = `
      lane :beta do
        gym(scheme: "MyApp")
        pilot
      end

      lane :release do
        deliver
        slack
      end
    `;

    const capabilities = detectCapabilitiesFromFastfile(content);

    expect(capabilities.build).toContain('gym');
    expect(capabilities.distribution).toContain('pilot');
    expect(capabilities.distribution).toContain('deliver');
  });

  it('should detect build_app as gym alias', async () => {
    const { detectCapabilitiesFromFastfile } = await import('../capabilities.js');

    const content = `
      lane :build do
        build_app(scheme: "MyApp")
      end
    `;

    const capabilities = detectCapabilitiesFromFastfile(content);

    expect(capabilities.build).toContain('gym');
  });

  it('should detect upload_to_testflight as pilot alias', async () => {
    const { detectCapabilitiesFromFastfile } = await import('../capabilities.js');

    const content = `
      lane :beta do
        upload_to_testflight
      end
    `;

    const capabilities = detectCapabilitiesFromFastfile(content);

    expect(capabilities.distribution).toContain('pilot');
  });

  it('should detect upload_to_app_store as deliver alias', async () => {
    const { detectCapabilitiesFromFastfile } = await import('../capabilities.js');

    const content = `
      lane :release do
        upload_to_app_store
      end
    `;

    const capabilities = detectCapabilitiesFromFastfile(content);

    expect(capabilities.distribution).toContain('deliver');
  });

  it('should detect gradle action', async () => {
    const { detectCapabilitiesFromFastfile } = await import('../capabilities.js');

    const content = `
      platform :android do
        lane :build do
          gradle(task: "assembleRelease")
        end
      end
    `;

    const capabilities = detectCapabilitiesFromFastfile(content);

    expect(capabilities.build).toContain('gradle');
  });

  it('should detect supply and upload_to_play_store', async () => {
    const { detectCapabilitiesFromFastfile } = await import('../capabilities.js');

    const content = `
      platform :android do
        lane :release do
          supply
        end
        lane :beta do
          upload_to_play_store(track: "beta")
        end
      end
    `;

    const capabilities = detectCapabilitiesFromFastfile(content);

    expect(capabilities.distribution).toContain('supply');
  });

  it('should detect firebase_app_distribution', async () => {
    const { detectCapabilitiesFromFastfile } = await import('../capabilities.js');

    const content = `
      lane :distribute do
        firebase_app_distribution(
          app: "1:123456789:ios:abcd1234",
          groups: "testers"
        )
      end
    `;

    const capabilities = detectCapabilitiesFromFastfile(content);

    expect(capabilities.distribution).toContain('firebase_app_distribution');
  });

  it('should detect signing capabilities', async () => {
    const { detectCapabilitiesFromFastfile } = await import('../capabilities.js');

    const content = `
      lane :setup_certs do
        match(type: "appstore")
        cert
        sigh(adhoc: true)
        register_devices(devices_file: "./devices.txt")
      end
    `;

    const capabilities = detectCapabilitiesFromFastfile(content);

    expect(capabilities.signing).toContain('match');
    expect(capabilities.signing).toContain('cert');
    expect(capabilities.signing).toContain('sigh');
    expect(capabilities.signing).toContain('register_devices');
  });

  it('should detect sync_code_signing as match alias', async () => {
    const { detectCapabilitiesFromFastfile } = await import('../capabilities.js');

    const content = `
      lane :certs do
        sync_code_signing(type: "development")
      end
    `;

    const capabilities = detectCapabilitiesFromFastfile(content);

    expect(capabilities.signing).toContain('match');
  });

  it('should detect get_certificates as cert alias', async () => {
    const { detectCapabilitiesFromFastfile } = await import('../capabilities.js');

    const content = `
      lane :certs do
        get_certificates
      end
    `;

    const capabilities = detectCapabilitiesFromFastfile(content);

    expect(capabilities.signing).toContain('cert');
  });

  it('should detect get_provisioning_profile as sigh alias', async () => {
    const { detectCapabilitiesFromFastfile } = await import('../capabilities.js');

    const content = `
      lane :profiles do
        get_provisioning_profile(adhoc: true)
      end
    `;

    const capabilities = detectCapabilitiesFromFastfile(content);

    expect(capabilities.signing).toContain('sigh');
  });

  it('should detect scan and run_tests', async () => {
    const { detectCapabilitiesFromFastfile } = await import('../capabilities.js');

    const content = `
      lane :test do
        scan(scheme: "MyAppTests")
      end
      lane :test2 do
        run_tests(scheme: "MyAppTests")
      end
    `;

    const capabilities = detectCapabilitiesFromFastfile(content);

    expect(capabilities.build).toContain('scan');
  });

  it('should detect snapshot and capture_screenshots', async () => {
    const { detectCapabilitiesFromFastfile } = await import('../capabilities.js');

    const content = `
      lane :screenshots do
        snapshot
        capture_screenshots
      end
    `;

    const capabilities = detectCapabilitiesFromFastfile(content);

    expect(capabilities.build).toContain('snapshot');
  });

  it('should detect frameit and frame_screenshots', async () => {
    const { detectCapabilitiesFromFastfile } = await import('../capabilities.js');

    const content = `
      lane :screenshots do
        frameit(white: true)
        frame_screenshots
      end
    `;

    const capabilities = detectCapabilitiesFromFastfile(content);

    expect(capabilities.metadata).toContain('frameit');
  });

  it('should detect precheck', async () => {
    const { detectCapabilitiesFromFastfile } = await import('../capabilities.js');

    const content = `
      lane :validate do
        precheck
      end
    `;

    const capabilities = detectCapabilitiesFromFastfile(content);

    expect(capabilities.metadata).toContain('precheck');
  });

  it('should not detect actions mentioned in comments', async () => {
    const { detectCapabilitiesFromFastfile } = await import('../capabilities.js');

    const content = `
      # This lane used to call gym but now it's disabled
      # gym(scheme: "MyApp")
      lane :build do
        puts "Building..."
      end
    `;

    const capabilities = detectCapabilitiesFromFastfile(content);

    // gym should not be detected from comment
    expect(capabilities.build).not.toContain('gym');
  });

  it('should handle empty Fastfile content', async () => {
    const { detectCapabilitiesFromFastfile } = await import('../capabilities.js');

    const capabilities = detectCapabilitiesFromFastfile('');

    expect(capabilities.platforms).toEqual([]);
    expect(capabilities.build).toEqual([]);
    expect(capabilities.distribution).toEqual([]);
    expect(capabilities.metadata).toEqual([]);
    expect(capabilities.signing).toEqual([]);
  });

  it('should not match partial action names', async () => {
    const { detectCapabilitiesFromFastfile } = await import('../capabilities.js');

    const content = `
      lane :build do
        # gymnasium is not gym
        gymnasium_setup
        my_gym_helper
      end
    `;

    const capabilities = detectCapabilitiesFromFastfile(content);

    expect(capabilities.build).not.toContain('gym');
  });
});

describe('mergeCapabilities', () => {
  it('should merge multiple capability objects', async () => {
    const { mergeCapabilities, createEmptyCapabilities } = await import('../capabilities.js');

    const caps1 = {
      ...createEmptyCapabilities(),
      platforms: ['ios' as const],
      build: ['gym'],
    };

    const caps2 = {
      ...createEmptyCapabilities(),
      platforms: ['android' as const],
      distribution: ['supply'],
    };

    const merged = mergeCapabilities(caps1, caps2);

    expect(merged.platforms).toContain('ios');
    expect(merged.platforms).toContain('android');
    expect(merged.build).toContain('gym');
    expect(merged.distribution).toContain('supply');
  });

  it('should not duplicate items when merging', async () => {
    const { mergeCapabilities, createEmptyCapabilities } = await import('../capabilities.js');

    const caps1 = {
      ...createEmptyCapabilities(),
      platforms: ['ios' as const],
      build: ['gym'],
    };

    const caps2 = {
      ...createEmptyCapabilities(),
      platforms: ['ios' as const],
      build: ['gym', 'scan'],
    };

    const merged = mergeCapabilities(caps1, caps2);

    expect(merged.platforms.filter(p => p === 'ios')).toHaveLength(1);
    expect(merged.build.filter(b => b === 'gym')).toHaveLength(1);
    expect(merged.build).toContain('scan');
  });

  it('should handle merging empty capabilities', async () => {
    const { mergeCapabilities, createEmptyCapabilities } = await import('../capabilities.js');

    const caps1 = createEmptyCapabilities();
    const caps2 = createEmptyCapabilities();

    const merged = mergeCapabilities(caps1, caps2);

    expect(merged.platforms).toEqual([]);
    expect(merged.build).toEqual([]);
    expect(merged.distribution).toEqual([]);
    expect(merged.metadata).toEqual([]);
    expect(merged.signing).toEqual([]);
  });

  it('should merge three or more capability objects', async () => {
    const { mergeCapabilities, createEmptyCapabilities } = await import('../capabilities.js');

    const caps1 = {
      ...createEmptyCapabilities(),
      signing: ['match'],
    };

    const caps2 = {
      ...createEmptyCapabilities(),
      signing: ['cert'],
    };

    const caps3 = {
      ...createEmptyCapabilities(),
      signing: ['sigh'],
    };

    const merged = mergeCapabilities(caps1, caps2, caps3);

    expect(merged.signing).toContain('match');
    expect(merged.signing).toContain('cert');
    expect(merged.signing).toContain('sigh');
  });
});

describe('createEmptyCapabilities', () => {
  it('should create an object with all empty arrays', async () => {
    const { createEmptyCapabilities } = await import('../capabilities.js');

    const capabilities = createEmptyCapabilities();

    expect(capabilities.platforms).toEqual([]);
    expect(capabilities.build).toEqual([]);
    expect(capabilities.distribution).toEqual([]);
    expect(capabilities.metadata).toEqual([]);
    expect(capabilities.signing).toEqual([]);
  });

  it('should create a new object each time', async () => {
    const { createEmptyCapabilities } = await import('../capabilities.js');

    const caps1 = createEmptyCapabilities();
    const caps2 = createEmptyCapabilities();

    caps1.platforms.push('ios');

    expect(caps2.platforms).toEqual([]);
    expect(caps1).not.toBe(caps2);
  });
});

describe('ProjectCapabilities interface', () => {
  it('should have correct structure', async () => {
    const { createEmptyCapabilities } = await import('../capabilities.js');
    const capabilities = createEmptyCapabilities();

    // Verify the structure has all expected properties
    expect(capabilities).toHaveProperty('platforms');
    expect(capabilities).toHaveProperty('build');
    expect(capabilities).toHaveProperty('distribution');
    expect(capabilities).toHaveProperty('metadata');
    expect(capabilities).toHaveProperty('signing');

    // Verify all are arrays
    expect(Array.isArray(capabilities.platforms)).toBe(true);
    expect(Array.isArray(capabilities.build)).toBe(true);
    expect(Array.isArray(capabilities.distribution)).toBe(true);
    expect(Array.isArray(capabilities.metadata)).toBe(true);
    expect(Array.isArray(capabilities.signing)).toBe(true);
  });
});
