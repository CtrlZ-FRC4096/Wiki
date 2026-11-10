import pytest
from wpimath.controller import PIDController
from wpimath.geometry import Translation2d
from wpimath.kinematics import ChassisSpeeds

import ex7_drive_math as ex


def close(a, b, tol=1e-6):
    return abs(a - b) <= tol


@pytest.mark.parametrize("x, expected", [(0.5, 0.25), (-0.5, -0.25), (1.0, 1.0), (0.0, 0.0)])
def test_7_1_square_keeps_the_sign(x, expected):
    got = ex.square(x)
    assert close(got, expected), f"square({x}) should be {expected}, got {got}"


def test_7_2_full_stick_forward():
    got = ex.drive_translation(stick_x=0.0, stick_y=-1.0, should_flip=False)
    assert isinstance(got, Translation2d), f"return a Translation2d, got {type(got).__name__}"
    assert close(got.X(), 4.75) and close(got.Y(), 0.0), (
        f"stick forward (y = -1) is full speed +x: expected (4.75, 0), got ({got.X():.2f}, {got.Y():.2f})"
    )


def test_7_2_half_stick_left():
    got = ex.drive_translation(stick_x=-0.5, stick_y=0.0, should_flip=False)
    assert close(got.X(), 0.0) and close(got.Y(), 0.25 * 4.75), (
        f"half stick left is +y at 0.25 of full speed: expected (0, 1.19), got ({got.X():.2f}, {got.Y():.2f})"
    )


def test_7_2_red_alliance_flips():
    got = ex.drive_translation(stick_x=0.0, stick_y=-1.0, should_flip=True)
    assert close(got.X(), -4.75), f"on red, stick forward drives -x: expected -4.75, got {got.X():.2f}"


def test_7_3_heading_pid_takes_the_short_way():
    pid = ex.make_heading_pid()
    assert isinstance(pid, PIDController), f"return a PIDController, got {type(pid).__name__}"
    assert (pid.getP(), pid.getI(), pid.getD()) == (0.0275, 0.0, 0.0001), (
        f"gains should be (0.0275, 0, 0.0001), got {(pid.getP(), pid.getI(), pid.getD())}"
    )
    out = pid.calculate(350, 10)
    assert 0 < out < 1, (
        f"from 350 to 10 degrees the short way is +20 degrees, so the output must be small "
        f"and positive. Got {out:.2f}. Did you call enableContinuousInput(0, 360)?"
    )


def test_7_3_heading_pid_tolerance():
    pid = ex.make_heading_pid()
    pid.calculate(11.5, 10)
    assert pid.atSetpoint(), "1.5 degrees from the target is inside a tolerance of 2: atSetpoint() should be True"
    pid.calculate(13, 10)
    assert not pid.atSetpoint(), "3 degrees from the target is outside the tolerance: atSetpoint() should be False"


def test_7_4_field_to_robot_speeds():
    got = ex.field_to_robot_speeds(1.0, 0.0, 0.5, heading_degrees=90)
    assert isinstance(got, ChassisSpeeds), f"return ChassisSpeeds, got {type(got).__name__}"
    assert close(got.vx, 0.0) and close(got.vy, -1.0), (
        f"the robot faces +y (90 degrees). Field +x is the robot's right side, so expect "
        f"vx = 0, vy = -1. Got vx = {got.vx:.2f}, vy = {got.vy:.2f}"
    )
    assert close(got.omega, 0.5), f"the turn rate does not change: expected 0.5, got {got.omega}"
