"""
Exercise 6: build autonomous routines from command groups.

Run the checks:   python -m pytest checks/test_ex6_autos.py

autoroutines.py in Robot-2026 builds every auto from four commands2 tools:

    SequentialCommandGroup(a, b, c)  a, then b, then c
    ParallelCommandGroup(a, b)       a and b at the same time. Ends when BOTH end
    ParallelRaceGroup(a, b)          a and b at the same time. Ends when ONE ends,
                                     and the other one is cancelled
    cmd.withTimeout(4.0)             cmd, but cancelled after 4 seconds

The commands below stand in for the real path and coroutine commands. Each
one writes to robot.events, so the checks can see what ran and when.

IMPORTANT: a command object can be in ONE group only. If you put the same
object in a second group, commands2 raises IllegalCommandUse. Make new
command objects each time you build an auto.
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from robot import Robot

from commands2 import ParallelCommandGroup, ParallelRaceGroup, SequentialCommandGroup

from ex5_commands import wait
from wpilibextra.coroutine import CoroutineCommand


# ---- Stand-in commands. These are complete. Do not change them. ----------


def drive_path(robot, name, seconds):
    """Stands in for robot.getPathCommand(PathPlannerPath.fromPathFile(name))."""

    def path():
        robot.events.append("start " + name)
        yield from wait(seconds)
        robot.events.append("end " + name)

    return CoroutineCommand(path)


def intake(robot):
    """Runs the intake until something cancels it."""

    def run():
        robot.is_intaking = True
        try:
            while True:
                yield
        finally:  # runs when the command is cancelled
            robot.is_intaking = False

    return CoroutineCommand(run)


def shoot(robot):
    """Shoots for 0.5 seconds."""

    def run():
        robot.events.append("shoot")
        yield from wait(0.5)

    return CoroutineCommand(run)


def empty_hopper(robot):
    """Shoots until the hopper is empty. If a piece is stuck, it never ends."""

    def run():
        robot.events.append("empty")
        while robot.fuel_in_hopper > 0:
            yield

    return CoroutineCommand(run)


# ---- Your autos ------------------------------------------------------------


class AutoRoutines:
    def __init__(self, robot: "Robot"):
        self.robot = robot

        # Robot-2026 makes each path command one time, in robot.py, and keeps it.
        self.p1 = drive_path(robot, "P1", 2.0)

    def shoot_and_leave(self):
        """
        6.1  Shoot the preloaded piece, THEN drive the "Leave" path (1.5 s).
        Return a SequentialCommandGroup.
        """
        # TODO
        raise NotImplementedError("Exercise 6.1: write shoot_and_leave()")

    def grab_and_score(self):
        """
        6.2  Drive path P1 and run the intake at the same time. Stop the
        intake when the path ends. THEN shoot.

        The intake never ends by itself, so a ParallelCommandGroup would never
        end. Which group ends when the path ends?
        """
        # TODO: use self.p1 for the path.
        raise NotImplementedError("Exercise 6.2: write grab_and_score()")

    def empty_then_park(self):
        """
        6.3  Run empty_hopper(self.robot), but give up after 1.0 second.
        THEN drive the "Park" path (1.0 s).
        """
        # TODO
        raise NotImplementedError("Exercise 6.3: write empty_then_park()")

    # 6.4  The checks call grab_and_score() two times, because the auto chooser
    #      can build an auto more than one time. With self.p1 that crashes:
    #      self.p1 is already in the first group. Run the checks to see the
    #      error, then fix grab_and_score() so that it makes a NEW path command
    #      each time it is called.
