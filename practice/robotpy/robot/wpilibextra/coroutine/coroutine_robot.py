import typing

from wpilib import TimedRobot

# from typing import TypeAlias
from .coroutine_command import ensure_generator_function

seconds = float


class CoroutineRobot(TimedRobot):
    _teleop_coro: typing.Generator
    _autonomous_coro: typing.Generator
    _disabled_coro: typing.Generator
    _test_coro: typing.Generator
    _robot_coro: typing.Generator

    def __init__(self, period: seconds = 0.02) -> None:
        super().__init__(period)

    # PRACTICE PACK CHANGE: Robot-2026 makes these eight functions inside
    # __init__ and stores them on the object (self.robotInit = robotInit).
    # They work the same way here, but as normal methods of the class.
    # Stored on the object, they hide the robotInit() that "python -m robotpy
    # test" adds to see that the robot started, so every test timed out.

    def teleopInit(self):
        self._teleop_coro = ensure_generator_function(self.teleop_mode)()
        self._autonomous_coro, self._disabled_coro, self._test_coro = None, None, None  # type: ignore
        self.teleopPeriodic()

    def teleopPeriodic(self):
        next(self._teleop_coro, None)

    def autonomousInit(self):
        self._autonomous_coro = ensure_generator_function(self.autonomous_mode)()
        self._teleop_coro, self._disabled_coro, self._test_coro = None, None, None  # type: ignore
        self.autonomousPeriodic()

    def autonomousPeriodic(self):
        next(self._autonomous_coro, None)

    def disabledInit(self):
        self._disabled_coro = ensure_generator_function(self.disabled_mode)()
        self._teleop_coro, self._autonomous_coro, self._test_coro = None, None, None  # type: ignore
        self.disabledPeriodic()

    def disabledPeriodic(self):
        next(self._disabled_coro, None)

    def testInit(self):
        self._test_coro = ensure_generator_function(self.test_mode)()
        self._teleop_coro, self._autonomous_coro, self._disabled_coro = None, None, None  # type: ignore
        self.testPeriodic()

    def testPeriodic(self):
        next(self._test_coro, None)

    def robotInit(self):
        self._robot_coro = ensure_generator_function(self.robot_start)()
        self.robotPeriodic()

    def robotPeriodic(self):
        next(self._robot_coro, None)

    def addPeriodic(
        self, period: seconds, offset: seconds = 0
    ) -> typing.Callable[[typing.Callable[[], None]], None]:
        def wrapper(callback: typing.Callable[[], None]):
            TimedRobot.addPeriodic(self, callback, period, offset)

        return wrapper

    def robot_start(self):
        """
        Robot-wide code should go here.

        This coroutine is resumed every loop (50 times / second by default)
        """

    def teleop_mode(self):
        """
        Teleop mode code should go here.

        If the robot is in teleop mode, This coroutine is resumed every loop (50 times / second by default)
        If the robot exits teleop mode, this coroutine is cancelled and will start from the beginning the next time the robot enters teleop mode.
        """

    def autonomous_mode(self):
        """
        Autonomous mode code should go here.

        If the robot is in Autonomous mode, This coroutine is resumed every loop (50 times / second by default)
        If the robot exits Autonomous mode, this coroutine is cancelled and will start from the beginning the next time the robot enters Autonomous mode.
        """

    def disabled_mode(self):
        """
        Disabled mode code should go here.

        If the robot is in Disabled mode, This coroutine is resumed every loop (50 times / second by default)
        If the robot exits Disabled mode, this coroutine is cancelled and will start from the beginning the next time the robot enters Disabled mode.
        """

    def test_mode(self):
        """
        Test mode code should go here.

        If the robot is in Test mode, This coroutine is resumed every loop (50 times / second by default)
        If the robot exits Test mode, this coroutine is cancelled and will start from the beginning the next time the robot enters Test mode.
        """
