---
title: Operator Interface
parent: Controls
nav_order: 6
---

# The Operator Interface
{: .no_toc }

<details open markdown="block">
  <summary>Contents</summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

`robot/oi.py` converts controller inputs into robot actions. A driver can ask
you to change this file during an event. Therefore you must know it well.

## How the bindings operate

We use `XboxCommandController`. This is our own class. It contains WPILib
controller classes. Each button on the controller is a trigger. Attach a
function to a trigger with a decorator:

```python
@self.driver1.A.whenPressed
def _():
    self.robot.shooter_at_default = False
```

The name of the function is `_`, because no other code calls the function. The
registration of the function is the purpose. Three decorators are sufficient
for almost all bindings:

| Decorator | When the function operates |
|:----------|:---------------------------|
| `whenPressed` | One time, on the loop when the button goes down |
| `whenHeld` | Each loop while the button is down. This is approximately 50 times each second |
| `whenReleased` | One time, on the loop when the button goes up |

To select the correct decorator is most of the work. These rules come from
failures at competitions:

- **Use `whenPressed` for a single action.** Examples are a shot, a change of
  state, and a gyro reset. If you use `whenHeld` for a single action, the
  action occurs 50 times each second.
- **A continuous action needs `whenHeld` and `whenReleased`.** `whenHeld`
  starts the intake. Nothing stops the intake unless you write the
  `whenReleased` function. This is the most frequent error in this file.
- **Do not use `whenHeld` to start a shooter.** A shooter needs approximately
  one second to reach speed. Use `whenPressed` and let the shooter continue.

## Available buttons

`A`, `B`, `X`, `Y`, `LEFT_BUMPER`, `RIGHT_BUMPER`, `START`, `BACK`,
`LEFT_STICK`, `RIGHT_STICK`, `POV.UP`, `POV.DOWN`, `POV.LEFT` and `POV.RIGHT`.

The triggers are analog. Therefore each trigger has two forms. `LEFT_TRIGGER`
is a `CustomAnalog` and gives a value from 0 to 1. `LEFT_TRIGGER_AS_BUTTON` is
a button. It is pressed above approximately 5%. Use the button form unless you
need the analog value.

The joysticks are also analog. Set a deadzone on each joystick in
`OI.__init__`:

```python
self.driver1.LEFT_JOY_X.setDeadzone(0.02)
self.driver1.RIGHT_JOY_X.setDeadzone(0.1)
```

Read [Joystick Deadbands](../../Tutorials/joystick-deadband) first. That page
gives the reason for these two values.

## Exercise

The robot below has an intake, a shooter and a driver station. Write the
bindings, load them, then complete a scoring cycle with your keyboard. Your
Python operates 50 times each second, with the same rules as the robot.

The cycle is:

1. Drive to the depot.
2. Collect one piece of fuel with the intake.
3. Start the shooter.
4. Move to a position within range of the goal.
5. Shoot.

Complete the cycle two times.

The depot changes color when the robot is in it. The shooter shows a ring that
increases as the speed increases. A shot moves to the goal. If you shoot too
early or from too far away, the piece stops before the goal.

{: .note }
> **Reset robot** moves the robot back to the start position. It does not
> change your bindings. **Restore starter code** replaces your bindings, and it
> asks you first.

{% include interactive/oi-task.html id="fuel_cycle" %}

## Differences from the robot

The real `oi.py` is longer than this exercise:

- **Two controllers.** `driver1` controls the drivetrain. `driver2` controls
  the superstructure. Discuss the division of the actions with the drive team.
- **Default commands.** The drivetrain has a `setDefaultCommand`. It reads the
  joysticks each loop when no other command uses the drivetrain.
- **Coroutines.** Many bindings start a coroutine instead of a flag. A
  coroutine can continue across many loops. An example sequence is: start the
  shooter, wait for the speed, feed the piece, stop. See
  [Libraries](../../Libraries/libraries).
- **Rumble.** Controller vibration uses the same decorators. Rumble tells the
  driver that an event occurred, and the driver does not look at the dashboard.

{: .warning }
> Change the bindings before a practice session. Do not change the bindings
> between matches. A driver learns the button positions. A button that moved
> after the last match is worse than a button with no function.
