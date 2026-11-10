---
title: 7. RobotPy in Our Robot Code
parent: Python Tutorials
nav_order: 7
last_modified_date: 2026-11-10
---

# 7. RobotPy in Our Robot Code
{: .no_toc }

Lessons 1 to 6 teach Python with fake motors in your browser. This lesson
uses the real libraries. It goes through all the RobotPy code that our robots
used from 2024 to 2026, file by file. For each part, you write code on your
own computer and run tests that tell you if it is correct.

<details open markdown="block">
  <summary>Contents</summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

## Before you start

Do these first:

- Lessons 1 to 6. This lesson uses classes (lesson 5), and lambdas,
  decorators and `yield` (lesson 6) on almost every line.
- Section 1 of the [Setup](../../Getting%20Started/setup/) page: Python, Git
  and VS Code.

The examples come from three repositories. All three years use the same
team framework, `wpilibextra`. Its files are identical in 2024, 2025 and 2026.
Therefore what you learn here applies to all three robots.

| Year | Repository | Notes |
|:-----|:-----------|:------|
| 2026 | [Robot-2026](https://github.com/CtrlZ-FRC4096/Robot-2026/tree/tracking-hub/robot), branch `tracking-hub` | The end-of-season code. The `main` branch stops in February 2026 |
| 2025 | [Robot-2025-Public](https://github.com/CtrlZ-FRC4096/Robot-2025-Public/tree/main/robot) | Elevator, end effector, CANrange sensors |
| 2024 | [Robot-2024-Public](https://github.com/CtrlZ-FRC4096/Robot-2024-Public/tree/main/robot) | Shooter and two intakes. Many `yield from` commands |

{: .note }
> Each behavior that this page describes was tested with RobotPy 2026, and
> the practice tests check it again on your computer. If the page and a test
> do not agree, the test is correct. Tell a code mentor.

## Get the practice pack

The practice pack is in the wiki repository, in
[`practice/robotpy`](https://github.com/CtrlZ-FRC4096/Wiki/tree/main/practice/robotpy).
Do this one time, in PowerShell:

```powershell
git clone https://github.com/CtrlZ-FRC4096/Wiki.git
cd Wiki\practice\robotpy
py -3.14 -m venv .venv
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\python -m pip install -r requirements.txt
```

This installs RobotPy 2026, commands2 and Phoenix 6 in a `.venv` folder.
pytest, the test tool, comes with RobotPy. In VS Code, open the
`practice/robotpy` folder and select `.venv\Scripts\python.exe` as the
interpreter.

Run the tests for the first exercise:

```powershell
.\.venv\Scripts\python -m pytest checks\test_ex1_geometry.py
```

Most tests fail, because you did not write the code yet. Read the output:

- Each `.` is a test that passed. Each `F` is a test that failed.
- Under `FAILURES`, each failed test shows the line of the test that failed.
  The line that starts with `E` tells you what is wrong.
- `NotImplementedError: Exercise 1.1` means that you did not write part 1.1
  yet.

Open the exercise file, replace each `TODO` with your code, and run the tests
again. Continue until every test passes. Then go to the next exercise.

| Exercise | File | Section of this page |
|:---------|:-----|:---------------------|
| 1 | `ex1_geometry.py` | [Field geometry](#field-geometry-wpimathgeometry) |
| 2 | `ex2_phoenix.py` | [Phoenix 6](#phoenix-6-motors-and-sensors) |
| 3 | `ex3_hopper.py` | [Subsystems](#subsystems) |
| 4 | `ex4_oi.py` | [The operator interface](#the-operator-interface-oipy) |
| 5 | `ex5_commands.py` | [Commands and coroutines](#commands-and-coroutines-coroutinespy) |
| 6 | `ex6_autos.py` | [Autos](#autos-autoroutinespy) |
| 7 | `ex7_drive_math.py` | [Drive math](#drive-math-pid-filters-and-kinematics) |
| 8 | `ex8_dashboard.py` | [Dashboard and time](#dashboard-logging-and-time) |
| R | `robot/` | [Run a whole robot](#run-a-whole-robot) |

## The libraries

RobotPy is the Python version of WPILib, the FRC software library. It comes as
a set of packages. `robot/pyproject.toml` lists the ones that the robot needs:

```toml
[tool.robotpy]
robotpy_version = "2026.2.1.1"
components = ["apriltag", "commands2", "pathplannerlib", "phoenix6", "phoenix5", "robotpy-opencv"]
requires = ["photonlibpy", "numpy", "robotpy-pykit"]
```

| Import | What we use it for |
|:-------|:-------------------|
| `wpilib` | The robot base class, `Timer`, `SmartDashboard`, `DriverStation`, `XboxController`, `SendableChooser`, `Field2d`, LEDs, encoders |
| `wpimath` | Geometry (`Pose2d`), units, PID controllers, filters, swerve kinematics, the pose estimator |
| `commands2` | `Command`, `Subsystem`, the `CommandScheduler`, and command groups |
| `phoenix6` | CTRE devices: `TalonFX` motors, `CANcoder`, `Pigeon2`, `CANrange` |
| `wpilibextra` | Our framework, in `robot/wpilibextra`: `CoroutineRobot`, `commandify`, `XboxCommandController` |
| `pathplannerlib` | Paths for autonomous: `PathPlannerPath`, `FollowPathCommand`, `NamedCommands` |
| `ntcore` | NetworkTables, the data link to the dashboards |
| `robotpy_apriltag` | The AprilTag positions for the field |
| `photonlibpy` | Cameras that see AprilTags |
| `pykit` | Log files for AdvantageScope (2026) |

`wpilibextra` is not on PyPI. It is a folder in the robot code. If VS Code
cannot find it, you opened the wrong folder.

### Two ways to import

```python
import wpilib                          # then: wpilib.SmartDashboard.putNumber(...)
from wpilib import SmartDashboard      # then: SmartDashboard.putNumber(...)
from phoenix6 import controls, configs, hardware, signals
import subsystems.intake               # then: subsystems.intake.Intake(self)
from subsystems import shooter, hopper # then: shooter.Shooter(self)
```

Both forms give the same object. Our files mix them, sometimes in the same
file.

### The TYPE_CHECKING block

Almost every file starts with this:

```python
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from robot import Robot

class Intake(Subsystem):
    def __init__(self, robot: "Robot"):
```

`robot.py` imports `subsystems/intake.py`. If `intake.py` also imported
`robot.py`, the imports would go in a circle, which can fail. `TYPE_CHECKING` is `False`
when the robot runs, so the import never runs. VS Code reads it anyway, so it
knows what `self.robot` contains and can complete names for you. The quotes in
`"Robot"` tell Python not to look for the name when the code runs.

## robot.py and CoroutineRobot

`robot.py` holds one class, `Robot`. It makes every subsystem, holds the
state flags, and runs the scheduler. This is the 2026 file, shorter:

```python
class Robot(CoroutineRobot):
    def robot_start(self):
        self.scheduler = CommandScheduler.getInstance()

        # subsystems
        self.poseEstimator = subsystems.poseEstimator.PoseEstimator(self)
        self.drivetrain = subsystems.drivetrain.Drivetrain(self)
        self.intake = subsystems.intake.Intake(self)
        self.shooter = shooter.Shooter(self)
        self.hopper = hopper.Hopper(self)
        self.subsystems = [self.drivetrain, self.poseEstimator, self.intake, self.shooter, self.hopper]

        self.coroutines = Coroutines(self)
        self.oi = oi.OI(self)

        ### STATE MACHINE VARIABLES ###
        self.intake_at_default = True
        self.shoot_intent = False
        self.is_intaking = False

        while True:
            yield
            self.scheduler.run()
```

Each subsystem gets `self`, the robot, as its argument. That is how every
part of the code can read `self.robot.shoot_intent` or call
`self.robot.drivetrain.drive(...)`.

### How CoroutineRobot works

The WPILib class `TimedRobot` calls a method every 20 ms, 50 times each second.
`CoroutineRobot` is our class on top of it. It makes each mode a generator:

| Our method | When it runs |
|:-----------|:-------------|
| `robot_start()` | Starts when the program starts. Then one step in every loop, in every mode, until the program stops |
| `teleop_mode()` | Starts from the top each time teleop starts. Then one step in every loop of teleop |
| `autonomous_mode()` | The same, for autonomous |
| `disabled_mode()` | The same, for disabled |
| `test_mode()` | The same, for test mode |

"One step" means: run until the next `yield`, then stop until the next loop.
The `while True: yield; self.scheduler.run()` at the end of `robot_start()`
therefore runs the scheduler one time in every loop. The scheduler runs the
`periodic()` of every subsystem, and every command. If you remove that line,
the robot does nothing.

A mode method with no `yield` is also correct. In 2026, `autonomous_mode()`
only schedules the auto and ends. `CoroutineRobot` runs it one time.

### Waiting in a mode

```python
def wait(self, time):
    timer = Timer()
    timer.start()
    while not timer.hasElapsed(time):
        yield

def disabled_mode(self):
    if self.using_FMS:
        while not self.driverstation.isFMSAttached():
            yield
        yield from self.wait(2.0)
```

`yield from self.wait(2.0)` runs the `wait()` generator one step in each
loop until it ends. Never use `time.sleep()`. It stops the whole robot,
because nothing else can run while Python sleeps.

### Other parts of robot.py

```python
log_refresh_rate = 0.02 if self.isSimulation() else 0.25
@self.addPeriodic(period=log_refresh_rate, offset=0)
def _():
    self.log()
```

- `addPeriodic` runs a function on its own timer. The logs update 4 times
  each second on the robot and 50 times each second in simulation.
- `self.isSimulation()` is `True` on your computer and `False` on the
  robot. The code uses it to fake values that only real hardware has.
- `autonomousExit()` in 2026 is a normal `TimedRobot` method. WPILib calls
  it one time when autonomous ends. The robot uses it to apply new configs to
  the drive motors for teleop.
- `if __name__ == "__main__": pass` at the end does nothing. RobotPy finds
  the `Robot` class by itself when you run `python -m robotpy sim`.

## Subsystems

A subsystem is one mechanism. Each subsystem file follows the same pattern.
This is the 2026 hopper, shorter:

```python
class Hopper(Subsystem):
    def __init__(self, robot: "Robot"):
        super().__init__()
        self.robot = robot
        self.commanded_speed = 0.0
        self.indexer_motor = hardware.TalonFX(const.INDEXER_MOTOR_ID, "rio")
        self.indexer_motor_config = self.robot.get_motor_config(1, 15.0, 0.0, 0.0, 0.55, 0, 0, 26.5)
        self.indexer_motor.configurator.apply(self.indexer_motor_config)

    def get_speed(self):
        if self.robot.isSimulation():
            return self.commanded_speed
        else:
            return self.indexer_motor.get_velocity().value

    def set_speed(self, speed):
        self.commanded_speed = speed
        self.indexer_motor.set_control(controls.VelocityVoltage(speed))

    def stop(self):
        self.commanded_speed = 0.0
        self.indexer_motor.set_control(controls.DutyCycleOut(0.0))

    def periodic(self):
        ...  # read the state flags, then call set_speed() or stop()

    def log(self):
        SmartDashboard.putNumber("Hopper/Actual Speed", self.get_speed())
        SmartDashboard.putNumber("Hopper/Commanded Speed", self.commanded_speed)
```

The rules:

- Call `super().__init__()` first. It registers the subsystem with the
  scheduler.
- Save each command in a `commanded_...` attribute. In simulation, a motor
  does not move, so `get_...()` returns the saved command instead.
- `periodic()` reads the state flags of the robot and decides what the motors
  do. The OI only changes flags. This is our state machine.
- `stop()` turns off every motor. `disabled_mode()` calls it for every
  subsystem.
- `log()` puts values on the dashboard. `Robot.log()` calls it.

Two facts that surprise people:

- **`periodic()` runs in every mode, also when the robot is disabled.** On
  the field, a disabled robot cannot move its motors. But a flag that stays
  `True` makes `periodic()` command the motor again in the next loop. The
  practice robot clears its flags in `disabled_mode()` for this reason.
- **`registerSubsystem()` is not necessary.** `robot.py` calls
  `self.scheduler.registerSubsystem(subsystem)` for each subsystem. A
  `Subsystem` already did that in `super().__init__()`. RobotPy 2026 prints
  the warning "Tried to register an already-registered subsystem".

The 2026 files import `Subsystem` two times:

```python
from commands2 import Subsystem
from wpilibextra.coroutine.subsystem import Subsystem
```

The second line replaces the first. Our `Subsystem` is the commands2
`Subsystem` plus one feature: `setDefaultCommand` works as a decorator. See
[default commands](#default-commands).

**Exercise 3** writes this hopper. Its tests run the scheduler, so you can
see that `periodic()` runs without a call from you.

## Phoenix 6: motors and sensors

From 2024 to 2026, our code controls every motor through a TalonFX motor
controller. Phoenix 6 is the library from CTRE for these devices. It has four
parts:

```python
from phoenix6 import hardware, configs, controls, signals
```

| Part | What it is | Examples |
|:-----|:-----------|:---------|
| `hardware` | The devices | `TalonFX`, `CANcoder`, `Pigeon2`, `CANrange` |
| `configs` | Settings that you apply one time | `TalonFXConfiguration`, `CANcoderConfiguration` |
| `controls` | Requests: what the motor does now | `DutyCycleOut`, `VelocityVoltage`, `MotionMagicVoltage` |
| `signals` | Named values for settings | `InvertedValue`, `NeutralModeValue`, `MotorAlignmentValue` |

### Devices

```python
self.left_intake_motor = hardware.TalonFX(const.LEFT_INTAKE_MOTOR_ID, "rio")
self.deploy_cancoder = hardware.CANcoder(const.INTAKE_DEPLOY_CANCODER_ID, "rio")
self.gyro = Pigeon2(const.SWERVE_PIGEON_ID, "carnivore")
```

The first number is the CAN ID. It comes from `const.py`. The string is the
CAN bus: `"rio"` is the bus of the roboRIO, and `"carnivore"` is the CANivore bus
for the drivetrain.

{: .note }
> Phoenix 6 for 2026 prints a `DeprecationWarning` for the bus string. In
> 2027 the code must use a `CANBus` object instead. The practice pack hides
> the warning, because the 2026 robot code uses strings.

### Configs

Fill in a `TalonFXConfiguration`, then apply it one time in `__init__`:

```python
motor_config = configs.TalonFXConfiguration()
motor_config.motor_output.inverted = signals.InvertedValue(inverted)
motor_config.motor_output.neutral_mode = signals.NeutralModeValue(1)   # BRAKE
motor_config.slot0.k_p = k_p
motor_config.slot0.k_v = k_v
motor_config.slot0.k_s = k_s
motor_config.current_limits.supply_current_limit = 40
motor_config.current_limits.supply_current_limit_enable = True
motor_config.current_limits.stator_current_limit = 100
self.indexer_motor.configurator.apply(motor_config)
```

In 2026, `robot.get_motor_config(inverted, k_p, k_i, k_d, k_v, k_a, k_g, k_s)`
makes this config, so each subsystem only changes what is different. The
groups that our code uses:

| Group | Fields |
|:------|:-------|
| `slot0` | `k_p`, `k_i`, `k_d` (PID), `k_s`, `k_v`, `k_a`, `k_g` (feedforward). See [How to Tune a Controller](../../Controls/tuning/) |
| `motor_output` | `inverted`, `neutral_mode` |
| `current_limits` | `supply_current_limit`, `supply_current_limit_enable`, `stator_current_limit` |
| `torque_current` | `peak_forward_torque_current`, `peak_reverse_torque_current` |
| `motion_magic` | `motion_magic_cruise_velocity`, `motion_magic_acceleration` |
| `feedback` | `feedback_remote_sensor_id`, `feedback_sensor_source` (to use a CANcoder) |
| `closed_loop_ramps`, `open_loop_ramps` | the ramp periods, 0.02 s in our code |

Our code writes signal values as numbers. These are their names in Phoenix 6
for 2026:

| Written as | Name |
|:-----------|:-----|
| `signals.InvertedValue(0)` | `COUNTER_CLOCKWISE_POSITIVE` |
| `signals.InvertedValue(1)` | `CLOCKWISE_POSITIVE` |
| `signals.NeutralModeValue(0)` | `COAST` |
| `signals.NeutralModeValue(1)` | `BRAKE` |
| `signals.MotorAlignmentValue(0)` | `ALIGNED`: the follower turns the same way |
| `signals.MotorAlignmentValue(1)` | `OPPOSED`: the follower turns the other way |

### Control requests

A TalonFX does what the last request told it, until the next request.

```python
self.left_intake_motor.set_control(controls.DutyCycleOut(speed / 100))
```

| Request | The number means | Where we use it |
|:--------|:-----------------|:----------------|
| `DutyCycleOut(x)` | Fraction of full output, -1 to 1 | Intake rollers, `stop()` |
| `VoltageOut(v)` | Volts | 2024 pivots, with a wpimath PID output |
| `VelocityVoltage(rps)` | Rotations per second | 2026 hopper |
| `VelocityTorqueCurrentFOC(rps)` | Rotations per second, current control | Flywheels, swerve drive motors |
| `PositionVoltage(rot)` | Rotations | Swerve steering |
| `MotionMagicVoltage(rot)` | Rotations, with a speed profile | Shooter hood, 2025 elevator |
| `MotionMagicTorqueCurrentFOC(rot)` | Rotations, with a speed profile | 2026 intake deploy |
| `Follower(leader_id, alignment)` | Copy another motor | Second flywheel and intake motors |
| `StaticBrake()` | Hold still | 2024 climber, 2025 end effector |

The 2025 elevator makes one request in `__init__` and changes it:

```python
self.request = controls.MotionMagicVoltage(0, enable_foc=True)
...
self.elevator_motor_1.set_control(self.request.with_position(rotation))
```

Every request has `with_...` methods like this. They change one field and
return the same request.

{: .warning }
> `motor.set_position(0.0)` does **not** move the motor. It tells the sensor in
> the motor that its current position is now 0. The 2025 code uses it to zero
> the elevator and the end effector. To move to a position, send a position
> request.

The second argument of `Follower` changed between the years. In 2025 it was
`True` or `False`. In 2026 it is a `MotorAlignmentValue`.

### Read sensors

```python
speed = self.left_intake_motor.get_velocity().value        # rotations per second
rotations = self.deploy_motor.get_position().value         # rotations
angle = self.angle_encoder.get_absolute_position().value   # CANcoder, rotations
distance = self.can_range.get_distance().value             # CANrange, meters (2025)
```

Each `get_...()` returns a status signal. `.value` is the number in it.
Phoenix units are rotations, not degrees or meters. Convert them with the gear
ratio. See [Unit Conversions](../../Tutorials/unit-conversions/).

**Exercise 2** builds requests and configs, and its tests look inside them.

## const.py

`const.py` holds every number that does not change: CAN IDs, robot sizes,
gear ratios, and tuning values. The names are in `UPPER_CASE`.

```python
import math
from wpimath.geometry import Rotation2d, Translation2d
from wpimath.kinematics import SwerveDrive4Kinematics
from wpimath.units import inchesToMeters

DRIVETRAIN_TRACKWIDTH_METERS = inchesToMeters(23.5)
SWERVE_WHEEL_CIRCUMFERENCE = math.pi * inchesToMeters(4)  # C = pi*d
SWERVE_MAX_SPEED = 4.75  # meters per second
SWERVE_ANGLE_OFFSET_FRONT_LEFT = Rotation2d.fromDegrees(257.34375)
LEFT_INTAKE_MOTOR_ID = 25

SWERVE_KINEMATICS = SwerveDrive4Kinematics(
    Translation2d(DRIVETRAIN_WHEELBASE_METERS / 2.0, DRIVETRAIN_TRACKWIDTH_METERS / 2.0),
    ...
)
```

Other files read it with `import const`, then `const.SWERVE_MAX_SPEED`.
`const.py` can also hold objects, such as the kinematics, which are made one
time when the robot starts.

The 2025 code also uses classes as folders for numbers, in
`robot_scoring_positions.py`:

```python
class RobotScoringPositions:
    elevator_intake_height = 2.0
    class L1_Scoring:
        elevator_height = 10.0
        end_effector_outtake_speed = 12.0
```

`RobotScoringPositions.L1_Scoring.elevator_height` is `10.0`. The code never
makes an object from these classes.

## Field geometry (wpimath.geometry)

wpimath describes every position on the field in **meters** and every angle
with a `Rotation2d`.

| Class | Make one | Read from it |
|:------|:---------|:-------------|
| `Translation2d` | `Translation2d(x, y)` | `.X()`, `.Y()`, `.x`, `.y`, `.norm()` (length), `.angle()` |
| `Rotation2d` | `Rotation2d.fromDegrees(90)`, `Rotation2d(radians)`, `Rotation2d(x, y)` | `.degrees()`, `.radians()` |
| `Pose2d` | `Pose2d(x, y, rotation)`, `Pose2d(translation, rotation)` | `.X()`, `.Y()`, `.translation()`, `.rotation()` |
| `Translation3d`, `Rotation3d`, `Pose3d` | the same, with z | used to log 3D positions for AdvantageScope |

Math on these objects:

```python
arrow = target - robot_pose.translation()     # Translation2d minus Translation2d
distance = arrow.norm()                       # its length in meters
fast = Translation2d(forward_back, left_right) * const.SWERVE_MAX_SPEED
unit = Translation2d(forward_back, left_right) / mag_vel
ahead = Translation2d(0, -0.2).rotateBy(pose.rotation())   # turn an arrow
error = (current.rotation() - target_rotation).degrees()   # wraps to -180..180
```

`Rotation2d` subtraction wraps. 350 degrees minus 10 degrees gives -20
degrees, not 340. This is usually what you want for an error.

### Units

```python
from wpimath.units import inchesToMeters, degreesToRadians, radiansToDegrees
max_x_blue = inchesToMeters(205.406)
```

The game manual gives field sizes in inches. Convert them before you use
them.

### Red and blue

Our field positions are written for the blue alliance. `field_const.py` flips
them for red:

```python
self.fieldConstants.shouldFlip = DriverStation.getAlliance() == DriverStation.Alliance.kRed

def flip_Translation2d(self, translation):
    return (
        Translation2d(self.flip_X_coord(translation.X()), self.flip_Y_coord(translation.Y()))
        if self.shouldFlip
        else translation
    )
```

`a if condition else b` is a conditional expression: one value or the other.
`field_const.py` also loads the AprilTag positions:

```python
self.tag_map = AprilTagFieldLayout.loadField(AprilTagField.k2026RebuiltWelded)
```

**Exercise 1** writes the distance to the hub, the flip, and the point in
front of the intake.

## Drive math: PID, filters and kinematics

### The drive default command

```python
def square(x):
    return abs(x) * x

forward_back = -square(self.driver1.LEFT_JOY_Y())
left_right = -square(self.driver1.LEFT_JOY_X())
if self.robot.fieldConstants.shouldFlip:
    forward_back *= -1
    left_right *= -1
```

- A stick gives -1 when you push it forward or left. On the field, forward
  is +x and left is +y. That is the reason for the minus signs.
- `square()` makes small stick movements gentle. `abs(x) * x` keeps the
  sign, which `x * x` loses.
- On red, the drivers stand at the other end of the field, so both
  directions flip.

### PIDController

```python
from wpimath.controller import PIDController, ProfiledPIDController
from wpimath.trajectory import TrapezoidProfile

self.angle_pid = PIDController(0.0275, 0.0, 0.0001)
self.angle_pid.enableContinuousInput(0, 360)
self.angle_pid.setTolerance(2)

output = self.angle_pid.calculate(current_degrees, target_degrees)
```

- `calculate(measurement, setpoint)`: the measurement is **first**.
- `enableContinuousInput(0, 360)` tells the controller that 359 and 1 are
  close. Without it, the robot turns 358 degrees the long way.
- `atSetpoint()` is `True` when the error is inside the tolerance.
- `reset()` clears the old error. Use it when you start a new target.

`ProfiledPIDController` adds a speed limit and an acceleration limit, so the
target moves smoothly:

```python
self.rotation_controller = ProfiledPIDController(
    0.03, 0.001, 0.000225, TrapezoidProfile.Constraints(28000.0, 36500.0)
)
```

### Filters

```python
from wpimath.filter import SlewRateLimiter
self.accel_shoot_limiter = SlewRateLimiter(0.2, -3)   # 2026
```

A `SlewRateLimiter` limits how fast a value can change each second. Here the
value can go up by 0.2 each second and down by 3 each second.

`SimpleMotorFeedforwardMeters` (2024 and 2025 swerve modules) calculates the
voltage for a speed from `k_s`, `k_v` and `k_a`.

### ChassisSpeeds and kinematics

```python
module_states = const.SWERVE_KINEMATICS.toSwerveModuleStates(
    ChassisSpeeds.fromFieldRelativeSpeeds(translation.x, translation.y, rotation, self.robot.poseEstimator.getYaw())
)
module_states = SwerveDrive4Kinematics.desaturateWheelSpeeds(module_states, max_speed)
```

- `ChassisSpeeds(vx, vy, omega)` is a robot speed: m/s, m/s and rad/s.
- `fromFieldRelativeSpeeds(...)` changes field directions to robot
  directions, with the heading of the robot.
- `toSwerveModuleStates(...)` gives the speed and angle of each wheel.
- `desaturateWheelSpeeds(...)` scales all wheels down together if one is
  faster than the maximum.
- `SwerveModuleState(speed, Rotation2d)` is one wheel. See
  [Swerve Module Optimization](../../Tutorials/swerve-module-optimization/).

The pose estimator (`SwerveDrive4PoseEstimator` in `poseEstimator.py`)
combines the wheels, the gyro and the cameras with `addVisionMeasurement()`.
That code is long. Read it after this lesson.

**Exercise 7** writes the stick math, the heading PID and the field-to-robot
speed change.

## The operator interface (oi.py)

`oi.py` connects the controllers to the robot. Read the
[Operator Interface](../../Controls/operator-interface/) page for the rules
that the drive team uses.

```python
self.driver1 = XboxCommandController(0)
self.driver2 = XboxCommandController(1)
self.driver1.LEFT_JOY_X.setDeadzone(0.02)
self.driver1.RIGHT_JOY_X.setDeadzone(0.1)
```

The number is the port in the Driver Station: 0 for driver 1, 1 for driver 2.

### What a controller has

| Name | Type | Notes |
|:-----|:-----|:------|
| `A`, `B`, `X`, `Y`, `LEFT_BUMPER`, `RIGHT_BUMPER`, `START`, `BACK`, `LEFT_STICK`, `RIGHT_STICK` | button | |
| `POV.UP`, `POV.DOWN`, `POV.LEFT`, `POV.RIGHT`, `POV.DIAG_UP_LEFT`, ... | button | The D-pad: 0, 180, 270 and 90 degrees |
| `LEFT_TRIGGER_AS_BUTTON`, `RIGHT_TRIGGER_AS_BUTTON` | button | Pressed above 0.05 |
| `LEFT_JOY_UP`, `LEFT_JOY_DOWN`, `RIGHT_JOY_LEFT`, ... | button | A stick pushed past 0.1 |
| `LEFT_JOY_X`, `LEFT_JOY_Y`, `RIGHT_JOY_X`, `RIGHT_JOY_Y` | analog | -1 to 1 |
| `LEFT_TRIGGER`, `RIGHT_TRIGGER` | analog | 0 to 1 |

An analog is a `CustomAnalog`. Call it like a function to read it:

```python
self.driver1.LEFT_JOY_Y()          # with the deadzone, inversion and modifier
self.driver1.LEFT_JOY_Y.getRaw()   # the raw value
self.driver1.LEFT_JOY_Y.setInverted(True)
self.driver1.LEFT_JOY_Y.setModifier(lambda x: x ** 3)
```

Inside the deadzone the value is 0. See
[Joystick Deadbands](../../Tutorials/joystick-deadband/).

### Bindings

```python
@self.driver1.A.whenPressed
def _():
    self.robot.is_intaking = not self.robot.is_intaking
```

Each decorator makes a command from your function and binds it to the button.
This is how they behave in our framework. The tests in exercise 4 check each
row:

| Decorator | What happens |
|:----------|:-------------|
| `whenPressed` | The function starts one time when the button goes down |
| `whenReleased` | The function starts one time when the button goes up |
| `whenHeld` | The function starts when the button goes down, and is cancelled when the button goes up. A plain function runs **one** time. A generator with `while True: ... yield` runs in every loop while the button is held |

The usual pattern is a `whenHeld` and `whenReleased` pair that set and clear
a flag, as in 2026:

```python
@self.driver1.LEFT_TRIGGER_AS_BUTTON.whenHeld
def _():
    self.robot.is_intaking = True
    self.robot.intake_at_default = False

@self.driver1.LEFT_TRIGGER_AS_BUTTON.whenReleased
def _():
    self.robot.is_intaking = False
```

{: .note }
> The keyboard exercise on the Operator Interface page uses a simpler model.
> In that exercise, `whenHeld` runs your function in every loop. In our
> robot code, a plain function under `whenHeld` runs one time.

### A button made from a flag

```python
self.rumble_button_d1 = Button(lambda: self.robot.rumble_d1)

@self.rumble_button_d1.whenPressed
def _():
    timer = Timer()
    timer.start()
    self.driver1.setRumble(1)
    while not timer.hasElapsed(0.5):
        yield
    self.driver1.setRumble(0)
    self.robot.rumble_d1 = False
```

`Button` here is our `CustomButton`, imported as `Button`. It is pressed when
its lambda returns `True`. The robot sets `rumble_d1`. The binding rumbles
for half a second and then clears the flag. The robot keeps running during
the wait, because the function yields.

A binding decorator can also take options in parentheses. Our `oi.py` files
do not use them, but the framework accepts them:

```python
@self.driver1.A.whenHeld(requirements=[self.robot.drivetrain])
def _():
    while True:
        ...  # drive in a special way while A is held
        yield
```

This binding stops the default command of the drivetrain while A is held.

### Default commands

```python
@self.robot.drivetrain.setDefaultCommand
def _():
    while True:
        yield
        ...  # read the sticks and drive
```

A default command runs when no other command uses the subsystem. Our
`Subsystem` lets you write it as a decorator. If a command that requires the
drivetrain starts, the default command stops. When that command ends, the
default command starts again.

**Exercise 4** writes a toggle, a trigger pair, the rumble and a held loop.

## Commands and coroutines (coroutines.py)

`coroutines.py` holds the commands that autos use. Each one is a generator
function with the `@commandify` decorator:

```python
@commandify
def drive_to_zone_trench():
    robot.is_intaking = False
    robot.intake_at_default = False
    robot.shoot_intent = True
    robot.shooter_at_default = False
    while robot.fuel_in_hopper > 0:
        yield

self.drive_to_zone_trench = drive_to_zone_trench
```

- `@commandify` makes a `CoroutineCommand`. After the decorator, the name
  `drive_to_zone_trench` is a command, not a function.
- Store the command itself. **Do not call it.** `self.x = x()` makes a
  broken command. It crashes with `TypeError: 'generator' object is not
  callable` when it runs. The 2024 code has this mistake, but those copies
  were never used.
- `commandify` also registers the command with the PathPlanner class
  `NamedCommands` under the function name. A PathPlanner event with the name
  `drive_to_zone_trench` runs this command. Therefore each name must be
  unique.
- `@commandify(requirements=[robot.shooter])` (2024) says which subsystems
  the command uses. If a second command needs the same subsystem, the
  scheduler cancels the first one.

### The life of a CoroutineCommand

| commands2 step | What our command does |
|:---------------|:----------------------|
| `initialize()` | Makes a new generator from your function |
| `execute()` | One step: runs to the next `yield` |
| `isFinished()` | `True` when the function reached its end |
| `end(interrupted)` | If cancelled early, closes the generator |

A closed generator raises `GeneratorExit` at the `yield` where it stopped.
Therefore `try: ... finally:` in the function runs when the command is
cancelled. The stand-in intake in exercise 6 uses this to turn itself off.

### Wait in a command

```python
while not robot.shooter.shoot_ready:   # wait for a condition
    yield
yield from self.wait(0.65)             # wait for time (2024)
```

**Exercise 5** writes a shoot command that waits for the shooter, feeds for
0.3 s, and stops.

## Autos (autoroutines.py)

An auto is a command group, made from paths and coroutine commands:

```python
def right_trench_bump_robust_new_mvr(self):
    return SequentialCommandGroup(
        ParallelCommandGroup(
            self.robot.P1_T_B_R_ROBUST_MVR,
            self.robot.coroutines.intake),
        self.robot.coroutines.p1_over_right_bump,
        self.robot.coroutines.drive_to_zone_trench.withTimeout(4.0),
        ...
    )
```

| Tool | What it does |
|:-----|:-------------|
| `SequentialCommandGroup(a, b, c)` | `a`, then `b`, then `c` |
| `ParallelCommandGroup(a, b)` | Both at the same time. Ends when **both** end |
| `ParallelRaceGroup(a, b)` | Both at the same time. Ends when **one** ends, and cancels the other |
| `WaitCommand(5.5)` | Waits 5.5 seconds |
| `cmd.withTimeout(4.0)` | `cmd`, but cancelled after 4 seconds |

### One command, one group

A command object can be in **one** group only. If you put it in a second
group, commands2 raises `IllegalCommandUse: Commands that have been composed
may not be added to another composition or scheduled individually`.

`robot.py` in 2026 makes each path command one time. Then several autos use
the same objects, for example `drive_to_zone_trench.withTimeout(4.0)`. This
works because the robot builds only one auto each time the program starts.
If you build an auto two times, make new command objects for each one.

### Paths

```python
self.robot_config = RobotConfig.fromGUISettings()
self.P1_T_B_R_ROBUST = self.getPathCommand(PathPlannerPath.fromPathFile("P1_T_B_R_Robust"))

def getPathCommand(self, path: PathPlannerPath):
    return FollowPathCommand(
        path,
        self.drivetrain.get_pose,
        self.drivetrain.get_robot_relative_speeds,
        self.drivetrain.drive_robot_relative,
        PPHolonomicDriveController(PIDConstants(0.95, 0, 0.05), PIDConstants(0.75, 0, 0.04)),
        self.robot_config,
        self.drivetrain.should_flip_path,
        self.drivetrain,
    )
```

The path files are in `robot/deploy/pathplanner`. `get_pose` has no parentheses:
the path command gets the **function**, and calls it in every loop. This is
the same idea as the lambda in lesson 6.

2024 used `@autoroutine2command`. It makes a command from a generator. The
command requires every subsystem, so nothing else can run during the auto.

### Pick the auto

```python
self.auto_chooser = wpilib.SendableChooser()
self.auto_chooser.addOption("Right Trench & Bump MVR PP", 5)
self.auto_chooser.setDefaultOption("Default (no auto)", 0)
SmartDashboard.putData("Auto Chooser", self.auto_chooser)

match self.robot.auto_chooser.getSelected():
    case 5:
        self.robot.auto = self.robot.autoroutines.right_trench_bump_robust_new_mvr()
    case 0:
        self.robot.auto = SequentialCommandGroup()
```

The drive team picks an option on the dashboard. `getSelected()` gives its
value. `match`/`case` compares one value with each `case`, from the top.
`case _:` matches anything. Then `autonomous_mode()` calls
`self.scheduler.schedule(self.auto)`.

**Exercise 6** builds three autos and makes the one-group error happen, so you
know it when you see it.

## Dashboard, logging and time

### SmartDashboard

```python
SmartDashboard.putNumber("Intake/Commanded Intake Speed", self.commanded_intake_speed)
SmartDashboard.putBoolean("States/Is Intaking", self.robot.is_intaking)
SmartDashboard.putNumberArray("RobotPose", [pose.X(), pose.Y(), pose.rotation().degrees()])
SmartDashboard.putData("Intake/Deploy PID Controller", self.deploy_pid_controller)
SmartDashboard.putData("Field", self.field)
submitted = SmartDashboard.getNumber("Submit Auto? (and FMS Connected)", 0)
```

- The `/` in a key makes a folder in AdvantageScope and Elastic.
- `putData` sends an object that the dashboard can show or change. Examples
  are a PID controller, a chooser and a field.
- `getNumber(key, default)` reads a value that someone typed on the
  dashboard. It returns the default if the key does not exist.
- f-strings make keys in a loop: `f"Hopper/Sim Fuels/Fuel {fuel_num}"`.

A `Field2d` shows the robot on a field drawing:

```python
self.field = Field2d()
self.field.setRobotPose(self.poseEst.getEstimatedPosition())
self.virtual_target = self.poseEstimator.field.getObject("Virtual Target")
```

Logs for after the match: `DataLogManager.start()` and
`DriverStation.startDataLog(DataLogManager.getLog())` record everything.
In 2026, the `Logger` from pykit also writes logs for AdvantageScope.

### Time

```python
timer = Timer()
timer.start()
timer.hasElapsed(0.5)   # True after 0.5 s
timer.get()             # seconds since start()
timer.reset()

start_time = wpilib.RobotController.getFPGATime()          # microseconds
...
elapsed_ms = (wpilib.RobotController.getFPGATime() - start_time) / 1000.0
SmartDashboard.putNumber("Loop Times/Intake", elapsed_ms)
```

The 2026 subsystems measure how long each `periodic()` takes. A loop has
20 ms. If the code needs more time, the robot prints loop overrun warnings.

### The Driver Station

```python
DriverStation.getAlliance() == DriverStation.Alliance.kRed
DriverStation.isFMSAttached()      # True on the competition field
DriverStation.getBatteryVoltage()
```

**Exercise 8** logs values, makes the auto chooser, picks an auto with
`match`/`case`, and reads a value from the dashboard.

## Python features in our code

These parts of Python appear in the robot code. Lessons 1 to 6 do not
explain all of them.

| Feature | Example | Meaning |
|:--------|:--------|:--------|
| Conditional expression | `0.02 if self.isSimulation() else 0.25` | One value or the other |
| Chained comparison | `min_x_blue <= pose.X() <= max_x_blue` | Both comparisons are true |
| f-string | `f"Fuel {fuel_num}"` | Puts a value into a string |
| `match` / `case` | `match choice:` then `case 5:` | Compares one value with each case |
| Type hints | `def drive(self, translation: Translation2d, rotation)`, `-> float` | Notes for VS Code. Python does not check them |
| `@property` | `def Hub(self):` in `field_const.py` | Read it like an attribute: `self.fieldConstants.Hub` |
| `@dataclass(frozen=True)` | `limelight.py` | A class that only holds values, which cannot change |
| `deque(maxlen=22)` | `self.flywheel_spun` in `shooter.py` | A list that keeps only the last 22 values |
| `all(...)` | `all(self.flywheel_spun)` | `True` if every value is true |
| `enumerate`, `zip` | `for idx, waypoint in enumerate(waypoints):` | A loop with the index, or over two lists |
| Unpacking | `[*self.get_module_positions()]` | Puts the values of one list into a new list |
| `*args`, `**kwargs` | `wpilibextra` | Any number of arguments |
| `try` / `finally` | the intake in exercise 6 | The `finally` code always runs |
| numpy | `np.array([...])` in `const.py` | Camera calibration numbers |

{: .warning }
> A few lines in the 2026 files start with tabs instead of spaces. They are
> inside parentheses or comments, where Python ignores the indentation. In a
> block, a mix of tabs and spaces gives `TabError`. The VS Code command
> **Convert Indentation to Spaces** corrects a file.

## Run a whole robot

`practice/robotpy/robot` is a small robot with the same layout as
`Robot-2026/robot`: `robot.py`, `oi.py`, `const.py`, `subsystems/`,
`tests/`, and a copy of `wpilibextra`. It has one intake and one auto.

Do the three parts, then run the robot:

1. **R.1** in `subsystems/intake.py`: write `periodic()`.
2. **R.2** in `oi.py`: bind the left trigger.
3. **R.3** in `robot.py`: write `make_auto()`.

From `practice\robotpy\robot`:

```powershell
..\.venv\Scripts\python -m robotpy sim
```

The simulator window opens:

1. Drag **Keyboard 0** from **System Joysticks** into **Joystick 0**.
2. Select **Teleop**.
3. Hold the key for axis 2. On an Xbox controller, axis 2 is the left
   trigger. The keyboard settings window shows which key it is.
4. In the **NetworkTables** view, watch `Intake/Commanded Speed` change.
5. Press Ctrl+C in the terminal to stop.

Until a joystick is connected, the terminal prints warnings that a joystick
is missing. This is normal.

Then run the robot tests:

```powershell
..\.venv\Scripts\python -m robotpy test
```

`robotpy test` runs the tests in `robot/tests`. `pyfrc_test.py` is the same
file as in Robot-2026: it starts the robot in each mode and fails if the code
crashes. `test_practice_robot.py` drives the robot. It holds the left trigger
and checks the intake speed, and runs the auto two times.

{: .note }
> The copy of `wpilibextra` in the practice pack has one change. In Robot-2026,
> `CoroutineRobot` makes `robotInit()` and the other mode methods inside
> `__init__`. pyfrc cannot see when the robot started, so every
> `robotpy test` test times out. The copy makes them normal methods. The
> robot behaves the same way. Ask a mentor before you change this in the
> robot code.

## How the tests work

The tests are normal Python files. A function whose name starts with `test_`
is one test. It fails if an `assert` is false or an error occurs:

```python
def test_3_4_scheduler_runs_periodic(robot, step):
    hopper = ex.Hopper(robot)
    robot.shoot_intent = True
    step()  # one robot loop: the scheduler calls hopper.periodic()
    assert hopper.get_speed() == ex.FEED_SPEED, "shoot_intent is True, so ..."
```

The arguments `robot` and `step` are **fixtures**. pytest makes them before
the test, from `checks/conftest.py`:

| Fixture | What it gives the test |
|:--------|:-----------------------|
| `robot` | A `FakeRobot` with the state flags that the exercises use |
| `step` | `step()` runs one 20 ms loop, `step(10)` runs ten, `step.seconds(0.5)` runs 25 |
| `driver1` | A simulated controller on port 0: `press("A")`, `set_axis("RightTrigger", 0.8)`, `set_pov(180)` |

Before each test, `conftest.py` resets the Driver Station, makes a new
scheduler, enables the robot, and stops the clock. Time moves only when a
test calls `step`. Therefore a test gives the same result on every computer.

Useful pytest options:

```powershell
.\.venv\Scripts\python -m pytest checks\test_ex4_oi.py -k rumble   # only tests with "rumble" in the name
.\.venv\Scripts\python -m pytest -x                                 # stop at the first failure
.\.venv\Scripts\python -m pytest -v                                 # one line for each test
```

The robot tests in `robot/tests` use two fixtures from pyfrc instead:
`robot`, the real `Robot` object, and `control`, which runs it:
`control.step_timing(seconds=1.0, autonomous=True, enabled=True)`.

## Common errors

| You see | The cause |
|:--------|:----------|
| `NotImplementedError: Exercise 3.1` | You did not write that part yet |
| `ModuleNotFoundError: No module named 'wpilib'` | The wrong Python. Use `.\.venv\Scripts\python` |
| `ModuleNotFoundError: No module named 'wpilibextra'` | The wrong folder. Run pytest in `practice\robotpy` |
| `IllegalCommandUse: Commands that have been composed ...` | One command object is in two groups |
| `TypeError: 'generator' object is not callable` | You called a `@commandify` command: `x()` instead of `x` |
| A `whenHeld` binding does its work one time only | A plain function runs one time. Use `while True: ... yield` |
| The robot freezes for a moment | `time.sleep()` in a command. Use `yield` and a `Timer` |
| The robot turns the long way around | `enableContinuousInput(0, 360)` is missing |
| The robot drives sideways | Field speeds were sent as robot speeds, or the reverse |
| `periodic()` turns a motor on after `stop()` | A state flag is still `True`. `periodic()` runs in every loop |
| Warnings that a joystick is missing | No controller is in the simulator or the Driver Station. Normal in tests |

## Answers

The solutions are in
[`tools/robotpy-practice/solutions`](https://github.com/CtrlZ-FRC4096/Wiki/tree/main/tools/robotpy-practice/solutions).
Try each exercise first. A test that fails tells you more than an answer
that you read. Mentors check the pack with
`python tools/validate-robotpy-practice.py`.

## After this lesson

Open the real `robot/oi.py` and `robot/subsystems/intake.py` in Robot-2026.
Trace one button from the binding to the flag, from the flag to
`periodic()`, and from `periodic()` to `set_control()`. You now know every
part of the code on that path.
