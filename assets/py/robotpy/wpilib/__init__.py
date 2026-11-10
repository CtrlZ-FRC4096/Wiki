"""
A browser copy of the parts of wpilib (RobotPy 2026) that the wiki
exercises use. Plain Python, no hardware. See assets/py/robotpy/README.md.
"""

import enum as _enum
import math as _math

from ._sim import state as _state
from .interfaces import GenericHID

__all__ = [
    "DataLogManager",
    "DriverStation",
    "Field2d",
    "FieldObject2d",
    "GenericHID",
    "RobotBase",
    "RobotController",
    "RobotState",
    "SendableChooser",
    "SmartDashboard",
    "TimedRobot",
    "Timer",
    "XboxController",
]


# ---------------------------------------------------------------- time ----


class Timer:
    """Seconds since start(). The browser clock moves only when the checks step it."""

    def __init__(self):
        self._start = _state.time
        self._accumulated = 0.0
        self._running = False

    @staticmethod
    def getFPGATimestamp():
        return _state.time

    @staticmethod
    def getTimestamp():
        return _state.time

    def get(self):
        if self._running:
            return self._accumulated + (_state.time - self._start)
        return self._accumulated

    def reset(self):
        self._accumulated = 0.0
        self._start = _state.time

    def start(self):
        if not self._running:
            self._start = _state.time
            self._running = True

    def restart(self):
        if self._running:
            self.stop()
        self.reset()
        self.start()

    def stop(self):
        self._accumulated = self.get()
        self._running = False

    def isRunning(self):
        return self._running

    def hasElapsed(self, period):
        return self.get() >= period

    def advanceIfElapsed(self, period):
        if self.get() >= period:
            self._start += period
            return True
        return False


class RobotController:
    @staticmethod
    def getFPGATime():
        """Microseconds, as an integer."""
        return int(round(_state.time * 1_000_000))

    @staticmethod
    def getBatteryVoltage():
        return _state.battery_voltage


# ---------------------------------------------------------- robot state ----


class RobotBase:
    @staticmethod
    def isSimulation():
        return True

    @staticmethod
    def isReal():
        return False

    def isEnabled(self):
        return _state.enabled

    def isDisabled(self):
        return not _state.enabled

    def isAutonomous(self):
        return _state.autonomous

    def isTeleop(self):
        return not _state.autonomous and not _state.test


class RobotState:
    @staticmethod
    def isEnabled():
        return _state.enabled

    @staticmethod
    def isDisabled():
        return not _state.enabled

    @staticmethod
    def isAutonomous():
        return _state.autonomous

    @staticmethod
    def isTeleop():
        return not _state.autonomous and not _state.test

    @staticmethod
    def isTest():
        return _state.test


class DriverStation:
    class Alliance(_enum.Enum):
        kRed = 0
        kBlue = 1

    @staticmethod
    def getAlliance():
        if _state.alliance == "red":
            return DriverStation.Alliance.kRed
        if _state.alliance == "blue":
            return DriverStation.Alliance.kBlue
        return None

    @staticmethod
    def isEnabled():
        return _state.enabled

    @staticmethod
    def isDisabled():
        return not _state.enabled

    @staticmethod
    def isAutonomous():
        return _state.autonomous

    @staticmethod
    def isTeleop():
        return not _state.autonomous and not _state.test

    @staticmethod
    def isFMSAttached():
        return _state.fms_attached

    @staticmethod
    def getBatteryVoltage():
        return _state.battery_voltage

    @staticmethod
    def getMatchTime():
        return -1.0

    @staticmethod
    def startDataLog(log, logJoysticks=True):
        pass


class DataLogManager:
    @staticmethod
    def start(dir="", filename="", period=0.25):
        pass

    @staticmethod
    def getLog():
        return None

    @staticmethod
    def log(message):
        print(message)


# ------------------------------------------------------------ dashboard ----


class SmartDashboard:
    """Keeps every value in memory. There is no dashboard in the browser."""

    @staticmethod
    def _put(key, value):
        _state.dashboard[key] = value
        return True

    @staticmethod
    def _get(key, default, kinds):
        value = _state.dashboard.get(key, default)
        if kinds and not isinstance(value, kinds):
            return default
        return value

    @staticmethod
    def putNumber(key, value):
        return SmartDashboard._put(key, float(value))

    @staticmethod
    def getNumber(key, defaultValue):
        value = _state.dashboard.get(key)
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return defaultValue
        return value

    @staticmethod
    def putBoolean(key, value):
        return SmartDashboard._put(key, bool(value))

    @staticmethod
    def getBoolean(key, defaultValue):
        value = _state.dashboard.get(key)
        return value if isinstance(value, bool) else defaultValue

    @staticmethod
    def putString(key, value):
        return SmartDashboard._put(key, str(value))

    @staticmethod
    def getString(key, defaultValue):
        value = _state.dashboard.get(key)
        return value if isinstance(value, str) else defaultValue

    @staticmethod
    def putNumberArray(key, value):
        return SmartDashboard._put(key, [float(v) for v in value])

    @staticmethod
    def getNumberArray(key, defaultValue):
        value = _state.dashboard.get(key)
        return value if isinstance(value, list) else defaultValue

    @staticmethod
    def putBooleanArray(key, value):
        return SmartDashboard._put(key, [bool(v) for v in value])

    @staticmethod
    def putStringArray(key, value):
        return SmartDashboard._put(key, [str(v) for v in value])

    @staticmethod
    def putData(key, data):
        _state.dashboard[key] = data

    @staticmethod
    def getData(key):
        return _state.dashboard.get(key)

    @staticmethod
    def containsKey(key):
        return key in _state.dashboard

    @staticmethod
    def updateValues():
        pass


class SendableChooser:
    """The drive team picks an option on the dashboard. getSelected() returns its value."""

    def __init__(self):
        self._options = {}
        self._default = None
        self._selected = None  # an option name, set from the dashboard

    def setDefaultOption(self, name, object):
        self._default = name
        self._options[name] = object

    def addOption(self, name, object):
        self._options[name] = object

    def getSelected(self):
        name = self._selected if self._selected in self._options else self._default
        return self._options.get(name)

    def onChange(self, callback):
        pass


class FieldObject2d:
    def __init__(self, name):
        self._name = name
        self._poses = []

    def setPose(self, *args):
        from wpimath.geometry import Pose2d

        self._poses = [args[0] if len(args) == 1 else Pose2d(*args)]

    def getPose(self):
        from wpimath.geometry import Pose2d

        return self._poses[0] if self._poses else Pose2d()

    def setPoses(self, poses):
        self._poses = list(poses)

    def getPoses(self):
        return list(self._poses)


class Field2d:
    def __init__(self):
        self._objects = {"Robot": FieldObject2d("Robot")}

    def setRobotPose(self, *args):
        self._objects["Robot"].setPose(*args)

    def getRobotPose(self):
        return self._objects["Robot"].getPose()

    def getObject(self, name):
        if name not in self._objects:
            self._objects[name] = FieldObject2d(name)
        return self._objects[name]

    def getRobotObject(self):
        return self._objects["Robot"]


# ------------------------------------------------------------ controllers ----


class XboxController(GenericHID):
    """Reads the controller that cz_sim.Gamepad sets."""

    class Button:
        kLeftBumper = 5
        kRightBumper = 6
        kLeftStick = 9
        kRightStick = 10
        kA = 1
        kB = 2
        kX = 3
        kY = 4
        kBack = 7
        kStart = 8

    class Axis:
        kLeftX = 0
        kRightX = 4
        kLeftY = 1
        kRightY = 5
        kLeftTrigger = 2
        kRightTrigger = 3

    def getLeftX(self):
        return self.getRawAxis(self.Axis.kLeftX)

    def getLeftY(self):
        return self.getRawAxis(self.Axis.kLeftY)

    def getRightX(self):
        return self.getRawAxis(self.Axis.kRightX)

    def getRightY(self):
        return self.getRawAxis(self.Axis.kRightY)

    def getLeftTriggerAxis(self):
        return self.getRawAxis(self.Axis.kLeftTrigger)

    def getRightTriggerAxis(self):
        return self.getRawAxis(self.Axis.kRightTrigger)

    def getAButton(self):
        return self.getRawButton(self.Button.kA)

    def getBButton(self):
        return self.getRawButton(self.Button.kB)

    def getXButton(self):
        return self.getRawButton(self.Button.kX)

    def getYButton(self):
        return self.getRawButton(self.Button.kY)

    def getLeftBumper(self):
        return self.getRawButton(self.Button.kLeftBumper)

    def getRightBumper(self):
        return self.getRawButton(self.Button.kRightBumper)

    def getBackButton(self):
        return self.getRawButton(self.Button.kBack)

    def getStartButton(self):
        return self.getRawButton(self.Button.kStart)

    def getLeftStickButton(self):
        return self.getRawButton(self.Button.kLeftStick)

    def getRightStickButton(self):
        return self.getRawButton(self.Button.kRightStick)


# ----------------------------------------------------------------- robot ----


class TimedRobot(RobotBase):
    """
    In the browser, cz_sim.RobotRunner calls the init and periodic methods,
    in the same order as WPILib: the mode init when the mode changes, then the
    mode periodic, then robotPeriodic, then the addPeriodic callbacks.
    """

    kDefaultPeriod = 0.02

    def __init__(self, period=0.02):
        self._period = period
        self._cz_callbacks = []  # [callback, period, next_time]

    def getPeriod(self):
        return self._period

    def addPeriodic(self, callback, period, offset=0):
        self._cz_callbacks.append([callback, period, _state.time + offset + period])

    def robotInit(self):
        pass

    def robotPeriodic(self):
        pass

    def simulationInit(self):
        pass

    def simulationPeriodic(self):
        pass

    def disabledInit(self):
        pass

    def disabledPeriodic(self):
        pass

    def disabledExit(self):
        pass

    def autonomousInit(self):
        pass

    def autonomousPeriodic(self):
        pass

    def autonomousExit(self):
        pass

    def teleopInit(self):
        pass

    def teleopPeriodic(self):
        pass

    def teleopExit(self):
        pass

    def testInit(self):
        pass

    def testPeriodic(self):
        pass

    def testExit(self):
        pass
