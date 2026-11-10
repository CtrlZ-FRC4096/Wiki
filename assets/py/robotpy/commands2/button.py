"""A browser copy of commands2.button.Trigger. See assets/py/robotpy/README.md."""

from . import CommandScheduler


class Trigger:
    """
    Trigger(condition): a button made from any function that returns True or False.
    The scheduler checks it one time in each loop.
    """

    def __init__(self, *args):
        if len(args) == 2:
            loop, condition = args
        elif len(args) == 1:
            loop, condition = CommandScheduler.getInstance().getDefaultButtonLoop(), args[0]
        else:
            loop, condition = CommandScheduler.getInstance().getDefaultButtonLoop(), (lambda: False)
        self._loop = loop
        self._condition = condition

    def _add_binding(self, body):
        state = {"previous": bool(self._condition())}

        def _():
            current = bool(self._condition())
            body(state["previous"], current)
            state["previous"] = current

        self._loop.bind(_)

    def onTrue(self, command):
        def body(previous, current):
            if not previous and current:
                command.schedule()

        self._add_binding(body)
        return self

    def onFalse(self, command):
        def body(previous, current):
            if previous and not current:
                command.schedule()

        self._add_binding(body)
        return self

    def onChange(self, command):
        def body(previous, current):
            if previous != current:
                command.schedule()

        self._add_binding(body)
        return self

    def whileTrue(self, command):
        def body(previous, current):
            if not previous and current:
                command.schedule()
            elif previous and not current:
                command.cancel()

        self._add_binding(body)
        return self

    def whileFalse(self, command):
        def body(previous, current):
            if previous and not current:
                command.schedule()
            elif not previous and current:
                command.cancel()

        self._add_binding(body)
        return self

    def toggleOnTrue(self, command):
        def body(previous, current):
            if not previous and current:
                if command.isScheduled():
                    command.cancel()
                else:
                    command.schedule()

        self._add_binding(body)
        return self

    def __call__(self):
        return self._condition()

    def getAsBoolean(self):
        return self._condition()

    def __bool__(self):
        return bool(self._condition())

    def __and__(self, other):
        return Trigger(self._loop, lambda: bool(self._condition()) and bool(other()))

    def __or__(self, other):
        return Trigger(self._loop, lambda: bool(self._condition()) or bool(other()))

    def __invert__(self):
        return Trigger(self._loop, lambda: not self._condition())
