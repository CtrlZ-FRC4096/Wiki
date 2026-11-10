"""
Exercise 8: SmartDashboard, the auto chooser, and match/case.

Run the checks:   python -m pytest checks/test_ex8_dashboard.py

Every subsystem has a log() method that puts values on the dashboard:

    SmartDashboard.putNumber("Shooter/Hood Position", self.get_hood_position())
    SmartDashboard.putBoolean("States/Shoot Intent", self.robot.shoot_intent)

The "/" in a key makes a folder in AdvantageScope and Elastic.

robot.py in Robot-2026 picks the auto with a SendableChooser, and
hopper.py turns the choice into an auto with match/case.
"""

import wpilib
from wpilib import SmartDashboard


def log_shooter(fly_speed: float, hood_angle: float, ready: bool) -> None:
    """
    8.1  Put three values on the dashboard:
        "Shooter/Fly Speed"   number
        "Shooter/Hood Angle"  number
        "Shooter/Ready"       boolean
    """
    SmartDashboard.putNumber("Shooter/Fly Speed", fly_speed)
    SmartDashboard.putNumber("Shooter/Hood Angle", hood_angle)
    SmartDashboard.putBoolean("Shooter/Ready", ready)


def make_auto_chooser() -> wpilib.SendableChooser:
    """
    8.2  Make a wpilib.SendableChooser with these options:

        setDefaultOption("Default (no auto)", 0)
        addOption("Right Trench", 5)
        addOption("Left Trench", 6)

    Put it on the dashboard with SmartDashboard.putData("Auto Chooser", chooser)
    so the drive team can pick one. Return the chooser.
    """
    chooser = wpilib.SendableChooser()
    chooser.setDefaultOption("Default (no auto)", 0)
    chooser.addOption("Right Trench", 5)
    chooser.addOption("Left Trench", 6)
    SmartDashboard.putData("Auto Chooser", chooser)
    return chooser


def pick_auto(choice: int) -> str:
    """
    8.3  Use match/case (not if/elif) to turn the chooser value into a name:

        5         -> "right_trench"
        6         -> "left_trench"
        any other -> "no_auto"     (case _: matches anything)
    """
    match choice:
        case 5:
            return "right_trench"
        case 6:
            return "left_trench"
        case _:
            return "no_auto"


def read_test_fly_speed() -> float:
    """
    8.4  Read a tuning number that a mentor can type in on the dashboard:

        SmartDashboard.getNumber("Test/Test fly speed", 60)

    The second value is the default. getNumber() returns it when the key is
    not on the dashboard yet.
    """
    return SmartDashboard.getNumber("Test/Test fly speed", 60)
