"""
The practice robot's intake. A short copy of subsystems/intake.py in Robot-2026.
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from robot import Robot

from phoenix6 import configs, controls, hardware, signals
from wpilib import SmartDashboard

import const
from wpilibextra.coroutine.subsystem import Subsystem


class Intake(Subsystem):
    def __init__(self, robot: "Robot"):
        super().__init__()
        self.robot = robot
        self.commanded_speed = 0.0

        self.motor = hardware.TalonFX(const.INTAKE_MOTOR_ID, "rio")
        config = configs.TalonFXConfiguration()
        config.motor_output.inverted = signals.InvertedValue(0)
        config.current_limits.supply_current_limit = 40
        config.current_limits.supply_current_limit_enable = True
        self.motor.configurator.apply(config)

    def set_speed(self, percent):
        self.commanded_speed = percent / 100
        self.motor.set_control(controls.DutyCycleOut(percent / 100))

    def get_speed(self):
        if self.robot.isSimulation():
            return self.commanded_speed
        return self.motor.get_velocity().value

    def stop(self):
        self.commanded_speed = 0.0
        self.motor.set_control(controls.DutyCycleOut(0.0))

    def periodic(self):
        # R.1  Use the robot's state flags. The first True one wins:
        #        self.robot.clear_jam    -> set_speed(const.JAM_SPEED)
        #        self.robot.is_intaking  -> set_speed(const.INTAKE_SPEED)
        #        anything else           -> stop()
        if self.robot.clear_jam:
            self.set_speed(const.JAM_SPEED)
        elif self.robot.is_intaking:
            self.set_speed(const.INTAKE_SPEED)
        else:
            self.stop()

    def log(self):
        SmartDashboard.putNumber("Intake/Commanded Speed", self.commanded_speed)
        SmartDashboard.putNumber("Intake/Actual Speed", self.get_speed())
