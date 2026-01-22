"""Tests for lane parsing."""

import pytest
from fastlane_mcp.discovery.lanes import parse_lanes_from_fastfile, LaneInfo


class TestParseLanesFromFastfile:
    def test_parses_simple_lane(self):
        content = '''
lane :build do
  gym
end
'''
        lanes = parse_lanes_from_fastfile(content)
        assert len(lanes) == 1
        assert lanes[0].name == "build"
        assert lanes[0].platform is None
        assert lanes[0].is_private is False

    def test_parses_lane_with_platform(self):
        content = '''
platform :ios do
  lane :build do
    gym
  end
end
'''
        lanes = parse_lanes_from_fastfile(content)
        assert len(lanes) == 1
        assert lanes[0].name == "build"
        assert lanes[0].platform == "ios"

    def test_parses_private_lane(self):
        content = '''
private_lane :helper do
  puts "helper"
end
'''
        lanes = parse_lanes_from_fastfile(content)
        assert len(lanes) == 1
        assert lanes[0].name == "helper"
        assert lanes[0].is_private is True

    def test_parses_underscore_prefixed_as_private(self):
        content = '''
lane :_internal do
  puts "internal"
end
'''
        lanes = parse_lanes_from_fastfile(content)
        assert len(lanes) == 1
        assert lanes[0].is_private is True

    def test_parses_description(self):
        content = '''
desc "Build the app"
lane :build do
  gym
end
'''
        lanes = parse_lanes_from_fastfile(content)
        assert len(lanes) == 1
        assert lanes[0].description == "Build the app"

    def test_parses_single_quoted_description(self):
        content = """
desc 'Build the app'
lane :build do
  gym
end
"""
        lanes = parse_lanes_from_fastfile(content)
        assert len(lanes) == 1
        assert lanes[0].description == "Build the app"

    def test_parses_multiple_lanes(self):
        content = '''
platform :ios do
  desc "Build for testing"
  lane :build do
    gym
  end

  desc "Deploy to TestFlight"
  lane :deploy do
    pilot
  end
end

platform :android do
  lane :build do
    gradle
  end
end
'''
        lanes = parse_lanes_from_fastfile(content)
        assert len(lanes) == 3

        ios_build = next(l for l in lanes if l.name == "build" and l.platform == "ios")
        assert ios_build.description == "Build for testing"

        ios_deploy = next(l for l in lanes if l.name == "deploy")
        assert ios_deploy.description == "Deploy to TestFlight"

        android_build = next(l for l in lanes if l.platform == "android")
        assert android_build.name == "build"

    def test_skips_comments(self):
        content = '''
# This is a comment
lane :build do
  gym
end
'''
        lanes = parse_lanes_from_fastfile(content)
        assert len(lanes) == 1

    def test_returns_empty_for_empty_content(self):
        lanes = parse_lanes_from_fastfile("")
        assert lanes == []
