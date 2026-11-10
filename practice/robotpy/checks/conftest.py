"""
Shared setup for the exercise checks. You do not need to change this file.

pytest runs the code in this file before each check. It gives every check a
clean, enabled, simulated robot:

- The Driver Station is reset and the robot is enabled in teleop.
- The command scheduler is new, so bindings from one check do not leak into
  the next check.
- The clock is paused. Time moves only when a check calls step(). This makes
  every check give the same result on every computer.
"""

import pytest
import wpilib
from commands2 import CommandScheduler
from wpilib.simulation import (
    DriverStationSim,
    XboxControllerSim,
    pauseTiming,
    resumeTiming,
    stepTiming,
)

LOOP = 0.02  # seconds per robot loop, the same as TimedRobot


@pytest.fixture(autouse=True)
def fresh_robot_sim():
    DriverStationSim.resetData()
    DriverStationSim.setEnabled(True)
    DriverStationSim.setAutonomous(False)
    DriverStationSim.notifyNewData()
    CommandScheduler.resetInstance()
    pauseTiming()
    yield
    CommandScheduler.getInstance().cancelAll()
    CommandScheduler.resetInstance()
    resumeTiming()


class Stepper:
    """Moves the simulated robot forward, one 20 ms loop at a time."""

    def __call__(self, loops=1):
        for _ in range(loops):
            stepTiming(LOOP)
            CommandScheduler.getInstance().run()

    def seconds(self, seconds):
        self(round(seconds / LOOP))


@pytest.fixture
def step():
    """step() runs one robot loop. step(10) runs ten. step.seconds(0.5) runs 25."""
    return Stepper()


class Gamepad:
    """A simulated Xbox controller. Press its buttons from a check."""

    def __init__(self, port):
        self.sim = XboxControllerSim(port)
        DriverStationSim.notifyNewData()

    def _send(self):
        DriverStationSim.notifyNewData()

    def press(self, name):
        getattr(self.sim, "set" + name + "Button")(True)
        self._send()

    def release(self, name):
        getattr(self.sim, "set" + name + "Button")(False)
        self._send()

    def set_axis(self, name, value):
        """name is LeftX, LeftY, RightX, RightY, LeftTrigger or RightTrigger."""
        if name.endswith("Trigger"):
            getattr(self.sim, "set" + name + "Axis")(value)
        else:
            getattr(self.sim, "set" + name)(value)
        self._send()

    def set_pov(self, degrees):
        self.sim.setPOV(degrees)
        self._send()

    def rumble(self):
        return self.sim.getRumble(wpilib.interfaces.GenericHID.RumbleType.kLeftRumble)


@pytest.fixture
def driver1():
    """The simulated controller on port 0. Create it before XboxCommandController(0)."""
    return Gamepad(0)


class FakeRobot:
    """
    Stands in for the Robot object from robot.py.

    Subsystems and the OI read and write state flags on self.robot, so the
    checks give them this object instead of a full robot.
    """

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


@pytest.fixture
def robot():
    return FakeRobot()
