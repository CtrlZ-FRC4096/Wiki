import pytest
from commands2 import Command, CommandScheduler

import ex5_commands as ex


def schedule(command):
    CommandScheduler.getInstance().schedule(command)


def run(step, loops=1):
    try:
        step(loops)
    except TypeError as e:
        pytest.fail(
            f"the command crashed: {e}. Did you write self.x = x()? "
            "Store the command itself: self.x = x"
        )


def get(coroutines, name):
    cmd = getattr(coroutines, name, None)
    assert cmd is not None, f"store the command in self.{name}"
    assert isinstance(cmd, Command), (
        f"self.{name} must be a Command made by @commandify, got {type(cmd).__name__}"
    )
    return cmd


def test_example_intake(robot, step):
    co = ex.Coroutines(robot)
    schedule(co.intake)
    run(step, 2)
    assert robot.is_intaking is True, "the example intake command must still set is_intaking"


def test_5_1_stop_intake(robot, step):
    co = ex.Coroutines(robot)
    robot.is_intaking = True
    schedule(get(co, "stop_intake"))
    run(step, 2)
    assert robot.is_intaking is False, "stop_intake must set robot.is_intaking to False"


def test_5_2_shoot_waits_for_the_shooter(robot, step):
    co = ex.Coroutines(robot)
    shoot = get(co, "shoot")
    schedule(shoot)
    run(step)
    assert robot.shoot_intent is True, "shoot must set shoot_intent = True first"
    run(step, 25)
    assert robot.feeding is False, (
        "the shooter is not ready yet, so shoot must NOT feed. Wait with: while not robot.shooter_ready: yield"
    )
    assert shoot.isScheduled(), "shoot must keep running while it waits for the shooter"


def test_5_2_shoot_feeds_for_point_3_seconds(robot, step):
    co = ex.Coroutines(robot)
    shoot = get(co, "shoot")
    schedule(shoot)
    run(step, 3)
    robot.shooter_ready = True
    run(step, 2)
    assert robot.feeding is True, "the shooter is ready: shoot should set feeding = True"
    step.seconds(0.2)
    assert robot.feeding is True, "0.2 s into the feed, feeding should still be True"
    step.seconds(0.2)
    assert robot.feeding is False, "after 0.3 s, feeding should be False"
    assert robot.shoot_intent is False, "at the end, shoot_intent should be False"
    assert not shoot.isScheduled(), "shoot should be finished, so the scheduler removes it"


def test_5_3_empty_hopper_runs_until_empty(robot, step):
    co = ex.Coroutines(robot)
    empty = get(co, "empty_hopper")
    robot.fuel_in_hopper = 3
    schedule(empty)
    run(step, 2)
    assert robot.shoot_intent is True, "empty_hopper must set shoot_intent = True"
    for fuel in (2, 1):
        robot.fuel_in_hopper = fuel
        run(step, 5)
        assert empty.isScheduled(), f"{fuel} fuel left: empty_hopper must still be running"
    robot.fuel_in_hopper = 0
    run(step, 2)
    assert not empty.isScheduled(), "the hopper is empty: empty_hopper must finish"
    assert robot.shoot_intent is False, "at the end, shoot_intent should be False"


def test_5_3_empty_hopper_ends_at_once_if_empty(robot, step):
    co = ex.Coroutines(robot)
    empty = get(co, "empty_hopper")
    robot.fuel_in_hopper = 0
    schedule(empty)
    run(step, 3)
    assert not empty.isScheduled(), "with no fuel, empty_hopper must finish at once"
