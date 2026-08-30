"""Shared machinery for the challenge validators.

Each challenge in _data/exercises/ ships a `setup` block: the simulator its
checks run against. These validators load that same block and throw families of
wrong answers at it, to prove the challenge is hard for the reason it claims to
be, and that the published solution really passes.

The one thing to know: an answer has to be executed in the SAME namespace as
the setup. The simulator's functions look up the student's name (`JamDetector`,
`aim`, and so on) in the namespace they were compiled in, so a copy will not
do. `fresh()` builds a new namespace per answer.
"""

import contextlib
import io
import os
import sys

try:
    import yaml
except ImportError:
    sys.exit("This needs PyYAML. Install it with:  pip install pyyaml")

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")


class Challenge:
    def __init__(self, name, cases="CASES", checks=("check",)):
        path = os.path.join(ROOT, "_data", "exercises", name + ".yml")
        self.name = name
        self.data = yaml.safe_load(open(path))
        self.setup = compile(self.data["setup"], "the checks", "exec")
        self.cases_name = cases
        # A challenge can grade a case on more than one thing, so it can have
        # more than one check function.
        self.checks = tuple(checks)
        ns = self.fresh()
        for fn in self.checks:
            assert fn in ns, "%s has no function called %s" % (name, fn)
        self.total = len(ns[cases]) * len(self.checks)
        self.failures = 0

    def fresh(self):
        ns = {"__name__": "__main__"}
        exec(self.setup, ns)
        return ns

    def run(self, source):
        """Run one answer. Returns (passed, [(case name, why it failed)])."""
        ns = self.fresh()
        sink = io.StringIO()
        misses = []
        passed = 0
        try:
            with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
                exec(compile(source, "an answer", "exec"), ns)
        except BaseException as exc:
            return 0, [("the answer did not run", "%s: %s" % (type(exc).__name__, exc))]
        for case in ns[self.cases_name]:
            label = case["name"] if isinstance(case, dict) else str(case)
            for fn in self.checks:
                try:
                    with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
                        ns[fn](case)
                    passed += 1
                except AssertionError as exc:
                    misses.append(("%s / %s" % (label, fn), str(exc)))
                except BaseException as exc:
                    misses.append(("%s / %s" % (label, fn),
                                   "%s: %s" % (type(exc).__name__, exc)))
        return passed, misses

    def score(self, source):
        return self.run(source)[0]

    def check(self, ok, what):
        print(("ok    " if ok else "FAIL  ") + what)
        if not ok:
            self.failures += 1

    def basics(self):
        """Every challenge owes the student a working solution and a starter
        that does not already pass."""
        print("--- the intended answer ---")
        got, misses = self.run(self.data["solution"])
        self.check(got == self.total,
                   "the published solution gets all %d cases" % self.total)
        for name, why in misses[:3]:
            print("      %s: %s" % (name, why[:110]))
        self.check(self.score(self.data["starter"]) < self.total,
                   "the starter does not already pass")

    def explains_itself(self):
        """A failure a student cannot read is a failure they cannot fix."""
        print("\n--- every failure tells the student what the robot did ---")
        _, misses = self.run(self.data["starter"])
        thin = [name for name, why in misses if len(why) < 40]
        self.check(not thin,
                   "each failure explains itself" + (" (%s)" % thin if thin else ""))

    def done(self):
        print("\nAll %s checks passed." % self.name if not self.failures
              else "\n%d check(s) failed." % self.failures)
        sys.exit(0 if not self.failures else 1)
