"""
A browser copy of the phoenix6.configs groups that our code uses, with the
same field names and defaults as Phoenix 6 for 2026. Each group also has
with_... methods. See assets/py/robotpy/README.md.
"""

from . import signals as _signals


class _ConfigGroup:
    _DEFAULTS = {}

    def __init__(self):
        for name, value in self._DEFAULTS.items():
            setattr(self, name, value)

    def __getattr__(self, attr):
        if attr.startswith("with_"):
            field = attr[len("with_"):]
            if field in self._DEFAULTS:

                def setter(value):
                    setattr(self, field, value)
                    return self

                return setter
        raise AttributeError("%r object has no attribute %r" % (type(self).__name__, attr))

    def __str__(self):
        lines = ["Config Group: " + type(self).__name__]
        for name in self._DEFAULTS:
            lines.append("    %s: %s" % (name, getattr(self, name)))
        return "\n".join(lines)


class MotorOutputConfigs(_ConfigGroup):
    _DEFAULTS = {
        "inverted": _signals.InvertedValue.COUNTER_CLOCKWISE_POSITIVE,
        "neutral_mode": _signals.NeutralModeValue.COAST,
        "duty_cycle_neutral_deadband": 0,
        "peak_forward_duty_cycle": 1,
        "peak_reverse_duty_cycle": -1,
        "control_timesync_freq_hz": 0,
    }


class CurrentLimitsConfigs(_ConfigGroup):
    _DEFAULTS = {
        "stator_current_limit": 120,
        "stator_current_limit_enable": True,
        "supply_current_limit": 70,
        "supply_current_limit_enable": True,
        "supply_current_lower_limit": 40,
        "supply_current_lower_time": 1.0,
    }


class TorqueCurrentConfigs(_ConfigGroup):
    _DEFAULTS = {
        "peak_forward_torque_current": 800,
        "peak_reverse_torque_current": -800,
        "torque_neutral_deadband": 0.0,
    }


class _SlotConfigs(_ConfigGroup):
    _DEFAULTS = {
        "k_p": 0,
        "k_i": 0,
        "k_d": 0,
        "k_s": 0,
        "k_v": 0,
        "k_a": 0,
        "k_g": 0,
        "gravity_type": _signals.GravityTypeValue.ELEVATOR_STATIC,
        "static_feedforward_sign": _signals.StaticFeedforwardSignValue.USE_VELOCITY_SIGN,
        "gravity_arm_position_offset": 0,
        "gain_sched_behavior": _signals.GainSchedBehaviorValue.INACTIVE,
    }


class Slot0Configs(_SlotConfigs):
    pass


class Slot1Configs(_SlotConfigs):
    pass


class Slot2Configs(_SlotConfigs):
    pass


class MotionMagicConfigs(_ConfigGroup):
    _DEFAULTS = {
        "motion_magic_cruise_velocity": 0,
        "motion_magic_acceleration": 0,
        "motion_magic_jerk": 0,
        "motion_magic_expo_k_v": 0.12,
        "motion_magic_expo_k_a": 0.1,
    }


class FeedbackConfigs(_ConfigGroup):
    _DEFAULTS = {
        "feedback_rotor_offset": 0.0,
        "sensor_to_mechanism_ratio": 1.0,
        "rotor_to_sensor_ratio": 1.0,
        "feedback_sensor_source": _signals.FeedbackSensorSourceValue.ROTOR_SENSOR,
        "feedback_remote_sensor_id": 0,
        "velocity_filter_time_constant": 0,
    }


class ClosedLoopRampsConfigs(_ConfigGroup):
    _DEFAULTS = {
        "duty_cycle_closed_loop_ramp_period": 0,
        "voltage_closed_loop_ramp_period": 0,
        "torque_closed_loop_ramp_period": 0,
    }


class OpenLoopRampsConfigs(_ConfigGroup):
    _DEFAULTS = {
        "duty_cycle_open_loop_ramp_period": 0,
        "voltage_open_loop_ramp_period": 0,
        "torque_open_loop_ramp_period": 0,
    }


class MagnetSensorConfigs(_ConfigGroup):
    _DEFAULTS = {
        "sensor_direction": _signals.SensorDirectionValue.COUNTER_CLOCKWISE_POSITIVE,
        "magnet_offset": 0,
        "absolute_sensor_discontinuity_point": 0.5,
    }


class MountPoseConfigs(_ConfigGroup):
    _DEFAULTS = {"mount_pose_yaw": 0, "mount_pose_pitch": 0, "mount_pose_roll": 0}


class TalonFXConfiguration:
    def __init__(self):
        self.motor_output = MotorOutputConfigs()
        self.current_limits = CurrentLimitsConfigs()
        self.torque_current = TorqueCurrentConfigs()
        self.feedback = FeedbackConfigs()
        self.open_loop_ramps = OpenLoopRampsConfigs()
        self.closed_loop_ramps = ClosedLoopRampsConfigs()
        self.slot0 = Slot0Configs()
        self.slot1 = Slot1Configs()
        self.slot2 = Slot2Configs()
        self.motion_magic = MotionMagicConfigs()
        self.future_proof_configs = True

    def __getattr__(self, attr):
        if attr.startswith("with_"):
            field = attr[len("with_"):]
            if field in self.__dict__:

                def setter(value):
                    setattr(self, field, value)
                    return self

                return setter
        raise AttributeError("%r object has no attribute %r" % (type(self).__name__, attr))


class CANcoderConfiguration:
    def __init__(self):
        self.magnet_sensor = MagnetSensorConfigs()
        self.future_proof_configs = True

    def with_magnet_sensor(self, value):
        self.magnet_sensor = value
        return self


class Pigeon2Configuration:
    def __init__(self):
        self.mount_pose = MountPoseConfigs()
        self.future_proof_configs = True

    def with_mount_pose(self, value):
        self.mount_pose = value
        return self
