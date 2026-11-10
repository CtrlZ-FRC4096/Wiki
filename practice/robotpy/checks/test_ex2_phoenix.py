from phoenix6 import configs, controls, signals

import ex2_phoenix as ex


def test_2_1_intake_request_is_a_fraction():
    req = ex.intake_request(85)
    assert isinstance(req, controls.DutyCycleOut), (
        f"return controls.DutyCycleOut(...), got {type(req).__name__}"
    )
    assert abs(req.output - 0.85) < 1e-9, f"85 percent is an output of 0.85, got {req.output}"


def test_2_1_reverse_and_stop():
    assert abs(ex.intake_request(-30).output + 0.30) < 1e-9, "-30 percent is an output of -0.30"
    assert ex.intake_request(0).output == 0, "0 percent is an output of 0"


def test_2_2_flywheel_is_reversed():
    req = ex.flywheel_request(50)
    assert isinstance(req, controls.VelocityTorqueCurrentFOC), (
        f"return controls.VelocityTorqueCurrentFOC(...), got {type(req).__name__}"
    )
    assert req.velocity == -50, (
        f"the flywheel motor is mounted backwards: 50 rps must be sent as -50, got {req.velocity}"
    )


def test_2_3_opposed_follower():
    req = ex.follower_request(18, opposed=True)
    assert isinstance(req, controls.Follower), f"return controls.Follower(...), got {type(req).__name__}"
    assert req.leader_id == 18, f"the follower must follow motor 18, got {req.leader_id}"
    assert req.motor_alignment == signals.MotorAlignmentValue.OPPOSED, (
        f"opposed=True needs MotorAlignmentValue.OPPOSED, got {req.motor_alignment}"
    )


def test_2_3_aligned_follower():
    req = ex.follower_request(25, opposed=False)
    assert req.motor_alignment == signals.MotorAlignmentValue.ALIGNED, (
        f"opposed=False needs MotorAlignmentValue.ALIGNED, got {req.motor_alignment}"
    )


def test_2_4_gains_go_in_slot0():
    config = ex.get_motor_config(inverted=1, k_p=24.5, k_v=0.07, k_s=4.0)
    assert isinstance(config, configs.TalonFXConfiguration), "return a TalonFXConfiguration"
    got = (config.slot0.k_p, config.slot0.k_v, config.slot0.k_s)
    assert got == (24.5, 0.07, 4.0), f"slot0 (k_p, k_v, k_s) should be (24.5, 0.07, 4.0), got {got}"
    assert config.motor_output.inverted == signals.InvertedValue.CLOCKWISE_POSITIVE, (
        "inverted=1 is InvertedValue.CLOCKWISE_POSITIVE"
    )


def test_2_4_brake_and_current_limits():
    config = ex.get_motor_config(supply_limit=55)
    assert config.motor_output.neutral_mode == signals.NeutralModeValue.BRAKE, (
        f"set motor_output.neutral_mode to BRAKE, got {config.motor_output.neutral_mode}"
    )
    limits = config.current_limits
    assert limits.supply_current_limit == 55, f"supply_current_limit should be 55, got {limits.supply_current_limit}"
    assert limits.supply_current_limit_enable is True, "turn on supply_current_limit_enable"
    assert limits.stator_current_limit == 100, f"stator_current_limit should be 100, got {limits.stator_current_limit}"
