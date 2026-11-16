---
title: 3. Use Camera Measurements That Arrive Late
parent: Challenges
nav_order: 3
---

# Use Camera Measurements That Arrive Late
{: .no_toc }

The robot has two sources of position data. Each source has errors.

**The wheels.** The odometry adds up the rotation of the wheels. This data is
smooth and always available, but its error increases slowly. The diameter of a
wheel is never exactly the value in the code, and the wheels slip a small
distance during each turn. Also, the wheels measure only the movement of the
wheels. If a defender pushes the robot, the wheels do not measure that
movement.

**The camera.** The camera reads an AprilTag and calculates the position of the
robot from the image of the tag. The error of this data does not increase over
time. But the data arrives late.

## Why the camera data arrives late

Between the time when light gets to the sensor and the time when your code gets
the result, these steps occur:

1. The exposure of the image.
2. The read-out of the sensor.
3. The detection of the tag.
4. The calculation of the pose.
5. The transfer through the network.
6. The wait for the next loop of your code.

Thus, a measurement is 90 ms to 230 ms old when your code gets it. This robot
moves at speeds up to 4.9 m/s:

```
0.14 s  x  4.9 m/s  =  0.69 m
```

Thus, the camera does not give the position of the robot now. It gives the
position of the robot at the time when the camera took the image. If you set
your pose to the camera position, your pose moves back along the path
approximately twelve times each second. Each controller that uses the pose then
reacts to these movements.

## The method

Do not compare the camera measurement with your pose now. Compare it with your
pose at the time when the camera took the image.

To do this, keep a history. In each loop, record the time and your pose. When a
measurement from 0.14 s before arrives, find the pose that you recorded 0.14 s
before, and compare the two. The difference does not include the movement of
the robot.

Then, apply that difference to your pose now. The correction that you
calculate for a past time is also correct now, because the wheels measured all
the movement between that time and now. The wheels are not accurate about the
position of the robot. But they are accurate about the distance that the robot
moved in the last 0.2 s.

To write this in code, keep two values: the sum of the wheel movements, and a
correction. The camera changes only the correction.

## Two other problems

**Some measurements are incorrect.** If the camera reads a tag as a different
tag, the position is incorrect by many metres. Discard a measurement if it is
different from your estimate by more than approximately 2 m.

**Do not make that limit too small.** At 6 s, a defender pushes the robot. The
wheels do not measure this movement, so your pose becomes incorrect by
approximately 1 m. After that, each camera measurement is different from your
pose by approximately 1 m. If your limit is small, your code discards all these
measurements, and your pose stays incorrect. With a limit of 0.35 m, the pose
does not recover from the push.

An outlier filter can discard the measurements that show that your estimate is
incorrect. Make sure that your limit does not discard those measurements.

## The task

{% include interactive/python-exercise.html id="vision_latency" %}

## Why the obvious answers fail

`tools/validate-vision.py` tests each of these answers on the three runs:

| Answer | Settled error | Largest error | Time to recover from the push |
|:-------|:--------------|:--------------|:------------------------------|
| Use only the wheels | 0.80 m | 1.25 m | no recovery |
| Set the pose to each measurement | 1.97 m | 5.05 m | no recovery |
| Move part of the way to each measurement | 0.79 m | 1.63 m | 5.64 s |
| Move part of the way, and discard the incorrect measurements | 0.64 m | 0.87 m | no recovery |
| Compare with the pose at the time of the image | **0.069 m** | **0.11 m** | **0.80 s** |

In the fourth row, the code discards the incorrect measurements. This result is
better than the third row. But its error is still nine times larger than the
error of the correct answer.

A larger blend also does not solve the problem, because the error is not noise.
The error is a delay. Each measurement is old by approximately the same time.
Thus, the error always points back along the path, and the blend moves the
estimate in that direction.

A filter cannot remove a delay. Your code must use the time when the camera
took the image.

{: .note }
> `poseEstimator.py` on the robot uses this method. For this reason,
> `addVisionMeasurement` in WPILib needs a timestamp.

## Next

- [Drive straight while you spin](../second-order-swerve)
