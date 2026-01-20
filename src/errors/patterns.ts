export interface ErrorPattern {
  id: string;
  pattern: RegExp;
  category: 'signing' | 'build' | 'credentials' | 'environment' | 'network';
  message: string;
  diagnosis: string;
  suggestions: string[];
}

export const ERROR_PATTERNS: ErrorPattern[] = [
  // Code Signing
  {
    id: 'no_signing_certificate',
    pattern: /No signing certificate|Code Sign error|No certificate/i,
    category: 'signing',
    message: 'Code signing certificate not found',
    diagnosis: 'Your signing certificate is not installed in the keychain or has expired',
    suggestions: [
      "Run 'fastlane match development' to sync certificates",
      'Check Keychain Access for expired certificates',
      'Verify your Apple Developer account has valid certificates',
    ],
  },
  {
    id: 'provisioning_profile_mismatch',
    pattern: /Provisioning profile.*doesn't match|no matching provisioning/i,
    category: 'signing',
    message: 'Provisioning profile mismatch',
    diagnosis: 'The provisioning profile does not match the signing certificate or bundle ID',
    suggestions: [
      "Run 'fastlane match' to regenerate profiles",
      'Verify bundle ID matches in Xcode and Apple Developer Portal',
      'Check that certificate and profile are for the same team',
    ],
  },
  {
    id: 'device_not_registered',
    pattern: /device.*not.*registered|Unable to install.*device/i,
    category: 'signing',
    message: 'Device not registered for development',
    diagnosis: 'This device UDID is not in your provisioning profile',
    suggestions: [
      'Add device UDID to Apple Developer Portal',
      "Run 'fastlane match --force' to regenerate profiles with new device",
      "Use 'fastlane register_devices' to add devices",
    ],
  },

  // Build Errors
  {
    id: 'module_not_found',
    pattern: /No such module|module.*not found|Cannot find module/i,
    category: 'build',
    message: 'Module or dependency not found',
    diagnosis: 'A required module or framework is missing',
    suggestions: [
      "Run 'pod install' for CocoaPods dependencies",
      "Run 'swift package resolve' for SPM dependencies",
      'Check that the module name is spelled correctly',
    ],
  },
  {
    id: 'linker_error',
    pattern: /Linker command failed|ld: symbol|Undefined symbol/i,
    category: 'build',
    message: 'Linker error',
    diagnosis: 'The linker cannot find required symbols or libraries',
    suggestions: [
      'Check that all required frameworks are linked',
      'Verify library search paths in build settings',
      'Clean build folder and rebuild',
    ],
  },

  // Credentials
  {
    id: 'auth_failed',
    pattern: /Authentication failed|Invalid credentials|401 Unauthorized/i,
    category: 'credentials',
    message: 'Authentication failed',
    diagnosis: 'Your credentials are invalid or expired',
    suggestions: [
      'Verify your Apple ID and app-specific password',
      'Check that API keys are correct and not expired',
      'Re-authenticate with fastlane',
    ],
  },
  {
    id: 'rate_limited',
    pattern: /rate limit|too many requests|429/i,
    category: 'credentials',
    message: 'Rate limited',
    diagnosis: 'Too many requests to the API',
    suggestions: [
      'Wait a few minutes before retrying',
      'Check if other CI jobs are running simultaneously',
    ],
  },

  // Environment
  {
    id: 'java_home_not_set',
    pattern: /JAVA_HOME.*not set|No Java runtime present/i,
    category: 'environment',
    message: 'Java not configured',
    diagnosis: 'JAVA_HOME environment variable is not set',
    suggestions: [
      'Install JDK and set JAVA_HOME',
      "Add 'export JAVA_HOME=$(/usr/libexec/java_home)' to your shell profile",
    ],
  },
  {
    id: 'android_sdk_not_found',
    pattern: /SDK location not found|ANDROID_HOME.*not set/i,
    category: 'environment',
    message: 'Android SDK not found',
    diagnosis: 'Android SDK is not installed or ANDROID_HOME is not set',
    suggestions: [
      'Install Android Studio',
      'Set ANDROID_HOME to your SDK location',
      'Typically: export ANDROID_HOME=$HOME/Library/Android/sdk',
    ],
  },
  {
    id: 'xcode_select',
    pattern: /xcrun: error|xcode-select.*error/i,
    category: 'environment',
    message: 'Xcode command line tools issue',
    diagnosis: 'Xcode command line tools are not properly configured',
    suggestions: [
      "Run 'xcode-select --install'",
      "Run 'sudo xcode-select -s /Applications/Xcode.app'",
    ],
  },
];
