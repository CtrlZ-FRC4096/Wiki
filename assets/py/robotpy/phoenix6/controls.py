"""
A browser copy of the phoenix6.controls requests that our code uses. Each
one takes the same arguments, in the same order and with the same defaults,
as Phoenix 6 for 2026, and has the same with_... methods.
See assets/py/robotpy/README.md.
"""

_LIMITS = [
    ("limit_forward_motion", False),
    ("limit_reverse_motion", False),
    ("ignore_hardware_limits", False),
    ("ignore_software_limits", False),
    ("use_timesync", False),
]


class _ControlRequest:
    _FIELDS = []  # [(name, default)], in the order of the real __init__

    def __init__(self, *args, **kwargs):
        names = [name for name, _ in self._FIELDS]
        if len(args) > len(names):
            raise TypeError("%s() takes at most %d arguments" % (type(self).__name__, len(names)))
        values = dict(self._FIELDS)
        for name, value in zip(names, args):
            values[name] = value
        for name, value in kwargs.items():
            if name not in values:
                raise TypeError("%s() got an unexpected keyword argument %r" % (type(self).__name__, name))
            values[name] = value
        missing = [name for name, default in self._FIELDS if default is _REQUIRED and values[name] is _REQUIRED]
        if missing:
            raise TypeError("%s() missing required argument %r" % (type(self).__name__, missing[0]))
        for name, value in values.items():
            setattr(self, name, value)
        self.update_freq_hz = 100.0

    @property
    def name(self):
        return type(self).__name__

    def __getattr__(self, attr):
        if attr.startswith("with_"):
            field = attr[len("with_"):]
            if field in dict(self._FIELDS) or field == "update_freq_hz":

                def setter(value):
                    setattr(self, field, value)
                    return self

                return setter
        raise AttributeError("%r object has no attribute %r" % (type(self).__name__, attr))

    def __str__(self):
        lines = ["Control: " + type(self).__name__]
        for name, _ in self._FIELDS:
            lines.append("    %s: %s" % (name, getattr(self, name)))
        return "\n".join(lines)


class _Required:
    def __repr__(self):
        return "<required>"


_REQUIRED = _Required()


class DutyCycleOut(_ControlRequest):
    _FIELDS = [("output", _REQUIRED), ("enable_foc", True), ("override_brake_dur_neutral", False)] + _LIMITS


class VoltageOut(_ControlRequest):
    _FIELDS = [("output", _REQUIRED), ("enable_foc", True), ("override_brake_dur_neutral", False)] + _LIMITS


class VelocityVoltage(_ControlRequest):
    _FIELDS = [
        ("velocity", _REQUIRED),
        ("acceleration", 0.0),
        ("enable_foc", True),
        ("feed_forward", 0.0),
        ("slot", 0),
        ("override_brake_dur_neutral", False),
    ] + _LIMITS


class VelocityTorqueCurrentFOC(_ControlRequest):
    _FIELDS = [
        ("velocity", _REQUIRED),
        ("acceleration", 0.0),
        ("feed_forward", 0.0),
        ("slot", 0),
        ("override_coast_dur_neutral", False),
    ] + _LIMITS


class PositionVoltage(_ControlRequest):
    _FIELDS = [
        ("position", _REQUIRED),
        ("velocity", 0.0),
        ("enable_foc", True),
        ("feed_forward", 0.0),
        ("slot", 0),
        ("override_brake_dur_neutral", False),
    ] + _LIMITS


class MotionMagicVoltage(_ControlRequest):
    _FIELDS = [
        ("position", _REQUIRED),
        ("enable_foc", True),
        ("feed_forward", 0.0),
        ("slot", 0),
        ("override_brake_dur_neutral", False),
    ] + _LIMITS


class MotionMagicTorqueCurrentFOC(_ControlRequest):
    _FIELDS = [
        ("position", _REQUIRED),
        ("feed_forward", 0.0),
        ("slot", 0),
        ("override_coast_dur_neutral", False),
    ] + _LIMITS


class DynamicMotionMagicTorqueCurrentFOC(_ControlRequest):
    _FIELDS = [
        ("position", _REQUIRED),
        ("velocity", _REQUIRED),
        ("acceleration", _REQUIRED),
        ("jerk", 0.0),
        ("feed_forward", 0.0),
        ("slot", 0),
        ("override_coast_dur_neutral", False),
    ] + _LIMITS


class Follower(_ControlRequest):
    _FIELDS = [("leader_id", _REQUIRED), ("motor_alignment", _REQUIRED)]


class StaticBrake(_ControlRequest):
    _FIELDS = [("use_timesync", False)]


class NeutralOut(_ControlRequest):
    _FIELDS = [("use_timesync", False)]


class CoastOut(_ControlRequest):
    _FIELDS = [("use_timesync", False)]
