# A browser copy of the RobotPy libraries

The Python exercises on the wiki run in the browser with Pyodide. The real
RobotPy libraries are C++ with Python bindings, so they cannot load there.
This folder is a small copy of them in plain Python. It has only the parts
that the lesson 7 exercises use, and each part behaves like RobotPy 2026.

| Folder | Copy of |
|:-------|:--------|
| `wpilib/` | `Timer`, `SmartDashboard`, `SendableChooser`, `DriverStation`, `XboxController`, `TimedRobot`, `RobotController`, `Field2d` |
| `wpimath/` | `geometry`, `units`, `controller.PIDController`, `kinematics.ChassisSpeeds` |
| `commands2/` | `Command`, `Subsystem`, `CommandScheduler`, the command groups, `WaitCommand`, `button.Trigger` |
| `phoenix6/` | `hardware`, `configs`, `controls`, `signals` (devices that do nothing, as in simulation) |
| `wpilibextra/` | An exact copy of `robot/wpilibextra` from Robot-2026 (`tracking-hub`), without `remote_shell.py` |
| `cz_sim.py` | Helpers for the checks: move time, press buttons, run a robot. Not part of RobotPy |

An exercise uses it with `library: robotpy` in its YAML file. The page then
loads every file in `manifest.json` before it runs the code, and loads them
again for each run, so each run starts with a new scheduler and a clock at 0.

If you add a file here, add it to `manifest.json`.

## How we know it behaves like RobotPy

`tools/validate-robotpy-browser.py` runs the checks of each lesson 7 exercise
two times: one time with this copy, and one time with the real RobotPy 2026.
`tools/robotpy-browser/real/cz_sim.py` gives the checks the same helpers on top of
the real `wpilib.simulation`. Both runs must pass. Run it after you change this
folder or a lesson 7 exercise.
