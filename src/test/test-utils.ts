import type { ExecutionResult } from '../utils/executor.js';

/**
 * Mock successful execution result
 */
export function mockSuccessResult(stdout: string = 'Success'): ExecutionResult {
  return {
    stdout,
    stderr: '',
    exitCode: 0,
  };
}

/**
 * Mock failed execution result
 */
export function mockFailureResult(stderr: string = 'Error'): ExecutionResult {
  return {
    stdout: '',
    stderr,
    exitCode: 1,
  };
}

/**
 * Mock warning execution result
 */
export function mockWarningResult(stdout: string = 'Success', stderr: string = 'Warning'): ExecutionResult {
  return {
    stdout,
    stderr,
    exitCode: 0,
  };
}

/**
 * Create mock project structure
 */
export function createMockProject() {
  return {
    ios: {
      fastlane: {
        Fastfile: `
          default_platform(:ios)
          
          platform :ios do
            desc "Build the iOS app"
            lane :build do
              gym(scheme: "App")
            end
            
            desc "Run tests"
            lane :test do
              scan(scheme: "App")
            end
            
            desc "Deploy to AppCenter"
            lane :appcenter do
              appcenter_upload
            end
          end
        `,
      },
    },
    android: {
      fastlane: {
        Fastfile: `
          default_platform(:android)
          
          platform :android do
            desc "Build the Android app"
            lane :build do
              gradle(task: "assembleRelease")
            end
            
            desc "Run tests"
            lane :test do
              gradle(task: "test")
            end
            
            desc "Deploy to AppCenter"
            lane :appcenter do
              appcenter_upload
            end
          end
        `,
      },
    },
  };
}
