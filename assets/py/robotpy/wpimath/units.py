"""A browser copy of wpimath.units: the conversion functions. See assets/py/robotpy/README.md."""

import math as _math


def inchesToMeters(inches):
    return inches * 0.0254


def metersToInches(meters):
    return meters / 0.0254


def feetToMeters(feet):
    return feet * 0.3048


def metersToFeet(meters):
    return meters / 0.3048


def degreesToRadians(degrees):
    return _math.radians(degrees)


def radiansToDegrees(radians):
    return _math.degrees(radians)


def degreesToRotations(degrees):
    return degrees / 360.0


def rotationsToDegrees(rotations):
    return rotations * 360.0


def radiansToRotations(radians):
    return radians / (2 * _math.pi)


def rotationsToRadians(rotations):
    return rotations * 2 * _math.pi


def rotationsPerMinuteToRadiansPerSecond(rpm):
    return rpm * 2 * _math.pi / 60.0


def radiansPerSecondToRotationsPerMinute(radians_per_second):
    return radians_per_second * 60.0 / (2 * _math.pi)


def millisecondsToSeconds(milliseconds):
    return milliseconds / 1000.0


def secondsToMilliseconds(seconds):
    return seconds * 1000.0
