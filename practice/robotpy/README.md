# RobotPy practice pack

Practice code for the wiki lesson
[7. RobotPy in Our Robot Code](https://wiki.team4096.org/docs/Code/Python%20Tutorials/07%20robotpy%20in%20our%20code/).

The code uses the real RobotPy 2026 libraries: WPILib, wpimath, commands2 and
Phoenix 6. It also uses `wpilibextra`, the framework of our team. Every exercise has
tests. You write code until the tests pass.

## What is in this folder

| Path | What it is |
|:-----|:-----------|
| `ex1_geometry.py` … `ex8_dashboard.py` | The exercises. Each `TODO` is a part for you to write |
| `checks/` | The tests for the exercises. Do not change them |
| `robot/` | A small practice robot, with the same layout as `Robot-2026/robot` |
| `robot/tests/` | The tests for the practice robot |
| `robot/wpilibextra/` | A copy of our framework from Robot-2026 (see the note below) |

## Set up (one time)

Use PowerShell on Windows, the same as the
[Setup page](https://wiki.team4096.org/docs/Code/Getting%20Started/setup/).

1. Get the files. Clone the wiki repository into your normal code folder:

   ```powershell
   git clone https://github.com/CtrlZ-FRC4096/Wiki.git
   cd Wiki\practice\robotpy
   ```

2. Make a Python environment and install RobotPy:

   ```powershell
   py -3.14 -m venv .venv
   .\.venv\Scripts\python -m pip install --upgrade pip
   .\.venv\Scripts\python -m pip install -r requirements.txt
   ```

   `requirements.txt` installs RobotPy 2026 with commands2, and Phoenix 6.
   pytest comes with RobotPy. Use the Python version from the Setup page.

3. In VS Code, open the `practice/robotpy` folder. Choose
   **Python: Select Interpreter** and select `.venv\Scripts\python.exe`.

## Run the exercise tests

From `practice\robotpy`:

```powershell
.\.venv\Scripts\python -m pytest checks\test_ex1_geometry.py
```

Change the number for the other exercises. To run all of them:

```powershell
.\.venv\Scripts\python -m pytest
```

A dot `.` is a test that passed. An `F` is a test that failed. Under
`FAILURES`, the line that starts with `E` tells you what is wrong.

## Run the practice robot

From `practice\robotpy\robot`:

```powershell
..\.venv\Scripts\python -m robotpy sim
..\.venv\Scripts\python -m robotpy test
```

`sim` opens the simulator window. Drag a keyboard or controller into Joystick
0, pick **Teleop**, and enable the robot. Until you do, the terminal prints
warnings that a joystick is missing. This is normal.

`test` runs the tests in `robot/tests`. Do R.1, R.2 and R.3 to make them pass.

## Note about wpilibextra

`robot/wpilibextra` is a copy of `robot/wpilibextra` from Robot-2026 (branch
`tracking-hub`), without `remote_shell.py`. One file is different:
`coroutine/coroutine_robot.py`.

In Robot-2026, `CoroutineRobot` makes its `robotInit()` and the other mode
functions inside `__init__`. That hides the `robotInit()` that `robotpy test`
needs, so every robot test times out. This copy makes them normal methods.
The robot behaves the same way.

## For mentors

The solutions are in `tools/robotpy-practice/solutions/`. After you change an
exercise or a test, check the whole pack from the repository root:

```powershell
practice\robotpy\.venv\Scripts\python tools\validate-robotpy-practice.py
```

It checks that each starter fails its tests and each solution passes.
