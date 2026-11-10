import ntcore
import pytest
import wpilib
from wpilib import SmartDashboard

import ex8_dashboard as ex


def test_8_1_log_shooter():
    ex.log_shooter(55.0, 36.5, True)
    speed = SmartDashboard.getNumber("Shooter/Fly Speed", -1)
    hood = SmartDashboard.getNumber("Shooter/Hood Angle", -1)
    ready = SmartDashboard.getBoolean("Shooter/Ready", False)
    assert speed == 55.0, f'"Shooter/Fly Speed" should be 55.0, got {speed}. Check the key spelling.'
    assert hood == 36.5, f'"Shooter/Hood Angle" should be 36.5, got {hood}'
    assert ready is True, '"Shooter/Ready" should be True. Use putBoolean() for True/False values.'


def test_8_2_default_is_no_auto():
    chooser = ex.make_auto_chooser()
    assert isinstance(chooser, wpilib.SendableChooser), f"return a SendableChooser, got {type(chooser).__name__}"
    assert chooser.getSelected() == 0, f"nothing picked yet: getSelected() should be the default 0, got {chooser.getSelected()}"


def test_8_2_drive_team_picks_left_trench():
    chooser = ex.make_auto_chooser()
    # Act like the drive team: pick an option on the dashboard.
    table = ntcore.NetworkTableInstance.getDefault().getTable("SmartDashboard/Auto Chooser")
    assert "Left Trench" in table.getStringArray("options", []), (
        'the chooser is not on the dashboard with a "Left Trench" option. '
        'Did you call SmartDashboard.putData("Auto Chooser", chooser)?'
    )
    table.putString("selected", "Left Trench")
    SmartDashboard.updateValues()
    assert chooser.getSelected() == 6, f'"Left Trench" was picked: getSelected() should be 6, got {chooser.getSelected()}'


@pytest.mark.parametrize("choice, expected", [(5, "right_trench"), (6, "left_trench"), (0, "no_auto"), (14, "no_auto")])
def test_8_3_pick_auto(choice, expected):
    got = ex.pick_auto(choice)
    assert got == expected, f"pick_auto({choice}) should be {expected!r}, got {got!r}"


def test_8_3_uses_match_case():
    import inspect

    source = inspect.getsource(ex.pick_auto)
    assert "match " in source and "case " in source, "write pick_auto() with match/case, like hopper.py in Robot-2026"


def test_8_4_default_then_dashboard_value():
    key = "Test/Test fly speed"
    assert ex.read_test_fly_speed() == 60, "the key is not on the dashboard yet, so return the default 60"
    SmartDashboard.putNumber(key, 62.5)
    assert ex.read_test_fly_speed() == 62.5, "a mentor typed 62.5 on the dashboard: return 62.5"
