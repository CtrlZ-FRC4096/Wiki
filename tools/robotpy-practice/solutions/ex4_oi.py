"""
Exercise 4: bind controller buttons in an OI class.

Run the checks:   python -m pytest checks/test_ex4_oi.py

The OI (operator interface) is the file that connects the controllers to the
robot. A binding is a decorator on a function named _:

    @self.driver1.A.whenPressed
    def _():
        self.robot.is_intaking = True

How each decorator behaves (checked with RobotPy 2026):

    whenPressed   starts the function one time when the button goes down
    whenReleased  starts the function one time when the button goes up
    whenHeld      starts the function when the button goes down, and cancels
                  it when the button goes up. A plain function runs ONE time.
                  To do work in every loop while the button is held, write a
                  generator:  while True: ... then yield

A function with yield in it runs a little in each loop. The robot keeps
running between the steps. This is how a binding can wait without time.sleep().

This is a short copy of oi.py in Robot-2026.
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from robot import Robot

from wpilib import Timer

from wpilibextra.customcontroller import XboxCommandController
from wpilibextra.customcontroller.custom_button import CustomButton as Button


class OI:
    def __init__(self, robot: "Robot"):
        self.robot = robot

        self.driver1 = XboxCommandController(0)
        self.driver1.LEFT_JOY_X.setDeadzone(0.02)
        self.driver1.LEFT_JOY_Y.setDeadzone(0.02)
        self.driver1.RIGHT_JOY_X.setDeadzone(0.1)

        # A button made from any True/False value. The lambda reads the flag
        # again in every loop. See lesson 6.
        self.rumble_button_d1 = Button(lambda: self.robot.rumble_d1)

        # An example binding. It is complete. Reset the heading the driver holds.
        @self.driver1.POV.DOWN.whenPressed
        def _():
            self.robot.robot_oriented_angle = 0.0

        # 4.1  When A is pressed, toggle self.robot.is_intaking.
        #      (True becomes False, False becomes True.)
        @self.driver1.A.whenPressed
        def _():
            self.robot.is_intaking = not self.robot.is_intaking

        # 4.2  The right trigger is analog. Use RIGHT_TRIGGER_AS_BUTTON.
        #      While it is held:   self.robot.shoot_intent = True
        #      When it is released: self.robot.shoot_intent = False
        #                           self.robot.spin_down = True
        @self.driver1.RIGHT_TRIGGER_AS_BUTTON.whenHeld
        def _():
            self.robot.shoot_intent = True

        @self.driver1.RIGHT_TRIGGER_AS_BUTTON.whenReleased
        def _():
            self.robot.shoot_intent = False
            self.robot.spin_down = True

        # 4.3  When self.rumble_button_d1 is pressed:
        #        self.driver1.setRumble(1)
        #        wait 0.5 seconds with a Timer and a while loop that yields
        #        self.driver1.setRumble(0)
        #        self.robot.rumble_d1 = False
        #      (This is the rumble binding in Robot-2026.)
        @self.rumble_button_d1.whenPressed
        def _():
            timer = Timer()
            timer.start()
            self.driver1.setRumble(1)
            while not timer.hasElapsed(0.5):
                yield
            self.driver1.setRumble(0)
            self.robot.rumble_d1 = False

        # 4.4  While Y is held, add 2 to self.robot.robot_oriented_angle in
        #      every loop. A plain function would run one time only.
        @self.driver1.Y.whenHeld
        def _():
            while True:
                self.robot.robot_oriented_angle += 2
                yield
