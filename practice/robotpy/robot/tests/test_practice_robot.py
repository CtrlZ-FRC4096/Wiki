"""
Tests that run the whole practice robot, the same way the robot runs on the
field. Run them in the robot folder (practice/robotpy/robot) with:

    python -m robotpy test

pyfrc gives each test two fixtures:

    robot     the Robot object from robot.py
    control   starts the robot and moves time forward:
              control.step_timing(seconds=..., autonomous=..., enabled=...)
"""

from wpilib.simulation import XboxControllerSim


def teleop(control, seconds):
    control.step_timing(seconds=seconds, autonomous=False, enabled=True)


def auto(control, seconds):
    control.step_timing(seconds=seconds, autonomous=True, enabled=True)


def test_r1_r2_left_trigger_runs_the_intake(control, robot):
    with control.run_robot():
        pad = XboxControllerSim(0)
        teleop(control, 0.5)
        assert robot.intake.get_speed() == 0, "the intake must be off at the start of teleop"

        pad.setLeftTriggerAxis(1.0)
        teleop(control, 0.2)
        assert robot.is_intaking, "R.2: holding the left trigger should set robot.is_intaking"
        assert robot.intake.get_speed() == 0.85, (
            f"R.1: is_intaking is True, so the intake should run at 85% (0.85), got {robot.intake.get_speed()}"
        )

        pad.setLeftTriggerAxis(0.0)
        teleop(control, 0.2)
        assert not robot.is_intaking, "R.2: releasing the left trigger should clear robot.is_intaking"
        assert robot.intake.get_speed() == 0, "R.1: with no flags set, the intake must stop"


def test_r1_clear_jam_wins(control, robot):
    with control.run_robot():
        pad = XboxControllerSim(0)
        teleop(control, 0.5)
        pad.setLeftTriggerAxis(1.0)
        pad.setPOV(270)  # POV LEFT
        teleop(control, 0.2)
        assert robot.intake.get_speed() == -0.30, (
            f"R.1: clear_jam is checked first, so the intake should run at -30% (-0.30), got {robot.intake.get_speed()}"
        )


def test_r3_auto_intakes_then_stops(control, robot):
    with control.run_robot():
        auto(control, 1.0)
        assert robot.intake.get_speed() == 0.85, (
            f"R.3: 1 s into auto the intake should run at 0.85, got {robot.intake.get_speed()}"
        )
        auto(control, 1.5)
        assert robot.intake.get_speed() == 0, (
            f"R.3: after {2.0} s of auto the intake should stop, got {robot.intake.get_speed()}"
        )


def test_r3_auto_works_two_times(control, robot):
    with control.run_robot():
        auto(control, 2.5)
        control.step_timing(seconds=0.5, autonomous=True, enabled=False)
        auto(control, 1.0)
        assert robot.intake.get_speed() == 0.85, (
            "R.3: the second auto should intake too. If the robot crashed with IllegalCommandUse, "
            "make new commands inside make_auto() each time"
        )


def test_disabled_stops_everything(control, robot):
    with control.run_robot():
        pad = XboxControllerSim(0)
        teleop(control, 0.5)
        pad.setLeftTriggerAxis(1.0)
        teleop(control, 0.2)
        control.step_timing(seconds=0.2, autonomous=False, enabled=False)
        assert robot.intake.get_speed() == 0, (
            "when the robot is disabled, every subsystem must stop and stay stopped. "
            "periodic() still runs when disabled, so disabled_mode() clears the flags."
        )
