"""
Runs one exercise the way the browser page does: the code, then the shared
setup, then each check, all in one namespace. Reads JSON from stdin:

    {"code": "...", "setup": "...", "tests": [{"name": "...", "code": "..."}]}

and prints one line, "CZ-RESULT " + JSON, with the result of each check.

tools/validate-robotpy-browser.py starts it two times for each exercise: with
the browser copy of RobotPy, and with the real RobotPy. Not used by the site.
"""

import contextlib
import io
import json
import sys
import traceback
import warnings

warnings.filterwarnings("ignore", message="Constructing devices with a CAN bus string")


def last_line():
    return traceback.format_exc().strip().split("\n")[-1]


def main():
    job = json.load(sys.stdin)
    namespace = {"__name__": "__main__"}
    sink = io.StringIO()
    result = {"error": None, "tests": []}
    try:
        with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
            exec(compile(job["code"], "your code", "exec"), namespace)
            if job.get("setup"):
                exec(compile(job["setup"], "the checks", "exec"), namespace)
    except BaseException:
        result["error"] = last_line()
    else:
        for test in job["tests"]:
            entry = {"name": test.get("name", "check"), "passed": True, "message": ""}
            try:
                with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
                    exec(compile(test["code"], "check: " + entry["name"], "exec"), namespace)
            except AssertionError as exc:
                entry["passed"] = False
                entry["message"] = str(exc) or "no message on the assert"
            except BaseException as exc:
                entry["passed"] = False
                entry["message"] = "%s: %s" % (type(exc).__name__, exc)
            result["tests"].append(entry)
    helpers = sys.modules.get("cz_sim")
    if helpers is not None and hasattr(helpers, "_cz_shutdown"):
        with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
            helpers._cz_shutdown()  # the real robot loop runs in a thread
    sys.__stdout__.write("CZ-RESULT " + json.dumps(result) + "\n")
    sys.__stdout__.flush()


if __name__ == "__main__":
    main()
