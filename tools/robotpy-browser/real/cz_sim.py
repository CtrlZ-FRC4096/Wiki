"""
The same helpers as assets/py/robotpy/cz_sim.py, built on the REAL RobotPy
2026 simulation. tools/validate-robotpy-browser.py uses this file to run the
lesson 7 checks against the real libraries. Not used by the website.
"""

import threading

import ntcore
import wpilib
from commands2 import CommandScheduler
from wpilib import SmartDashboard
from wpilib.interfaces import GenericHID
from wpilib.simulation import (
    DriverStationSim,
    XboxControllerSim,
    pauseTiming,
    restartTiming,
    stepTiming,
    stepTimingAsync,
)

LOOP = 0.02

_sims = {}


def _send():
    DriverStationSim.notifyNewData()


def reset():
    DriverStationSim.resetData()
    DriverStationSim.setEnabled(True)
    DriverStationSim.setAutonomous(False)
    _send()
    CommandScheduler.resetInstance()
    restartTiming()
    pauseTiming()
    _sims.clear()


def set_mode(enabled=True, autonomous=False):
    DriverStationSim.setEnabled(enabled)
    DriverStationSim.setAutonomous(autonomous)
    _send()


def step(loops=1):
    for _ in range(loops):
        stepTiming(LOOP)
        CommandScheduler.getInstance().run()


def step_seconds(seconds):
    step(round(seconds / LOOP))


def now():
    return wpilib.Timer.getFPGATimestamp()


class Gamepad:
    def __init__(self, port=0):
        self.port = port
        self.sim = XboxControllerSim(port)
        _sims[port] = self.sim
        _send()

    def press(self, name):
        getattr(self.sim, "set" + name + "Button")(True)
        _send()

    def release(self, name):
        getattr(self.sim, "set" + name + "Button")(False)
        _send()

    def set_axis(self, name, value):
        if name.endswith("Trigger"):
            getattr(self.sim, "set" + name + "Axis")(value)
        else:
            getattr(self.sim, "set" + name)(value)
        _send()

    def set_pov(self, degrees):
        self.sim.setPOV(degrees)
        _send()

    def rumble(self):
        return self.sim.getRumble(GenericHID.RumbleType.kLeftRumble)


class FakeRobot:
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
        return wpilib.RobotBase.isSimulation()


def _table(key):
    return ntcore.NetworkTableInstance.getDefault().getTable("SmartDashboard/" + key)


def chooser_options(key):
    return list(_table(key).getStringArray("options", []))


def choose(key, option):
    if option not in chooser_options(key):
        raise KeyError("the chooser %r has no option %r" % (key, option))
    _table(key).putString("selected", option)
    SmartDashboard.updateValues()


class RobotRunner:
    """
    Runs a robot class the way pyfrc's robot tests do: startCompetition() in a
    thread, and the simulated clock moved forward from here. The real TimedRobot
    then calls the mode methods, so this is the real robot loop.
    """

    _running = []

    def __init__(self, robot_class):
        reset()
        wpilib.DriverStation.silenceJoystickConnectionWarning(True)
        DriverStationSim.setAutonomous(False)
        DriverStationSim.setEnabled(False)
        _send()
        self.robot = robot_class()

        # CoroutineRobot stores robotInit on the object, so wrap that one.
        started = threading.Event()
        original = self.robot.robotInit

        def robotInit():
            try:
                original()
            finally:
                started.set()

        self.robot.robotInit = robotInit
        self._thread = threading.Thread(target=self.robot.startCompetition, daemon=True)
        self._thread.start()
        if not started.wait(5.0):
            raise RuntimeError("the robot did not finish robotInit() in 5 seconds")
        RobotRunner._running.append(self)

    def step_timing(self, seconds, autonomous=False, enabled=True):
        DriverStationSim.setDsAttached(True)
        DriverStationSim.setAutonomous(autonomous)
        DriverStationSim.setEnabled(enabled)
        for _ in range(round(seconds / LOOP)):
            DriverStationSim.notifyNewData()
            stepTiming(LOOP)
            if not self._thread.is_alive():
                raise RuntimeError("the robot code stopped. Look for an exception above.")

    def stop(self):
        self.robot.endCompetition()
        stepTimingAsync(1.0)
        self._thread.join(timeout=2)


def _cz_shutdown():
    """Called by tools/robotpy-browser/run_checks.py at the end: stop every robot thread."""
    while RobotRunner._running:
        RobotRunner._running.pop().stop()
