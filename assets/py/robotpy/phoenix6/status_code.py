"""A browser copy of phoenix6.StatusCode. See assets/py/robotpy/README.md."""

import enum as _enum


class StatusCode(_enum.Enum):
    OK = 0

    def is_ok(self):
        return self is StatusCode.OK

    def is_error(self):
        return False

    def is_warning(self):
        return False
