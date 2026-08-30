---
title: 3. Teach the Robot to Decide
parent: Tutorials
nav_order: 0.3
---

# Teach the Robot to Decide
{: .no_toc }

Until now you told the robot exactly what to do and when. In a match that is
not enough. The robot must decide some things for itself.

A robot decides with a **sensor** and a **rule**.

## The ball path

The robot has a ball path inside it. The game piece goes in at the intake
roller. Then it travels half way around the **indexer wheel** in the middle of
the robot.

At the end of the path there is a block called the **Jamomatic**. The game
piece stops against it.

The path has two colours:

- **Green.** The game piece is inside the robot. Stop the indexer here.
- **Red.** The game piece is against the Jamomatic. The Jamomatic turns red.

The indexer wheel turns while the indexer motor runs. Watch the game piece move
around it.

## Your task

Stop the indexer when the game piece is inside the robot.

The robot cannot see the game piece. It must know from a sensor.

## The indexer motor tells you

A motor pulls current from the battery. A motor that turns with nothing against
it pulls only a little. When the game piece pushes on the indexer wheel, the
motor must push back harder. It then pulls more current.

So the current goes **up** as the game piece comes in.

| What happens | Current |
|:-------------|:--------|
| The indexer is off | 0 A |
| The indexer turns with nothing in it | about 8 A |
| The game piece touches the wheel | the current goes up |
| The game piece is inside the robot | about 26 A to 38 A |
| The game piece is against the Jamomatic | more than 50 A |

The graph shows the current while the robot runs. The blue line is the current.
The orange line is your rule. The orange dot shows the moment the rule
happened.

Many teams find a game piece this way. It needs no extra sensor at all.

## Build the rule

A rule has three parts:

**IF** a sensor **goes over** a value, **THEN** do this.

1. For **IF**, tap **the indexer motor**.
2. Move the slider to a value.
3. For **THEN**, tap **stop the indexer**.
4. Tap **Play**.

The robot drives out from the wall, puts the arm down and starts the intake.
Then your rule gets its chance. **Play** always starts a new run from the
beginning.

{% include interactive/first-rule.html title="Teach the robot to decide" %}

## Find the correct value

The value on the slider decides everything.

- **Too small.** The rule happens while the game piece is still outside. The
  indexer stops too early.
- **Too large.** The rule never happens in time. The game piece goes all the
  way to the Jamomatic.

There is a range of values that work. Find one end of the range, then the
other, then use a value in the middle. This is how you tune anything on a
robot.

## The other sensor

Some robots have a **distance sensor** in the ball path. It measures the
distance to the game piece in centimetres. The reading gets smaller as the game
piece comes in. That rule happens when the reading goes **under** a value.

The bar under the robot shows this sensor. The red part is where the piece
reaches the Jamomatic. The green part is where the piece is inside. The orange
line is your rule, and the blue dot is the reading now.

Try it. The task is the same, but the numbers move the other way.

{: .note }
> Try **the battery voltage** as well. The rule never happens, because the
> battery voltage does not change when a game piece arrives. A rule is only as
> good as the sensor you give it.

## What you have learned

You have now done the three things that all robot code does:

1. **A button makes something happen.** That is the driver.
2. **Steps happen in an order.** That is autonomous.
3. **A sensor decides.** That is everything else.

## Next

Everything after this is the same three ideas with more detail. The next
tutorial writes real Python, a few lines at a time.

- [Joystick Deadbands](../joystick-deadband)
