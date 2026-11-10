"""A browser copy of commands2.exceptions. See assets/py/robotpy/README.md."""


class IllegalCommandUse(Exception):
    def __init__(self, message, **kwargs):
        if kwargs:
            message = message + " (" + ", ".join("%s=%r" % (k, v) for k, v in kwargs.items()) + ")"
        super().__init__(message)
