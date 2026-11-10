"""
A browser copy of wpimath.geometry: Rotation2d, Translation2d and Pose2d.
It follows RobotPy 2026, including where angles wrap and where they do not.
See assets/py/robotpy/README.md.
"""

import math as _math

_EPS = 1e-9


class Rotation2d:
    """
    Rotation2d(radians), Rotation2d(x, y), or Rotation2d.fromDegrees(degrees).

    degrees() and radians() return the value it was made with (350 stays 350).
    rotateBy, + and - give a result between -180 and 180 degrees.
    """

    def __init__(self, value=0.0, y=None):
        if y is None:
            self._value = float(value)
            self._cos = _math.cos(self._value)
            self._sin = _math.sin(self._value)
        else:
            x = float(value)
            y = float(y)
            magnitude = _math.hypot(x, y)
            if magnitude > 1e-6:
                self._cos = x / magnitude
                self._sin = y / magnitude
            else:
                self._cos = 1.0
                self._sin = 0.0
            self._value = _math.atan2(self._sin, self._cos)

    @staticmethod
    def fromDegrees(degrees):
        return Rotation2d(_math.radians(degrees))

    @staticmethod
    def fromRadians(radians):
        return Rotation2d(radians)

    @staticmethod
    def fromRotations(rotations):
        return Rotation2d(rotations * 2 * _math.pi)

    def radians(self):
        return self._value

    def degrees(self):
        return _math.degrees(self._value)

    def rotations(self):
        return self._value / (2 * _math.pi)

    def cos(self):
        return self._cos

    def sin(self):
        return self._sin

    def tan(self):
        return self._sin / self._cos

    def rotateBy(self, other):
        return Rotation2d(
            self._cos * other._cos - self._sin * other._sin,
            self._cos * other._sin + self._sin * other._cos,
        )

    def __add__(self, other):
        return self.rotateBy(other)

    def __sub__(self, other):
        return self.rotateBy(-other)

    def __neg__(self):
        return Rotation2d(-self._value)

    def __mul__(self, scalar):
        return Rotation2d(self._value * scalar)

    def __truediv__(self, scalar):
        return Rotation2d(self._value / scalar)

    def __eq__(self, other):
        if not isinstance(other, Rotation2d):
            return NotImplemented
        return _math.hypot(self._cos - other._cos, self._sin - other._sin) < _EPS

    def __hash__(self):
        return hash((round(self._cos, 9), round(self._sin, 9)))

    def __repr__(self):
        return "Rotation2d(%f)" % self._value


class Translation2d:
    """A point or an arrow on the field, in meters: Translation2d(x, y)."""

    def __init__(self, x=0.0, y=0.0):
        if isinstance(x, Rotation2d) or isinstance(y, Rotation2d):
            raise TypeError("Translation2d(x, y) takes two numbers in meters")
        self._x = float(x)
        self._y = float(y)

    @property
    def x(self):
        return self._x

    @property
    def y(self):
        return self._y

    def X(self):
        return self._x

    def Y(self):
        return self._y

    def norm(self):
        return _math.hypot(self._x, self._y)

    def angle(self):
        return Rotation2d(self._x, self._y)

    def distance(self, other):
        return _math.hypot(other._x - self._x, other._y - self._y)

    def rotateBy(self, other):
        return Translation2d(
            self._x * other.cos() - self._y * other.sin(),
            self._x * other.sin() + self._y * other.cos(),
        )

    def __add__(self, other):
        return Translation2d(self._x + other._x, self._y + other._y)

    def __sub__(self, other):
        return Translation2d(self._x - other._x, self._y - other._y)

    def __neg__(self):
        return Translation2d(-self._x, -self._y)

    def __mul__(self, scalar):
        if not isinstance(scalar, (int, float)):
            return NotImplemented
        return Translation2d(self._x * scalar, self._y * scalar)

    def __truediv__(self, scalar):
        if not isinstance(scalar, (int, float)):
            return NotImplemented
        return Translation2d(self._x / scalar, self._y / scalar)

    def __eq__(self, other):
        if not isinstance(other, Translation2d):
            return NotImplemented
        return abs(self._x - other._x) < _EPS and abs(self._y - other._y) < _EPS

    def __hash__(self):
        return hash((round(self._x, 9), round(self._y, 9)))

    def __repr__(self):
        return "Translation2d(x=%f, y=%f)" % (self._x, self._y)


class Pose2d:
    """
    A position and a heading: Pose2d(x, y, rotation) or Pose2d(translation, rotation).
    The rotation can be a Rotation2d or a number in radians.
    """

    def __init__(self, *args):
        if len(args) == 0:
            self._translation = Translation2d()
            self._rotation = Rotation2d()
        elif len(args) == 2:
            translation, rotation = args
            if not isinstance(translation, Translation2d):
                raise TypeError("Pose2d(translation, rotation) needs a Translation2d first")
            self._translation = translation
            self._rotation = rotation if isinstance(rotation, Rotation2d) else Rotation2d(rotation)
        elif len(args) == 3:
            x, y, rotation = args
            self._translation = Translation2d(x, y)
            self._rotation = rotation if isinstance(rotation, Rotation2d) else Rotation2d(rotation)
        else:
            raise TypeError("Pose2d() takes (x, y, rotation) or (translation, rotation)")

    @property
    def x(self):
        return self._translation.x

    @property
    def y(self):
        return self._translation.y

    def X(self):
        return self._translation.X()

    def Y(self):
        return self._translation.Y()

    def translation(self):
        return self._translation

    def rotation(self):
        return self._rotation

    def __eq__(self, other):
        if not isinstance(other, Pose2d):
            return NotImplemented
        return self._translation == other._translation and self._rotation == other._rotation

    def __hash__(self):
        return hash((self._translation, self._rotation))

    def __repr__(self):
        return "Pose2d(%r, %r)" % (self._translation, self._rotation)
