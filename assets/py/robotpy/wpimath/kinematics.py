"""A browser copy of wpimath.kinematics.ChassisSpeeds. See assets/py/robotpy/README.md."""

import math as _math

from .geometry import Rotation2d, Translation2d


class ChassisSpeeds:
    """A robot speed: vx and vy in meters per second, omega in radians per second."""

    def __init__(self, vx=0.0, vy=0.0, omega=0.0):
        self.vx = float(vx)
        self.vy = float(vy)
        self.omega = float(omega)

    @property
    def omega_dps(self):
        return _math.degrees(self.omega)

    @staticmethod
    def _split(args):
        if len(args) == 2 and isinstance(args[0], ChassisSpeeds):
            speeds, angle = args
            return speeds.vx, speeds.vy, speeds.omega, angle
        if len(args) == 4:
            return args
        raise TypeError("pass (vx, vy, omega, robotAngle) or (ChassisSpeeds, robotAngle)")

    @staticmethod
    def fromFieldRelativeSpeeds(*args):
        """Field directions to robot directions: turn the speed by minus the robot heading."""
        vx, vy, omega, angle = ChassisSpeeds._split(args)
        turned = Translation2d(vx, vy).rotateBy(-angle)
        return ChassisSpeeds(turned.x, turned.y, omega)

    @staticmethod
    def fromRobotRelativeSpeeds(*args):
        """Robot directions to field directions: turn the speed by the robot heading."""
        vx, vy, omega, angle = ChassisSpeeds._split(args)
        turned = Translation2d(vx, vy).rotateBy(angle)
        return ChassisSpeeds(turned.x, turned.y, omega)

    def __add__(self, other):
        return ChassisSpeeds(self.vx + other.vx, self.vy + other.vy, self.omega + other.omega)

    def __sub__(self, other):
        return ChassisSpeeds(self.vx - other.vx, self.vy - other.vy, self.omega - other.omega)

    def __mul__(self, scalar):
        return ChassisSpeeds(self.vx * scalar, self.vy * scalar, self.omega * scalar)

    def __repr__(self):
        return "ChassisSpeeds(vx=%f, vy=%f, omega=%f)" % (self.vx, self.vy, self.omega)
