# Browser tests

These tests open the interactive widgets in a real browser and use them. They
check what a student would see: that an exercise rejects wrong code, that a
tuning simulator grades a tuning, that the autonomous task can be completed.

**You do not need these to write a tutorial.** If you only add Markdown and
YAML, run the checks on the
[Tutorials page](../../docs/Code/Tutorials/tutorials.md) instead. Those need no
installation.

Use these when you change the JavaScript in `assets/js/interactive/`.

## Install

```
cd tools/e2e
npm run setup
```

This installs Playwright and downloads a copy of Chromium, which is
approximately 115 MB. Chromium is the only browser needed: the phone tests set
a phone viewport rather than using a device preset, because the presets for
real phones ask for WebKit. It goes in `tools/e2e/node_modules/` and is ignored by
git.

## Run

Build the site first. The tests serve `_site`, they do not build it.

```
bundle exec jekyll build
cd tools/e2e
npm test
```

To watch the browser while it works:

```
npm run test:headed
```

To see the report for a failed run, with a trace of every step:

```
npm run report
```

## What each file covers

| File | Covers |
|:-----|:-------|
| `pages.spec.mjs` | Every tutorial page loads, carries its widgets, does not scroll sideways, and has no broken links |
| `exercises.spec.mjs` | Each Python exercise rejects wrong code and accepts its own published solution. A loop that never ends is stopped. Work is kept across a reload |
| `tuning.spec.mjs` | Each simulator rejects all-zero gains and accepts its published gains. Each Isolate mode changes what runs and greys the right sliders |
| `operator-interface.spec.mjs` | A syntax error is reported. The bindings complete a full scoring cycle. Reset robot keeps the bindings |
| `auto-planner.spec.mjs` | The objective is reachable, a straight line hits a barrier, and the start pose cannot be moved |
| `swerve-dial.spec.mjs` | The dial reports the same values as the maths in `swerve-core.js` |
| `first-tutorials.spec.mjs` | The three beginner tutorials, at a phone size with touch on. Every control is at least 44px, nothing needs typing, and each exercise passes on the right answer and explains the wrong one |

## How these tests are written

Two rules keep them useful:

- **Take the expected values from the source, not from a copy.** The tuning
  tests read the reference gains out of `mechanism-sim.js`. The exercise tests
  read each solution out of its own YAML file. If someone retunes a plant, the
  tests follow it instead of failing on a stale number.
- **Do not sample an animation and compare pixels.** It looks like a strong
  check and is not: under load two samples land on the same frame and the test
  fails for no reason. Compare something that does not depend on timing. The
  tuning tests check the model and the text on the page instead.
- **Assert on behaviour, not on appearance.** A widget can add a CSS class and
  still do nothing. One of these tests exists because a control set its class,
  greyed its sliders, and then threw before it changed anything. The test
  passed. Check that the plot changed, not that the button looks pressed.

## Running them in CI

`.github/workflows/ci.yml` builds the site but does not run these. To add them,
put a step after the build:

```yaml
- name: Browser tests
  working-directory: tools/e2e
  run: |
    npm ci
    npx playwright install --with-deps chromium
    npm test
```

That adds a Chromium download to every run, so decide whether the time is worth
it for your pull requests.
