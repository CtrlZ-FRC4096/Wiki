"""
Operator Input for the practice robot. A short copy of oi.py in Robot-2026.
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from robot import Robot

from wpilibextra.customcontroller import XboxCommandController


class OI:
    def __init__(self, robot: "Robot"):
        self.robot = robot

        self.driver1 = XboxCommandController(0)
        self.driver1.LEFT_JOY_X.setDeadzone(0.02)
        self.driver1.LEFT_JOY_Y.setDeadzone(0.02)

        # Complete example: hold POV LEFT to run the intake backwards.
        @self.driver1.POV.LEFT.whenHeld
        def _():
            self.robot.clear_jam = True

        @self.driver1.POV.LEFT.whenReleased
        def _():
            self.robot.clear_jam = False

        # R.2  Hold the left trigger to intake, like driver 1 in Robot-2026:
        #        held:     self.robot.is_intaking = True
        #        released: self.robot.is_intaking = False
        #      The trigger is analog. Use LEFT_TRIGGER_AS_BUTTON.
        @self.driver1.LEFT_TRIGGER_AS_BUTTON.whenHeld
        def _():
            self.robot.is_intaking = True

        @self.driver1.LEFT_TRIGGER_AS_BUTTON.whenReleased
        def _():
            self.robot.is_intaking = False
