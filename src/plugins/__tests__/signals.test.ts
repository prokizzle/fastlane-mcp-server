import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('extractPodDependencies', () => {
  it('should extract pod names from Podfile content', async () => {
    const { extractPodDependencies } = await import('../signals.js');

    const content = `
      platform :ios, '13.0'

      target 'MyApp' do
        use_frameworks!

        pod 'Alamofire', '~> 5.0'
        pod 'SwiftyJSON'
        pod "Kingfisher", :git => 'https://github.com/onevcat/Kingfisher.git'
      end
    `;

    const pods = extractPodDependencies(content);

    expect(pods).toContain('Alamofire');
    expect(pods).toContain('SwiftyJSON');
    expect(pods).toContain('Kingfisher');
  });

  it('should extract base pod name from subspecs', async () => {
    const { extractPodDependencies } = await import('../signals.js');

    const content = `
      pod 'Firebase/Core'
      pod 'Firebase/Analytics'
      pod 'Firebase/Crashlytics'
    `;

    const pods = extractPodDependencies(content);

    // Should only have one Firebase entry
    expect(pods.filter(p => p === 'Firebase')).toHaveLength(1);
    expect(pods).toContain('Firebase');
  });

  it('should handle empty Podfile', async () => {
    const { extractPodDependencies } = await import('../signals.js');

    const pods = extractPodDependencies('');

    expect(pods).toEqual([]);
  });

  it('should handle Podfile with only comments', async () => {
    const { extractPodDependencies } = await import('../signals.js');

    const content = `
      # This is a comment
      # pod 'NotARealPod'
    `;

    const pods = extractPodDependencies(content);

    expect(pods).toEqual([]);
  });

  it('should not duplicate pod names', async () => {
    const { extractPodDependencies } = await import('../signals.js');

    const content = `
      pod 'Alamofire'
      pod 'Alamofire', '~> 5.0'
    `;

    const pods = extractPodDependencies(content);

    expect(pods.filter(p => p === 'Alamofire')).toHaveLength(1);
  });
});

describe('extractPackageSwiftDependencies', () => {
  it('should extract package names from URL-based dependencies', async () => {
    const { extractPackageSwiftDependencies } = await import('../signals.js');

    const content = `
      // swift-tools-version:5.5
      import PackageDescription

      let package = Package(
          name: "MyPackage",
          dependencies: [
              .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.0.0"),
              .package(url: "https://github.com/SwiftyJSON/SwiftyJSON", .upToNextMajor(from: "5.0.0")),
          ]
      )
    `;

    const packages = extractPackageSwiftDependencies(content);

    expect(packages).toContain('Alamofire');
    expect(packages).toContain('SwiftyJSON');
  });

  it('should extract package names from name-based dependencies', async () => {
    const { extractPackageSwiftDependencies } = await import('../signals.js');

    const content = `
      .package(name: "MyLocalPackage", path: "../MyLocalPackage"),
    `;

    const packages = extractPackageSwiftDependencies(content);

    expect(packages).toContain('MyLocalPackage');
  });

  it('should handle .git suffix in URLs', async () => {
    const { extractPackageSwiftDependencies } = await import('../signals.js');

    const content = `
      .package(url: "https://github.com/ReactiveX/RxSwift.git", from: "6.0.0"),
    `;

    const packages = extractPackageSwiftDependencies(content);

    expect(packages).toContain('RxSwift');
  });

  it('should handle empty Package.swift', async () => {
    const { extractPackageSwiftDependencies } = await import('../signals.js');

    const packages = extractPackageSwiftDependencies('');

    expect(packages).toEqual([]);
  });

  it('should not duplicate package names', async () => {
    const { extractPackageSwiftDependencies } = await import('../signals.js');

    const content = `
      .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.0.0"),
      .package(name: "Alamofire", path: "../Alamofire"),
    `;

    const packages = extractPackageSwiftDependencies(content);

    expect(packages.filter(p => p === 'Alamofire')).toHaveLength(1);
  });
});

describe('extractNpmDependencies', () => {
  it('should extract dependencies from package.json', async () => {
    const { extractNpmDependencies } = await import('../signals.js');

    const packageJson = {
      name: 'my-app',
      dependencies: {
        'react': '^18.0.0',
        'react-native': '0.72.0',
      },
    };

    const deps = extractNpmDependencies(packageJson);

    expect(deps).toContain('react');
    expect(deps).toContain('react-native');
  });

  it('should extract devDependencies from package.json', async () => {
    const { extractNpmDependencies } = await import('../signals.js');

    const packageJson = {
      name: 'my-app',
      devDependencies: {
        'typescript': '^5.0.0',
        'jest': '^29.0.0',
      },
    };

    const deps = extractNpmDependencies(packageJson);

    expect(deps).toContain('typescript');
    expect(deps).toContain('jest');
  });

  it('should combine dependencies and devDependencies', async () => {
    const { extractNpmDependencies } = await import('../signals.js');

    const packageJson = {
      name: 'my-app',
      dependencies: {
        'react': '^18.0.0',
      },
      devDependencies: {
        'typescript': '^5.0.0',
      },
    };

    const deps = extractNpmDependencies(packageJson);

    expect(deps).toContain('react');
    expect(deps).toContain('typescript');
  });

  it('should handle package.json with no dependencies', async () => {
    const { extractNpmDependencies } = await import('../signals.js');

    const packageJson = {
      name: 'my-app',
    };

    const deps = extractNpmDependencies(packageJson);

    expect(deps).toEqual([]);
  });

  it('should not duplicate dependencies', async () => {
    const { extractNpmDependencies } = await import('../signals.js');

    const packageJson = {
      dependencies: {
        'lodash': '^4.0.0',
      },
      devDependencies: {
        'lodash': '^4.0.0',
      },
    };

    const deps = extractNpmDependencies(packageJson);

    expect(deps.filter(d => d === 'lodash')).toHaveLength(1);
  });
});

describe('extractGradleDependencies', () => {
  it('should extract implementation dependencies', async () => {
    const { extractGradleDependencies } = await import('../signals.js');

    const content = `
      dependencies {
          implementation 'com.google.firebase:firebase-core:17.0.0'
          implementation 'com.squareup.retrofit2:retrofit:2.9.0'
      }
    `;

    const deps = extractGradleDependencies(content);

    expect(deps).toContain('firebase-core');
    expect(deps).toContain('retrofit');
  });

  it('should extract dependencies with Kotlin DSL syntax', async () => {
    const { extractGradleDependencies } = await import('../signals.js');

    const content = `
      dependencies {
          implementation("com.google.firebase:firebase-analytics:21.0.0")
          testImplementation("junit:junit:4.13.2")
      }
    `;

    const deps = extractGradleDependencies(content);

    expect(deps).toContain('firebase-analytics');
    expect(deps).toContain('junit');
  });

  it('should extract api dependencies', async () => {
    const { extractGradleDependencies } = await import('../signals.js');

    const content = `
      dependencies {
          api 'com.example:my-library:1.0.0'
      }
    `;

    const deps = extractGradleDependencies(content);

    expect(deps).toContain('my-library');
  });

  it('should extract testImplementation dependencies', async () => {
    const { extractGradleDependencies } = await import('../signals.js');

    const content = `
      dependencies {
          testImplementation 'org.mockito:mockito-core:4.0.0'
          androidTestImplementation 'androidx.test.espresso:espresso-core:3.4.0'
      }
    `;

    const deps = extractGradleDependencies(content);

    expect(deps).toContain('mockito-core');
    expect(deps).toContain('espresso-core');
  });

  it('should handle empty build.gradle', async () => {
    const { extractGradleDependencies } = await import('../signals.js');

    const deps = extractGradleDependencies('');

    expect(deps).toEqual([]);
  });

  it('should not duplicate dependencies', async () => {
    const { extractGradleDependencies } = await import('../signals.js');

    const content = `
      dependencies {
          implementation 'com.google.firebase:firebase-core:17.0.0'
          implementation 'com.google.firebase:firebase-core:18.0.0'
      }
    `;

    const deps = extractGradleDependencies(content);

    expect(deps.filter(d => d === 'firebase-core')).toHaveLength(1);
  });
});

describe('detectProjectSignals', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'signals-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should detect CocoaPods from Podfile', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    // Create a Podfile
    await fs.writeFile(
      path.join(testDir, 'Podfile'),
      `pod 'Alamofire'\npod 'SwiftyJSON'`
    );

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'dependency',
        name: 'cocoapods',
        source: 'Podfile',
        confidence: 'high',
      })
    );
    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'dependency',
        name: 'Alamofire',
        source: 'Podfile',
      })
    );
  });

  it('should detect CocoaPods from ios/Podfile', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    // Create ios directory and Podfile
    await fs.mkdir(path.join(testDir, 'ios'));
    await fs.writeFile(
      path.join(testDir, 'ios', 'Podfile'),
      `pod 'Firebase/Core'`
    );

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'dependency',
        name: 'cocoapods',
        source: 'ios/Podfile',
      })
    );
  });

  it('should detect SPM from Package.swift', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.writeFile(
      path.join(testDir, 'Package.swift'),
      `.package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.0.0")`
    );

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'dependency',
        name: 'swift-package-manager',
        source: 'Package.swift',
      })
    );
    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'dependency',
        name: 'Alamofire',
        source: 'Package.swift',
      })
    );
  });

  it('should detect Gradle from build.gradle', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.writeFile(
      path.join(testDir, 'build.gradle'),
      `implementation 'com.google.firebase:firebase-core:17.0.0'`
    );

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'dependency',
        name: 'gradle',
        source: 'build.gradle',
      })
    );
  });

  it('should detect npm from package.json', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { 'react': '^18.0.0' },
      })
    );

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'dependency',
        name: 'npm',
        source: 'package.json',
      })
    );
    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'dependency',
        name: 'react',
        source: 'package.json',
      })
    );
  });

  it('should detect yarn from yarn.lock', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify({ dependencies: {} })
    );
    await fs.writeFile(path.join(testDir, 'yarn.lock'), '');

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'dependency',
        name: 'yarn',
        source: 'yarn.lock',
      })
    );
  });

  it('should detect Flutter from pubspec.yaml', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.writeFile(path.join(testDir, 'pubspec.yaml'), 'name: my_app');

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'framework',
        name: 'flutter',
        source: 'pubspec.yaml',
      })
    );
  });

  it('should detect SwiftLint config', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.writeFile(path.join(testDir, '.swiftlint.yml'), 'disabled_rules:');

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'config',
        name: 'swiftlint',
        source: '.swiftlint.yml',
      })
    );
  });

  it('should detect ESLint config', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.writeFile(path.join(testDir, '.eslintrc.json'), '{}');

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'config',
        name: 'eslint',
        source: '.eslintrc.json',
      })
    );
  });

  it('should detect Prettier config', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.writeFile(path.join(testDir, '.prettierrc'), '{}');

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'config',
        name: 'prettier',
        source: '.prettierrc',
      })
    );
  });

  it('should detect Danger config', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.writeFile(path.join(testDir, 'Dangerfile'), '');

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'config',
        name: 'danger',
        source: 'Dangerfile',
      })
    );
  });

  it('should detect fastlane Matchfile', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.mkdir(path.join(testDir, 'fastlane'));
    await fs.writeFile(path.join(testDir, 'fastlane', 'Matchfile'), '');

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'config',
        name: 'fastlane-match',
        source: 'fastlane/Matchfile',
      })
    );
  });

  it('should detect Firebase from GoogleService-Info.plist', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.writeFile(path.join(testDir, 'GoogleService-Info.plist'), '');

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'service',
        name: 'firebase',
        source: 'GoogleService-Info.plist',
      })
    );
    // Crashlytics is also detected from Firebase config
    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'service',
        name: 'crashlytics',
        source: 'GoogleService-Info.plist',
      })
    );
  });

  it('should detect Firebase from google-services.json', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.writeFile(path.join(testDir, 'google-services.json'), '{}');

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'service',
        name: 'firebase',
      })
    );
  });

  it('should detect Sentry from .sentryclirc', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.writeFile(path.join(testDir, '.sentryclirc'), '');

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'service',
        name: 'sentry',
        source: '.sentryclirc',
      })
    );
  });

  it('should detect AppCenter from appcenter-config.json', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.writeFile(path.join(testDir, 'appcenter-config.json'), '{}');

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'service',
        name: 'appcenter',
        source: 'appcenter-config.json',
      })
    );
  });

  it('should detect SwiftUI from Swift files', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.writeFile(
      path.join(testDir, 'ContentView.swift'),
      `import SwiftUI\n\nstruct ContentView: View { }`
    );

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'framework',
        name: 'swiftui',
        confidence: 'high',
      })
    );
  });

  it('should detect UIKit from Swift files', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.writeFile(
      path.join(testDir, 'ViewController.swift'),
      `import UIKit\n\nclass ViewController: UIViewController { }`
    );

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'framework',
        name: 'uikit',
        confidence: 'high',
      })
    );
  });

  it('should detect Combine from Swift files', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.writeFile(
      path.join(testDir, 'ViewModel.swift'),
      `import Combine\n\nclass ViewModel { }`
    );

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'framework',
        name: 'combine',
        confidence: 'high',
      })
    );
  });

  it('should detect React Native from package.json', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { 'react-native': '0.72.0' },
      })
    );

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'framework',
        name: 'react-native',
        source: 'package.json',
      })
    );
  });

  it('should detect Expo from package.json', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { 'expo': '~49.0.0' },
      })
    );

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'framework',
        name: 'expo',
        source: 'package.json',
      })
    );
  });

  it('should detect RxSwift from Podfile', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    await fs.writeFile(
      path.join(testDir, 'Podfile'),
      `pod 'RxSwift'\npod 'RxCocoa'`
    );

    const signals = await detectProjectSignals(testDir);

    expect(signals).toContainEqual(
      expect.objectContaining({
        category: 'framework',
        name: 'rxswift',
        source: 'Podfile',
      })
    );
  });

  it('should return empty array for empty directory', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    const signals = await detectProjectSignals(testDir);

    expect(signals).toEqual([]);
  });

  it('should handle non-existent directory gracefully', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    const signals = await detectProjectSignals('/non/existent/path');

    expect(signals).toEqual([]);
  });

  it('should detect multiple signals from a complex project', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    // Create a project with multiple signals
    await fs.writeFile(
      path.join(testDir, 'Podfile'),
      `pod 'Alamofire'\npod 'Firebase/Core'`
    );
    await fs.writeFile(path.join(testDir, '.swiftlint.yml'), '');
    await fs.writeFile(path.join(testDir, 'GoogleService-Info.plist'), '');
    await fs.writeFile(
      path.join(testDir, 'App.swift'),
      'import SwiftUI'
    );

    const signals = await detectProjectSignals(testDir);

    // Verify multiple categories are detected
    const categories = new Set(signals.map(s => s.category));
    expect(categories.has('dependency')).toBe(true);
    expect(categories.has('config')).toBe(true);
    expect(categories.has('service')).toBe(true);
    expect(categories.has('framework')).toBe(true);
  });
});

describe('ProjectSignal interface', () => {
  it('should have correct structure', async () => {
    const { detectProjectSignals } = await import('../signals.js');

    // Create a temp directory with a simple signal
    const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'signal-interface-test-'));
    try {
      await fs.writeFile(path.join(testDir, '.swiftlint.yml'), '');
      const signals = await detectProjectSignals(testDir);

      expect(signals.length).toBeGreaterThan(0);
      const signal = signals[0];

      // Verify structure
      expect(signal).toHaveProperty('category');
      expect(signal).toHaveProperty('name');
      expect(signal).toHaveProperty('source');
      expect(signal).toHaveProperty('confidence');

      // Verify types
      expect(['dependency', 'config', 'service', 'framework']).toContain(signal.category);
      expect(typeof signal.name).toBe('string');
      expect(typeof signal.source).toBe('string');
      expect(['high', 'medium', 'low']).toContain(signal.confidence);
    } finally {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });
});
