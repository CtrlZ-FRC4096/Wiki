#!/usr/bin/env python3
"""Checks every Python exercise in _data/exercises/.

    python3 tools/validate-exercises.py

Needs Python 3 and PyYAML (`pip install pyyaml`). Nothing else.

Run it after you add or change an exercise. It uses the same rules as the
grader in the browser, so a pass here means a pass on the page:

  - the solution must pass every check
  - the starter must fail at least one check, or the exercise teaches nothing
  - every check must carry a message on its assert, because that message is
    the only feedback a student sees
"""

import ast
import contextlib
import glob
import io
import os
import sys
import traceback

try:
    import yaml
except ImportError:
    sys.exit("This needs PyYAML. Install it with:  pip install pyyaml")

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")


def run(source, checks, setup=""):
    """Run one snippet, then each check against it. Same as the page does."""
    namespace = {"__name__": "__main__"}
    sink = io.StringIO()
    try:
        with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
            exec(compile(source, "your code", "exec"), namespace)
    except BaseException:
        line = traceback.format_exc().strip().split("\n")[-1]
        return [("the code did not run", False, line)]

    if setup:
        try:
            with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
                exec(compile(setup, "the checks", "exec"), namespace)
        except BaseException:
            line = traceback.format_exc().strip().split("\n")[-1]
            return [("the shared check code did not run", False, line)]

    results = []
    for check in checks:
        name = check.get("name", "check")
        try:
            with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
                exec(compile(check["code"], "check: " + name, "exec"), namespace)
            results.append((name, True, ""))
        except AssertionError as exc:
            results.append((name, False, str(exc) or "no message on the assert"))
        except BaseException as exc:
            results.append((name, False, "%s: %s" % (type(exc).__name__, exc)))
    return results


def has_silent_assert(code):
    """True if any assert in this check has no message for the student."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return False
    return any(isinstance(node, ast.Assert) and node.msg is None
               for node in ast.walk(tree))


def main():
    paths = sorted(glob.glob(os.path.join(ROOT, "_data", "exercises", "*.yml")))
    if not paths:
        sys.exit("No exercises found in _data/exercises/")

    problems = 0
    for path in paths:
        name = os.path.basename(path)
        exercise = yaml.safe_load(open(path, encoding="utf-8"))

        for field in ("title", "starter", "tests", "solution"):
            if field not in exercise:
                print("FAIL  %-26s missing '%s'" % (name, field))
                problems += 1

        checks = exercise.get("tests", [])
        setup = exercise.get("setup", "")
        solved = run(exercise.get("solution", ""), checks, setup)
        failed = [r for r in solved if not r[1]]
        starter_failures = sum(1 for r in run(exercise.get("starter", ""), checks, setup) if not r[1])

        # A check with no message tells the student nothing useful. Read the
        # syntax tree rather than looking for a comma: a comma inside a call
        # on any line makes a text search useless.
        silent = [c.get("name", "?") for c in checks if has_silent_assert(c.get("code", ""))]

        status = "ok  " if not failed and starter_failures and not silent else "FAIL"
        if status == "FAIL":
            problems += 1
        print("%s  %-26s solution %d/%d   starter fails %d/%d"
              % (status, name, len(solved) - len(failed), len(solved), starter_failures, len(checks)))

        for check_name, _, message in failed:
            print("        the solution fails: %s | %s" % (check_name, message[:90]))
        if not starter_failures and checks:
            print("        the starter already passes every check")
        for check_name in silent:
            print("        no message on the assert in: %s" % check_name)

    print("\nAll exercises are good." if not problems else "\n%d problem(s) found." % problems)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
