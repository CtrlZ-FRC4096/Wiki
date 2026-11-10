#!/usr/bin/env python3
"""Checks the browser copy of RobotPy against the real RobotPy.

    python3 tools/validate-robotpy-browser.py --robotpy PATH/TO/python

PATH/TO/python is a Python that has RobotPy 2026, commands2 and Phoenix 6, for
example the .venv of Robot-2026:  Robot-2026/robot/.venv/Scripts/python.exe
This script itself needs PyYAML (pip install pyyaml).

For every exercise in _data/exercises/ with `library: robotpy`, it runs the
solution and the starter, with the checks, two times:

  - with the browser copy in assets/py/robotpy (what the website uses)
  - with the real RobotPy, and tools/robotpy-browser/real/cz_sim.py for the helpers

In both, the solution must pass every check and the starter must fail at least
one. If the browser copy and the real RobotPy disagree, a student could pass a
check on the website with code that would not work on the robot.

Without --robotpy it checks only the browser copy, and says so.

It also checks that assets/py/robotpy/manifest.json lists every file, and,
if the site is built, that Jekyll copied every one of them into _site.
"""

import argparse
import glob
import json
import os
import shutil
import subprocess
import sys
import tempfile

try:
    import yaml
except ImportError:
    sys.exit("This needs PyYAML. Install it with:  pip install pyyaml")

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
LIB = os.path.join(ROOT, "assets", "py", "robotpy")
HERE = os.path.join(ROOT, "tools", "robotpy-browser")
RUNNER = os.path.join(HERE, "run_checks.py")


def check_manifest():
    with open(os.path.join(LIB, "manifest.json"), encoding="utf-8") as fp:
        listed = set(json.load(fp)["files"])
    present = {
        os.path.relpath(os.path.join(d, f), LIB).replace(os.sep, "/")
        for d, _, files in os.walk(LIB)
        for f in files
        if f.endswith(".py")
    }
    problems = []
    for missing in sorted(present - listed):
        problems.append("manifest.json does not list %s, so the page never loads it" % missing)
    for extra in sorted(listed - present):
        problems.append("manifest.json lists %s, but the file does not exist" % extra)
    built = os.path.join(ROOT, "_site", "assets", "py", "robotpy")
    if os.path.isdir(built):
        for name in sorted(listed):
            if not os.path.exists(os.path.join(built, name)):
                problems.append(
                    "the built site has no %s. Jekyll leaves out names that start with _ "
                    "unless _config.yml lists them under include:" % name
                )
    return problems


def run(python, paths, code, setup, tests):
    env = dict(os.environ, PYTHONPATH=os.pathsep.join(paths), PYTHONDONTWRITEBYTECODE="1")
    job = json.dumps({"code": code, "setup": setup, "tests": tests})
    with tempfile.TemporaryDirectory() as cwd:  # Phoenix writes its sim files here
        proc = subprocess.run(
            [python, RUNNER], input=job, cwd=cwd, env=env,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=120,
        )
    for line in proc.stdout.splitlines():
        if line.startswith("CZ-RESULT "):
            return json.loads(line[len("CZ-RESULT "):])
    return {"error": "the check runner crashed:\n" + proc.stdout[-1500:], "tests": []}


def judge(label, result, want_pass):
    """Return a list of problems."""
    if result["error"]:
        if want_pass:
            return ["%s: the code did not run: %s" % (label, result["error"])]
        return []  # a starter that does not even run still fails
    failed = [t for t in result["tests"] if not t["passed"]]
    if want_pass and failed:
        return ["%s: %s | %s" % (label, t["name"], t["message"][:160]) for t in failed]
    if not want_pass and not failed:
        return ["%s: the starter passes every check" % label]
    return []


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--robotpy", help="a Python with RobotPy 2026, commands2 and Phoenix 6")
    args = parser.parse_args()

    problems = check_manifest()
    for p in problems:
        print("FAIL  " + p)

    exercises = []
    for path in sorted(glob.glob(os.path.join(ROOT, "_data", "exercises", "*.yml"))):
        data = yaml.safe_load(open(path, encoding="utf-8"))
        if data.get("library") == "robotpy" and data.get("tests"):
            exercises.append((os.path.basename(path), data))
    if not exercises:
        sys.exit("No exercises with library: robotpy found.")

    with tempfile.TemporaryDirectory() as real_lib:
        # The real RobotPy, plus our wpilibextra and the real-RobotPy cz_sim.
        shutil.copytree(os.path.join(LIB, "wpilibextra"), os.path.join(real_lib, "wpilibextra"))
        shutil.copyfile(os.path.join(HERE, "real", "cz_sim.py"), os.path.join(real_lib, "cz_sim.py"))

        targets = [("browser copy", sys.executable, [LIB])]
        if args.robotpy:
            targets.append(("real RobotPy", args.robotpy, [real_lib]))

        for name, data in exercises:
            line = []
            # A real TimedRobot cannot be made twice in one process, so the
            # checks that run a whole robot each get their own process there.
            whole_robot = "RobotRunner" in data.get("setup", "") + json.dumps(data["tests"])
            for label, python, paths in targets:
                for which, want_pass in (("solution", True), ("starter", False)):
                    code, setup = data.get(which, ""), data.get("setup", "")
                    if whole_robot and label == "real RobotPy":
                        parts = [run(python, paths, code, setup, [t]) for t in data["tests"]]
                        result = {
                            "error": next((p["error"] for p in parts if p["error"]), None),
                            "tests": [t for p in parts for t in p["tests"]],
                        }
                    else:
                        result = run(python, paths, code, setup, data["tests"])
                    found = judge("%s, %s, %s" % (name, label, which), result, want_pass)
                    problems += found
                    line.append("%s %s %s" % (label, which, "ok" if not found else "FAIL"))
            status = "FAIL" if any("FAIL" in part for part in line) else "ok  "
            print("%s  %-24s %s" % (status, name, " | ".join(line)))

    if not args.robotpy:
        print("\nNot compared with the real RobotPy. Pass --robotpy PATH/TO/python to do that.")
    if problems:
        print()
        for p in problems:
            print("FAIL  " + p)
        print("\n%d problem(s) found." % len(problems))
        return 1
    print("\nThe browser copy and the checks agree%s." % (" with the real RobotPy" if args.robotpy else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
