/**
 * Project Signal Detection for Plugin Advisor
 *
 * This module detects project signals that indicate what tools, frameworks,
 * and patterns are being used in a mobile project. These signals help the
 * Plugin Advisor recommend relevant fastlane plugins.
 *
 * Signal categories:
 * - dependency: Package managers and their dependencies (CocoaPods, SPM, Gradle, npm)
 * - config: Configuration files (SwiftLint, ESLint, Prettier, Danger, fastlane configs)
 * - service: Third-party services (Firebase, Crashlytics, Sentry, AppCenter)
 * - framework: Code frameworks detected from imports (SwiftUI, UIKit, Combine, React Native)
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';

export interface ProjectSignal {
  category: 'dependency' | 'config' | 'service' | 'framework';
  name: string;
  source: string; // file that provided the signal
  confidence: 'high' | 'medium' | 'low';
  metadata?: Record<string, unknown>;
}

/**
 * Detect all project signals from the given project path
 *
 * Scans the project for:
 * - Dependency management files (Podfile, Package.swift, build.gradle, package.json)
 * - Configuration files (SwiftLint, ESLint, Prettier, Danger, fastlane configs)
 * - Service integration files (Firebase, Sentry, AppCenter)
 * - Framework usage from code patterns
 *
 * @param projectPath - Path to the project root
 * @returns Array of detected project signals
 */
export async function detectProjectSignals(projectPath: string): Promise<ProjectSignal[]> {
  const signals: ProjectSignal[] = [];

  // Detect dependency management signals
  const dependencySignals = await detectDependencySignals(projectPath);
  signals.push(...dependencySignals);

  // Detect configuration file signals
  const configSignals = await detectConfigSignals(projectPath);
  signals.push(...configSignals);

  // Detect service integration signals
  const serviceSignals = await detectServiceSignals(projectPath);
  signals.push(...serviceSignals);

  // Detect framework signals from code
  const frameworkSignals = await detectFrameworkSignals(projectPath);
  signals.push(...frameworkSignals);

  return signals;
}

/**
 * Detect signals from dependency management files
 */
async function detectDependencySignals(projectPath: string): Promise<ProjectSignal[]> {
  const signals: ProjectSignal[] = [];

  // CocoaPods detection
  const podfileSignals = await detectCocoaPods(projectPath);
  signals.push(...podfileSignals);

  // SPM detection
  const spmSignals = await detectSPM(projectPath);
  signals.push(...spmSignals);

  // Gradle detection
  const gradleSignals = await detectGradle(projectPath);
  signals.push(...gradleSignals);

  // npm/yarn detection
  const npmSignals = await detectNpm(projectPath);
  signals.push(...npmSignals);

  // Flutter detection (pubspec.yaml)
  const flutterSignals = await detectFlutter(projectPath);
  signals.push(...flutterSignals);

  return signals;
}

/**
 * Detect CocoaPods and extract pod dependencies
 */
async function detectCocoaPods(projectPath: string): Promise<ProjectSignal[]> {
  const signals: ProjectSignal[] = [];

  // Check for Podfile
  const podfilePath = path.join(projectPath, 'Podfile');
  try {
    const content = await fs.readFile(podfilePath, 'utf-8');
    signals.push({
      category: 'dependency',
      name: 'cocoapods',
      source: 'Podfile',
      confidence: 'high',
    });

    // Extract pod dependencies
    const pods = extractPodDependencies(content);
    for (const pod of pods) {
      signals.push({
        category: 'dependency',
        name: pod,
        source: 'Podfile',
        confidence: 'high',
        metadata: { manager: 'cocoapods' },
      });
    }
  } catch {
    // Podfile doesn't exist, check ios/ subdirectory
    const iosPodfilePath = path.join(projectPath, 'ios', 'Podfile');
    try {
      const content = await fs.readFile(iosPodfilePath, 'utf-8');
      signals.push({
        category: 'dependency',
        name: 'cocoapods',
        source: 'ios/Podfile',
        confidence: 'high',
      });

      const pods = extractPodDependencies(content);
      for (const pod of pods) {
        signals.push({
          category: 'dependency',
          name: pod,
          source: 'ios/Podfile',
          confidence: 'high',
          metadata: { manager: 'cocoapods' },
        });
      }
    } catch {
      // No Podfile found
    }
  }

  // Check for Podfile.lock (indicates actually used)
  const podfileLockPath = path.join(projectPath, 'Podfile.lock');
  try {
    await fs.access(podfileLockPath);
    signals.push({
      category: 'dependency',
      name: 'cocoapods-installed',
      source: 'Podfile.lock',
      confidence: 'high',
    });
  } catch {
    // Try ios/ subdirectory
    const iosPodfileLockPath = path.join(projectPath, 'ios', 'Podfile.lock');
    try {
      await fs.access(iosPodfileLockPath);
      signals.push({
        category: 'dependency',
        name: 'cocoapods-installed',
        source: 'ios/Podfile.lock',
        confidence: 'high',
      });
    } catch {
      // No Podfile.lock found
    }
  }

  return signals;
}

/**
 * Detect Swift Package Manager and extract package dependencies
 */
async function detectSPM(projectPath: string): Promise<ProjectSignal[]> {
  const signals: ProjectSignal[] = [];

  const packageSwiftPath = path.join(projectPath, 'Package.swift');
  try {
    const content = await fs.readFile(packageSwiftPath, 'utf-8');
    signals.push({
      category: 'dependency',
      name: 'swift-package-manager',
      source: 'Package.swift',
      confidence: 'high',
    });

    const packages = extractPackageSwiftDependencies(content);
    for (const pkg of packages) {
      signals.push({
        category: 'dependency',
        name: pkg,
        source: 'Package.swift',
        confidence: 'high',
        metadata: { manager: 'spm' },
      });
    }
  } catch {
    // Package.swift doesn't exist
  }

  return signals;
}

/**
 * Detect Gradle and extract dependencies
 */
async function detectGradle(projectPath: string): Promise<ProjectSignal[]> {
  const signals: ProjectSignal[] = [];

  // Look for build.gradle or build.gradle.kts
  const gradleFiles = [
    'build.gradle',
    'build.gradle.kts',
    'app/build.gradle',
    'app/build.gradle.kts',
    'android/build.gradle',
    'android/app/build.gradle',
  ];

  for (const gradleFile of gradleFiles) {
    const gradlePath = path.join(projectPath, gradleFile);
    try {
      const content = await fs.readFile(gradlePath, 'utf-8');
      signals.push({
        category: 'dependency',
        name: 'gradle',
        source: gradleFile,
        confidence: 'high',
      });

      // Extract dependencies
      const deps = extractGradleDependencies(content);
      for (const dep of deps) {
        signals.push({
          category: 'dependency',
          name: dep,
          source: gradleFile,
          confidence: 'high',
          metadata: { manager: 'gradle' },
        });
      }
      break; // Found gradle, no need to check other paths
    } catch {
      // File doesn't exist
    }
  }

  return signals;
}

/**
 * Detect npm/yarn and extract dependencies
 */
async function detectNpm(projectPath: string): Promise<ProjectSignal[]> {
  const signals: ProjectSignal[] = [];

  const packageJsonPath = path.join(projectPath, 'package.json');
  try {
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content) as Record<string, unknown>;

    signals.push({
      category: 'dependency',
      name: 'npm',
      source: 'package.json',
      confidence: 'high',
    });

    // Check for yarn.lock
    try {
      await fs.access(path.join(projectPath, 'yarn.lock'));
      signals.push({
        category: 'dependency',
        name: 'yarn',
        source: 'yarn.lock',
        confidence: 'high',
      });
    } catch {
      // No yarn.lock
    }

    // Check for pnpm-lock.yaml
    try {
      await fs.access(path.join(projectPath, 'pnpm-lock.yaml'));
      signals.push({
        category: 'dependency',
        name: 'pnpm',
        source: 'pnpm-lock.yaml',
        confidence: 'high',
      });
    } catch {
      // No pnpm-lock.yaml
    }

    const deps = extractNpmDependencies(packageJson);
    for (const dep of deps) {
      signals.push({
        category: 'dependency',
        name: dep,
        source: 'package.json',
        confidence: 'high',
        metadata: { manager: 'npm' },
      });
    }
  } catch {
    // package.json doesn't exist or invalid JSON
  }

  return signals;
}

/**
 * Detect Flutter projects
 */
async function detectFlutter(projectPath: string): Promise<ProjectSignal[]> {
  const signals: ProjectSignal[] = [];

  const pubspecPath = path.join(projectPath, 'pubspec.yaml');
  try {
    await fs.access(pubspecPath);
    signals.push({
      category: 'framework',
      name: 'flutter',
      source: 'pubspec.yaml',
      confidence: 'high',
    });
  } catch {
    // pubspec.yaml doesn't exist
  }

  return signals;
}

/**
 * Detect configuration file signals
 */
async function detectConfigSignals(projectPath: string): Promise<ProjectSignal[]> {
  const signals: ProjectSignal[] = [];

  // Configuration file mappings
  const configFiles: Array<{ pattern: string; name: string; confidence: 'high' | 'medium' | 'low' }> = [
    // Linting
    { pattern: '.swiftlint.yml', name: 'swiftlint', confidence: 'high' },
    { pattern: '.swiftlint.yaml', name: 'swiftlint', confidence: 'high' },
    { pattern: '.eslintrc', name: 'eslint', confidence: 'high' },
    { pattern: '.eslintrc.js', name: 'eslint', confidence: 'high' },
    { pattern: '.eslintrc.json', name: 'eslint', confidence: 'high' },
    { pattern: '.eslintrc.yml', name: 'eslint', confidence: 'high' },
    { pattern: '.eslintrc.yaml', name: 'eslint', confidence: 'high' },
    { pattern: 'eslint.config.js', name: 'eslint', confidence: 'high' },
    { pattern: 'eslint.config.mjs', name: 'eslint', confidence: 'high' },

    // Formatting
    { pattern: '.prettierrc', name: 'prettier', confidence: 'high' },
    { pattern: '.prettierrc.js', name: 'prettier', confidence: 'high' },
    { pattern: '.prettierrc.json', name: 'prettier', confidence: 'high' },
    { pattern: '.prettierrc.yml', name: 'prettier', confidence: 'high' },
    { pattern: '.prettierrc.yaml', name: 'prettier', confidence: 'high' },
    { pattern: 'prettier.config.js', name: 'prettier', confidence: 'high' },

    // CI/Code Review
    { pattern: 'Dangerfile', name: 'danger', confidence: 'high' },
    { pattern: 'Dangerfile.swift', name: 'danger-swift', confidence: 'high' },
    { pattern: 'dangerfile.js', name: 'danger-js', confidence: 'high' },
    { pattern: 'dangerfile.ts', name: 'danger-js', confidence: 'high' },

    // Fastlane configs
    { pattern: 'fastlane/Matchfile', name: 'fastlane-match', confidence: 'high' },
    { pattern: 'fastlane/Appfile', name: 'fastlane-appfile', confidence: 'high' },
    { pattern: 'fastlane/Deliverfile', name: 'fastlane-deliver', confidence: 'high' },
    { pattern: 'fastlane/Gymfile', name: 'fastlane-gym', confidence: 'high' },
    { pattern: 'fastlane/Scanfile', name: 'fastlane-scan', confidence: 'high' },
    { pattern: 'fastlane/Snapfile', name: 'fastlane-snapshot', confidence: 'high' },
  ];

  for (const config of configFiles) {
    const configPath = path.join(projectPath, config.pattern);
    try {
      await fs.access(configPath);
      // Check if signal already exists (avoid duplicates for same tool)
      const exists = signals.some(s => s.name === config.name);
      if (!exists) {
        signals.push({
          category: 'config',
          name: config.name,
          source: config.pattern,
          confidence: config.confidence,
        });
      }
    } catch {
      // File doesn't exist
    }
  }

  return signals;
}

/**
 * Detect service integration signals
 */
async function detectServiceSignals(projectPath: string): Promise<ProjectSignal[]> {
  const signals: ProjectSignal[] = [];

  // Firebase/Crashlytics (iOS)
  const firebaseIosFiles = [
    'GoogleService-Info.plist',
    'ios/GoogleService-Info.plist',
    '**/GoogleService-Info.plist',
  ];

  for (const pattern of firebaseIosFiles) {
    if (pattern.includes('*')) {
      const matches = await glob(pattern, { cwd: projectPath, nodir: true });
      if (matches.length > 0) {
        signals.push({
          category: 'service',
          name: 'firebase',
          source: matches[0],
          confidence: 'high',
        });
        signals.push({
          category: 'service',
          name: 'crashlytics',
          source: matches[0],
          confidence: 'medium',
        });
        break;
      }
    } else {
      try {
        await fs.access(path.join(projectPath, pattern));
        signals.push({
          category: 'service',
          name: 'firebase',
          source: pattern,
          confidence: 'high',
        });
        signals.push({
          category: 'service',
          name: 'crashlytics',
          source: pattern,
          confidence: 'medium',
        });
        break;
      } catch {
        // File doesn't exist
      }
    }
  }

  // Firebase (Android)
  const firebaseAndroidFiles = [
    'google-services.json',
    'android/app/google-services.json',
    'app/google-services.json',
  ];

  for (const filePath of firebaseAndroidFiles) {
    try {
      await fs.access(path.join(projectPath, filePath));
      // Only add if not already detected
      if (!signals.some(s => s.name === 'firebase')) {
        signals.push({
          category: 'service',
          name: 'firebase',
          source: filePath,
          confidence: 'high',
        });
      }
      if (!signals.some(s => s.name === 'crashlytics')) {
        signals.push({
          category: 'service',
          name: 'crashlytics',
          source: filePath,
          confidence: 'medium',
        });
      }
      break;
    } catch {
      // File doesn't exist
    }
  }

  // Sentry
  const sentryFiles = [
    '.sentryclirc',
    'sentry.properties',
    'ios/sentry.properties',
    'android/sentry.properties',
  ];

  for (const filePath of sentryFiles) {
    try {
      await fs.access(path.join(projectPath, filePath));
      if (!signals.some(s => s.name === 'sentry')) {
        signals.push({
          category: 'service',
          name: 'sentry',
          source: filePath,
          confidence: 'high',
        });
      }
      break;
    } catch {
      // File doesn't exist
    }
  }

  // AppCenter
  const appCenterFiles = [
    'appcenter-config.json',
    'ios/appcenter-config.json',
    'android/app/src/main/assets/appcenter-config.json',
  ];

  for (const filePath of appCenterFiles) {
    try {
      await fs.access(path.join(projectPath, filePath));
      signals.push({
        category: 'service',
        name: 'appcenter',
        source: filePath,
        confidence: 'high',
      });
      break;
    } catch {
      // File doesn't exist
    }
  }

  return signals;
}

/**
 * Detect framework signals from code patterns
 */
async function detectFrameworkSignals(projectPath: string): Promise<ProjectSignal[]> {
  const signals: ProjectSignal[] = [];

  // Scan Swift files for framework imports
  const swiftFrameworkSignals = await detectSwiftFrameworks(projectPath);
  signals.push(...swiftFrameworkSignals);

  // Check for React Native in package.json
  const packageJsonPath = path.join(projectPath, 'package.json');
  try {
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content) as Record<string, unknown>;
    const deps = {
      ...(packageJson.dependencies as Record<string, string> || {}),
      ...(packageJson.devDependencies as Record<string, string> || {}),
    };

    if (deps['react-native']) {
      signals.push({
        category: 'framework',
        name: 'react-native',
        source: 'package.json',
        confidence: 'high',
      });
    }

    if (deps['expo']) {
      signals.push({
        category: 'framework',
        name: 'expo',
        source: 'package.json',
        confidence: 'high',
      });
    }
  } catch {
    // package.json doesn't exist or invalid
  }

  // Check for RxSwift in Podfile or Package.swift
  const rxSwiftSignals = await detectRxSwift(projectPath);
  signals.push(...rxSwiftSignals);

  return signals;
}

/**
 * Detect Swift framework usage by scanning .swift files
 */
async function detectSwiftFrameworks(projectPath: string): Promise<ProjectSignal[]> {
  const signals: ProjectSignal[] = [];
  const detectedFrameworks = new Set<string>();

  try {
    // Find Swift files (limit to avoid scanning too many files)
    const swiftFiles = await glob('**/*.swift', {
      cwd: projectPath,
      nodir: true,
      ignore: ['**/Pods/**', '**/DerivedData/**', '**/.build/**', '**/Carthage/**'],
    });

    // Limit to first 50 files for performance
    const filesToScan = swiftFiles.slice(0, 50);

    for (const swiftFile of filesToScan) {
      try {
        const content = await fs.readFile(path.join(projectPath, swiftFile), 'utf-8');

        // SwiftUI detection
        if (!detectedFrameworks.has('swiftui') && /import\s+SwiftUI\b/.test(content)) {
          detectedFrameworks.add('swiftui');
          signals.push({
            category: 'framework',
            name: 'swiftui',
            source: swiftFile,
            confidence: 'high',
          });
        }

        // UIKit detection
        if (!detectedFrameworks.has('uikit') && /import\s+UIKit\b/.test(content)) {
          detectedFrameworks.add('uikit');
          signals.push({
            category: 'framework',
            name: 'uikit',
            source: swiftFile,
            confidence: 'high',
          });
        }

        // Combine detection
        if (!detectedFrameworks.has('combine') && /import\s+Combine\b/.test(content)) {
          detectedFrameworks.add('combine');
          signals.push({
            category: 'framework',
            name: 'combine',
            source: swiftFile,
            confidence: 'high',
          });
        }
      } catch {
        // Can't read file, skip
      }
    }
  } catch {
    // Glob failed
  }

  return signals;
}

/**
 * Detect RxSwift from dependency files
 */
async function detectRxSwift(projectPath: string): Promise<ProjectSignal[]> {
  const signals: ProjectSignal[] = [];

  // Check Podfile
  try {
    const podfilePath = path.join(projectPath, 'Podfile');
    const content = await fs.readFile(podfilePath, 'utf-8');
    if (/pod\s+['"]RxSwift['"]/.test(content)) {
      signals.push({
        category: 'framework',
        name: 'rxswift',
        source: 'Podfile',
        confidence: 'high',
      });
    }
  } catch {
    // Check ios/Podfile
    try {
      const iosPodfilePath = path.join(projectPath, 'ios', 'Podfile');
      const content = await fs.readFile(iosPodfilePath, 'utf-8');
      if (/pod\s+['"]RxSwift['"]/.test(content)) {
        signals.push({
          category: 'framework',
          name: 'rxswift',
          source: 'ios/Podfile',
          confidence: 'high',
        });
      }
    } catch {
      // No Podfile
    }
  }

  // Check Package.swift
  try {
    const packageSwiftPath = path.join(projectPath, 'Package.swift');
    const content = await fs.readFile(packageSwiftPath, 'utf-8');
    if (/RxSwift/.test(content)) {
      if (!signals.some(s => s.name === 'rxswift')) {
        signals.push({
          category: 'framework',
          name: 'rxswift',
          source: 'Package.swift',
          confidence: 'high',
        });
      }
    }
  } catch {
    // No Package.swift
  }

  return signals;
}

/**
 * Extract pod names from Podfile content
 *
 * Parses Podfile Ruby syntax to extract pod dependency names.
 * Handles various pod declaration formats:
 * - pod 'PodName'
 * - pod "PodName"
 * - pod 'PodName', '~> 1.0'
 * - pod 'PodName', :git => '...'
 *
 * @param podfileContent - Content of the Podfile
 * @returns Array of pod names
 */
export function extractPodDependencies(podfileContent: string): string[] {
  const pods: string[] = [];
  const seen = new Set<string>();

  // Match pod declarations: pod 'Name' or pod "Name"
  // Handles optional version/options that follow
  const podRegex = /^\s*pod\s+['"]([^'"]+)['"]/gm;

  let match;
  while ((match = podRegex.exec(podfileContent)) !== null) {
    const podName = match[1];
    // Some pods have subspecs like 'Firebase/Core', extract base name
    const baseName = podName.split('/')[0];
    if (!seen.has(baseName)) {
      seen.add(baseName);
      pods.push(baseName);
    }
  }

  return pods;
}

/**
 * Extract package names from Package.swift content
 *
 * Parses Package.swift to extract Swift package dependency names.
 * Looks for .package(url: "...") or .package(name: "...")
 *
 * @param content - Content of Package.swift
 * @returns Array of package names
 */
export function extractPackageSwiftDependencies(content: string): string[] {
  const packages: string[] = [];
  const seen = new Set<string>();

  // Match .package(url: "https://github.com/owner/repo.git", ...)
  // Extract the repo name from the URL
  const urlRegex = /\.package\s*\(\s*url:\s*["']([^"']+)["']/g;

  let match;
  while ((match = urlRegex.exec(content)) !== null) {
    const url = match[1];
    // Extract repo name from URL (last path component without .git)
    const repoMatch = url.match(/\/([^\/]+?)(?:\.git)?$/);
    if (repoMatch) {
      const repoName = repoMatch[1].replace(/\.git$/, '');
      if (!seen.has(repoName)) {
        seen.add(repoName);
        packages.push(repoName);
      }
    }
  }

  // Also match .package(name: "PackageName", ...)
  const nameRegex = /\.package\s*\(\s*name:\s*["']([^"']+)["']/g;
  while ((match = nameRegex.exec(content)) !== null) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      packages.push(name);
    }
  }

  return packages;
}

/**
 * Extract dependency names from package.json
 *
 * Combines dependencies and devDependencies from package.json.
 *
 * @param packageJson - Parsed package.json object
 * @returns Array of dependency names
 */
export function extractNpmDependencies(packageJson: Record<string, unknown>): string[] {
  const deps: string[] = [];
  const seen = new Set<string>();

  const dependencies = packageJson.dependencies as Record<string, string> | undefined;
  const devDependencies = packageJson.devDependencies as Record<string, string> | undefined;

  if (dependencies) {
    for (const name of Object.keys(dependencies)) {
      if (!seen.has(name)) {
        seen.add(name);
        deps.push(name);
      }
    }
  }

  if (devDependencies) {
    for (const name of Object.keys(devDependencies)) {
      if (!seen.has(name)) {
        seen.add(name);
        deps.push(name);
      }
    }
  }

  return deps;
}

/**
 * Extract dependency names from Gradle build file
 *
 * Parses build.gradle or build.gradle.kts to extract dependencies.
 * Handles various formats:
 * - implementation 'group:artifact:version'
 * - implementation("group:artifact:version")
 * - api 'group:artifact:version'
 * - testImplementation "group:artifact:version"
 *
 * @param content - Content of build.gradle file
 * @returns Array of dependency artifact names
 */
export function extractGradleDependencies(content: string): string[] {
  const deps: string[] = [];
  const seen = new Set<string>();

  // Match various dependency configurations
  // implementation 'com.google.firebase:firebase-core:17.0.0'
  // implementation("com.google.firebase:firebase-core:17.0.0")
  const depRegex = /(?:implementation|api|compileOnly|runtimeOnly|testImplementation|androidTestImplementation)\s*[\(]?\s*['"]([^'"]+)['"]/g;

  let match;
  while ((match = depRegex.exec(content)) !== null) {
    const depString = match[1];
    // Extract artifact name from group:artifact:version format
    const parts = depString.split(':');
    if (parts.length >= 2) {
      const artifactName = parts[1];
      if (!seen.has(artifactName)) {
        seen.add(artifactName);
        deps.push(artifactName);
      }
    }
  }

  return deps;
}
