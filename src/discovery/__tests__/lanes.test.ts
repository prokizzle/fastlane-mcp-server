import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LaneInfo } from '../lanes.js';

describe('parseLanesFromFastfile', () => {
  it('should parse lanes from Fastfile content', async () => {
    const { parseLanesFromFastfile } = await import('../lanes.js');

    const fastfileContent = `
platform :ios do
  desc "Build the app"
  lane :build do
    gym
  end

  desc "Deploy to TestFlight"
  lane :beta do
    build
    pilot
  end

  private_lane :_setup do
    setup_ci
  end
end

platform :android do
  desc "Build Android"
  lane :build do
    gradle
  end
end

desc "Shared lane"
lane :test do
  scan
end
`;

    const lanes = parseLanesFromFastfile(fastfileContent);

    expect(lanes).toHaveLength(5);

    // iOS build lane
    const iosBuild = lanes.find(l => l.name === 'build' && l.platform === 'ios');
    expect(iosBuild).toBeDefined();
    expect(iosBuild?.description).toBe('Build the app');
    expect(iosBuild?.isPrivate).toBe(false);

    // iOS beta lane
    const iosBeta = lanes.find(l => l.name === 'beta' && l.platform === 'ios');
    expect(iosBeta).toBeDefined();
    expect(iosBeta?.description).toBe('Deploy to TestFlight');
    expect(iosBeta?.isPrivate).toBe(false);

    // iOS private lane
    const iosSetup = lanes.find(l => l.name === '_setup');
    expect(iosSetup).toBeDefined();
    expect(iosSetup?.isPrivate).toBe(true);
    expect(iosSetup?.platform).toBe('ios');

    // Android build lane
    const androidBuild = lanes.find(l => l.name === 'build' && l.platform === 'android');
    expect(androidBuild).toBeDefined();
    expect(androidBuild?.description).toBe('Build Android');
    expect(androidBuild?.platform).toBe('android');

    // Shared lane (no platform)
    const testLane = lanes.find(l => l.name === 'test');
    expect(testLane).toBeDefined();
    expect(testLane?.platform).toBeNull();
    expect(testLane?.description).toBe('Shared lane');
  });

  it('should handle Fastfiles with no lanes', async () => {
    const { parseLanesFromFastfile } = await import('../lanes.js');

    const content = `
# Empty fastfile
fastlane_version "2.0.0"
`;

    const lanes = parseLanesFromFastfile(content);
    expect(lanes).toHaveLength(0);
  });

  it('should handle lanes without descriptions', async () => {
    const { parseLanesFromFastfile } = await import('../lanes.js');

    const content = `
platform :ios do
  lane :deploy do
    gym
    pilot
  end
end
`;

    const lanes = parseLanesFromFastfile(content);
    expect(lanes).toHaveLength(1);
    expect(lanes[0].name).toBe('deploy');
    expect(lanes[0].description).toBeNull();
    expect(lanes[0].platform).toBe('ios');
  });

  it('should handle private_lane keyword', async () => {
    const { parseLanesFromFastfile } = await import('../lanes.js');

    const content = `
platform :ios do
  desc "Internal setup"
  private_lane :setup_environment do
    setup_ci
  end
end
`;

    const lanes = parseLanesFromFastfile(content);
    expect(lanes).toHaveLength(1);
    expect(lanes[0].name).toBe('setup_environment');
    expect(lanes[0].isPrivate).toBe(true);
    expect(lanes[0].description).toBe('Internal setup');
  });

  it('should detect underscore-prefixed lanes as private', async () => {
    const { parseLanesFromFastfile } = await import('../lanes.js');

    const content = `
platform :android do
  lane :_internal_task do
    gradle
  end
end
`;

    const lanes = parseLanesFromFastfile(content);
    expect(lanes).toHaveLength(1);
    expect(lanes[0].name).toBe('_internal_task');
    expect(lanes[0].isPrivate).toBe(true);
  });

  it('should handle double-quoted descriptions', async () => {
    const { parseLanesFromFastfile } = await import('../lanes.js');

    const content = `
platform :ios do
  desc "Build and deploy the app"
  lane :release do
    gym
  end
end
`;

    const lanes = parseLanesFromFastfile(content);
    expect(lanes).toHaveLength(1);
    expect(lanes[0].description).toBe('Build and deploy the app');
  });

  it('should handle single-quoted descriptions', async () => {
    const { parseLanesFromFastfile } = await import('../lanes.js');

    const content = `
platform :ios do
  desc 'Single quoted description'
  lane :build do
    gym
  end
end
`;

    const lanes = parseLanesFromFastfile(content);
    expect(lanes).toHaveLength(1);
    expect(lanes[0].description).toBe('Single quoted description');
  });

  it('should handle multiple platforms correctly', async () => {
    const { parseLanesFromFastfile } = await import('../lanes.js');

    const content = `
platform :ios do
  lane :build do
    gym
  end
end

platform :android do
  lane :build do
    gradle
  end
end

platform :ios do
  lane :test do
    scan
  end
end
`;

    const lanes = parseLanesFromFastfile(content);
    expect(lanes).toHaveLength(3);

    const iosLanes = lanes.filter(l => l.platform === 'ios');
    expect(iosLanes).toHaveLength(2);

    const androidLanes = lanes.filter(l => l.platform === 'android');
    expect(androidLanes).toHaveLength(1);
  });

  it('should handle nested blocks without affecting platform context', async () => {
    const { parseLanesFromFastfile } = await import('../lanes.js');

    const content = `
platform :ios do
  desc "Build with options"
  lane :build do
    if ENV["CI"]
      setup_ci
    end
    gym(
      scheme: "MyApp"
    )
  end
end
`;

    const lanes = parseLanesFromFastfile(content);
    expect(lanes).toHaveLength(1);
    expect(lanes[0].platform).toBe('ios');
    expect(lanes[0].name).toBe('build');
  });
});

describe('LaneInfo interface', () => {
  it('should have correct structure for parsed lanes', async () => {
    const { parseLanesFromFastfile } = await import('../lanes.js');

    const content = `
platform :ios do
  desc "Test description"
  lane :test_lane do
    scan
  end
end
`;

    const lanes = parseLanesFromFastfile(content);

    // Verify the LaneInfo structure
    const lane: LaneInfo = lanes[0];
    expect(lane).toHaveProperty('name');
    expect(lane).toHaveProperty('platform');
    expect(lane).toHaveProperty('description');
    expect(lane).toHaveProperty('isPrivate');

    expect(typeof lane.name).toBe('string');
    expect(lane.platform === 'ios' || lane.platform === 'android' || lane.platform === null).toBe(true);
    expect(typeof lane.description === 'string' || lane.description === null).toBe(true);
    expect(typeof lane.isPrivate).toBe('boolean');
  });
});

describe('getLanes', () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fall back to Fastfile parsing when CLI fails', async () => {
    // Mock executeCommand to fail
    vi.doMock('../../utils/executor.js', () => ({
      executeCommand: vi.fn().mockRejectedValue(new Error('Command not found')),
    }));

    // Mock fs.readFile to return Fastfile content
    vi.doMock('fs', () => ({
      promises: {
        readFile: vi.fn().mockResolvedValue(`
platform :ios do
  desc "Test lane"
  lane :test do
    scan
  end
end
`),
      },
    }));

    const { getLanes } = await import('../lanes.js');
    const lanes = await getLanes('/test/project', 'ios');

    expect(lanes).toHaveLength(1);
    expect(lanes[0].name).toBe('test');
    expect(lanes[0].platform).toBe('ios');
  });

  it('should return empty array when no Fastfile exists', async () => {
    // Mock executeCommand to fail
    vi.doMock('../../utils/executor.js', () => ({
      executeCommand: vi.fn().mockRejectedValue(new Error('Command not found')),
    }));

    // Mock fs.readFile to throw ENOENT
    const enoentError = new Error('File not found');
    (enoentError as any).code = 'ENOENT';
    vi.doMock('fs', () => ({
      promises: {
        readFile: vi.fn().mockRejectedValue(enoentError),
      },
    }));

    const { getLanes } = await import('../lanes.js');
    const lanes = await getLanes('/nonexistent/project', 'ios');

    expect(lanes).toHaveLength(0);
  });
});

describe('transformFastlaneJson', () => {
  it('should transform fastlane lanes JSON output', async () => {
    const { transformFastlaneJson } = await import('../lanes.js');

    const jsonOutput = {
      ios: [
        { name: 'build', description: 'Build the app' },
        { name: 'beta', description: 'Deploy to beta' },
        { name: '_setup', description: 'Internal setup' },
      ],
      android: [
        { name: 'release', description: 'Release to Play Store' },
      ],
    };

    const lanes = transformFastlaneJson(jsonOutput);

    expect(lanes).toHaveLength(4);

    const iosBuild = lanes.find(l => l.name === 'build' && l.platform === 'ios');
    expect(iosBuild).toBeDefined();
    expect(iosBuild?.description).toBe('Build the app');
    expect(iosBuild?.isPrivate).toBe(false);

    const iosSetup = lanes.find(l => l.name === '_setup');
    expect(iosSetup).toBeDefined();
    expect(iosSetup?.isPrivate).toBe(true);

    const androidRelease = lanes.find(l => l.name === 'release' && l.platform === 'android');
    expect(androidRelease).toBeDefined();
  });

  it('should handle invalid JSON structure gracefully', async () => {
    const { transformFastlaneJson } = await import('../lanes.js');

    expect(transformFastlaneJson(null)).toEqual([]);
    expect(transformFastlaneJson(undefined)).toEqual([]);
    expect(transformFastlaneJson('invalid')).toEqual([]);
    expect(transformFastlaneJson(123)).toEqual([]);
  });

  it('should handle shared lanes (non-platform keys)', async () => {
    const { transformFastlaneJson } = await import('../lanes.js');

    const jsonOutput = {
      '': [
        { name: 'test', description: 'Run tests' },
      ],
    };

    const lanes = transformFastlaneJson(jsonOutput);
    expect(lanes).toHaveLength(1);
    expect(lanes[0].platform).toBeNull();
  });
});
