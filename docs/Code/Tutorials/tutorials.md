---
title: Tutorials
parent: Code
nav_order: 7
---

# Interactive Tutorials

## Start here

These three need no code, no computer and no keyboard. A phone is enough. Do
them in order.

1. [Give a Button a Job](../first-button) — a robot does what you tell it
2. [Put the Steps in Order](../first-sequence) — and nothing else
3. [Teach the Robot to Decide](../first-rule) — sensors and rules

## Then write some code

On these pages you write the code. The page then checks your answer.

The code operates in your browser with
[Pyodide](https://pyodide.org/){:target="_blank"}. Pyodide is a Python
interpreter compiled to WebAssembly. The page sends nothing to a server and
installs nothing. It saves your work on the computer that you use. Therefore
you can close the page and continue later.

{: .note }
> The first time you press **Run checks**, the browser downloads Python. The
> download is a few megabytes and needs some seconds. All the later runs start
> immediately.

## Available tutorials

Write Python and have it checked:

- [Joystick Deadbands](../joystick-deadband) — why a robot moves when nobody
  touches the controller, and how to correct it.
- [Unit Conversions](../unit-conversions) — encoder counts to metres per
  second, and how to find an inverse that is wrong.
- [Swerve Module Optimization](../swerve-module-optimization) — why a module
  never turns more than 90 degrees.

Tune a simulated mechanism:

- [How to Tune a Controller](../../Controls/tuning) — the method, and the function of each gain
- [How to Tune a Flywheel](../../Controls/tuning-flywheel) — velocity control
- [How to Tune an Arm](../../Controls/tuning-arm) — position control against gravity
- [How to Tune an Elevator](../../Controls/tuning-elevator) — position control, constant gravity

Drive a robot around:

- [Operator Interface](../../Controls/operator-interface) — write button
  bindings, then complete a scoring cycle with your keyboard
- [How to Plan an Auto](../../Autonomous/planning-an-auto) — draw paths and
  actions on a 2D field, and measure the duration

## Writing a tutorial

Tutorials are Markdown pages. Four includes are available:

| Include | What it gives you |
|:--------|:------------------|
| `interactive/python-exercise.html` | A Python editor with auto-checked exercises |
| `interactive/pid-sim.html` | A tunable mechanism with sliders and a live plot |
| `interactive/oi-task.html` | Button bindings driven from the keyboard |
| `interactive/auto-planner.html` | The autonomous path planner |
| `interactive/swerve-dial.html` | A swerve module dial |
| `interactive/first-bindings.html` | Tap a button, give it a job |
| `interactive/first-sequence.html` | Order a list of steps |
| `interactive/first-rule.html` | Build one sensor rule |

To drop a Python exercise into a page:

1. Add `_data/exercises/<your-id>.yml` describing the exercise.
2. Reference it from the page with `{% raw %}{% include interactive/python-exercise.html id="<your-id>" %}{% endraw %}`.

The YAML file looks like this:

```yaml
title: Ignore stick drift with a deadband
prompt: |
  Markdown shown above the editor.
starter: |
  def apply_deadband(value, deadband):
      return value
tests:
  - name: A resting stick is treated as zero
    code: |
      got = apply_deadband(0.03, 0.1)
      assert got == 0.0, f"got {got}, expected 0.0"
hints:
  - Shown one at a time when the student asks for help.
solution: |
  def apply_deadband(value, deadband):
      return 0.0 if abs(value) < deadband else value
```

Each check is a small Python program. It operates after the code that the
student writes. A check passes if it raises no exception.

**Put a message on every `assert`.** The student sees only that message.
Therefore the message must give the expected value and the actual value.



## The answers are locked

The **Show solution** buttons ask for a password. The answers are not in the
page: they are encrypted, and the password decrypts them in your browser. A
button that only hides the answer is not a lock, because the answer is still in
the page for anybody who opens the developer tools.

Ask a mentor for the password. A browser remembers it after the first time.

If you change a solution, encrypt it again:

```
CZ_ANSWER_PASSWORD='the password' node tools/lock-answers.js
```

`node tools/lock-answers.js --check` tells you whether you need to. It needs no
password.

{: .note }
> This keeps the answers off the website. It does not keep them off GitHub: the
> exercise files in `_data/exercises/` still hold them, because the checking
> tools grade with them, and this repository is public.

## When these are too easy

The [Challenges](../../Challenges/challenges) are the same ideas without the
training wheels. Every one of them is a problem this team has really had, and
in every one the obvious answer fails.

## How to check your work

Run these before you open a pull request. They need no installation except
PyYAML for the first one.

| Command | What it checks |
|:--------|:---------------|
| `python3 tools/validate-exercises.py` | Every exercise. The solution must pass all its checks, the starter must fail at least one, and every assert must carry a message |
| `node tools/validate-tuning.js` | Every gain quoted on a tuning page. Each one must be reachable on its slider and must pass at every setpoint |
| `node tools/validate-auto-task.js` | The autonomous task is possible, and a routine with its actions in series is not |
| `node tools/validate-swerve.js` | The swerve maths on the wiki agrees with `ctre_module_state.py` on the robot |
| `node tools/validate-rule.js` | Every rule a student can build in tutorial 3. Each sensor that can work has an unbroken band of values that pass, and every failure gives a reason |
| `python3 tools/validate-jam.py` | The jam-detector challenge. No fixed threshold can pass it, and the intended answer can |
| `python3 tools/validate-shoot.py` | The shoot-on-the-fly challenge. Measures how close each number of corrections gets |
| `python3 tools/validate-vision.py` | The vision challenge. Only an answer that rewinds to the moment of the picture passes |
| `python3 tools/validate-swerve2.py` | The second-order swerve challenge, including the case that divides by zero |
| `node tools/check-ste.js` | Sentence length, paragraph length and word use on the tutorial pages |
| `node tools/lock-answers.js --check` | Every answer has an up-to-date encrypted copy |
| `node tools/lock-answers.js --audit` | No answer reached the built site. Build first |

If you change the JavaScript in `assets/js/interactive/`, also run the browser
tests. They open the widgets in a real browser and use them. They need
Playwright, which is a larger installation, so see
[`tools/e2e/README.md`](https://github.com/CtrlZ-FRC4096/Wiki/blob/main/tools/e2e/README.md).

To see a page before you push it, build the site and open it:

```
bundle exec jekyll serve
```

Then go to `localhost:4000`.
