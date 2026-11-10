"""
Exercise 1: field geometry with wpimath.

Run the checks:   python -m pytest checks/test_ex1_geometry.py

Our robot code describes every position on the field with three classes:

    Translation2d(x, y)        a point, in meters
    Rotation2d.fromDegrees(a)  a heading
    Pose2d(x, y, rotation)     a point and a heading together

The blue alliance wall is x = 0. The red alliance wall is x = FIELD_LENGTH.
Positions in our code are written for blue. On red, the code "flips" them.
"""

from wpimath.geometry import Pose2d, Rotation2d, Translation2d
from wpimath.units import inchesToMeters

FIELD_LENGTH = 16.54  # meters
FIELD_WIDTH = 8.07  # meters


def hub_distance(robot_pose: Pose2d, hub: Translation2d) -> float:
    """
    1.1  Return the distance in meters from the robot to the hub.

    From drivetrain.get_hub_distance() in Robot-2026:
        return (pos - hub_pos).norm()

    Subtract two Translation2d objects to get the arrow from one to the other.
    .norm() gives the length of that arrow.
    """
    # TODO: get the robot's Translation2d from the pose, subtract, and return the length.
    raise NotImplementedError("Exercise 1.1: write hub_distance()")


def flip_translation(point: Translation2d, should_flip: bool) -> Translation2d:
    """
    1.2  Flip a blue-side point to the red side when should_flip is True.

    The red point is (FIELD_LENGTH - x, FIELD_WIDTH - y).
    When should_flip is False, return the point with no change.

    From field_const.flip_Translation2d() in Robot-2026.
    """
    # TODO
    raise NotImplementedError("Exercise 1.2: write flip_translation()")


def flip_pose(pose: Pose2d, should_flip: bool) -> Pose2d:
    """
    1.3  Flip a whole pose.

    Flip the translation with flip_translation(). Turn the rotation by 180
    degrees with rotation.rotateBy(Rotation2d.fromDegrees(180)).
    When should_flip is False, return the pose with no change.

    From field_const.flip_Pose2d() in Robot-2026.
    """
    # TODO
    raise NotImplementedError("Exercise 1.3: write flip_pose()")


def point_in_front(robot_pose: Pose2d, distance_inches: float) -> Translation2d:
    """
    1.4  Return the field point that is distance_inches in front of the robot.

    "In front" means along the direction the robot faces. Make an arrow that
    points forward in the robot's own frame, Translation2d(meters, 0), turn it
    by the robot's rotation with .rotateBy(), then add it to the robot's
    translation.

    Remember: wpimath uses meters. Convert with inchesToMeters().

    From intake.intake_pose_in_trench() in Robot-2026, which checks the
    point in front of the intake.
    """
    # TODO
    raise NotImplementedError("Exercise 1.4: write point_in_front()")
