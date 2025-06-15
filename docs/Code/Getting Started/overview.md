---
title: Overview of FRC Programming
parent: Getting Started
nav_order: 2
---

# Overview of FRC Programming
Overview of FRC program inspired by [Spectrum 3847](https://docs.google.com/presentation/d/e/2PACX-1vRC037jwjNSnJN47Sut_juVnw0Ds6HQF1Jrwlx2t-1F6xo2s3G6tx7XU7Q0-xzG7ihGxwnhlGDvChz6/pub?start=false&loop=false&delayms=3000&slide=id.p)

In FRC, we primarily program the main computer of the robot known as the RoboRIO. The RoboRIO is the main processor tells the robot what to do.

The robot will only do exactly what you tell it to do and nothing else. If the robot exhibits other behavior it is likely because your instructions (code) were incorrect.

The program can respond to the joystick and button presses of the driver as well as other sensors which stream data about the robot state or outside environment. The program uses inputs and sensor signals to control motors and other actuators. Some common signals:

- A button is pressed, held, or released by the operator
- A joystick is moved to a certain position
- How many times a motor has rotated
- How fast a motor is rotating
- How much torque a motor is outputting
- An object has touched a button or if an object is near something
- The position of a part of the robot such as an arm or elevator
- Vision information from camera settings

We will go in depth on the different types and function of sensors throughout the Wiki.

## What is possible with FRC programming
1. Basic Driving and Controls: Map buttons and joysticks to the various controls.
2. Basic Autonomous: Perform actions based on time, i.e. drive forward for 2 seconds.
3. Sensor Feedback: The robot can know if it has a game piece, how fast it is driving, where it is on the field, how fast a shooter wheel is spinning, etc.
4. Advanced Control: The robot moves subsystems to certain positions such as driving to a pose, raising an elevator, or tilting a shooter.
5. Advanced Autonomous: Choreograph the robot to score multiple game pieces without driver input, through automated moving, intaking, and scoring.

## Logic and Commands
Most of FRC programming is based on logic and commands. The robot code can check if some condition is true and then perform a command or action. If the condition is false then the robot can do nothing or perform a different action. If the A button is pressed then turn on the intake motor is a logical statement the roboRIO could understand. Ctrl-Z robots are programmed used a complex state machine where the robot follows different paths through robot code depending on if certain conditions are met.

## Python and RobotPy
Ctrl-Z chooses to program our robot in Python. As of 2025 there are only about ~100 teams in the world that use Python but many of them perform at a high level and make their code publicly available. Python is a growing community in FIRST and is a dominate programming language in real world applications. We also have built up a lot of knowledge and best practices since we started using Python as a team in 2016 which is why it continues to be the language of choice for Ctrl-Z.

While most teams use Java, public examples of FRC Java programs are very easy to modify into Python with very similar syntax and structure. Many of the libraries we use in our code have excellent documentation in Python. **You can learn a lot of Java control strategies from other teams but you will need to understand how it works to move it into our Python workflow.**

## WPILib
[WPILib](https://docs.wpilib.org/en/stable/) is the main library program we use for the robot. This library contains all the code you need for basic robot functions such as communicating with the driver station or enabling and disabling the robot. It has some useful datatypes and contains code for many common tasks that robots need to do. **Learning what is included in WPILib and how to use the classes and methods is very useful for FRC programmers.**


