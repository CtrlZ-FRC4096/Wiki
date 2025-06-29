---
title: Code Organization
parent: Getting Started
nav_order: 5
---

# Robot Code Organization

Ctrl-Z Robot code as of 2025 is organized using a Python-based architecture with several key components:

## Core Files

- **robot.py**: Think of this as the brain of our robot.
   - It starts everything up and keeps track of what state the robot is in (like "we have a game piece" or "we're in scoring mode")
   - It contains the code for the different phases of a match (autonomous, teleop, disabled)
   - It's like the main control center that everything else connects to

- **const.py**: This is our dictionary of important numbers.
   - Instead of typing numbers directly in our code (like motor speed = 0.5), we put them all in one place
   - This includes things like motor IDs, robot dimensions, and settings for our control systems
   - Makes it easier to change values in just one place rather than hunting through the code

- **oi.py**: This connects what the drivers do to what the robot does.
   - Maps buttons on controllers to robot actions (like "press A to shoot")
   - Think of it as the translator between human inputs and robot movements

## Subsystems

These are the body parts of our robot. Each handles a specific mechanism. There are different subsystems depending on what mechanisms the robot has, but we have the following for the 2025 robot:

- **Drivetrain**: Controls how the robot moves around the field
   - Our robot uses "swerve drive" which means each wheel can turn independently (like shopping cart wheels)
   - Allows the robot to drive forward/backward, side-to-side, and rotate

- **Elevator**: Moves things up and down
   - Works like an elevator in a building, but for game pieces

- **End Effector**: The "hands" of the robot
   - Grabs, holds, and releases game pieces
   - Can be positioned at different heights for scoring using the elevator

- **Funnel Intake**: Collects game pieces from the field feeder station
   - Like a vacuum that sucks in the game pieces

- **LEDs**: The robot's way of communicating with drivers
   - Shows different colors/patterns to indicate what the robot is doing or sensing
   - Like how traffic lights tell you when to stop or go

- **PoseEstimator**: The robot's GPS system
   - Keeps track of where the robot is on the field
   - Uses cameras and wheel measurements to figure out position

## Autonomous - The Robot's Autopilot

- **autoroutines.py**: Pre-programmed sequences for the robot to follow by itself
   - Like a checklist of actions: "drive here, pick this up, score there"
   - Different routines for different match strategies

- **Path Planning**: Helps the robot navigate the field
   - Creates smooth paths for the robot to follow
   - Adjusts paths based on which alliance we're on (red or blue)

## Programming Approach - How We Write Code

- **Coroutines**: A way of writing code that makes sequences easier to understand
   - Instead of a bunch of separate commands that are hard to follow, we use Python generators
   - Makes complicated sequences read more like a step-by-step recipe

- **State Machine**: Keeps track of what the robot is doing right now
   - Like having different "modes" for the robot (intake mode, scoring mode, etc.)
   - Helps manage transitions between different actions

- **Hardware Abstraction**: Simplifies controlling physical components
   - Provides simple commands like "elevator.raise_to(height)" instead of complex motor controls
   - Makes code easier to write and understand

## How It All Works Together

When you press a button on the controller:
1. The **OI** detects this input
2. It triggers a function that may change the robot's **state** (stored in robot.py)
3. Various **subsystems** read this state during their periodic updates
4. Each subsystem controls its **hardware** to achieve what the state requires
5. The **PoseEstimator** keeps track of where we are on the field
6. **LEDs** provide feedback to the drivers about what's happening

This organization makes our code easier to understand, modify, and debug, which is essential when multiple team members are working on it and when we need to adapt quickly at competitions.


