"""Error patterns for fastlane and build errors."""

import re
from dataclasses import dataclass


@dataclass
class ErrorPattern:
    """A recognizable error pattern with diagnosis."""
    id: str
    pattern: re.Pattern
    category: str
    message: str
    diagnosis: str
    suggestions: list[str]


ERROR_PATTERNS = [
    ErrorPattern(
        id="no_signing_certificate",
        pattern=re.compile(r"No signing certificate|Code Sign error|No certificate", re.I),
        category="signing",
        message="Code signing certificate not found",
        diagnosis="Your signing certificate is not installed in the keychain or has expired",
        suggestions=[
            "Run 'fastlane match development' to sync certificates",
            "Check Keychain Access for expired certificates",
            "Verify your Apple Developer account has valid certificates",
        ]
    ),
    ErrorPattern(
        id="no_provisioning_profile",
        pattern=re.compile(r"No provisioning profile|Provisioning profile.*not found|couldn't find provisioning profile", re.I),
        category="signing",
        message="Provisioning profile not found",
        diagnosis="The required provisioning profile is missing or expired",
        suggestions=[
            "Run 'fastlane match appstore' or 'fastlane match development'",
            "Check that the bundle ID matches your provisioning profile",
            "Verify the profile hasn't expired in the Developer Portal",
        ]
    ),
    ErrorPattern(
        id="xcode_not_selected",
        pattern=re.compile(r"xcode-select.*error|no developer tools were found", re.I),
        category="environment",
        message="Xcode developer tools not configured",
        diagnosis="Xcode command line tools are not properly installed or selected",
        suggestions=[
            "Run 'xcode-select --install' to install command line tools",
            "Run 'sudo xcode-select -s /Applications/Xcode.app' to select Xcode",
        ]
    ),
    ErrorPattern(
        id="simulator_not_found",
        pattern=re.compile(r"Unable to find a destination matching|No simulator found|destination.*not found", re.I),
        category="simulator",
        message="iOS Simulator not found",
        diagnosis="The specified simulator device or iOS version is not available",
        suggestions=[
            "Open Xcode and download the required simulator runtime",
            "Run 'xcrun simctl list devices' to see available simulators",
            "Check your destination parameter matches an available device",
        ]
    ),
    ErrorPattern(
        id="cocoapods_not_installed",
        pattern=re.compile(r"pod.*command not found|CocoaPods.*not installed", re.I),
        category="dependencies",
        message="CocoaPods not installed",
        diagnosis="CocoaPods is required but not installed",
        suggestions=[
            "Run 'gem install cocoapods'",
            "Run 'pod setup' after installation",
            "Consider using 'bundle exec pod' if using Bundler",
        ]
    ),
    ErrorPattern(
        id="pod_install_failed",
        pattern=re.compile(r"pod install.*failed|Unable to find a specification", re.I),
        category="dependencies",
        message="CocoaPods installation failed",
        diagnosis="One or more pods failed to install",
        suggestions=[
            "Run 'pod repo update' to update the spec repo",
            "Check your Podfile for typos in pod names",
            "Try removing Podfile.lock and running 'pod install' again",
        ]
    ),
    ErrorPattern(
        id="gradle_build_failed",
        pattern=re.compile(r"Gradle build failed|FAILURE: Build failed|Could not resolve", re.I),
        category="build",
        message="Gradle build failed",
        diagnosis="The Android Gradle build encountered an error",
        suggestions=[
            "Run './gradlew clean' and try again",
            "Check build.gradle for dependency conflicts",
            "Verify your Android SDK and build tools are up to date",
        ]
    ),
    ErrorPattern(
        id="android_sdk_not_found",
        pattern=re.compile(r"SDK location not found|ANDROID_HOME.*not set|ANDROID_SDK_ROOT", re.I),
        category="environment",
        message="Android SDK not found",
        diagnosis="The Android SDK is not installed or ANDROID_HOME is not set",
        suggestions=[
            "Install Android Studio which includes the SDK",
            "Set ANDROID_HOME environment variable to your SDK path",
            "Run 'sdkmanager --licenses' to accept licenses",
        ]
    ),
    ErrorPattern(
        id="keystore_not_found",
        pattern=re.compile(r"Keystore.*not found|keystore file|release-key", re.I),
        category="signing",
        message="Android keystore not found",
        diagnosis="The signing keystore file is missing or path is incorrect",
        suggestions=[
            "Verify the keystore path in your gradle.properties",
            "Create a keystore with 'keytool -genkey -v -keystore release.keystore'",
            "Check that MYAPP_RELEASE_STORE_FILE points to the correct file",
        ]
    ),
    ErrorPattern(
        id="ruby_version_mismatch",
        pattern=re.compile(r"ruby.*version.*required|Your Ruby version is", re.I),
        category="environment",
        message="Ruby version mismatch",
        diagnosis="The installed Ruby version doesn't meet requirements",
        suggestions=[
            "Install the required Ruby version with 'rbenv install X.X.X'",
            "Check .ruby-version file for the required version",
            "Run 'rbenv local X.X.X' to set the version for this project",
        ]
    ),
    ErrorPattern(
        id="bundler_not_installed",
        pattern=re.compile(r"bundler.*not found|bundle.*command not found", re.I),
        category="dependencies",
        message="Bundler not installed",
        diagnosis="Ruby Bundler is required but not installed",
        suggestions=[
            "Run 'gem install bundler'",
            "Ensure your Ruby environment is properly configured",
        ]
    ),
    ErrorPattern(
        id="timeout_error",
        pattern=re.compile(r"timed out|timeout|Operation timed out", re.I),
        category="network",
        message="Operation timed out",
        diagnosis="A network operation or build step exceeded the timeout limit",
        suggestions=[
            "Check your network connection",
            "Increase timeout settings if building large projects",
            "Try again - this may be a temporary issue",
        ]
    ),
]
