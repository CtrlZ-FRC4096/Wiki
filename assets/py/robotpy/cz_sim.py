"""
Helpers for the checks of the wiki exercises. Not part of RobotPy.

    reset()                      a new scheduler, the clock at 0, the robot enabled in teleop
    step(loops=1)                move time 20 ms, then run the scheduler one time, for each loop
    step_seconds(seconds)        step() for that many seconds
    Gamepad(port)                press buttons on a simulated Xbox controller
    FakeRobot()                  an object with the state flags that the exercises use
    choose(key, option)          pick an option in a SendableChooser on the dashboard
    RobotRunner(RobotClass)      run a whole robot class, mode by mode

tools/robotpy-browser/real/cz_sim.py has the same helpers for the real RobotPy.
"""

from commands2 import CommandScheduler
from wpilib._sim import state as _state

LOOP = 0.02  # seconds, the same as TimedRobot

_BUTTONS = {
    "A": 1,
    "B": 2,
    "X": 3,
    "Y": 4,
    "LeftBumper": 5,
    "RightBumper": 6,
    "Back": 7,
    "Start": 8,
    "LeftStick": 9,
    "RightStick": 10,
}

_AXES = {"LeftX": 0, "LeftY": 1, "LeftTrigger": 2, "RightTrigger": 3, "RightX": 4, "RightY": 5}


def reset():
    """A clean, enabled, teleop robot: a new scheduler and the clock at 0."""
    _state.reset()
    _state.enabled = True
    CommandScheduler.resetInstance()


def set_mode(enabled=True, autonomous=False):
    _state.enabled = enabled
    _state.autonomous = autonomous


def step(loops=1):
    for _ in range(loops):
        _state.time += LOOP
        CommandScheduler.getInstance().run()


def step_seconds(seconds):
    step(round(seconds / LOOP))


def now():
    return _state.time


class Gamepad:
    """A simulated Xbox controller. Make it before XboxCommandController(port)."""

    def __init__(self, port=0):
        self.port = port
        _state.joystick(port)

    def press(self, name):
        _state.joystick(self.port)["buttons"][_BUTTONS[name]] = True

    def release(self, name):
        _state.joystick(self.port)["buttons"][_BUTTONS[name]] = False

    def set_axis(self, name, value):
        """name is LeftX, LeftY, RightX, RightY, LeftTrigger or RightTrigger."""
        _state.joystick(self.port)["axes"][_AXES[name]] = float(value)

    def set_pov(self, degrees):
        """0 is up, 90 right, 180 down, 270 left, -1 not pressed."""
        _state.joystick(self.port)["pov"] = int(degrees)

    def rumble(self):
        return _state.rumble.get(self.port, {}).get("left", 0.0)


class FakeRobot:
    """Stands in for the Robot object from robot.py, with the flags the exercises use."""

    def __init__(self):
        self.is_intaking = False
        self.shoot_intent = False
        self.spin_down = False
        self.clear_jam = False
        self.shooter_ready = False
        self.feeding = False
        self.rumble_d1 = False
        self.robot_oriented_angle = 90.0
        self.fuel_in_hopper = 0
        self.events = []

    def isSimulation(self):
        return True


def choose(key, option):
    """Act like the drive team: pick option in the chooser put on the dashboard as key."""
    chooser = _state.dashboard.get(key)
    if chooser is None or not hasattr(chooser, "_options"):
        raise KeyError("no SendableChooser on the dashboard as %r" % key)
    if option not in chooser._options:
        raise KeyError("the chooser %r has no option %r" % (key, option))
    chooser._selected = option


def chooser_options(key):
    chooser = _state.dashboard.get(key)
    return list(chooser._options) if chooser is not None and hasattr(chooser, "_options") else []


class RobotRunner:
    """
    Runs a robot class the way TimedRobot does, one 20 ms loop at a time:

        runner = RobotRunner(Robot)
        runner.step_timing(seconds=1.0, autonomous=False, enabled=True)
        runner.robot.intake.get_speed()

    step_timing has the same arguments as the one in pyfrc's robot tests.
    """

    def __init__(self, robot_class):
        reset()
        _state.enabled = False
        self.robot = robot_class()
        self._mode = None
        self.robot.robotInit()

    def _current_mode(self):
        if not _state.enabled:
            return "disabled"
        if _state.autonomous:
            return "autonomous"
        return "teleop"

    def step_timing(self, seconds, autonomous=False, enabled=True):
        _state.enabled = enabled
        _state.autonomous = autonomous
        for _ in range(round(seconds / LOOP)):
            self._loop()
            _state.time += LOOP

    def _loop(self):
        robot = self.robot
        mode = self._current_mode()
        # The same order as IterativeRobotBase.loopFunc in WPILib.
        if mode != self._mode:
            if self._mode is not None:
                getattr(robot, self._mode + "Exit")()
            self._mode = mode
            getattr(robot, mode + "Init")()
        getattr(robot, mode + "Periodic")()
        robot.robotPeriodic()
        for callback in getattr(robot, "_cz_callbacks", []):
            function, period, next_time = callback
            if _state.time + 1e-9 >= next_time:
                function()
                callback[2] = next_time + period


def _cz_shutdown():
    """Nothing to stop in the browser. The real-RobotPy version stops robot threads."""
