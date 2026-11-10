import math

import pytest
from wpimath.geometry import Pose2d, Rotation2d, Translation2d

import ex1_geometry as ex


def close(a, b, tol=1e-6):
    return abs(a - b) <= tol


def test_1_1_distance_to_the_hub():
    pose = Pose2d(1.0, 2.0, Rotation2d.fromDegrees(30))
    got = ex.hub_distance(pose, Translation2d(4.0, 6.0))
    assert isinstance(got, float), f"return a float in meters, got {type(got).__name__}"
    assert close(got, 5.0), f"robot at (1, 2), hub at (4, 6): expected 5.0 m, got {got}"


def test_1_1_heading_does_not_change_distance():
    a = ex.hub_distance(Pose2d(0, 0, Rotation2d.fromDegrees(0)), Translation2d(3, 4))
    b = ex.hub_distance(Pose2d(0, 0, Rotation2d.fromDegrees(170)), Translation2d(3, 4))
    assert close(a, b), f"the heading must not change the distance: got {a} and {b}"


def test_1_2_flip_to_red():
    got = ex.flip_translation(Translation2d(1.0, 2.0), True)
    assert isinstance(got, Translation2d), f"return a Translation2d, got {type(got).__name__}"
    assert close(got.X(), ex.FIELD_LENGTH - 1.0) and close(got.Y(), ex.FIELD_WIDTH - 2.0), (
        f"(1, 2) flipped should be ({ex.FIELD_LENGTH - 1.0:.2f}, {ex.FIELD_WIDTH - 2.0:.2f}), "
        f"got ({got.X():.2f}, {got.Y():.2f})"
    )


def test_1_2_no_flip_on_blue():
    got = ex.flip_translation(Translation2d(1.0, 2.0), False)
    assert close(got.X(), 1.0) and close(got.Y(), 2.0), (
        f"should_flip is False, so (1, 2) must not change. Got ({got.X():.2f}, {got.Y():.2f})"
    )


def test_1_3_flip_pose_turns_the_heading():
    got = ex.flip_pose(Pose2d(1.0, 2.0, Rotation2d.fromDegrees(30)), True)
    assert isinstance(got, Pose2d), f"return a Pose2d, got {type(got).__name__}"
    assert close(got.X(), ex.FIELD_LENGTH - 1.0) and close(got.Y(), ex.FIELD_WIDTH - 2.0), (
        f"the translation must flip too, got ({got.X():.2f}, {got.Y():.2f})"
    )
    heading = got.rotation().degrees()
    assert close(heading, -150.0, 1e-4), (
        f"30 degrees turned by 180 is -150 degrees (Rotation2d wraps to -180..180), got {heading:.1f}"
    )


def test_1_3_no_flip_on_blue():
    pose = Pose2d(1.0, 2.0, Rotation2d.fromDegrees(30))
    got = ex.flip_pose(pose, False)
    assert close(got.X(), 1.0) and close(got.rotation().degrees(), 30.0, 1e-4), (
        "should_flip is False, so the pose must not change"
    )


@pytest.mark.parametrize(
    "heading, expected",
    [(0, (1.254, 2.0)), (90, (1.0, 2.254)), (180, (0.746, 2.0))],
)
def test_1_4_point_in_front(heading, expected):
    pose = Pose2d(1.0, 2.0, Rotation2d.fromDegrees(heading))
    got = ex.point_in_front(pose, 10.0)  # 10 inches is 0.254 m
    assert isinstance(got, Translation2d), f"return a Translation2d, got {type(got).__name__}"
    assert close(got.X(), expected[0], 1e-3) and close(got.Y(), expected[1], 1e-3), (
        f"robot at (1, 2) facing {heading} degrees: 10 in ahead is "
        f"({expected[0]:.3f}, {expected[1]:.3f}), got ({got.X():.3f}, {got.Y():.3f}). "
        "Did you convert inches to meters, and rotate by the robot's heading?"
    )
