---
title: Libraries
parent: Code
nav_order: 2
---

# Overview of Python Libraries for FRC

In FRC programming, several libraries and frameworks are used to interact with the robot's hardware, implement logic, and structure code effectively. Robotpy allows for Ctrl-Z to use Python to program FRC robots. There are also a few key libraries commonly used by 4096: **WPILib**, and **Phoenix6**.

More detailed documentation can be found here:

[Robotpy](https://robotpy.readthedocs.io/en/stable/index.html)

[WPILib](https://docs.wpilib.org/en/stable/index.html)

[Phoenix6](https://v6.docs.ctr-electronics.com/en/stable/)

---

## 1. RobotPy

RobotPy is a set of libraries that provide a Python interface to the hardware components commonly used in FRC robots. It abstracts much of the low-level complexity, enabling teams to focus on high-level programming concepts and robot functionality.

## 2. WPILib

From the WPILib documentation:

The WPI Robotics Library (WPILib) is the standard software library provided for teams to write code for their FRC® robots. WPILib contains a set of useful classes and subroutines for interfacing with various parts of the FRC control system (such as sensors, motor controllers, and the driver station), as well as an assortment of other utility functions.

Ctrl-Z uses WPILib mainly for communicating with the robot:

### Core Architecture
- The robot inherits from WPILib's `TimedRobot` class through a custom `CoroutineRobot` implementation
- Maintains standard WPILib robot state methods (`robotInit`, `teleopInit`, etc.)
- Uses WPILib's timing mechanisms with the default 50Hz (0.02s) control loop

### Coroutine Framework
- Replaces WPILib's command-based programming with Python coroutines
- Methods like `robot_start()` and `teleop_mode()` enable generator-based control flow
- Simplifies asynchronous operations and complex robot behaviors

### Controller Integration
- Custom implementations of WPILib's `CommandXboxController` 
- Adapted to work seamlessly with the coroutine command system

### Network Communications
- Uses `ntcore` (NetworkTables) for robot-to-driver station communication
- Implements a `RemoteShell` for interactive debugging and code execution

## 3. WPIMath

Ctrl-Z also uses the extensive WPILib math library to calculate more complex robot function. WPIMath provides essential mathematical tools for robot motion, control, and spatial reasoning. This library is part of the larger WPILib ecosystem designed specifically for FRC robots.

### Geometry and Transformations
- **Coordinate systems**: `wpimath.geometry` classes (Translation2d, Rotation2d, Pose2d) track robot position and orientation on the field
- **Field-relative operations**: Converting between robot-centric and field-centric coordinate frames for intuitive control
- **Target tracking**: Managing spatial relationships between robot components and game elements

### Motion Control
- **Kinematics**: Drive system calculations, especially for complex systems like swerve drive
- **Trajectory generation**: Creating smooth paths using `wpimath.trajectory` for autonomous navigation
- **Path following**: Using trajectory controllers to follow pre-computed or dynamically generated paths

### Control Algorithms
- **PID controllers**: Implementing closed-loop control for precise mechanisms
- **Profiled PID**: Adding motion profiling for smoother acceleration/deceleration curves
- **Feedforward control**: Compensating for known physical behaviors in motors and mechanisms

### Filtering and Signal Processing
- **Input smoothing**: Filtering driver inputs for more controlled operation
- **Sensor fusion**: Combining multiple sensor readings for more accurate state estimation
- **Noise reduction**: Filtering sensor data to reduce measurement noise

This mathematical foundation enables the robot to understand its position, plan movements, and execute precise actions during both autonomous and teleoperated periods.

## 4. Phoenix6

Phoenix6 is CTRE's modern control library for FRC robotics, providing interfaces to control CTRE hardware devices like motor controllers, encoders, and sensors. 

## Hardware

### Motor Controllers
```python
# Creating TalonFX motor controllers on different CAN buses
self.drive_motor = hardware.TalonFX(drive_motor_id, "carnivore")  # Swerve drive motors
self.elevator_motor = hardware.TalonFX(const.ELEVATOR_MOTOR_CAN_ID, "rio")  # Mechanism motors
```

### Sensors
```python
# CANcoder for rotation sensing in swerve modules
self.angle_encoder = hardware.CANcoder(cancoder_id, "carnivore")

# Pigeon2 IMU for robot orientation
self.imu = hardware.Pigeon2(const.GYRO_ID, "rio")

# CANrange for distance measurement
self.end_effector_reef_alignment_can_range = CANrange(const.END_EFFECTOR_REEF_ALIGNMENT_CANRANGE, "rio")
```

## Configuration Pattern

Phoenix6 uses a strongly-typed configuration system:

```python
# Create config object
swerve_angle_motor_config = configs.TalonFXConfiguration()

# Set properties
swerve_angle_motor_config.slot0.k_p = 2.4
swerve_angle_motor_config.slot0.k_d = 0.1
swerve_angle_motor_config.current_limits.supply_current_limit = 40
swerve_angle_motor_config.motor_output.inverted = signals.InvertedValue(0)

# Apply configuration
self.angle_motor.configurator.apply(swerve_angle_motor_config)
```

## Control Methods

### Position Control
```python
def set_end_effector_position(self, position):
    self.command_position = position
    self.end_effector_motor.set_position(
        self.command_position * const.END_EFFECTOR_CONVERSION_FACTOR
    )
```

### Velocity Control
```python
def set_outtake_motor_speed(self, speed):
    self.commanded_outtake_motor_speed = speed
    self.outtake_motor.set_velocity(self.commanded_outtake_motor_speed)
```

### Motion Magic and Feedforward
```python
# PID with feedforward for motion control
self.end_effector_config.slot0.k_p = 10.0
self.end_effector_config.slot0.k_i = 0.0
self.end_effector_config.slot0.k_d = 0.5
self.end_effector_config.slot0.k_v = 0.24  # Velocity feedforward
self.end_effector_config.slot0.k_s = 0.05  # Static friction compensation
self.end_effector_config.slot0.k_g = 0.45  # Gravity compensation
```

## Sensor Reading

```python
# Reading CANcoder position
angle = self.angle_encoder.get_absolute_position().value

# Reading TalonFX sensor data
current_position = self.elevator_motor.get_position().value
current_velocity = self.drive_motor.get_velocity().value

# Reading CANrange sensor
distance = self.end_effector_reef_alignment_can_range.get_distance().value
is_detected = self.canrange_end_effector.get_is_detected().value
```

## Multiple CAN Bus Architecture

The code leverages Phoenix6's support for multiple CAN buses:
- **"rio"** - Standard RoboRIO CAN bus for core mechanisms
- **"carnivore"** - Separate CAN bus for drivetrain, reducing bus utilization

## Integration with WPILib

Phoenix6 is designed to work seamlessly with WPILib's control and geometry classes:

```python
from wpimath.geometry import Rotation2d, Translation2d
from wpimath.kinematics import SwerveModuleState

# Converting Phoenix6 readings to WPILib types
def getState(self):
    return SwerveModuleState(
        self.drive_motor.get_velocity().value * const.SWERVE_WHEEL_CIRCUMFERENCE,
        Rotation2d(self.angle_encoder.get_absolute_position().value),
    )
```

This integration allows Phoenix6-controlled hardware to work with WPILib's higher-level control systems like trajectory following and pose estimation.
