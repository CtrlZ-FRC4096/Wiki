---
title: Setup
parent: Getting Started
nav_order: 1
---

# Driver Station & Robot Code Setup
*Team 4096, last edited 5/2025*

## Overview
This guide explains how to set up a new PC (or Driver Station PC) with the environment necessary to write, test, and run Python code on the robot.

---

## Requirements

- **Driver Station PC:** Must be a Windows PC (not Mac or Linux).
- **Code/Training Only:** Linux is supported for code/training (Python, VS Code, etc.), but motor control libraries are not supported on MacOS.

---

## 1. Install Python

- Download and install Python 3.12 (or the latest supported version) from the [Python downloads page](https://www.python.org/downloads/).
- Use the 64-bit version.
- During installation, select **Add Python to PATH**.
- *Note:* RobotPy2023 does **not** support Python 3.12.0, but for 2024, use Python 3.12.

### Windows Only

- Install the [Microsoft Visual C++ Redistributable for Visual Studio 2015, 2017, and 2019](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170) (choose the "x64" version).

---

## 2. Install Python Extensions

Open a command prompt:

1. Press `Start`, type `cmd`, and open **Command Prompt**.
2. Upgrade pip:
    ```
    py -m pip install --upgrade pip
    ```
3. Install required packages:
    ```
    py -m pip install --upgrade robotpy[all]
    ```

*If you have questions, ask a mentor or reach out on the #code channel in Slack!*

---

## 3. Install Git
- Download and install [Git](https://git-scm.com/downloads)
- If you are uncomfortable with command line, download and install [GitHub Desktop](https://desktop.github.com/).
- Create a GitHub account if needed.
- Ask a code moderator (e.g., Miles or Adam) for access to the latest robot Python repository.

### Clone the Repository

- Clone the desired repository from the [CtrlZ-FRC4096 GitHub organization](https://github.com/CtrlZ-FRC4096).
- For training, use the [Robot-Code-Starter repo](https://github.com/CtrlZ-FRC4096/Robot-Code-Starter).
- For full robot work, clone the latest `Robot-20xx` repo.

You can also perform this step after installing VS Code by typing Git: Clone into the Command Palette (Ctrl + Shift + P)

---

## 4. Install Visual Studio Code

- Download and install [VS Code](https://code.visualstudio.com/).
- Open VS Code and install the **Python** extension by Microsoft.
- Go to `File > Open Workspace...` and open the `.code-workspace` file from your cloned repo.

*Make sure you are in the directory containing `robot.py`.*

---

## 5. Installing on the Robot

- Follow the “Automated Installation” steps on the [RobotPy website](https://robotpy.readthedocs.io/en/stable/install/).

---

## 6. Deploying and Running Code

- Read the [Programmers Guide on the RobotPy website](https://robotpy.readthedocs.io/en/stable/).
- To deploy and run code, connect to the robot’s network and navigate to the folder with `robot.py` (usually Robot-20xx/robot).
- Deploy code with:
```
py -3 -m robotpy deploy
```
- Simulate code with 
```
py -3 -m robotpy sim
```
---

## 7. Installing Driver Station

- Follow the install directions on the [WPILib website](https://docs.wpilib.org/en/stable/docs/getting-started/getting-started-frc-control-system/index.html).
- After installation, you can cancel when asked to activate the software.

---

## 8. Configuring the Radio

Follow the [radio programming](https://docs.wpilib.org/en/stable/docs/zero-to-robot/step-3/radio-programming.html) to configure the VH-109 radio so you can connect to the robot.

## 9. Phoenix Tuner X

Phoenix Tuner is Cross the Road Electronics (CTRE) software that updates, configures, analyzes, and can even control most of the electronics on our robot.

Follow the installation instructions [here](https://v6.docs.ctr-electronics.com/en/stable/docs/tuner/index.html). It is recommended to install using the Windows app store if you are on a windows device.

The documentation has good tutorials on using the software. The main use phoenix for tuner is to set up CAN bus IDs which allow the code to communicate with the motors. We also use it to control individual motors on the robot for troubleshooting, monitor output speeds and current to set thresholds for logic, and quickly tune controllers.