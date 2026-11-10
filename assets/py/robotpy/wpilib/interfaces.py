"""A browser copy of wpilib.interfaces.GenericHID. See assets/py/robotpy/README.md."""

import enum as _enum

from ._sim import state as _state


class GenericHID:
    class RumbleType(_enum.Enum):
        kLeftRumble = 0
        kRightRumble = 1
        kBothRumble = 2

    def __init__(self, port):
        self._port = port

    def getPort(self):
        return self._port

    def getRawButton(self, button):
        return bool(_state.joystick(self._port)["buttons"].get(button, False))

    def getRawAxis(self, axis):
        return float(_state.joystick(self._port)["axes"].get(axis, 0.0))

    def getPOV(self, pov=0):
        return int(_state.joystick(self._port)["pov"])

    def setRumble(self, type, value):
        value = min(max(float(value), 0.0), 1.0)
        rumble = _state.rumble.setdefault(self._port, {"left": 0.0, "right": 0.0})
        if type in (GenericHID.RumbleType.kLeftRumble, GenericHID.RumbleType.kBothRumble):
            rumble["left"] = value
        if type in (GenericHID.RumbleType.kRightRumble, GenericHID.RumbleType.kBothRumble):
            rumble["right"] = value
