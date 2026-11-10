from wpilib import SmartDashboard

import ex3_hopper as ex


def test_3_1_set_speed_saves_the_command(robot):
    hopper = ex.Hopper(robot)
    hopper.set_speed(12.5)
    assert hopper.commanded_speed == 12.5, (
        f"set_speed(12.5) must save 12.5 in self.commanded_speed, got {hopper.commanded_speed}"
    )


def test_3_2_get_speed_in_simulation(robot):
    hopper = ex.Hopper(robot)
    hopper.set_speed(30)
    assert hopper.get_speed() == 30, (
        f"in simulation get_speed() returns the commanded speed (30), got {hopper.get_speed()}"
    )


def test_3_3_stop(robot):
    hopper = ex.Hopper(robot)
    hopper.set_speed(30)
    hopper.stop()
    assert hopper.commanded_speed == 0, f"stop() must set commanded_speed to 0, got {hopper.commanded_speed}"


def test_3_4_scheduler_runs_periodic(robot, step):
    hopper = ex.Hopper(robot)
    robot.shoot_intent = True
    step()  # one robot loop: the scheduler calls hopper.periodic()
    assert hopper.get_speed() == ex.FEED_SPEED, (
        f"shoot_intent is True, so after one loop the hopper should feed at {ex.FEED_SPEED}, "
        f"got {hopper.get_speed()}. Do not call periodic() yourself: the scheduler does."
    )


def test_3_4_jam_wins_over_shooting(robot, step):
    hopper = ex.Hopper(robot)
    robot.shoot_intent = True
    robot.clear_jam = True
    step()
    assert hopper.get_speed() == ex.JAM_SPEED, (
        f"clear_jam is checked first, so the hopper should run at {ex.JAM_SPEED}, got {hopper.get_speed()}"
    )


def test_3_4_no_flags_means_stop(robot, step):
    hopper = ex.Hopper(robot)
    robot.shoot_intent = True
    step()
    robot.shoot_intent = False
    step()
    assert hopper.get_speed() == 0, (
        f"with no flags set the hopper must stop, got {hopper.get_speed()}"
    )


def test_3_5_log_puts_numbers_on_the_dashboard(robot):
    hopper = ex.Hopper(robot)
    hopper.set_speed(17)
    hopper.log()
    commanded = SmartDashboard.getNumber("Hopper/Commanded Speed", -999)
    actual = SmartDashboard.getNumber("Hopper/Actual Speed", -999)
    assert commanded == 17, f'"Hopper/Commanded Speed" should be 17, got {commanded}'
    assert actual == 17, f'"Hopper/Actual Speed" should be 17 in simulation, got {actual}'
