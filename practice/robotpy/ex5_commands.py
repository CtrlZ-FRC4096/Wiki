"""
Exercise 5: write commands as coroutines with @commandify.

Run the checks:   python -m pytest checks/test_ex5_commands.py

@commandify turns a function into a Command that the scheduler can run. The
function can be plain, or a generator with yield in it:

    @commandify
    def intake():
        robot.is_intaking = True
        yield                  # end of this loop. Continue in the next loop

    self.intake = intake       # store the Command itself. Do NOT call it.

Every yield gives the robot back for one loop (20 ms). When the function
reaches its end, the command finishes and the scheduler removes it.

Two ways to wait:

    while not robot.shooter_ready:   # wait for a condition
        yield

    yield from wait(0.3)             # wait for time, with a helper generator

`yield from` runs another generator to its end, one step for each loop.

This is a short copy of coroutines.py in Robot-2026 (and 2024, where
yield from self.wait(...) is used in almost every command).
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from robot import Robot

from wpilib import Timer

from wpilibextra.coroutine import commandify


def wait(seconds):
    """The same as Robot.wait() in robot.py: yield until the time is over."""
    timer = Timer()
    timer.start()
    while not timer.hasElapsed(seconds):
        yield


class Coroutines:
    def __init__(self, robot: "Robot"):
        self.robot = robot

        # An example command. It is complete.
        @commandify
        def intake():
            robot.is_intaking = True
            yield

        self.intake = intake

        # 5.1  stop_intake: set robot.is_intaking to False.
        #      A plain function is fine. commandify makes it a command anyway.
        #      Store it in self.stop_intake.
        # TODO

        # 5.2  shoot:
        #        robot.shoot_intent = True
        #        wait until robot.shooter_ready is True
        #        robot.feeding = True
        #        wait 0.3 seconds (use: yield from wait(0.3))
        #        robot.feeding = False
        #        robot.shoot_intent = False
        #      Store it in self.shoot.
        # TODO

        # 5.3  empty_hopper: like drive_to_zone_trench in Robot-2026.
        #        robot.shoot_intent = True
        #        wait while robot.fuel_in_hopper is more than 0
        #        robot.shoot_intent = False
        #      Store it in self.empty_hopper.
        # TODO
