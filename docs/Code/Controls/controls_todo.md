---
title: Controls to add
parent: Controls
nav_order: 3
---

To add:
# FRC Controls: A Comprehensive Overview

## Hardware Foundation

### Main Control System Components
- **RoboRIO**: The central brain of an FRC robot; a National Instruments real-time controller that runs robot code
- **Power Distribution Hub (PDH)**: Distributes power to all electrical components and provides current monitoring
- **Radio**: Provides wireless communication between the driver station and robot
- **Voltage Regulator Module (VRM)**: Provides regulated power for low-voltage devices

### Motor Controllers
- **CTRE Phoenix Controllers**: 
  - **TalonFX**: Built-in encoders, sophisticated control modes (as seen in the drivetrain code)
  - **TalonSRX/VictorSPX**: Legacy controllers with broad adoption
- **REV Robotics**:
  - **SPARK MAX**: Used with NEO brushless motors
- **Multiple CAN Bus Architecture**: As seen in your code, using both "rio" and "carnivore" buses to split control traffic

### Sensors
- **Encoders**:
  - **CANcoders**: Absolute position encoders for tracking rotation (used in swerve modules)
  - **Built-in encoders**: In TalonFX/Falcon 500 motors
- **Inertial Measurement Units (IMUs)**:
  - **Pigeon 2.0**: Used for robot orientation (gyro readings)
- **Vision Systems**:
  - **Limelight**: Smart cameras for target tracking
  - **PhotonVision**: Open-source vision processing
- **Distance Sensors**:
  - **CANRange**: Time-of-flight sensors for precise distance measurement

### Input Devices
- **Driver Station**: Laptop running official FRC driver station software
- **Controllers**: Xbox controllers with custom button mappings and deadzone configurations
- **Custom Interfaces**: Often team-specific control panels

## Software Strategies

### WPILib Framework
- **Core Robot Structure**: TimedRobot or CommandRobot base classes with lifecycle methods
- **Subsystem Architecture**: Dividing robot functionality into modular components
- **Command-Based Programming**: Organizing actions into composable, reusable blocks
- **Coroutine Adaptations**: Your team has implemented Python coroutines to replace the command framework with more Pythonic patterns

### Motion Control Strategies

#### Closed-Loop Control
- **PID Controllers**: Used throughout your code for precise position and velocity control
  ```python
  self.angle_pid = PIDController(0.075, 0.0, 0.001)
  self.angle_pid.enableContinuousInput(0, 360)
  self.angle_pid.setTolerance(0.5)
  ```

- **Feedforward Control**: Compensating for known physical behaviors
  ```python
  self.end_effector_config.slot0.k_v = 0.24  # Velocity feedforward
  self.end_effector_config.slot0.k_s = 0.05  # Static friction compensation
  self.end_effector_config.slot0.k_g = 0.45  # Gravity compensation
  ```

- **Motion Magic**: CTRE's implementation of motion profiling for smooth movements
  ```python
  self.request = controls.MotionMagicVoltage(0, enable_foc=True)
  self.elevator_motor_config.motion_magic.motion_magic_cruise_velocity = 175
  self.elevator_motor_config.motion_magic.motion_magic_acceleration = 100
  ```

#### Drivetrain Control
- **Swerve Drive Kinematics**: Converting chassis movement to individual module states
  ```python
  module_states = const.SWERVE_KINEMATICS.toSwerveModuleStates(
      ChassisSpeeds.fromFieldRelativeSpeeds(
          translation.x, translation.y, -rotation, self.robot.poseEstimator.getYaw()
      )
  )
  ```

- **Field-Relative Control**: Mapping driver inputs to field coordinates rather than robot-relative motion
- **Path Following**: Trajectory generation and following for autonomous navigation

### Pose Estimation and Localization
- **Odometry**: Tracking robot position using wheel encoders and gyro
- **Vision Integration**: Using AprilTags for global position corrections
- **Sensor Fusion**: Combining multiple sensor inputs for robust positioning

### Autonomous Navigation
- **Sequenced Commands**: Building complex routines from simpler actions
  ```python
  def three_piece_auto(self):
      return SequentialCommandGroup(
          self.robot.coroutines.score_piece_1.withTimeout(1.37),
          self.robot.coroutines.reset_robot_after_scoring_1,
          self.robot.p_for_3p[0],
          # ... more commands
      )
  ```

- **Path Planning**: Pre-defined trajectories for robot movement
- **Dynamic Path Generation**: Creating paths on-the-fly based on game state

### Teleoperation Control
- **Button Binding**: Mapping controller inputs to robot actions
  ```python
  @self.driver1.RIGHT_TRIGGER_AS_BUTTON.whenHeld
  def _():
      # Command to execute while button is held
  ```

- **Axis Scaling**: Applying curves to joystick inputs for better control
- **State Machine Logic**: Managing complex robot behaviors based on current state

## Advanced Control Techniques

### Mechanism Control
- **Position PID**: Used for elevator, end effector, and climber position control
- **Cascaded Control**: Nested control loops for more precise behavior
- **Current Limiting**: Protecting motors while allowing peak performance
  ```python
  self.elevator_motor_config.current_limits.supply_current_limit = 80
  self.elevator_motor_config.torque_current.peak_forward_torque_current = 80
  ```

### Vision-Based Control
- **Target Alignment**: Automatically positioning relative to game pieces or field elements
- **Distance Estimation**: Using vision to determine range to targets
- **Pose Correction**: Periodically updating odometry with vision data

### Diagnostics and Tuning
- **SmartDashboard Integration**: Real-time data visualization and parameter adjustment
  ```python
  SmartDashboard.putNumber("vx", vx)
  SmartDashboard.putNumber("vy", vy)
  SmartDashboard.putNumber("omega", omega)
  ```

- **Logging**: Recording robot state for post-match analysis
- **Simulation**: Testing code without physical hardware

## Implementation Patterns

### Subsystem Design
- **Encapsulation**: Each mechanism (drivetrain, elevator, end effector) as its own subsystem
- **Interface Consistency**: Standard methods for commanding and querying state
- **Default Commands**: Behaviors that run when no other command is using a subsystem

### Robot Architecture
- **Dependency Injection**: Passing robot instance to subsystems for coordination
- **Periodic Updates**: Regular processing of sensor data and control calculations
- **Command Scheduling**: Managing which actions have control of which subsystems

### Safety Features
- **Soft Limits**: Preventing mechanisms from exceeding safe ranges
- **Current Monitoring**: Detecting jams or mechanical failures
- **Failsafe Behaviors**: Graceful degradation when systems fail

This overview demonstrates the sophisticated control strategies implemented in modern FRC robots, balancing performance with reliability and safety while providing intuitive operator interfaces.


