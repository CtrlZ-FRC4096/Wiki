import pytest
from commands2 import Command, CommandScheduler
from commands2.exceptions import IllegalCommandUse

import ex6_autos as ex


def start(auto):
    assert isinstance(auto, Command), f"return a command group, got {type(auto).__name__}"
    CommandScheduler.getInstance().schedule(auto)
    return auto


def test_6_1_shoot_then_leave(robot, step):
    auto = start(ex.AutoRoutines(robot).shoot_and_leave())
    step.seconds(0.2)
    assert robot.events == ["shoot"], f"first shoot, and only shoot. Events so far: {robot.events}"
    step.seconds(0.5)
    assert robot.events == ["shoot", "start Leave"], (
        f"after the 0.5 s shot, start the Leave path. Events: {robot.events}"
    )
    step.seconds(1.6)
    assert robot.events == ["shoot", "start Leave", "end Leave"], f"then the path ends. Events: {robot.events}"
    assert not auto.isScheduled(), "the auto should be finished after the path"


def test_6_2_intake_stops_when_the_path_ends(robot, step):
    auto = start(ex.AutoRoutines(robot).grab_and_score())
    step(2)
    assert robot.events == ["start P1"], f"start with path P1. Events: {robot.events}"
    assert robot.is_intaking, "the intake must run during the path"
    step.seconds(2.1)
    assert "end P1" in robot.events, f"P1 takes 2 s and should be done. Events: {robot.events}"
    assert not robot.is_intaking, (
        "the path ended, so the intake must be cancelled. "
        "ParallelCommandGroup waits for BOTH. Which group ends when ONE ends?"
    )
    step.seconds(0.2)
    assert robot.events[-1] == "shoot", f"after the path, shoot. Events: {robot.events}"
    step.seconds(0.5)
    assert not auto.isScheduled(), "the auto should be finished after the shot"


def test_6_3_give_up_after_one_second(robot, step):
    robot.fuel_in_hopper = 1  # stuck: empty_hopper will never end by itself
    auto = start(ex.AutoRoutines(robot).empty_then_park())
    step.seconds(0.5)
    assert robot.events == ["empty"], f"first empty the hopper. Events: {robot.events}"
    step.seconds(0.6)
    assert robot.events == ["empty", "start Park"], (
        f"after 1.0 s, give up on the hopper and park. Use .withTimeout(1.0). Events: {robot.events}"
    )
    step.seconds(1.1)
    assert not auto.isScheduled(), "the auto should be finished after the Park path"


def test_6_4_build_the_same_auto_two_times(robot, step):
    autos = ex.AutoRoutines(robot)
    first = autos.grab_and_score()
    try:
        second = autos.grab_and_score()
    except IllegalCommandUse:
        pytest.fail(
            "IllegalCommandUse: the same command object is in two groups. "
            "Make a new path command inside grab_and_score() each time it is called."
        )
    start(second)
    step(2)
    assert robot.events == ["start P1"], f"the second copy of the auto must run. Events: {robot.events}"
    assert first is not second, "each call must return a new group"
