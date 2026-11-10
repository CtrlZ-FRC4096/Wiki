"""
A browser copy of commands2 (RobotPy 2026): the scheduler, Command,
Subsystem, the command groups and WaitCommand. The scheduler follows the
same steps in the same order as the real one. See assets/py/robotpy/README.md.
"""

import enum as _enum
import inspect as _inspect
import os as _os
import sys as _sys

from .exceptions import IllegalCommandUse

__all__ = [
    "Command",
    "CommandScheduler",
    "IllegalCommandUse",
    "InstantCommand",
    "InterruptionBehavior",
    "ParallelCommandGroup",
    "ParallelDeadlineGroup",
    "ParallelRaceGroup",
    "PrintCommand",
    "RunCommand",
    "SequentialCommandGroup",
    "Subsystem",
    "WaitCommand",
    "WaitUntilCommand",
]

_HERE = _os.path.dirname(_os.path.abspath(__file__))


def _report_warning(message):
    print("Warning: " + message, file=_sys.stderr)


class InterruptionBehavior(_enum.Enum):
    kCancelIncoming = 0
    kCancelSelf = 1


class EventLoop:
    def __init__(self):
        self._bindings = []

    def bind(self, action):
        self._bindings.append(action)

    def poll(self):
        for action in list(self._bindings):
            action()

    def clear(self):
        self._bindings.clear()


# ---------------------------------------------------------------- Command ----


class Command:
    InterruptionBehavior = InterruptionBehavior

    def __new__(cls, *args, **kwargs):
        instance = super().__new__(cls)
        instance.requirements = set()
        return instance

    def __init__(self):
        pass

    def initialize(self):
        pass

    def execute(self):
        pass

    def end(self, interrupted):
        pass

    def isFinished(self):
        return False

    def getRequirements(self):
        return self.requirements

    def addRequirements(self, *requirements):
        for requirement in requirements:
            if isinstance(requirement, (list, tuple, set)):
                self.requirements.update(requirement)
            else:
                self.requirements.add(requirement)

    def hasRequirement(self, requirement):
        return requirement in self.requirements

    def runsWhenDisabled(self):
        return False

    def getInterruptionBehavior(self):
        return InterruptionBehavior.kCancelSelf

    def getName(self):
        return getattr(self, "_cz_name", type(self).__name__)

    def setName(self, name):
        self._cz_name = name

    def schedule(self):
        CommandScheduler.getInstance().schedule(self)

    def cancel(self):
        CommandScheduler.getInstance().cancel(self)

    def isScheduled(self):
        return CommandScheduler.getInstance().isScheduled(self)

    # decorators
    def withTimeout(self, seconds):
        return ParallelRaceGroup(self, WaitCommand(seconds))

    def until(self, condition):
        return ParallelRaceGroup(self, WaitUntilCommand(condition))

    def onlyWhile(self, condition):
        return self.until(lambda: not condition())

    def andThen(self, *next):
        return SequentialCommandGroup(self, *next)

    def beforeStarting(self, *before):
        return SequentialCommandGroup(*before, self)

    def alongWith(self, *parallel):
        return ParallelCommandGroup(self, *parallel)

    def raceWith(self, *parallel):
        return ParallelRaceGroup(self, *parallel)

    def deadlineFor(self, *parallel):
        return ParallelDeadlineGroup(self, *parallel)


# -------------------------------------------------------------- Subsystem ----


class Subsystem:
    def __new__(cls, *args, **kwargs):
        instance = super().__new__(cls)
        CommandScheduler.getInstance().registerSubsystem(instance)
        return instance

    def __init__(self):
        pass

    def periodic(self):
        pass

    def simulationPeriodic(self):
        pass

    def getName(self):
        return type(self).__name__

    def setDefaultCommand(self, command):
        CommandScheduler.getInstance().setDefaultCommand(self, command)

    def removeDefaultCommand(self):
        CommandScheduler.getInstance().removeDefaultCommand(self)

    def getDefaultCommand(self):
        return CommandScheduler.getInstance().getDefaultCommand(self)

    def getCurrentCommand(self):
        return CommandScheduler.getInstance().requiring(self)

    def register(self):
        CommandScheduler.getInstance().registerSubsystem(self)


# -------------------------------------------------------- CommandScheduler ----


class CommandScheduler:
    _instance = None

    @staticmethod
    def getInstance():
        if CommandScheduler._instance is None:
            CommandScheduler._instance = CommandScheduler()
        return CommandScheduler._instance

    @staticmethod
    def resetInstance():
        CommandScheduler._instance = None

    def __init__(self):
        self._composedCommands = {}
        self._scheduledCommands = {}
        self._requirements = {}
        self._subsystems = {}
        self._defaultButtonLoop = EventLoop()
        self._activeButtonLoop = self._defaultButtonLoop
        self._disabled = False
        self._inRunLoop = False
        self._toSchedule = {}
        self._toCancel = {}
        self._endingCommands = set()

    def getDefaultButtonLoop(self):
        return self._defaultButtonLoop

    def getActiveButtonLoop(self):
        return self._activeButtonLoop

    def setActiveButtonLoop(self, loop):
        self._activeButtonLoop = loop

    def disable(self):
        self._disabled = True

    def enable(self):
        self._disabled = False

    # composition rules
    def registerComposedCommands(self, commands):
        commands = tuple(commands)
        if len(set(commands)) != len(commands):
            raise IllegalCommandUse("Cannot compose a command twice in the same composition!")
        self.requireNotComposedOrScheduled(*commands)
        location = "<unknown>"
        for frame in _inspect.stack()[1:]:
            filename = frame.filename
            if not _os.path.abspath(filename).startswith(_HERE):
                location = "%s:%s" % (filename, frame.lineno)
                break
        for command in commands:
            self._composedCommands[command] = location

    def requireNotComposed(self, *commands):
        for command in commands:
            location = self._composedCommands.get(command)
            if location is not None:
                raise IllegalCommandUse(
                    "Commands that have been composed may not be added to another"
                    "composition or scheduled individually (originally composed at %s)" % location,
                    command=command,
                )

    def requireNotComposedOrScheduled(self, *commands):
        for command in commands:
            if self.isScheduled(command):
                raise IllegalCommandUse(
                    "Commands that have been scheduled individually may not be added to a composition!",
                    command=command,
                )
        self.requireNotComposed(*commands)

    def isComposed(self, command):
        return command in self._composedCommands

    def removeComposedCommand(self, command):
        self._composedCommands.pop(command, None)

    def clearComposedCommands(self):
        self._composedCommands.clear()

    # scheduling
    def schedule(self, *commands):
        for command in commands:
            self._schedule(command)

    def _schedule(self, command):
        from wpilib import RobotState

        if command is None:
            _report_warning("Tried to schedule a null command!")
            return
        if self._inRunLoop:
            self._toSchedule[command] = None
            return
        self.requireNotComposed(command)
        if self._disabled:
            return
        if self.isScheduled(command):
            return
        if RobotState.isDisabled() and not command.runsWhenDisabled():
            return
        requirements = command.getRequirements()
        if self._requirements.keys().isdisjoint(requirements):
            self._initCommand(command, *requirements)
        else:
            for requirement in requirements:
                requiring = self.requiring(requirement)
                if (
                    requiring is not None
                    and requiring.getInterruptionBehavior() == InterruptionBehavior.kCancelIncoming
                ):
                    return
            for requirement in requirements:
                requiring = self.requiring(requirement)
                if requiring is not None:
                    self._cancel(requiring, command)
            self._initCommand(command, *requirements)

    def _initCommand(self, command, *requirements):
        self._scheduledCommands[command] = None
        for requirement in requirements:
            self._requirements[requirement] = command
        command.initialize()

    def run(self):
        """One loop: subsystem periodic(), buttons, commands, then default commands."""
        from wpilib import RobotState

        if self._disabled:
            return
        for subsystem in list(self._subsystems):
            subsystem.periodic()
            subsystem.simulationPeriodic()

        self._activeButtonLoop.poll()

        self._inRunLoop = True
        is_disabled = RobotState.isDisabled()
        for command in list(self._scheduledCommands):
            if is_disabled and not command.runsWhenDisabled():
                self._cancel(command, None)
                continue
            command.execute()
            if command.isFinished():
                self._endingCommands.add(command)
                command.end(False)
                self._endingCommands.discard(command)
                self._scheduledCommands.pop(command, None)
                for requirement in command.getRequirements():
                    self._requirements.pop(requirement, None)
        self._inRunLoop = False

        for command in list(self._toSchedule):
            self._schedule(command)
        for command, interruptor in list(self._toCancel.items()):
            self._cancel(command, interruptor)
        self._toSchedule.clear()
        self._toCancel.clear()

        for subsystem, default in list(self._subsystems.items()):
            if subsystem not in self._requirements and default is not None:
                self._schedule(default)

    def registerSubsystem(self, *subsystems):
        for subsystem in subsystems:
            if subsystem is None:
                _report_warning("Tried to register a null subsystem")
                continue
            if subsystem in self._subsystems:
                _report_warning("Tried to register an already-registered subsystem")
                continue
            self._subsystems[subsystem] = None

    def unregisterSubsystem(self, *subsystems):
        for subsystem in subsystems:
            self._subsystems.pop(subsystem, None)

    def unregisterAllSubsystems(self):
        self._subsystems.clear()

    def setDefaultCommand(self, subsystem, defaultCommand):
        if subsystem is None:
            _report_warning("Tried to set a default command for a null subsystem")
            return
        if defaultCommand is None:
            _report_warning("Tried to set a null default command")
            return
        self.requireNotComposed(defaultCommand)
        if subsystem not in defaultCommand.getRequirements():
            raise IllegalCommandUse(
                "Default commands must require their subsystem!",
                command=defaultCommand,
                subsystem=subsystem,
            )
        if defaultCommand.getInterruptionBehavior() == InterruptionBehavior.kCancelIncoming:
            _report_warning(
                "Registering a non-interruptible default command\n"
                "This will likely prevent any other commands from requiring this subsystem."
            )
        self._subsystems[subsystem] = defaultCommand

    def removeDefaultCommand(self, subsystem):
        if subsystem in self._subsystems:
            self._subsystems[subsystem] = None

    def getDefaultCommand(self, subsystem):
        return self._subsystems.get(subsystem)

    def cancel(self, *commands):
        for command in commands:
            self._cancel(command, None)

    def _cancel(self, command, interruptor):
        if command is None:
            _report_warning("Tried to cancel a null command")
            return
        if command in self._endingCommands:
            return
        if self._inRunLoop:
            self._toCancel[command] = interruptor
            return
        if not self.isScheduled(command):
            return
        self._endingCommands.add(command)
        command.end(True)
        self._endingCommands.discard(command)
        self._scheduledCommands.pop(command, None)
        for requirement in command.getRequirements():
            self._requirements.pop(requirement, None)

    def cancelAll(self):
        self.cancel(*list(self._scheduledCommands))

    def isScheduled(self, *commands):
        return all(command in self._scheduledCommands for command in commands)

    def requiring(self, subsystem):
        return self._requirements.get(subsystem)


# ---------------------------------------------------------- simple commands ----


def _flatten(commands):
    out = []
    for command in commands:
        if isinstance(command, (list, tuple)):
            out.extend(command)
        else:
            out.append(command)
    return out


class WaitCommand(Command):
    def __init__(self, seconds):
        from wpilib import Timer

        super().__init__()
        self._duration = seconds
        self._timer = Timer()
        self.setName("WaitCommand: %s" % seconds)

    def initialize(self):
        self._timer.restart()

    def end(self, interrupted):
        self._timer.stop()

    def isFinished(self):
        return self._timer.hasElapsed(self._duration)

    def runsWhenDisabled(self):
        return True


class WaitUntilCommand(Command):
    def __init__(self, condition):
        super().__init__()
        self._condition = condition

    def isFinished(self):
        return self._condition()

    def runsWhenDisabled(self):
        return True


class InstantCommand(Command):
    def __init__(self, toRun=None, *requirements):
        super().__init__()
        self._toRun = toRun or (lambda: None)
        self.addRequirements(*requirements)

    def initialize(self):
        self._toRun()

    def isFinished(self):
        return True


class RunCommand(Command):
    def __init__(self, toRun, *requirements):
        super().__init__()
        self._toRun = toRun
        self.addRequirements(*requirements)

    def execute(self):
        self._toRun()


class PrintCommand(InstantCommand):
    def __init__(self, message):
        super().__init__(lambda: print(message))

    def runsWhenDisabled(self):
        return True


# ------------------------------------------------------------ command groups ----


class SequentialCommandGroup(Command):
    """a, then b, then c."""

    def __init__(self, *commands):
        super().__init__()
        self._commands = []
        self._currentCommandIndex = -1
        self._runsWhenDisabled = True
        self._interruptBehavior = InterruptionBehavior.kCancelIncoming
        self.addCommands(*commands)

    def addCommands(self, *commands):
        commands = _flatten(commands)
        if self._currentCommandIndex != -1:
            raise IllegalCommandUse("Commands cannot be added to a composition while it is running")
        CommandScheduler.getInstance().registerComposedCommands(commands)
        for command in commands:
            self._commands.append(command)
            self.requirements.update(command.getRequirements())
            self._runsWhenDisabled = self._runsWhenDisabled and command.runsWhenDisabled()
            if command.getInterruptionBehavior() == InterruptionBehavior.kCancelSelf:
                self._interruptBehavior = InterruptionBehavior.kCancelSelf

    def initialize(self):
        self._currentCommandIndex = 0
        if self._commands:
            self._commands[0].initialize()

    def execute(self):
        if not self._commands:
            return
        current = self._commands[self._currentCommandIndex]
        current.execute()
        if current.isFinished():
            current.end(False)
            self._currentCommandIndex += 1
            if self._currentCommandIndex < len(self._commands):
                self._commands[self._currentCommandIndex].initialize()

    def end(self, interrupted):
        if interrupted and self._commands and -1 < self._currentCommandIndex < len(self._commands):
            self._commands[self._currentCommandIndex].end(True)
        self._currentCommandIndex = -1

    def isFinished(self):
        return self._currentCommandIndex == len(self._commands)

    def runsWhenDisabled(self):
        return self._runsWhenDisabled

    def getInterruptionBehavior(self):
        return self._interruptBehavior


class ParallelCommandGroup(Command):
    """All at the same time. Ends when every command has ended."""

    def __init__(self, *commands):
        super().__init__()
        self._commands = {}
        self._runsWhenDisabled = True
        self._interruptBehavior = InterruptionBehavior.kCancelIncoming
        self.addCommands(*commands)

    def addCommands(self, *commands):
        commands = _flatten(commands)
        if True in self._commands.values():
            raise IllegalCommandUse("Commands cannot be added to a composition while it is running")
        CommandScheduler.getInstance().registerComposedCommands(commands)
        for command in commands:
            in_common = command.getRequirements().intersection(self.requirements)
            if in_common:
                raise IllegalCommandUse(
                    "Multiple commands in a parallel composition cannot require the same subsystems.",
                    common=in_common,
                )
            self._commands[command] = False
            self.requirements.update(command.getRequirements())
            self._runsWhenDisabled = self._runsWhenDisabled and command.runsWhenDisabled()
            if command.getInterruptionBehavior() == InterruptionBehavior.kCancelSelf:
                self._interruptBehavior = InterruptionBehavior.kCancelSelf

    def initialize(self):
        for command in self._commands:
            command.initialize()
            self._commands[command] = True

    def execute(self):
        for command, running in list(self._commands.items()):
            if not running:
                continue
            command.execute()
            if command.isFinished():
                command.end(False)
                self._commands[command] = False

    def end(self, interrupted):
        if interrupted:
            for command, running in list(self._commands.items()):
                if running:
                    command.end(True)
                    self._commands[command] = False

    def isFinished(self):
        return True not in self._commands.values()

    def runsWhenDisabled(self):
        return self._runsWhenDisabled

    def getInterruptionBehavior(self):
        return self._interruptBehavior


class ParallelRaceGroup(Command):
    """All at the same time. Ends when one command ends, and cancels the others."""

    def __init__(self, *commands):
        super().__init__()
        self._commands = []
        self._runsWhenDisabled = True
        self._finished = True
        self._interruptBehavior = InterruptionBehavior.kCancelIncoming
        self.addCommands(*commands)

    def addCommands(self, *commands):
        commands = _flatten(commands)
        if not self._finished:
            raise IllegalCommandUse("Commands cannot be added to a composition while it is running")
        CommandScheduler.getInstance().registerComposedCommands(commands)
        for command in commands:
            in_common = command.getRequirements().intersection(self.requirements)
            if in_common:
                raise IllegalCommandUse(
                    "Multiple commands in a parallel composition cannot require the same subsystems.",
                    common=in_common,
                )
            self._commands.append(command)
            self.requirements.update(command.getRequirements())
            self._runsWhenDisabled = self._runsWhenDisabled and command.runsWhenDisabled()
            if command.getInterruptionBehavior() == InterruptionBehavior.kCancelSelf:
                self._interruptBehavior = InterruptionBehavior.kCancelSelf

    def initialize(self):
        self._finished = False
        for command in self._commands:
            command.initialize()

    def execute(self):
        for command in self._commands:
            command.execute()
            if command.isFinished():
                self._finished = True

    def end(self, interrupted):
        for command in self._commands:
            command.end(not command.isFinished())

    def isFinished(self):
        return self._finished

    def runsWhenDisabled(self):
        return self._runsWhenDisabled

    def getInterruptionBehavior(self):
        return self._interruptBehavior


class ParallelDeadlineGroup(Command):
    """All at the same time. Ends when the first command (the deadline) ends."""

    def __init__(self, deadline, *commands):
        super().__init__()
        self._commands = {}
        self._runsWhenDisabled = True
        self._finished = True
        self._interruptBehavior = InterruptionBehavior.kCancelIncoming
        self._deadline = deadline
        self.addCommands(deadline, *commands)

    def addCommands(self, *commands):
        commands = _flatten(commands)
        if not self._finished:
            raise IllegalCommandUse("Commands cannot be added to a composition while it is running")
        CommandScheduler.getInstance().registerComposedCommands(commands)
        for command in commands:
            in_common = command.getRequirements().intersection(self.requirements)
            if in_common:
                raise IllegalCommandUse(
                    "Multiple commands in a parallel composition cannot require the same subsystems.",
                    common=in_common,
                )
            self._commands[command] = False
            self.requirements.update(command.getRequirements())
            self._runsWhenDisabled = self._runsWhenDisabled and command.runsWhenDisabled()
            if command.getInterruptionBehavior() == InterruptionBehavior.kCancelSelf:
                self._interruptBehavior = InterruptionBehavior.kCancelSelf

    def initialize(self):
        for command in self._commands:
            command.initialize()
            self._commands[command] = True
        self._finished = False

    def execute(self):
        for command, running in list(self._commands.items()):
            if not running:
                continue
            command.execute()
            if command.isFinished():
                command.end(False)
                self._commands[command] = False
                if command is self._deadline:
                    self._finished = True

    def end(self, interrupted):
        for command, running in list(self._commands.items()):
            if running:
                command.end(True)

    def isFinished(self):
        return self._finished

    def runsWhenDisabled(self):
        return self._runsWhenDisabled

    def getInterruptionBehavior(self):
        return self._interruptBehavior
