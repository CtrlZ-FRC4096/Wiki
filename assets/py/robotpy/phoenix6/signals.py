"""
A browser copy of the phoenix6.signals enums that our code uses, with the
same numbers as Phoenix 6 for 2026. See assets/py/robotpy/README.md.
"""

import enum as _enum


class InvertedValue(_enum.Enum):
    COUNTER_CLOCKWISE_POSITIVE = 0
    CLOCKWISE_POSITIVE = 1


class NeutralModeValue(_enum.Enum):
    COAST = 0
    BRAKE = 1


class MotorAlignmentValue(_enum.Enum):
    ALIGNED = 0
    OPPOSED = 1


class SensorDirectionValue(_enum.Enum):
    COUNTER_CLOCKWISE_POSITIVE = 0
    CLOCKWISE_POSITIVE = 1


class FeedbackSensorSourceValue(_enum.Enum):
    ROTOR_SENSOR = 0
    REMOTE_CANCODER = 1
    REMOTE_PIGEON2_YAW = 2
    REMOTE_PIGEON2_PITCH = 3
    REMOTE_PIGEON2_ROLL = 4
    FUSED_CANCODER = 5
    SYNC_CANCODER = 6


class GravityTypeValue(_enum.Enum):
    ELEVATOR_STATIC = 0
    ARM_COSINE = 1


class StaticFeedforwardSignValue(_enum.Enum):
    USE_VELOCITY_SIGN = 0
    USE_CLOSED_LOOP_SIGN = 1


class GainSchedBehaviorValue(_enum.Enum):
    INACTIVE = 0
