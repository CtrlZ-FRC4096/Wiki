"""
A browser copy of the phoenix6.hardware devices that our code uses. There is
no motor and no physics, so every sensor reads 0, the same as Phoenix 6
simulation with no physics code. See assets/py/robotpy/README.md.
"""

import copy as _copy

from .status_code import StatusCode


class StatusSignal:
    def __init__(self, value, units=""):
        self.value = value
        self.units = units
        self.status = StatusCode.OK

    def refresh(self):
        return self

    def wait_for_update(self, timeout_seconds=0.0):
        return self


class _Configurator:
    def __init__(self):
        self._applied = None

    def apply(self, config, timeout_seconds=0.1):
        self._applied = _copy.deepcopy(config)
        return StatusCode.OK

    def refresh(self, config, timeout_seconds=0.1):
        return StatusCode.OK


class _Device:
    def __init__(self, device_id, canbus="rio"):
        self._device_id = device_id
        self._canbus = canbus
        self.configurator = _Configurator()

    @property
    def device_id(self):
        return self._device_id

    def get_device_id(self):
        return self._device_id


class TalonFX(_Device):
    def __init__(self, device_id, canbus="rio"):
        super().__init__(device_id, canbus)
        self._position = 0.0
        self._control = None

    def set_control(self, request):
        self._control = request
        return StatusCode.OK

    def get_velocity(self, refresh=True):
        return StatusSignal(0.0, "rot per sec")

    def get_position(self, refresh=True):
        return StatusSignal(self._position, "rotations")

    def get_acceleration(self, refresh=True):
        return StatusSignal(0.0, "rot per sec²")

    def get_motor_voltage(self, refresh=True):
        return StatusSignal(0.0, "V")

    def get_supply_current(self, refresh=True):
        return StatusSignal(0.0, "A")

    def get_stator_current(self, refresh=True):
        return StatusSignal(0.0, "A")

    def get_torque_current(self, refresh=True):
        return StatusSignal(0.0, "A")

    def set_position(self, new_value, timeout_seconds=0.05):
        """Tells the sensor that its position is new_value. It does not move the motor."""
        self._position = float(new_value)
        return StatusCode.OK

    def stop_motor(self):
        return StatusCode.OK


class CANcoder(_Device):
    def __init__(self, device_id, canbus="rio"):
        super().__init__(device_id, canbus)
        self._position = 0.0

    def get_absolute_position(self, refresh=True):
        return StatusSignal(0.0, "rotations")

    def get_position(self, refresh=True):
        return StatusSignal(self._position, "rotations")

    def get_velocity(self, refresh=True):
        return StatusSignal(0.0, "rot per sec")

    def set_position(self, new_value, timeout_seconds=0.05):
        self._position = float(new_value)
        return StatusCode.OK


class Pigeon2(_Device):
    def __init__(self, device_id, canbus="rio"):
        super().__init__(device_id, canbus)
        self._yaw = 0.0

    def get_yaw(self, refresh=True):
        return StatusSignal(self._yaw, "deg")

    def set_yaw(self, new_value, timeout_seconds=0.05):
        self._yaw = float(new_value)
        return StatusCode.OK

    def get_pitch(self, refresh=True):
        return StatusSignal(0.0, "deg")

    def get_roll(self, refresh=True):
        return StatusSignal(0.0, "deg")


class CANrange(_Device):
    def get_distance(self, refresh=True):
        return StatusSignal(0.0, "m")

    def get_is_detected(self, refresh=True):
        return StatusSignal(False, "")
