"""
A browser copy of wpimath.controller.PIDController, the same calculation as
WPILib 2026. See assets/py/robotpy/README.md.
"""

import math as _math


def _input_modulus(value, minimum, maximum):
    modulus = maximum - minimum
    value -= int((value - minimum) / modulus) * modulus
    value -= int((value - maximum) / modulus) * modulus
    return value


class PIDController:
    def __init__(self, Kp, Ki, Kd, period=0.02):
        if period <= 0:
            raise ValueError("Controller period must be a positive number")
        self._kp = Kp
        self._ki = Ki
        self._kd = Kd
        self._period = period
        self._iZone = _math.inf
        self._maximumIntegral = 1.0
        self._minimumIntegral = -1.0
        self._continuous = False
        self._maximumInput = 0.0
        self._minimumInput = 0.0
        self._errorTolerance = 0.05
        self._errorDerivativeTolerance = _math.inf
        self._setpoint = 0.0
        self._measurement = 0.0
        self._error = 0.0
        self._prevError = 0.0
        self._totalError = 0.0
        self._errorDerivative = 0.0
        self._haveSetpoint = False
        self._haveMeasurement = False

    # gains
    def setPID(self, Kp, Ki, Kd):
        self._kp, self._ki, self._kd = Kp, Ki, Kd

    def setP(self, Kp):
        self._kp = Kp

    def setI(self, Ki):
        self._ki = Ki

    def setD(self, Kd):
        self._kd = Kd

    def setIZone(self, iZone):
        self._iZone = iZone

    def getP(self):
        return self._kp

    def getI(self):
        return self._ki

    def getD(self):
        return self._kd

    def getIZone(self):
        return self._iZone

    def getPeriod(self):
        return self._period

    # setpoint and tolerance
    def setSetpoint(self, setpoint):
        self._setpoint = setpoint
        self._haveSetpoint = True
        self._update_error()
        self._errorDerivative = (self._error - self._prevError) / self._period

    def getSetpoint(self):
        return self._setpoint

    def setTolerance(self, errorTolerance, errorDerivativeTolerance=_math.inf):
        self._errorTolerance = errorTolerance
        self._errorDerivativeTolerance = errorDerivativeTolerance

    def getErrorTolerance(self):
        return self._errorTolerance

    def getErrorDerivativeTolerance(self):
        return self._errorDerivativeTolerance

    def getPositionTolerance(self):
        return self._errorTolerance

    def getVelocityTolerance(self):
        return self._errorDerivativeTolerance

    def atSetpoint(self):
        return (
            self._haveMeasurement
            and self._haveSetpoint
            and abs(self._error) < self._errorTolerance
            and abs(self._errorDerivative) < self._errorDerivativeTolerance
        )

    def enableContinuousInput(self, minimumInput, maximumInput):
        self._continuous = True
        self._minimumInput = minimumInput
        self._maximumInput = maximumInput

    def disableContinuousInput(self):
        self._continuous = False

    def isContinuousInputEnabled(self):
        return self._continuous

    def setIntegratorRange(self, minimumIntegral, maximumIntegral):
        self._minimumIntegral = minimumIntegral
        self._maximumIntegral = maximumIntegral

    def getError(self):
        return self._error

    def getPositionError(self):
        return self._error

    def getErrorDerivative(self):
        return self._errorDerivative

    def getVelocityError(self):
        return self._errorDerivative

    def _update_error(self):
        if self._continuous:
            bound = (self._maximumInput - self._minimumInput) / 2.0
            self._error = _input_modulus(self._setpoint - self._measurement, -bound, bound)
        else:
            self._error = self._setpoint - self._measurement

    def calculate(self, measurement, setpoint=None):
        """calculate(measurement, setpoint): the measurement comes first."""
        if setpoint is not None:
            self._setpoint = setpoint
            self._haveSetpoint = True
        self._measurement = measurement
        self._prevError = self._error
        self._haveMeasurement = True
        self._update_error()
        self._errorDerivative = (self._error - self._prevError) / self._period

        if abs(self._error) > self._iZone:
            self._totalError = 0.0
        elif self._ki != 0:
            self._totalError = min(
                max(self._totalError + self._error * self._period, self._minimumIntegral / self._ki),
                self._maximumIntegral / self._ki,
            )

        return self._kp * self._error + self._ki * self._totalError + self._kd * self._errorDerivative

    def reset(self):
        self._error = 0.0
        self._prevError = 0.0
        self._totalError = 0.0
        self._errorDerivative = 0.0
        self._haveMeasurement = False
