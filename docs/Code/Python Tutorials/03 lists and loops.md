---
title: 3. Lists and Loops
parent: Python Tutorials
nav_order: 3
---

# 3. Lists and Loops

Store many values in order. Do the same thing to all of them without copy-pasting.

## Summary

A list keeps values in order:

```python
currents = [38.2, 41.0, 39.5, 31.4]
```

Tools for lists:

- Read one value with an **index**. Indexes start at 0: `currents[0]` is `38.2`.
- `currents[-1]` reads the last value: `31.4`.
- An index that is too big gives an `IndexError`.
- `len(currents)` gives the count: `4`.
- `currents.append(40.1)` adds a value to the end.

A loop visits each value:

```python
for c in currents:                  # each value in the list
    print(c)

for i in range(4):                  # i = 0, 1, 2, 3
    print(i)

for i, c in enumerate(currents):    # index and value together
    print(f'module {i}: {c} A')

tick = 0
while tick < 100:                   # repeats while the condition is true
    tick += 1
```

Which one to use:

- `for x in list`: you need the values. Most common.
- `for i in range(n)`: you need to count, or index into the list.
- `for i, x in enumerate(list)`: you need the index and the value.
- `while`: you do not know how many repeats. Be careful: a wrong condition loops forever.
- `break` inside a loop exits it at once.

{: .note }
In robot code, do not use a bare `while` to wait for time to pass. The robot runs its loop 50 times per second, and a blocking `while` stops all of it. Waiting uses coroutines with `yield` (lesson 6).

## In our robot code

`robot/robot.py` registers every subsystem with one loop instead of copy-pasted lines:

```python
self.subsystems = [
    self.drivetrain, self.poseEstimator,
    self.intake, self.shooter, self.hopper,
]
for subsystem in self.subsystems:
    self.scheduler.registerSubsystem(subsystem)
```

The hopper fuel simulation uses `range`:

```python
for fuel_num in range(1, self.max_fuel_in_hopper + 1):
    ...
```

## Try it

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:c3Vic3lzdGVtcyA9IFsnZHJpdmV0cmFpbicsICdzaG9vdGVyJywgJ2ludGFrZScsICdob3BwZXInXQoKZm9yIHMgaW4gc3Vic3lzdGVtczoKICAgIHByaW50KGYncmVnaXN0ZXJpbmcge3N9JykKCmZvciBpLCBzIGluIGVudW1lcmF0ZShzdWJzeXN0ZW1zKToKICAgIHByaW50KGYnbW9kdWxlIHtpfToge3N9Jyk=" width="100%" height="340px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

## Exercises

Every exercise ends with tests. Run the code until every line prints **PASS**.

### 3.1 Total current and hot modules

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:Y3VycmVudHMgPSBbMzguMiwgNDEuMCwgMzkuNSwgMzEuNF0gICMgYW1wcywgb25lIHBlciBzd2VydmUgbW9kdWxlCgojIFBBUlQgQTogYWRkIGFsbCBjdXJyZW50cyBpbnRvIHRvdGFsIHdpdGggYSBmb3IgbG9vcC4gRG8gbm90IHVzZSBzdW0oKS4KdG90YWwgPSAwLjAKCiMgUEFSVCBCOiBjb3VudCB0aGUgbW9kdWxlcyB0aGF0IHVzZSBtb3JlIHRoYW4gNDAgYW1wcwpob3RfY291bnQgPSAwCgoKIyAtLS0tLSBURVNUUyAoZG8gbm90IGNoYW5nZSkgLS0tLS0KZGVmIGNoZWNrKG5hbWUsIGZuKToKICAgIHRyeToKICAgICAgICBvayA9IGJvb2woZm4oKSkKICAgIGV4Y2VwdCBFeGNlcHRpb246CiAgICAgICAgb2sgPSBGYWxzZQogICAgcHJpbnQoKCdQQVNTJyBpZiBvayBlbHNlICdGQUlMJykgKyAnIC0gJyArIG5hbWUpCiAgICByZXR1cm4gb2sKCnNjb3JlID0gc3VtKFsKICAgIGNoZWNrKCd0b3RhbCBjdXJyZW50IGlzIGFib3V0IDE1MC4xJywgbGFtYmRhOiBhYnModG90YWwgLSAxNTAuMSkgPCAwLjAwMSksCiAgICBjaGVjaygnb25lIG1vZHVsZSBhYm92ZSA0MCBBJywgbGFtYmRhOiBob3RfY291bnQgPT0gMSkKXSkKcHJpbnQoZidTQ09SRToge3Njb3JlfS8yJyk=" width="100%" height="420px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Hint</summary>

Loop with `for c in currents:`. Part A adds with `total += c`. Part B puts an `if` inside a loop.
</details>

<details markdown="block">
<summary>Solution</summary>

```python
total = 0.0
for c in currents:
    total += c

hot_count = 0
for c in currents:
    if c > 40:
        hot_count += 1
```
</details>

### 3.2 Find the module with the most current

A swerve module that draws much more current than the others often has a mechanical problem.

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:Y3VycmVudHMgPSBbMzguMiwgNDEuMCwgMzkuNSwgMzEuNF0KCiMgUEFSVCBBOiBzZXQgYmVzdF9pbmRleCB0byB0aGUgaW5kZXggb2YgdGhlIG1vZHVsZSB3aXRoIHRoZSBtb3N0IGN1cnJlbnQuCmJlc3RfaW5kZXggPSAtMSAgIyBGSVggVEhJUwoKIyBQQVJUIEI6IHNldCBiZXN0X2N1cnJlbnQgdG8gdGhhdCBtb2R1bGUncyBjdXJyZW50LgpiZXN0X2N1cnJlbnQgPSAwLjAgICMgRklYIFRISVMKCgojIC0tLS0tIFRFU1RTIChkbyBub3QgY2hhbmdlKSAtLS0tLQpkZWYgY2hlY2sobmFtZSwgZm4pOgogICAgdHJ5OgogICAgICAgIG9rID0gYm9vbChmbigpKQogICAgZXhjZXB0IEV4Y2VwdGlvbjoKICAgICAgICBvayA9IEZhbHNlCiAgICBwcmludCgoJ1BBU1MnIGlmIG9rIGVsc2UgJ0ZBSUwnKSArICcgLSAnICsgbmFtZSkKICAgIHJldHVybiBvawoKc2NvcmUgPSBzdW0oWwogICAgY2hlY2soJ2Jlc3QgbW9kdWxlIGlzIGluZGV4IDEnLCBsYW1iZGE6IGJlc3RfaW5kZXggPT0gMSksCiAgICBjaGVjaygnaXRzIGN1cnJlbnQgaXMgNDEuMCBBJywgbGFtYmRhOiBhYnMoYmVzdF9jdXJyZW50IC0gNDEuMCkgPCAwLjAwMSkKXSkKcHJpbnQoZidTQ09SRToge3Njb3JlfS8yJyk=" width="100%" height="420px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Hint</summary>

Start with `best_index = 0`. Loop with `enumerate`. When a current is bigger than `currents[best_index]`, save that index.
</details>

<details markdown="block">
<summary>Solution</summary>

```python
best_index = 0
for i, c in enumerate(currents):
    if c > currents[best_index]:
        best_index = i

best_current = currents[best_index]
```

A shortcut exists: `currents.index(max(currents))`. Do it by hand once first so you know what is inside.
</details>

### 3.3 Count robot frames

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:IyBPbmUgcm9ib3QgZnJhbWUgaXMgMjAgbXMuCnRpY2sgPSAwCgojIFBBUlQgQTogY291bnQgdGljayB1cCB0byAxMDAgd2l0aCBhIHdoaWxlIGxvb3AuCgoKIyBQQVJUIEI6IHNldCBzZWNvbmRzIHRvIHRpY2sgKiAwLjAyCnNlY29uZHMgPSAwLjAgICMgRklYIFRISVMKCgojIC0tLS0tIFRFU1RTIChkbyBub3QgY2hhbmdlKSAtLS0tLQpkZWYgY2hlY2sobmFtZSwgZm4pOgogICAgdHJ5OgogICAgICAgIG9rID0gYm9vbChmbigpKQogICAgZXhjZXB0IEV4Y2VwdGlvbjoKICAgICAgICBvayA9IEZhbHNlCiAgICBwcmludCgoJ1BBU1MnIGlmIG9rIGVsc2UgJ0ZBSUwnKSArICcgLSAnICsgbmFtZSkKICAgIHJldHVybiBvawoKc2NvcmUgPSBzdW0oWwogICAgY2hlY2soJ3RpY2sgc3RvcHMgYXQgMTAwJywgbGFtYmRhOiB0aWNrID09IDEwMCksCiAgICBjaGVjaygnMTAwIHRpY2tzIGlzIDIgc2Vjb25kcycsIGxhbWJkYTogYWJzKHNlY29uZHMgLSAyLjApIDwgMC4wMDEpCl0pCnByaW50KGYnU0NPUkU6IHtzY29yZX0vMicp" width="100%" height="420px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Hint</summary>

`while tick < 100:` for part A. Part B is one multiply, after the loop.
</details>

<details markdown="block">
<summary>Solution</summary>

```python
while tick < 100:
    tick += 1

seconds = tick * 0.02
```
</details>

Next lesson: **4. Functions**.
