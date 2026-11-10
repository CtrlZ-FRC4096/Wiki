"""
Exercise 2: Phoenix 6 control requests and motor configs.

Run the checks:   python -m pytest checks/test_ex2_phoenix.py

A TalonFX does what the last *control request* told it to do:

    motor.set_control(controls.DutyCycleOut(0.5))      # 50% output
    motor.set_control(controls.VelocityVoltage(40))    # 40 rotations per second

Settings such as PID gains, current limits and inversion go in a
TalonFXConfiguration. You fill it in, then apply it one time in __init__:

    config = configs.TalonFXConfiguration()
    config.slot0.k_p = 2.4
    motor.configurator.apply(config)

These functions only build the request or the config. No motor is needed, so
the checks can look inside what you return.
"""

from phoenix6 import configs, controls, signals


def intake_request(speed_percent: float) -> controls.DutyCycleOut:
    """
    2.1  Return a DutyCycleOut request for a speed in percent (-100 to 100).

    DutyCycleOut wants a fraction from -1 to 1, so 85 percent is 0.85.
    From intake.set_intake_speed() in Robot-2026.
    """
    # TODO
    raise NotImplementedError("Exercise 2.1: write intake_request()")


def flywheel_request(rotations_per_second: float) -> controls.VelocityTorqueCurrentFOC:
    """
    2.2  Return a VelocityTorqueCurrentFOC request for this flywheel speed.

    The shooter flywheel motor is mounted backwards, so the code sends the
    negative of the speed. From shooter.set_fly_speed() in Robot-2026:
        controls.VelocityTorqueCurrentFOC(-1 * speed)
    """
    # TODO
    raise NotImplementedError("Exercise 2.2: write flywheel_request()")


def follower_request(leader_id: int, opposed: bool) -> controls.Follower:
    """
    2.3  Return a Follower request so a second motor copies the leader.

    controls.Follower(leader_id, alignment) takes a signals.MotorAlignmentValue:
        signals.MotorAlignmentValue.ALIGNED   the follower spins the same way
        signals.MotorAlignmentValue.OPPOSED   the follower spins the other way

    From the intake and shooter in Robot-2026, which write
    signals.MotorAlignmentValue(1) for OPPOSED and (0) for ALIGNED.
    """
    # TODO
    raise NotImplementedError("Exercise 2.3: write follower_request()")


def get_motor_config(inverted=0, k_p=0.0, k_v=0.0, k_s=0.0, supply_limit=40.0):
    """
    2.4  Build and return a configs.TalonFXConfiguration.

    A shorter copy of robot.get_motor_config() in Robot-2026. Set:

        motor_output.inverted                = signals.InvertedValue(inverted)
        motor_output.neutral_mode            = signals.NeutralModeValue.BRAKE
        slot0.k_p, slot0.k_v, slot0.k_s      = the gains passed in
        current_limits.supply_current_limit  = supply_limit
        current_limits.supply_current_limit_enable = True
        current_limits.stator_current_limit  = 100
    """
    config = configs.TalonFXConfiguration()
    config.motor_output.inverted = signals.InvertedValue(inverted)
    # TODO: set the neutral mode, the three gains and the current limits.
    return config
