"""
The state that the real HAL and Driver Station keep: the clock, the robot
mode, the controllers and the dashboard. Only cz_sim.py changes it.
"""


class _State:
    def __init__(self):
        self.reset()

    def reset(self):
        self.time = 0.0  # seconds, moved forward only by cz_sim
        self.enabled = False
        self.autonomous = False
        self.test = False
        self.fms_attached = False
        self.alliance = None  # None, "red" or "blue"
        self.battery_voltage = 12.5
        # port -> {"buttons": {number: bool}, "axes": {number: float}, "pov": int}
        self.joysticks = {}
        # port -> {"left": float, "right": float}
        self.rumble = {}
        self.dashboard = {}

    def joystick(self, port):
        if port not in self.joysticks:
            self.joysticks[port] = {"buttons": {}, "axes": {}, "pov": -1}
        return self.joysticks[port]


state = _State()
