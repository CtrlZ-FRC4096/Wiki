"""
Exercise 3: write a subsystem.

Run the checks:   python -m pytest checks/test_ex3_hopper.py

Every subsystem in our robot code has the same shape:

    class Name(Subsystem):
        def __init__(self, robot):   make the motors, apply configs, set start values
        def set_xxx(...):            command a motor and save what you commanded
        def get_xxx(...):            read the motor, or the saved command in simulation
        def stop(self):              all motors off. robot.py calls it when disabled
        def periodic(self):          read the robot's state flags, then command the motors
        def log(self):               put values on SmartDashboard

You never call periodic() yourself. The command scheduler calls it one time in
every loop (50 times each second), because the Subsystem registers itself.

This hopper is a short copy of subsystems/hopper.py in Robot-2026.
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from robot import Robot  # only for VS Code hints, never run

from phoenix6 import controls, hardware
from wpilib import SmartDashboard

from ex2_phoenix import get_motor_config
from wpilibextra.coroutine.subsystem import Subsystem

INDEXER_MOTOR_ID = 23
FEED_SPEED = 40.0  # rotations per second, toward the shooter
JAM_SPEED = -20.0  # rotations per second, backwards to clear a jam


class Hopper(Subsystem):
    def __init__(self, robot: "Robot"):
        super().__init__()
        self.robot = robot
        self.commanded_speed = 0.0

        self.indexer_motor = hardware.TalonFX(INDEXER_MOTOR_ID, "rio")
        self.indexer_motor.configurator.apply(get_motor_config(inverted=1, k_p=15.0, k_v=0.55))

    def set_speed(self, speed):
        """
        3.1  Save speed in self.commanded_speed, then send the motor a
        controls.VelocityVoltage(speed) request with set_control().
        """
        self.commanded_speed = speed
        self.indexer_motor.set_control(controls.VelocityVoltage(speed))

    def get_speed(self):
        """
        3.2  In simulation the motor never really spins, so return the
        commanded speed. On the real robot, return the measured velocity:
            self.indexer_motor.get_velocity().value

        self.robot.isSimulation() tells you which one you are on.
        """
        if self.robot.isSimulation():
            return self.commanded_speed
        else:
            return self.indexer_motor.get_velocity().value

    def stop(self):
        """3.3  Set self.commanded_speed to 0 and send controls.DutyCycleOut(0.0)."""
        self.commanded_speed = 0.0
        self.indexer_motor.set_control(controls.DutyCycleOut(0.0))

    def periodic(self):
        """
        3.4  Decide what to do from the robot's state flags. Check them in
        this order. The first one that is True wins:

            self.robot.clear_jam     -> run at JAM_SPEED
            self.robot.shoot_intent  -> run at FEED_SPEED
            anything else            -> stop()
        """
        if self.robot.clear_jam:
            self.set_speed(JAM_SPEED)
        elif self.robot.shoot_intent:
            self.set_speed(FEED_SPEED)
        else:
            self.stop()

    def log(self):
        """
        3.5  Put two numbers on the dashboard:
            "Hopper/Commanded Speed"  self.commanded_speed
            "Hopper/Actual Speed"     self.get_speed()
        """
        SmartDashboard.putNumber("Hopper/Commanded Speed", self.commanded_speed)
        SmartDashboard.putNumber("Hopper/Actual Speed", self.get_speed())
