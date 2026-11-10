import ex4_oi as ex


def make_oi(robot):
    return ex.OI(robot)


def test_example_pov_down_resets_heading(robot, driver1, step):
    make_oi(robot)
    driver1.set_pov(180)
    step()
    assert robot.robot_oriented_angle == 0.0, "the example binding must still work: POV down sets the angle to 0"


def test_4_1_a_toggles_intake(robot, driver1, step):
    make_oi(robot)
    driver1.press("A")
    step()
    assert robot.is_intaking is True, "press A one time: is_intaking should become True"
    driver1.release("A")
    step()
    driver1.press("A")
    step()
    assert robot.is_intaking is False, "press A a second time: is_intaking should become False"


def test_4_1_holding_a_toggles_one_time(robot, driver1, step):
    make_oi(robot)
    driver1.press("A")
    step(10)
    assert robot.is_intaking is True, (
        "hold A for 10 loops: is_intaking should toggle ONE time and stay True. "
        "Use whenPressed, not whenHeld with a loop."
    )


def test_4_2_trigger_held_and_released(robot, driver1, step):
    make_oi(robot)
    driver1.set_axis("RightTrigger", 0.8)
    step()
    assert robot.shoot_intent is True, "right trigger held: shoot_intent should be True"
    assert robot.spin_down is False, "right trigger held: spin_down should still be False"
    driver1.set_axis("RightTrigger", 0.0)
    step()
    assert robot.shoot_intent is False, "right trigger released: shoot_intent should be False"
    assert robot.spin_down is True, "right trigger released: spin_down should be True"


def test_4_3_rumble_for_half_a_second(robot, driver1, step):
    make_oi(robot)
    robot.rumble_d1 = True
    step(2)
    assert driver1.rumble() == 1.0, f"rumble_d1 became True: the controller should rumble at 1, got {driver1.rumble()}"
    step.seconds(0.3)
    assert driver1.rumble() == 1.0, "0.3 s later the controller should still rumble"
    step.seconds(0.3)
    assert driver1.rumble() == 0.0, f"after 0.5 s the rumble should stop, got {driver1.rumble()}"
    assert robot.rumble_d1 is False, "after the rumble, set robot.rumble_d1 back to False"


def test_4_3_robot_keeps_running_during_rumble(robot, driver1, step):
    make_oi(robot)
    robot.rumble_d1 = True
    step(2)
    driver1.press("A")
    step()
    assert robot.is_intaking is True, (
        "other buttons must work while the controller rumbles. "
        "Wait with yield in a loop, never with time.sleep()."
    )


def test_4_4_y_held_turns_every_loop(robot, driver1, step):
    make_oi(robot)
    start = robot.robot_oriented_angle
    driver1.press("Y")
    step(5)
    turned = robot.robot_oriented_angle - start
    assert turned == 10, (
        f"Y held for 5 loops should add 2 five times (10 degrees), got {turned}. "
        "A plain function runs one time. Use while True: ... yield"
    )
    driver1.release("Y")
    step(5)
    assert robot.robot_oriented_angle - start == 10, "after Y is released the angle must stop changing"
