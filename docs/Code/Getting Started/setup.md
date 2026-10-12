---
title: Setup
parent: Getting Started
nav_order: 1
last_modified_date: 2026-10-11
---

# Code Setup and Robot Tuning
*Team 4096, updated October 11, 2026*

Set up GitHub access, Robot-2026, local simulation, and AdvantageScope before class when possible. The physical shooter lab uses a separate, supervised station.

[Monday lesson slides](https://docs.google.com/presentation/d/188cIJEJO1N5EMpJ_FPADbY4Ziz_uRS_K2VvRVo531dU/edit)

## 1. Install the tools

Use **64-bit Windows** for the class commands below. Driver Station requires Windows. macOS and Linux can run Python development tools, but full robot simulation depends on the selected vendor libraries, operating system, and processor.

| Tool | Installation |
| --- | --- |
| Python | [64-bit Python](https://www.python.org/downloads/). The [Robot-2026 README](https://github.com/CtrlZ-FRC4096/Robot-2026#readme) currently specifies **Python 3.14**. Use the mentor-tested version for your branch. |
| Git | [Git](https://git-scm.com/downloads). [GitHub Desktop](https://desktop.github.com/) is an optional graphical interface. |
| VS Code | [Visual Studio Code](https://code.visualstudio.com/) and Microsoft's **Python** extension. |
| Windows runtime | [Microsoft Visual C++ Redistributable](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist), x64, if required by the libraries. |
| AdvantageScope | [Installation guide](https://docs.advantagescope.org/overview/installation/). |
| Phoenix Tuner X | [CTRE installation instructions](https://v6.docs.ctr-electronics.com/en/stable/docs/installation/installation.html). Install the desktop app at the tuning station. |

Open a new **PowerShell** terminal and check:

~~~powershell
py -3.14 --version
git --version
~~~

The Python command follows the current README. **Use robot/pyproject.toml on your selected branch for the exact RobotPy release and dependencies.** Branches may pin different releases. Do not upgrade a project to an arbitrary newer season's packages.

## 2. GitHub access and cloning

1. Create a [GitHub account](https://github.com/) if needed.
2. Give your username to a code mentor and accept the **CtrlZ-FRC4096** organization/repository invitation.
3. Clone [Robot-2026](https://github.com/CtrlZ-FRC4096/Robot-2026) into your normal code folder:

~~~powershell
git clone https://github.com/CtrlZ-FRC4096/Robot-2026.git
cd Robot-2026
git fetch origin
git remote show origin
git branch --show-current
git status -sb
git log -1 --oneline
~~~

Ask the mentor which **branch and commit** the class will use, and record yours. The default branch is currently **main**; the most recently updated branch is not automatically the class branch.

For a **clean checkout** using main:

~~~powershell
git switch main
git pull --ff-only
~~~

Use the mentor-selected branch instead when instructed. If Git reports local changes, ask how to preserve them before switching or updating. Do not discard changes or use a hard reset to fix setup.

You can also clone in VS Code: press **Ctrl+Shift+P**, choose **Git: Clone**, and paste the repository URL.

The [Robot-Code-Starter repository](https://github.com/CtrlZ-FRC4096/Robot-Code-Starter) remains available for separate introductory exercises.

## 3. VS Code and the project environment

Open the repository folder in VS Code, or its **.code-workspace** file if the branch includes one. The entry point is **robot/robot.py**, and the dependency configuration is **robot/pyproject.toml**.

Starting at the repository root:

~~~powershell
cd robot
py -3.14 -m venv .venv
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\python -m pip install robotpy
.\.venv\Scripts\python -m robotpy sync
~~~

The initial RobotPy install supplies the command-line tools. **sync** uses the project's dependency configuration. Use this project environment instead of a global **robotpy[all]** installation.

In the VS Code Command Palette, choose **Python: Select Interpreter** and select **robot/.venv/Scripts/python.exe**. These commands call it directly, so PowerShell activation is unnecessary.

Keep **.venv** local and out of Git. Run **sync** again after changing branches or dependency configuration. If the branch needs a different Python version, recreate the environment with the mentor.

## 4. Run local simulation

From **Robot-2026/robot**:

~~~powershell
.\.venv\Scripts\python -m robotpy sim
~~~

1. Wait for the simulation window and check the terminal for exceptions.
2. Select a simulated alliance and configure a simulated joystick/controller when needed.
3. Select **Teleop** and enable in the simulation window when instructed.
4. Confirm the program keeps running and publishes telemetry.
5. Disable in the simulation window, then press **Ctrl+C** in the terminal to stop.

Local simulation does not require connecting or deploying to the physical robot. It does not prove that simulated shooter behavior matches the real mechanism.

### Troubleshooting

| Symptom | Check |
| --- | --- |
| Python launcher cannot find 3.14 | Install the requested interpreter or use the version explicitly approved by the mentor. Reopen the terminal. |
| No module named robotpy | Use the **.venv** interpreter above and repeat the install/sync steps. |
| Missing project files or imports | Run from **Robot-2026/robot**, not the repository root or a subsystem folder. |
| Missing wpilibextra | This is team source under **robot/wpilibextra**. Check the complete clone and working directory. Do not install a similarly named package as a substitute. |
| Missing shapely on a branch that imports it | Public main currently imports it in the drivetrain but omits it from **pyproject.toml**. Ask the mentor to supply the approved dependency and add it to that branch's configuration. Repeating sync cannot fix an undeclared dependency. |
| No matching package or a vendor DLL error | Save the first error. Have the mentor check Python version, architecture, and vendor compatibility before changing packages. |

See the [WPILib RobotPy command reference](https://docs.wpilib.org/en/stable/docs/software/python/subcommands/index.html), or run:

~~~powershell
.\.venv\Scripts\python -m robotpy sim --help
~~~

## 5. AdvantageScope and the 3D field

1. Keep the simulator running.
2. Choose **File > Connect to Simulator > NetworkTables 4** in AdvantageScope.
3. The local simulator connection uses **127.0.0.1**, also called **localhost**, on the same computer.
4. Confirm values appear and update in the live data tree.

If the app stays on **Searching**, check for a simulator crash, the selected connection type, and local firewall permissions.

### Robot pose

1. Add a **3D Field** tab and choose the 2026 field.
2. Find **/SmartDashboard/RobotPose**. Some versions show an **NT:** prefix.
3. Drag it into **Poses**, choose **Robot**, and select an included stock robot model.
4. For branches publishing the legacy array, use **[x meters, y meters, heading degrees]**. Check changing values and correct orientation.

**Compatibility:** Newer AdvantageScope versions deprecate legacy geometry arrays. If the array is rejected, ask the mentor to publish a typed **Pose2d** struct or update a published **Field2d** with the actual pose. Use that supported topic instead. A published but unchanged Field2d will not show motion.

**Monday model:** The curriculum's search did not find an AdvantageScope-ready 2026 robot model in the [provided Drive folder](https://drive.google.com/drive/u/0/folders/1bL_FbR9JFCipZX0spaO_vGYZwVKIV82r). Use a stock model for class. CAD files alone are not necessarily installed AdvantageScope assets.

References: [live sources](https://docs.advantagescope.org/overview/live-sources/), [3D Field](https://docs.advantagescope.org/tab-reference/3d-field/), and [custom assets](https://docs.advantagescope.org/more-features/custom-assets/).

## 6. Supervised Phoenix Tuner X station

The mentor prepares the station before students enable anything:

- Install the season's [FRC Game Tools and Driver Station](https://docs.wpilib.org/en/stable/docs/zero-to-robot/step-2/frc-game-tools.html) on Windows.
- Connect through the team's approved robot network or USB connection. A mentor handles [radio programming](https://docs.wpilib.org/en/stable/docs/zero-to-robot/step-3/radio-programming.html).
- Secure the robot, guard flywheels, clear the shot path, and remove game pieces for initial speed tests.
- Verify CAN IDs, followers, inversion, feedback units/ratios, gain slot, and speed/current limits. Back up the configurations.
- Use a dedicated tuning mode/program so robot code does not overwrite Tuner commands or gains.
- Assign one operator and one recorder. Locate the disable control and wait for complete flywheel stop before approaching.

Plot target/measured velocity, output, and current. FRC-locked devices require **Driver Station enable and Tuner enable** to actuate. Disable between changes. Stop for unexpected motion, vibration, heat, faults, or excess current.

### Control mode matters

For a **velocity-voltage** example, **kV** predicts voltage for the target speed and **kP** corrects speed error. Change one gain at a time and record each trial.

The current public shooter code uses **VelocityTorqueCurrentFOC**. Torque-current control has different gain units and generally does not need kV to maintain speed. The mentor must choose whether the lab keeps this mode or uses a voltage demonstration. Do not transfer gains between modes.

Record mode, gain slot, feedback units/ratios, limits, target/measured speed, gains, settling time, and a plot for each trial. Phoenix speed setpoints use rotations per second with the configured feedback ratios; **RPM divided by 60 gives rotations per second**. The mentor reviews final gains and transfers them into code/configuration, since startup code may overwrite Tuner changes.

References: [device control](https://v6.docs.ctr-electronics.com/en/stable/docs/tuner/controlling-devices.html), [plotting](https://v6.docs.ctr-electronics.com/en/stable/docs/tuner/plotting.html), and [closed-loop modes and tuning](https://v6.docs.ctr-electronics.com/en/stable/docs/api-reference/device-specific/talonfx/closed-loop-requests.html).

## 7. Deployment to the physical robot

Deployment is separate from the simulation exercise. A mentor approves the branch, changes, and robot setup first.

From **Robot-2026/robot**, with the correct environment and robot connection:

~~~powershell
.\.venv\Scripts\python -m robotpy sync
.\.venv\Scripts\python -m robotpy deploy
~~~

Follow [WPILib's RobotPy deployment instructions](https://docs.wpilib.org/en/stable/docs/software/python/subcommands/deploy.html) for robot installation and connection details.

## Ready-for-class checklist

- [ ] Team GitHub invitation accepted.
- [ ] Correct branch and commit recorded, with local changes accounted for.
- [ ] Dependencies installed and VS Code interpreter selected.
- [ ] Simulation starts without exceptions.
- [ ] AdvantageScope connects locally and shows the selected pose.
- [ ] Stock model selected for Monday.
- [ ] Mentor has prepared Driver Station, Tuner, and the tuning station.
- [ ] Students know the disable control and how to record a gain change.

If you get stuck, share the first error, branch/commit, and Python version with a code mentor or the team's #code channel.
