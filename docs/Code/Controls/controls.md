---
title: Controls
parent: Code
nav_order: 3
---

# FRC Controls Overview

FRC Controls refers to the systems and methodologies used to command FIRST Robotics Competition robots. These systems translate driver inputs into precise mechanical actions while maintaining stability and accuracy during competition.

## Core Components

### Hardware
- **RoboRIO**: The central robot controller running team-developed code
- **Motor controllers**: Devices like CTRE Talons and REV Sparks that regulate power to motors
- **Sensors**: Encoders, gyroscopes, cameras, and distance sensors that provide feedback
- **Input devices**: Driver station, joysticks, and gamepads for human control

### Software
- **WPILib**: The standard FRC library providing robot control abstractions
- **Vendor libraries**: Specialized code for specific hardware (Phoenix6 for CTRE, REV libraries)
- **Command frameworks**: Structured approaches for organizing robot behaviors
- **Control algorithms**: PID loops, motion profiling, and feedforward systems

## Control Methodologies

### Teleop Control
Teams implement drive control systems allowing operators to maneuver robots using joysticks or gamepads. Control schemes can include:
- **Arcade/tank drive**: Basic forward/backward and rotation controls
- **Field-relative control**: Robot moves relative to field regardless of orientation
- **Custom mappings**: Specialized button configurations for game-specific actions

### Autonomous Operation
Programs that execute without driver input using:
- **Path planning**: Following pre-defined trajectories
- **Computer vision**: Targeting game elements using cameras
- **State machines**: Executing different behaviors based on conditions

### Closed-Loop Systems
Feedback mechanisms ensuring accuracy through:
- **Position/velocity control**: Moving mechanisms to exact positions or speeds
- **Sensor fusion**: Combining multiple data sources for improved accuracy
- **Software safety limits**: Preventing mechanical damage through code constraints

## Importance in Competition

Effective controls systems are critical for:
- **Consistent performance**: Reducing variability in robot actions
- **Driver assistance**: Making complex operations manageable
- **Competition advantage**: Enabling precise scoring and defensive maneuvers
- **Safety**: Protecting equipment and participants through software safeguards

FRC Controls represent the interface between human strategy and robot execution, often determining a team's competitive success.