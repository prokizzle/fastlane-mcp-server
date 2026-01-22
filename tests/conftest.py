"""Shared test fixtures."""

import pytest
from pathlib import Path


@pytest.fixture
def sample_fastfile():
    """Return a sample Fastfile content."""
    return '''
platform :ios do
  desc "Build the app"
  lane :build do
    gym
  end

  desc "Deploy to TestFlight"
  lane :deploy do
    pilot
  end

  private_lane :_helper do
    puts "helper"
  end
end

platform :android do
  desc "Build Android app"
  lane :build do
    gradle(task: "assembleRelease")
  end
end
'''


@pytest.fixture
def ios_project(tmp_path):
    """Create a minimal iOS fastlane project structure."""
    ios_dir = tmp_path / "ios" / "fastlane"
    ios_dir.mkdir(parents=True)

    fastfile = ios_dir / "Fastfile"
    fastfile.write_text('''
desc "Build for development"
lane :build do
  gym(scheme: "MyApp")
end

desc "Run tests"
lane :test do
  scan
end
''')

    return tmp_path


@pytest.fixture
def android_project(tmp_path):
    """Create a minimal Android fastlane project structure."""
    android_dir = tmp_path / "android" / "fastlane"
    android_dir.mkdir(parents=True)

    fastfile = android_dir / "Fastfile"
    fastfile.write_text('''
desc "Build debug APK"
lane :build do
  gradle(task: "assembleDebug")
end
''')

    return tmp_path


@pytest.fixture
def cross_platform_project(tmp_path):
    """Create a project with both iOS and Android."""
    # iOS
    ios_dir = tmp_path / "ios" / "fastlane"
    ios_dir.mkdir(parents=True)
    (ios_dir / "Fastfile").write_text('''
lane :build do
  gym
end
''')

    # Android
    android_dir = tmp_path / "android" / "fastlane"
    android_dir.mkdir(parents=True)
    (android_dir / "Fastfile").write_text('''
lane :build do
  gradle
end
''')

    return tmp_path
