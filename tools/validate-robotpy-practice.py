#!/usr/bin/env python3
"""Checks the RobotPy practice pack in practice/robotpy/.

    python tools/validate-robotpy-practice.py

Run it with a Python that has RobotPy, commands2 and Phoenix 6 installed. The
venv from the practice pack README works:

    practice/robotpy/.venv/Scripts/python tools/validate-robotpy-practice.py

For each exercise it makes two copies of the pack in a temporary folder:

  - the pack as students get it: the checks for the exercise must FAIL, or
    the exercise teaches nothing
  - the pack with every file from tools/robotpy-practice/solutions/ copied
    over it: the checks must PASS

It does the same for the practice robot in practice/robotpy/robot with
"python -m robotpy test".

It also checks that every assert in a check carries a message, because that
message is the only feedback a student sees.
"""

import ast
import glob
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
PACK = os.path.join(ROOT, "practice", "robotpy")
SOLUTIONS = os.path.join(ROOT, "tools", "robotpy-practice", "solutions")

IGNORE = shutil.ignore_patterns(".venv", "__pycache__", ".pytest_cache", "*.pyc", "ctre_sim")


def copy_pack(dest, with_solutions):
    shutil.copytree(PACK, dest, ignore=IGNORE)
    if with_solutions:
        for path in glob.glob(os.path.join(SOLUTIONS, "**", "*.py"), recursive=True):
            rel = os.path.relpath(path, SOLUTIONS)
            target = os.path.join(dest, rel)
            if not os.path.exists(target):
                raise SystemExit(f"solution {rel} has no starter file at practice/robotpy/{rel}")
            shutil.copyfile(path, target)


def run(cwd, *args):
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
    proc = subprocess.run(
        [sys.executable, "-m", *args],
        cwd=cwd,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        timeout=600,
    )
    return proc.returncode, proc.stdout


def silent_asserts(path):
    tree = ast.parse(open(path, encoding="utf-8").read(), path)
    return [n.lineno for n in ast.walk(tree) if isinstance(n, ast.Assert) and n.msg is None]


def main():
    failures = []
    checks = sorted(glob.glob(os.path.join(PACK, "checks", "test_*.py")))
    robot_tests = sorted(glob.glob(os.path.join(PACK, "robot", "tests", "test_*.py")))
    if not checks:
        sys.exit("No checks found in practice/robotpy/checks/")

    for path in checks + robot_tests:
        lines = silent_asserts(path)
        if lines:
            failures.append(f"{os.path.relpath(path, ROOT)}: assert with no message on line(s) {lines}")

    with tempfile.TemporaryDirectory() as tmp:
        starter = os.path.join(tmp, "starter")
        solved = os.path.join(tmp, "solved")
        copy_pack(starter, with_solutions=False)
        copy_pack(solved, with_solutions=True)

        for path in checks:
            name = os.path.basename(path)
            rel = os.path.join("checks", name)

            code, out = run(starter, "pytest", rel, "-p", "no:cacheprovider")
            if code == 0:
                failures.append(f"{rel}: the starter passes every check, so it teaches nothing")
            elif code != 1:
                failures.append(f"{rel}: the starter did not run cleanly (pytest exit {code})\n{out[-2000:]}")

            code, out = run(solved, "pytest", rel, "-p", "no:cacheprovider")
            if code != 0:
                failures.append(f"{rel}: the solution fails\n{out[-3000:]}")
            print(f"{'ok  ' if code == 0 else 'FAIL'}  {rel}")

        if robot_tests:
            for label, where, want_pass in (("starter", starter, False), ("solution", solved, True)):
                code, out = run(os.path.join(where, "robot"), "robotpy", "test")
                passed = code == 0
                if passed != want_pass:
                    verb = "passes" if passed else "fails"
                    failures.append(f"practice robot: the {label} {verb} 'robotpy test'\n{out[-3000:]}")
                print(f"{'ok  ' if passed == want_pass else 'FAIL'}  robotpy test ({label} must {'pass' if want_pass else 'fail'})")

    if failures:
        print()
        for f in failures:
            print("FAIL", f)
            print()
        sys.exit(1)
    print("\nAll practice checks behave as intended.")


if __name__ == "__main__":
    main()
