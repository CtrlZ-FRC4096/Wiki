#! python3
"""
The practice robot: one intake, one controller, one auto.

It has the same structure as robot.py in Robot-2026, with less in it.

Run these commands in this folder (practice/robotpy/robot):

    Run it in the simulator:   python -m robotpy sim
    Run its tests:             python -m robotpy test

Before the tests pass, do R.1 in subsystems/intake.py, R.2 in oi.py and R.3
below. The exercise checks in ../checks do not use this file.
"""

from commands2 import CommandScheduler, SequentialCommandGroup, WaitCommand
from wpilib import SmartDashboard, Timer

import const
import oi
from subsystems.intake import Intake
from wpilibextra.coroutine import commandify
from wpilibextra.coroutine.coroutine_robot import CoroutineRobot


class Robot(CoroutineRobot):
    """
    CoroutineRobot is our version of WPILib's TimedRobot. Each mode is a
    generator. While the robot is in a mode, the generator is stepped one
    time in each 20 ms loop.
    """

    def robot_start(self):
        # Runs when the robot program starts, then one step in every loop
        # in every mode. Make everything here.
        self.scheduler = CommandScheduler.getInstance()

        ### STATE FLAGS ###
        # The OI writes these. The subsystems read them in periodic().
        self.is_intaking = False
        self.clear_jam = False

        ### SUBSYSTEMS ###
        # A Subsystem registers itself with the scheduler when it is made.
        # (Robot-2026 also calls scheduler.registerSubsystem() for each one.
        # That is not necessary, and RobotPy 2026 prints a warning for it.)
        self.intake = Intake(self)
        self.subsystems = [self.intake]

        ### CONTROLS ###
        self.oi = oi.OI(self)

        # addPeriodic runs a function on its own timer, here 10 times each second.
        @self.addPeriodic(period=0.1, offset=0)
        def _():
            self.log()

        while True:
            yield
            self.scheduler.run()

    ### DISABLED ###
    def disabled_mode(self):
        self.scheduler.cancelAll()
        # periodic() still runs while the robot is disabled, so clear the
        # flags too. If not, the next periodic() starts the motors again.
        self.is_intaking = False
        self.clear_jam = False
        for subsystem in self.subsystems:
            subsystem.stop()
        while True:
            yield

    ### AUTONOMOUS ###
    def autonomous_mode(self):
        self.scheduler.cancelAll()
        self.scheduler.schedule(self.make_auto())

    def make_auto(self):
        """
        R.3  Return an auto that intakes for const.AUTO_INTAKE_SECONDS, then
        stops the intake. One way:

            SequentialCommandGroup(start_intake, WaitCommand(...), stop_intake)

        where start_intake and stop_intake are @commandify functions that set
        self.is_intaking. Make them INSIDE this method, so each auto gets new
        command objects. (Enable auto two times in the simulator to see why.)
        """
        @commandify
        def start_intake():
            self.is_intaking = True

        @commandify
        def stop_intake():
            self.is_intaking = False

        return SequentialCommandGroup(
            start_intake,
            WaitCommand(const.AUTO_INTAKE_SECONDS),
            stop_intake,
        )

    ### TELEOPERATED ###
    def teleop_mode(self):
        self.scheduler.cancelAll()
        self.is_intaking = False
        self.clear_jam = False
        while True:
            yield

    ### WAIT FUNCTION ###
    def wait(self, time):
        timer = Timer()
        timer.start()
        while not timer.hasElapsed(time):
            yield

    def log(self):
        SmartDashboard.putBoolean("States/Is Intaking", self.is_intaking)
        SmartDashboard.putBoolean("States/Clear Jam", self.clear_jam)
        for subsystem in self.subsystems:
            subsystem.log()
