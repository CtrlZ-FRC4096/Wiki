---
title: Simulation
parent: Code
nav_order: 6
---

# Robot Simulation Setup Guide

This guide will help you set up a simulation environment to practice driving or operating our robot on your own computer.

## Prerequisites

You'll need:
- Xbox controller
- USB cable to connect controller to computer
- VSCode with WPILib and RobotPy library installed
- Python with pip
- AdvantageScope application
- Downloaded asset files for the simulation

## Installation Steps

### 1. Clone the Repository

1. Open VSCode
2. Press `Ctrl+Shift+P` to open the command palette
3. Type "Git: Clone" and select it
4. Enter the repository URL: `https://github.com/CtrlZ-FRC4096/Robot-2025`
5. Select a location to save the repository

### 2. Install Dependencies

Open a terminal in VSCode (`Ctrl+Shift+``) and run:

```bash
pip install shapely
```

### 3. Code Configuration

1. Navigate to `subsystems/drivetrain`
2. Uncomment the shapely import line
3. Uncomment the `in_reef` function

## Setting Up AdvantageScope

1. Open AdvantageScope
2. Click the + symbol at the top right and select "3D Field"
3. Click Help → Show Assets Folder
4. Create a new folder called `Robot_Pozeidon`
5. Copy all [provided asset files](https://drive.google.com/drive/u/0/folders/1rVEbu60AOfilqxDEY39a5hA1TCb83dNU) into this folder (except for "Sim Layout") 
6. In AdvantageScope, click File → Import Layout
7. Select the "Sim Layout" file and import it

## Running the Simulation

1. In VSCode, open a terminal and make sure you're in the "robot" directory (not "Robot-2025")
2. Start the simulation - a window with a blue background should appear
3. Go back to AdvantageScope
4. Click File → Connect to Simulator
5. In the 3D field view, you should see our robot
6. On the right side, change the field from "evergreen" to "2025 reefscape welded"

## Controller Setup

1. In the simulator window, find the FMS dropdown
2. Change "red 1" to "blue 2"
3. Connect your Xbox controller via USB
4. Under System Joysticks, you should see "Xbox Controller"
5. Under Joysticks → Joystick[0] (driver 1), it should say "0: Xbox Controller"
   - If not, drag and drop the Xbox Controller from System Joysticks to Joystick[0]
6. Make sure "Map Gamepad" is checked
7. Under Robot State, click "Teleop" to start

## Usage Tips

- For a cleaner interface, hide the Network Tables publishers panel and the Poses panel
- To change camera positions, left click and then quickly right click
  - Useful views: "driver station" and "orbit field"
- Control mappings can be found in `oi.py` (starting around line 210) or in this [presentation (Driver for 1 Drive)](https://docs.google.com/presentation/d/1NHCgngR71NpEcgdR1aAaeR7wjS5Su4QubvW28qUdTVU/edit?slide=id.g36d884e8600_0_0#slide=id.g36d884e8600_0_0)
  - Look for lines starting with `@` that mention `driver1`
  - Comments explain what each button does
- Note that manual scoring is not yet implemented in the simulation
- Instead of zeroing the gyro (not available in sim), use POV.down to clear scored coral
- You can practice swerve driving around obstacles (feature coming soon)

Happy practicing, and try not to break any virtual walls!### 3. Code Configuration

1. Navigate to `subsystems/drivetrain`
2. Uncomment the shapely import line
3. Uncomment the `in_reef` function

## Setting Up AdvantageScope

1. Open AdvantageScope
2. Click the + symbol at the top right and select "3D Field"
3. Click Help → Show Assets Folder
4. Create a new folder called `Robot_Pozeidon`
5. Copy all provided asset files into this folder (except for "Sim Layout")
6. In AdvantageScope, click File → Import Layout
7. Select the "Sim Layout" file and import it

## Running the Simulation

1. In VSCode, open a terminal and make sure you're in the "robot" directory (not "Robot-2025")
2. Start the simulation - a window with a blue background should appear
3. Go back to AdvantageScope
4. Click File → Connect to Simulator
5. In the 3D field view, you should see our robot
6. On the right side, change the field from "evergreen" to "2025 reefscape welded"

## Controller Setup

1. In the simulator window, find the FMS dropdown
2. Change "red 1" to "blue 2"
3. Connect your Xbox controller via USB
4. Under System Joysticks, you should see "Xbox Controller"
5. Under Joysticks → Joystick[0] (driver 1), it should say "0: Xbox Controller"
   - If not, drag and drop the Xbox Controller from System Joysticks to Joystick[0]
6. Make sure "Map Gamepad" is checked
7. Under Robot State, click "Teleop" to start

## Usage Tips

- For a cleaner interface, hide the Network Tables publishers panel and the Poses panel
- To change camera positions, left click and then quickly right click
  - Useful views: "driver station" and "orbit field"
- Control mappings can be found in `oi.py` (starting around line 210)
  - Look for lines starting with `@` that mention `driver1`
  - Comments explain what each button does
- Note that manual scoring is not yet implemented in the simulation
- Instead of zeroing the gyro (not available in sim), use POV.down to clear scored coral
- You can practice swerve driving around obstacles (feature coming soon)

Happy practicing, and try not to break any virtual walls!
