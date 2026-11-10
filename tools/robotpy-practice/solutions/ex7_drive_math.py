"""
Exercise 7: joystick math, a heading PID, and ChassisSpeeds.

Run the checks:   python -m pytest checks/test_ex7_drive_math.py

The drivetrain default command in oi.py (Robot-2026) does this in every loop:

    forward_back = -square(self.driver1.LEFT_JOY_Y())
    left_right = -square(self.driver1.LEFT_JOY_X())
    if self.robot.fieldConstants.shouldFlip:
        forward_back *= -1
        left_right *= -1
    self.robot.drivetrain.drive_with_pid(
        Translation2d(forward_back, left_right) * const.SWERVE_MAX_SPEED,
        self.robot.robot_oriented_angle,
    )

drive_with_pid() then uses a PIDController to turn the robot to the heading,
and drive() makes ChassisSpeeds for the swerve modules.
"""

from wpimath.controller import PIDController
from wpimath.geometry import Rotation2d, Translation2d
from wpimath.kinematics import ChassisSpeeds

SWERVE_MAX_SPEED = 4.75  # meters per second, from const.py


def square(x: float) -> float:
    """
    7.1  Square the stick value but keep its sign: abs(x) * x.

    This makes small stick moves gentle and keeps full speed at full stick.
    """
    return abs(x) * x


def drive_translation(stick_x: float, stick_y: float, should_flip: bool) -> Translation2d:
    """
    7.2  Turn the left stick into a field velocity in meters per second.

    An Xbox stick gives y = -1 when pushed FORWARD and x = -1 when pushed LEFT.
    On the field, forward is +x and left is +y. So:

        forward_back = -square(stick_y)
        left_right   = -square(stick_x)

    On the red alliance (should_flip True) the driver faces the other way, so
    multiply both by -1. Return Translation2d(forward_back, left_right) times
    SWERVE_MAX_SPEED. (A Translation2d can be multiplied by a number.)
    """
    forward_back = -square(stick_y)
    left_right = -square(stick_x)
    if should_flip:
        forward_back *= -1
        left_right *= -1
    return Translation2d(forward_back, left_right) * SWERVE_MAX_SPEED


def make_heading_pid() -> PIDController:
    """
    7.3  Make the heading PID from drivetrain.py in Robot-2026:

        PIDController(0.0275, 0.0, 0.0001)
        enableContinuousInput(0, 360)  # 359 degrees and 1 degree are close
        setTolerance(2)                # within 2 degrees counts as "there"
    """
    pid = PIDController(0.0275, 0.0, 0.0001)
    pid.enableContinuousInput(0, 360)
    pid.setTolerance(2)
    return pid


def field_to_robot_speeds(vx: float, vy: float, omega: float, heading_degrees: float) -> ChassisSpeeds:
    """
    7.4  The driver pushes the stick in FIELD directions. The swerve modules
    need ROBOT directions. Convert with:

        ChassisSpeeds.fromFieldRelativeSpeeds(vx, vy, omega, robot_rotation)

    robot_rotation is a Rotation2d. From drivetrain.drive() in Robot-2026.
    """
    return ChassisSpeeds.fromFieldRelativeSpeeds(vx, vy, omega, Rotation2d.fromDegrees(heading_degrees))
