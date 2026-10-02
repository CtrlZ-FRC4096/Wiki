---
title: 5. Classes and Objects
parent: Python Tutorials
nav_order: 5
---

# 5. Classes and Objects

Every subsystem in our robot follows this pattern. Learn this lesson well and you can read any file in `robot/subsystems/`.

## Summary

A **class** is a blueprint. It groups **attributes** (stored values) and **methods** (functions). An **object** is a thing made from the blueprint.

```python
class FakeMotor:
    def __init__(self, name):     # runs once when you make the object
        self.name = name          # attribute: stored on the object
        self.speed = 0.0

    def set(self, speed):         # method
        self.speed = speed

left = FakeMotor('left intake')   # make an object
left.set(0.8)                     # call a method
print(left.speed)                 # read an attribute
```

Rules and tools:

- `self` means: this object. It is the first parameter of every method. You never pass it yourself: `left.set(0.8)` fills it in automatically.
- Every attribute that other code must see starts with `self.`. A plain variable inside a method disappears when the method ends.
- Objects can hold other objects: `self.left = FakeMotor('left')`, then `self.left.set(...)`.
- A subsystem follows one pattern: `__init__` makes the hardware, other methods give commands, `periodic()` runs every frame.
- **Inheritance**: a class can start from another class and add to it. `super().__init__()` runs the setup of the parent class first:

```python
class Intake(Subsystem):          # Intake is a Subsystem, with more
    def __init__(self, robot):
        super().__init__()
        ...
```

- `isinstance(x, SomeClass)` tests what class an object came from.
- **Imports** bring in classes from other files. `import const` gives `const.LEFT_INTAKE_MOTOR_ID`. `from wpilib import Timer` gives `Timer` directly.

> You do not need to know the inside of the libraries. Make objects, set attributes, call methods. Example: `motor = hardware.TalonFX(id)`, then `motor.set_control(...)`. That is all the vendor documentation expects you to do.

## In our robot code

`robot/subsystems/intake.py`:

```python
class Intake(Subsystem):
    def __init__(self, robot: "Robot"):
        super().__init__()
        self.robot = robot
        self.left_intake_motor = hardware.TalonFX(const.LEFT_INTAKE_MOTOR_ID, "rio")
        self.commanded_intake_speed = 0.0

    def set_intake_speed(self, speed):
        self.commanded_intake_speed = speed / 100
        self.left_intake_motor.set_control(controls.DutyCycleOut(speed / 100))
```

## Try it

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:Y2xhc3MgRmFrZU1vdG9yOgogICAgZGVmIF9faW5pdF9fKHNlbGYsIG5hbWUpOgogICAgICAgIHNlbGYubmFtZSA9IG5hbWUKICAgICAgICBzZWxmLnNwZWVkID0gMC4wCgogICAgZGVmIHNldChzZWxmLCBzcGVlZCk6ICAgICAgICAjIGxpa2UgbW90b3Iuc2V0X2NvbnRyb2woLi4uKQogICAgICAgIHNlbGYuc3BlZWQgPSBzcGVlZAoKbSA9IEZha2VNb3RvcignbGVmdCBpbnRha2UnKQptLnNldCgwLjgpCnByaW50KGYne20ubmFtZX0gcnVucyBhdCB7bS5zcGVlZH0nKQ==" width="100%" height="420px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

## Exercises

Every exercise ends with tests. Run the code until every line prints **PASS**.

### 5.1 Getter and status

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:Y2xhc3MgRmFrZU1vdG9yOgogICAgZGVmIF9faW5pdF9fKHNlbGYsIG5hbWUpOgogICAgICAgIHNlbGYubmFtZSA9IG5hbWUKICAgICAgICBzZWxmLnNwZWVkID0gMC4wCgogICAgZGVmIHNldChzZWxmLCBzcGVlZCk6CiAgICAgICAgc2VsZi5zcGVlZCA9IHNwZWVkCgogICAgIyBQQVJUIEE6IGFkZCBhIG1ldGhvZCBnZXQoc2VsZikuIFJldHVybiBzZWxmLnNwZWVkLgoKICAgICMgUEFSVCBCOiBhZGQgYSBtZXRob2Qgc3RhdHVzKHNlbGYpLgogICAgIyBSZXR1cm4gYW4gZi1zdHJpbmcgbGlrZSAnZGVwbG95IGF0IC0wLjM1JwoKCm0gPSBGYWtlTW90b3IoJ2RlcGxveScpCm0uc2V0KC0wLjM1KQoKCiMgLS0tLS0gVEVTVFMgKGRvIG5vdCBjaGFuZ2UpIC0tLS0tCmRlZiBjaGVjayhuYW1lLCBmbik6CiAgICB0cnk6CiAgICAgICAgb2sgPSBib29sKGZuKCkpCiAgICBleGNlcHQgRXhjZXB0aW9uOgogICAgICAgIG9rID0gRmFsc2UKICAgIHByaW50KCgnUEFTUycgaWYgb2sgZWxzZSAnRkFJTCcpICsgJyAtICcgKyBuYW1lKQogICAgcmV0dXJuIG9rCgpzY29yZSA9IHN1bShbCiAgICBjaGVjaygnZ2V0KCkgcmV0dXJucyB0aGUgc3BlZWQnLCBsYW1iZGE6IG0uZ2V0KCkgPT0gLTAuMzUpLAogICAgY2hlY2soJ3N0YXR1cygpIGhhcyBuYW1lIGFuZCBzcGVlZCcsIGxhbWJkYTogbS5zdGF0dXMoKSA9PSAnZGVwbG95IGF0IC0wLjM1JykKXSkKcHJpbnQoZidTQ09SRToge3Njb3JlfS8yJyk=" width="100%" height="540px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Hint</summary>

Both are methods: `def get(self):`. The status uses `self.name` and `self.speed` in one f-string.
</details>

<details markdown="block">
<summary>Solution</summary>

```python
def get(self):
    return self.speed

def status(self):
    return f'{self.name} at {self.speed}'
```
</details>

### 5.2 An intake with two motors

The real robot makes the right intake motor follow the left one (`controls.Follower`). Here you set both yourself:

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:Y2xhc3MgRmFrZU1vdG9yOgogICAgZGVmIF9faW5pdF9fKHNlbGYsIG5hbWUpOgogICAgICAgIHNlbGYubmFtZSA9IG5hbWUKICAgICAgICBzZWxmLnNwZWVkID0gMC4wCgogICAgZGVmIHNldChzZWxmLCBzcGVlZCk6CiAgICAgICAgc2VsZi5zcGVlZCA9IHNwZWVkCgpjbGFzcyBGYWtlSW50YWtlOgogICAgZGVmIF9faW5pdF9fKHNlbGYpOgogICAgICAgIHNlbGYubGVmdCA9IEZha2VNb3RvcignbGVmdCcpCiAgICAgICAgc2VsZi5yaWdodCA9IEZha2VNb3RvcigncmlnaHQnKQoKICAgIGRlZiBzZXRfc3BlZWQoc2VsZiwgc3BlZWQpOgogICAgICAgICMgUEFSVCBBOiBzZXQgYm90aCBtb3RvcnMgKHRoZSByZWFsIHJvYm90IHVzZXMgYSBGb2xsb3dlcikKICAgICAgICBwYXNzCgogICAgIyBQQVJUIEI6IGFkZCBhIG1ldGhvZCBzdG9wKHNlbGYpLiBTZXQgYm90aCBtb3RvcnMgdG8gMC4wCgoKIyB0ZXN0IHNjYWZmb2xkIChkbyBub3QgY2hhbmdlKQpkZWYgdHJpYWwoKToKICAgIGkgPSBGYWtlSW50YWtlKCkKICAgIHRyeToKICAgICAgICBpLnNldF9zcGVlZCgwLjg1KQogICAgZXhjZXB0IEV4Y2VwdGlvbjoKICAgICAgICBwYXNzCiAgICBkdXJpbmcgPSAoaS5sZWZ0LnNwZWVkLCBpLnJpZ2h0LnNwZWVkKQogICAgc3RvcCA9IGdldGF0dHIoaSwgJ3N0b3AnLCBOb25lKQogICAgaWYgc3RvcDoKICAgICAgICB0cnk6CiAgICAgICAgICAgIHN0b3AoKQogICAgICAgIGV4Y2VwdCBFeGNlcHRpb246CiAgICAgICAgICAgIHBhc3MKICAgIHJldHVybiBkdXJpbmcsIChpLmxlZnQuc3BlZWQsIGkucmlnaHQuc3BlZWQpCgpkdXJpbmcsIGFmdGVyID0gdHJpYWwoKQoKCiMgLS0tLS0gVEVTVFMgKGRvIG5vdCBjaGFuZ2UpIC0tLS0tCmRlZiBjaGVjayhuYW1lLCBmbik6CiAgICB0cnk6CiAgICAgICAgb2sgPSBib29sKGZuKCkpCiAgICBleGNlcHQgRXhjZXB0aW9uOgogICAgICAgIG9rID0gRmFsc2UKICAgIHByaW50KCgnUEFTUycgaWYgb2sgZWxzZSAnRkFJTCcpICsgJyAtICcgKyBuYW1lKQogICAgcmV0dXJuIG9rCgpzY29yZSA9IHN1bShbCiAgICBjaGVjaygnc2V0X3NwZWVkIHNwaW5zIHRoZSBsZWZ0IG1vdG9yJywgbGFtYmRhOiBkdXJpbmdbMF0gPT0gMC44NSksCiAgICBjaGVjaygnc2V0X3NwZWVkIHNwaW5zIHRoZSByaWdodCBtb3RvcicsIGxhbWJkYTogZHVyaW5nWzFdID09IDAuODUpLAogICAgY2hlY2soJ3N0b3AoKSBoYWx0cyBib3RoIG1vdG9ycycsIGxhbWJkYTogYWZ0ZXIgPT0gKDAuMCwgMC4wKSkKXSkKcHJpbnQoZidTQ09SRToge3Njb3JlfS8zJyk=" width="100%" height="660px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Hint</summary>

Call `.set(...)` on each motor. `stop` works because a speed of `0.0` means stopped.
</details>

<details markdown="block">
<summary>Solution</summary>

```python
def set_speed(self, speed):
    self.left.set(speed)
    self.right.set(speed)

def stop(self):
    self.left.set(0.0)
    self.right.set(0.0)
```

Notice the test scaffold saves the speeds before and after `stop`, so the tests can check both moments.
</details>

### 5.3 Inherit from Subsystem

Same class header as every subsystem file:

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:Y2xhc3MgU3Vic3lzdGVtOgogICAgZGVmIF9faW5pdF9fKHNlbGYsIG5hbWUpOgogICAgICAgIHNlbGYubmFtZSA9IG5hbWUKCmNsYXNzIEhvcHBlcihTdWJzeXN0ZW0pOgogICAgZGVmIF9faW5pdF9fKHNlbGYpOgogICAgICAgIHN1cGVyKCkuX19pbml0X18oJ2hvcHBlcicpICAjIHJ1biB0aGUgc2V0dXAgb2YgdGhlIHBhcmVudCBjbGFzcwogICAgICAgIHNlbGYucnVubmluZyA9IEZhbHNlCgogICAgZGVmIHN0YXJ0KHNlbGYpOgogICAgICAgIHNlbGYucnVubmluZyA9IFRydWUKCiAgICAjIFBBUlQgQTogYWRkIGEgbWV0aG9kIHN0b3Aoc2VsZikuIFNldCBzZWxmLnJ1bm5pbmcgPSBGYWxzZS4KCiAgICAjIFBBUlQgQjogYWRkIGEgbWV0aG9kIHRvZ2dsZShzZWxmKS4KICAgICMgU3dpdGNoIHJ1bm5pbmc6IFRydWUgYmVjb21lcyBGYWxzZSwgRmFsc2UgYmVjb21lcyBUcnVlLgoKCmggPSBIb3BwZXIoKQoKIyB0ZXN0IHNjYWZmb2xkIChkbyBub3QgY2hhbmdlKQpkZWYgcnVuX3N0YXRlcygpOgogICAgb3V0ID0gW10KICAgIGZvciBmbiBpbiAoaC5zdGFydCwgZ2V0YXR0cihoLCAnc3RvcCcsIE5vbmUpLAogICAgICAgICAgICAgICBnZXRhdHRyKGgsICd0b2dnbGUnLCBOb25lKSwgZ2V0YXR0cihoLCAndG9nZ2xlJywgTm9uZSkpOgogICAgICAgIHRyeToKICAgICAgICAgICAgaWYgZm46CiAgICAgICAgICAgICAgICBmbigpCiAgICAgICAgZXhjZXB0IEV4Y2VwdGlvbjoKICAgICAgICAgICAgcGFzcwogICAgICAgIG91dC5hcHBlbmQoaC5ydW5uaW5nKQogICAgcmV0dXJuIG91dAoKczEsIHMyLCBzMywgczQgPSBydW5fc3RhdGVzKCkKCgojIC0tLS0tIFRFU1RTIChkbyBub3QgY2hhbmdlKSAtLS0tLQpkZWYgY2hlY2sobmFtZSwgZm4pOgogICAgdHJ5OgogICAgICAgIG9rID0gYm9vbChmbigpKQogICAgZXhjZXB0IEV4Y2VwdGlvbjoKICAgICAgICBvayA9IEZhbHNlCiAgICBwcmludCgoJ1BBU1MnIGlmIG9rIGVsc2UgJ0ZBSUwnKSArICcgLSAnICsgbmFtZSkKICAgIHJldHVybiBvawoKc2NvcmUgPSBzdW0oWwogICAgY2hlY2soJ25hbWUgY29tZXMgZnJvbSBTdWJzeXN0ZW0nLCBsYW1iZGE6IGgubmFtZSA9PSAnaG9wcGVyJyksCiAgICBjaGVjaygnSG9wcGVyIGlzIGEgU3Vic3lzdGVtJywgbGFtYmRhOiBpc2luc3RhbmNlKGgsIFN1YnN5c3RlbSkpLAogICAgY2hlY2soJ3N0YXJ0LCBzdG9wLCB0b2dnbGUgd29yaycsIGxhbWJkYTogczEgaXMgVHJ1ZSBhbmQgczIgaXMgRmFsc2UgYW5kIHMzIGlzIFRydWUgYW5kIHM0IGlzIEZhbHNlKQpdKQpwcmludChmJ1NDT1JFOiB7c2NvcmV9LzMnKQ==" width="100%" height="620px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Hint</summary>

`self.running = not self.running` flips a bool in one step.
</details>

<details markdown="block">
<summary>Solution</summary>

```python
def stop(self):
    self.running = False

def toggle(self):
    self.running = not self.running
```

Why inherit? The `Subsystem` parent gives `periodic()`, command scheduling, and dashboard integration. `super().__init__(...)` runs the parent setup so all of that works. The `isinstance` test proves the parent-child link exists.
</details>

Next lesson: **6. RobotPy Patterns**.
