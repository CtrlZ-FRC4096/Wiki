/*
 * Ctrl-Z Wiki — autonomous routine planner (widget).
 *
 * Draws the field, handles waypoint editing, plays a match back and reports
 * against the objective over twenty matches. All the maths lives in
 * auto-core.js.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "czwiki.autoplanner.v4";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* ---------------- widget ---------------- */

  function setup(root) {
    var CZField = window.CZField;
    var A = window.CZAuto;
    var LOAD = A.LOAD, GOAL = A.GOAL, START = A.START, SHOT_RANGE = A.SHOT_RANGE, BARRIERS = A.BARRIERS, ACTIONS = A.ACTIONS;
    var TARGET_SCORE = A.TARGET_SCORE, TIME_LIMIT = A.TIME_LIMIT;
    var INTAKE_SECONDS = A.INTAKE_SECONDS, READY_SPEED = A.READY_SPEED;
    var actionById = A.actionById, inZone = A.inZone, robotHitsBox = A.robotHitsBox;
    var parallelOf = A.parallelOf, buildTimeline = A.buildTimeline, inShotRange = A.inShotRange, rangeToGoal = A.rangeToGoal;
    var poseAtTime = A.poseAtTime, simulateRoutine = A.simulateRoutine, reliability = A.reliability;
    var stateAtTime = A.stateAtTime, toPython = A.toPython, deg2rad = A.deg2rad;
    var PHYSICS = A.PHYSICS, TAGS = A.TAGS, MATCHES = A.MATCHES, MATCHES_NEEDED = A.MATCHES_NEEDED;
    var GRIP = PHYSICS.wheelCof * A.GRAVITY;
    var canvas = root.querySelector(".cz-auto__canvas");
    var stepsBox = root.querySelector(".cz-auto__steps");
    var codeBox = root.querySelector(".cz-auto__code");
    var clockLabel = root.querySelector(".cz-auto__clock");
    var hud = root.querySelector(".cz-auto__hud");
    var stripBox = root.querySelector(".cz-auto__strip");
    var output = root.querySelector(".cz-auto__output");
    var chart = root.querySelector(".cz-auto__chart");
    var matchGrid = root.querySelector(".cz-auto__match-grid");
    var matchSummary = root.querySelector(".cz-auto__matches-summary");
    var matchNote = root.querySelector(".cz-auto__match-note");
    var view = new CZField.FieldView(canvas);

    // Enough of a routine to see how the pieces fit, and not enough to finish
    // the task — the second half is the exercise.
    var DEFAULT = {
      name: "wiki_auto",
      startPose: { x: START.x, y: START.y, heading: START.heading },
      steps: [
        { kind: "path", waypoints: [{ x: 4.6, y: 3.0 }], endHeading: 0, parallel: ["spin_up_shooter"] }
      ]
    };

    // Gentle limits to start: the routine works, but too slowly. Finding
    // how far they can go up is the other half of the exercise.
    var DEFAULT_LIMITS = { maxV: 3.0, maxA: 3.0 };

    var routine = JSON.parse(JSON.stringify(DEFAULT));
    var limits = { maxV: DEFAULT_LIMITS.maxV, maxA: DEFAULT_LIMITS.maxA };
    var selected = 0;
    var playing = false;
    var playhead = 0;
    var timeline = null;
    var result = null;      // the match being shown, traced moment by moment
    var matches = null;     // all twenty matches, summarised
    var matchSeed = 1;
    var matchesTimer = null;
    var dragging = null;

    try {
      var saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && saved.routine) { routine = saved.routine; limits = saved.limits || limits; }
      routine.startPose = { x: START.x, y: START.y, heading: START.heading };
    } catch (e) { /* nothing saved */ }

    function persist() {
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ routine: routine, limits: limits })); }
      catch (e) { /* ignore */ }
    }

    /* Rebuild the plan and re-run the match being watched. The other
       nineteen matches wait until editing pauses, so dragging stays smooth. */
    function rebuild(soon) {
      timeline = buildTimeline(routine, limits);
      result = simulateRoutine(timeline, CZField.ROBOT, { seed: matchSeed });
      codeBox.textContent = toPython(routine, limits);
      renderSteps();
      renderStrip();
      persist();
      window.clearTimeout(matchesTimer);
      matchGrid.classList.add("is-stale");
      matchesTimer = window.setTimeout(runMatches, soon ? 250 : 0);
    }

    function runMatches() {
      window.clearTimeout(matchesTimer);
      matches = reliability(timeline, CZField.ROBOT, MATCHES);
      renderMatches();
    }

    function showMatch(seed, play) {
      matchSeed = seed;
      result = simulateRoutine(timeline, CZField.ROBOT, { seed: matchSeed });
      playhead = 0;
      playing = Boolean(play);
      playBtn.textContent = playing ? "Pause" : "Run routine";
      renderMatches();
    }

    /* ---- step list ---- */

    function renderSteps() {
      stepsBox.innerHTML = "";

      var startRow = el("div", "cz-auto__step cz-auto__step--start");
      startRow.appendChild(el("span", "cz-auto__step-kind", "start"));
      startRow.appendChild(el("span", "cz-auto__step-body",
        routine.startPose.x.toFixed(2) + ", " + routine.startPose.y.toFixed(2) + " m facing " +
        routine.startPose.heading + "° — set by the task"));
      stepsBox.appendChild(startRow);

      routine.steps.forEach(function (step, index) {
        var row = el("div", "cz-auto__step" + (index === selected ? " is-selected" : ""));
        row.addEventListener("click", function (e) {
          var tag = e.target.tagName;
          if (tag === "INPUT" || tag === "SELECT" || tag === "BUTTON") return;
          selected = index;
          renderSteps();
        });

        var timing = timeline ? timeline.entries[index] : null;
        row.appendChild(el("span", "cz-auto__step-kind is-" + step.kind, labelFor(step)));

        var body = el("span", "cz-auto__step-body");
        if (step.kind === "path") {
          body.appendChild(document.createTextNode(step.waypoints.length + " waypoint" +
            (step.waypoints.length === 1 ? "" : "s") + ", ends facing "));
          body.appendChild(numberInput(step.endHeading, -180, 180, 15, function (v) { step.endHeading = v; rebuild(); }));
          body.appendChild(document.createTextNode("°"));
          body.appendChild(parallelPicker(step));
        } else if (step.kind === "driveTo") {
          body.appendChild(document.createTextNode(
            step.pose.x.toFixed(2) + ", " + step.pose.y.toFixed(2) + " m facing "));
          body.appendChild(numberInput(step.pose.heading, -180, 180, 15, function (v) { step.pose.heading = v; rebuild(); }));
          body.appendChild(document.createTextNode("° timeout "));
          body.appendChild(numberInput(step.timeout, 0.2, 10, 0.1, function (v) { step.timeout = v; rebuild(); }));
          body.appendChild(document.createTextNode(" s"));
          body.appendChild(parallelPicker(step));
        } else if (step.kind === "action") {
          body.appendChild(selectInput(ACTIONS.map(function (a) { return { value: a.id, label: a.label }; }),
            step.action, function (v) { step.action = v; rebuild(); }));
          body.appendChild(document.createTextNode(" for "));
          body.appendChild(numberInput(step.timeout, 0.1, 10, 0.1, function (v) { step.timeout = v; rebuild(); }));
          body.appendChild(document.createTextNode(" s"));
        } else if (step.kind === "wait") {
          body.appendChild(numberInput(step.seconds, 0, 10, 0.1, function (v) { step.seconds = v; rebuild(); }));
          body.appendChild(document.createTextNode(" s"));
        }
        row.appendChild(body);

        if (timing) row.appendChild(el("span", "cz-auto__step-time", timing.duration.toFixed(1) + " s"));

        var tools = el("span", "cz-auto__step-tools");
        tools.appendChild(iconButton("↑", "Move earlier", function () { move(index, -1); }));
        tools.appendChild(iconButton("↓", "Move later", function () { move(index, 1); }));
        tools.appendChild(iconButton("✕", "Delete this step", function () {
          routine.steps.splice(index, 1);
          selected = Math.max(0, Math.min(selected, routine.steps.length - 1));
          rebuild();
        }));
        row.appendChild(tools);
        stepsBox.appendChild(row);
      });

      var total = timeline ? timeline.duration : 0;
      var totalRow = el("div", "cz-auto__step cz-auto__step--total");
      totalRow.appendChild(el("span", "cz-auto__step-kind", "total"));
      var over = total > TIME_LIMIT;
      totalRow.appendChild(el("span", "cz-auto__step-body" + (over ? " is-over" : ""),
        total.toFixed(1) + " s" + (over ? " — over the " + TIME_LIMIT + " second autonomous period" : "")));
      stepsBox.appendChild(totalRow);
    }

    /* Actions that run alongside a drive. Chips rather than a dropdown,
       because more than one can run at once. */
    function parallelPicker(step) {
      var wrap = el("span", "cz-auto__parallel");
      wrap.appendChild(el("span", "cz-auto__parallel-label", "alongside:"));
      var current = parallelOf(step);
      ACTIONS.forEach(function (action) {
        var on = current.indexOf(action.id) !== -1;
        var chip = el("button", "cz-auto__chip" + (on ? " is-on" : ""), action.label);
        chip.type = "button";
        chip.style.setProperty("--chip", action.colour);
        chip.addEventListener("click", function (e) {
          e.stopPropagation();
          var list = parallelOf(step);
          var at = list.indexOf(action.id);
          if (at === -1) list.push(action.id); else list.splice(at, 1);
          step.parallel = list;
          rebuild();
        });
        wrap.appendChild(chip);
      });
      return wrap;
    }

    function labelFor(step) {
      if (step.kind === "path") return "path";
      if (step.kind === "driveTo") return "drive to";
      return step.kind;
    }

    function move(index, delta) {
      var target = index + delta;
      if (target < 0 || target >= routine.steps.length) return;
      var tmp = routine.steps[index];
      routine.steps[index] = routine.steps[target];
      routine.steps[target] = tmp;
      selected = target;
      rebuild();
    }

    function numberInput(value, min, max, step, onChange) {
      var input = document.createElement("input");
      input.type = "number";
      input.className = "cz-auto__num";
      input.value = value;
      input.min = min; input.max = max; input.step = step;
      input.addEventListener("change", function () { onChange(parseFloat(input.value)); });
      return input;
    }

    function selectInput(options, value, onChange) {
      var select = document.createElement("select");
      select.className = "cz-auto__select";
      options.forEach(function (o) {
        var opt = document.createElement("option");
        opt.value = o.value;
        opt.textContent = o.label;
        if (o.value === value) opt.selected = true;
        select.appendChild(opt);
      });
      select.addEventListener("change", function () { onChange(select.value); });
      return select;
    }

    function iconButton(glyph, title, onClick) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "cz-auto__icon";
      b.title = title;
      b.textContent = glyph;
      b.addEventListener("click", function (e) { e.stopPropagation(); onClick(); });
      return b;
    }

    /* ---- timeline strip: the whole routine at a glance ---- */

    function renderStrip() {
      stripBox.innerHTML = "";
      if (!timeline.duration) return;
      var span = Math.max(timeline.duration, TIME_LIMIT);

      timeline.entries.forEach(function (entry, index) {
        if (entry.duration <= 0) return;
        var seg = el("div", "cz-auto__seg is-" + entry.kind + (index === selected ? " is-selected" : ""));
        seg.style.width = (entry.duration / span) * 100 + "%";
        seg.title = labelFor(routine.steps[index]) + " — " + entry.duration.toFixed(1) + " s" +
          (entry.parallel.length ? " with " + entry.parallel.join(", ") : "");
        entry.parallel.forEach(function (id) {
          var pip = el("span", "cz-auto__pip");
          pip.style.background = actionById(id).colour;
          seg.appendChild(pip);
        });
        seg.addEventListener("click", function () { selected = index; renderSteps(); renderStrip(); });
        stripBox.appendChild(seg);
      });

      if (timeline.duration < span) {
        var slack = el("div", "cz-auto__seg is-slack");
        slack.style.width = ((span - timeline.duration) / span) * 100 + "%";
        slack.title = (span - timeline.duration).toFixed(1) + " s left in the period";
        stripBox.appendChild(slack);
      }

      var head = el("div", "cz-auto__playhead");
      head.style.left = (playhead / span) * 100 + "%";
      stripBox.appendChild(head);
      stripBox.__span = span;
      stripBox.__head = head;
    }

    /* ---- twenty matches ---- */

    // Each match gets its own carpet and its own camera noise, so the same
    // routine can work in one and fail in the next.
    function whyFailed(run) {
      if (timeline.duration > TIME_LIMIT) return "over " + TIME_LIMIT + " s";
      if (run.collided) return "hit barrier " + run.collided;
      if (!run.picked) return "no fuel collected";
      if (run.misses.length) return "missed: " + run.misses[0].why;
      return "scored " + run.score + " of " + TARGET_SCORE;
    }

    function renderMatches() {
      matchGrid.innerHTML = "";
      matchGrid.classList.remove("is-stale");
      if (!matches) return;
      matches.runs.forEach(function (run) {
        var b = el("button", "cz-auto__match " + (run.ok ? "is-pass" : "is-fail") +
          (run.seed === matchSeed ? " is-shown" : ""), String(run.seed));
        b.type = "button";
        b.title = "Match " + run.seed + ": " + (run.ok ? "works" : whyFailed(run));
        b.setAttribute("aria-label", b.title);
        b.addEventListener("click", function () { showMatch(run.seed, true); });
        matchGrid.appendChild(b);
      });
      var enough = matches.passed >= MATCHES_NEEDED;
      matchSummary.textContent = "works in " + matches.passed + " of " + matches.matches +
        " (needs " + MATCHES_NEEDED + ")";
      matchSummary.className = "cz-auto__matches-summary " + (enough ? "is-pass" : "is-fail");

      var r = result;
      var outcome = r.ok ? "It works."
        : timeline.duration > TIME_LIMIT ? "The routine is too long."
        : r.collided ? "It hits barrier " + r.collisionWith + " at " + r.collisionAt.toFixed(1) + " s."
        : !r.picked ? "It collects no fuel."
        : r.misses.length ? "It misses: " + r.misses[0].why + "."
        : "It scores " + r.score + ".";
      matchNote.textContent = "Match " + matchSeed + ": the carpet grips up to " + r.grip.toFixed(1) +
        " m/s². The wheels slipped for " + r.slipSeconds.toFixed(1) + " s, and odometry was off by up to " +
        Math.round(r.worstError * 100) + " cm. " + outcome;
    }

    /* ---- toolbar ---- */

    root.querySelector('[data-action="add-path"]').addEventListener("click", function () {
      routine.steps.push({ kind: "path", waypoints: [], endHeading: 0, parallel: [] });
      selected = routine.steps.length - 1;
      rebuild();
    });
    root.querySelector('[data-action="add-action"]').addEventListener("click", function () {
      routine.steps.push({ kind: "action", action: "shoot", timeout: 0.6 });
      selected = routine.steps.length - 1;
      rebuild();
    });
    root.querySelector('[data-action="add-wait"]').addEventListener("click", function () {
      routine.steps.push({ kind: "wait", seconds: 0.5 });
      selected = routine.steps.length - 1;
      rebuild();
    });
    root.querySelector('[data-action="add-driveto"]').addEventListener("click", function () {
      var last = timeline && timeline.entries.length
        ? timeline.entries[timeline.entries.length - 1].to : routine.startPose;
      routine.steps.push({
        kind: "driveTo",
        pose: { x: Math.min(CZField.FIELD.length - 1, last.x + 1.5), y: last.y, heading: 0 },
        timeout: 2.0,
        parallel: []
      });
      selected = routine.steps.length - 1;
      rebuild();
    });

    var playBtn = root.querySelector('[data-action="play"]');
    playBtn.addEventListener("click", function () {
      if (playhead >= timeline.duration) playhead = 0;
      playing = !playing;
      playBtn.textContent = playing ? "Pause" : "Run routine";
    });

    root.querySelector('[data-action="clear"]').addEventListener("click", function () {
      if (!window.confirm("Reset the routine to the default? Your steps are then lost.")) return;
      routine = JSON.parse(JSON.stringify(DEFAULT));
      limits = { maxV: DEFAULT_LIMITS.maxV, maxA: DEFAULT_LIMITS.maxA };
      showLimits();
      selected = 0;
      playhead = 0;
      output.innerHTML = "";
      rebuild();
    });

    root.querySelector('[data-action="copy"]').addEventListener("click", function () {
      var button = root.querySelector('[data-action="copy"]');
      function done(text) {
        button.textContent = text;
        window.setTimeout(function () { button.textContent = "Copy Python"; }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(codeBox.textContent).then(function () { done("Copied"); }, function () { done("Select and copy"); });
      } else {
        done("Select and copy");
      }
    });

    /* What to change, given how the routine fails. */
    function adviceFor(m) {
      var tips = [];
      var plan = simulateRoutine(timeline, CZField.ROBOT, { ideal: true, trace: false });
      if (plan.collided) {
        tips.push("The planned path itself touches barrier " + plan.collisionWith + ". Move a waypoint to give it more room.");
      }
      if (limits.maxV > PHYSICS.topSpeed) {
        tips.push("Max speed is above the " + PHYSICS.topSpeed + " m/s the drive motors can reach. The robot falls behind the plan, then cuts corners to catch up.");
      }
      if (m.slipped > MATCHES - MATCHES_NEEDED) {
        tips.push("The wheels slipped in " + m.slipped + " matches. Speeding up, slowing down and turning all share the grip of the wheels. Ask for more than " +
          GRIP.toFixed(1) + " m/s² in total and the robot slides wide, and odometry loses track. Lower max acceleration.");
      }
      var missedBy = function (kind) {
        return m.runs.filter(function (r) { return r.misses.some(function (x) { return x.kind === kind; }); }).length;
      };
      if (missedBy("moving")) {
        tips.push("In " + missedBy("moving") + " matches a shot was taken while the robot was still moving, so the robot carried it off line. " +
          "The robot had not caught up with the plan when the path ended. A short wait before Shoot lets it settle, but costs time.");
      }
      if (missedBy("aim")) {
        tips.push("In " + missedBy("aim") + " matches a shot was aimed from the wrong place. The robot aims by where it thinks it is, " +
          "and slipping wheels and a blurred camera make that wrong.");
      }
      return tips;
    }

    function countLine(failed, what) {
      return what + " in " + failed + " of " + matches.matches + " matches (no more than " + (MATCHES - MATCHES_NEEDED) + " allowed).";
    }

    root.querySelector('[data-action="check"]').addEventListener("click", function () {
      if (!matches || matchGrid.classList.contains("is-stale")) runMatches();
      var m = matches;
      var allowed = MATCHES - MATCHES_NEEDED;
      var firstFail = function (test) {
        for (var i = 0; i < m.runs.length; i++) if (test(m.runs[i])) return m.runs[i].seed;
        return null;
      };
      var hitIn = firstFail(function (r) { return r.collided; });
      var missIn = firstFail(function (r) { return r.score < TARGET_SCORE; });
      var commonMiss = null, most = 0;
      Object.keys(m.missKinds).forEach(function (k) { if (m.missKinds[k] > most) { most = m.missKinds[k]; commonMiss = k; } });
      var missExample = null;
      m.runs.some(function (r) {
        return r.misses.some(function (x) { if (x.kind === commonMiss) { missExample = x.why; return true; } return false; });
      });
      var hitWhich = Object.keys(m.hits).join(" and ");

      var checks = [
        {
          name: "The routine is less than " + TIME_LIMIT + " seconds",
          ok: timeline.duration <= TIME_LIMIT,
          why: "This routine is " + timeline.duration.toFixed(1) + " s. Move the actions into the paths, " +
            "or raise max speed or max acceleration."
        },
        {
          name: "The robot does not touch a barrier",
          ok: m.collided <= allowed,
          why: countLine(m.collided, "It touches barrier " + hitWhich) + (hitIn ? " Watch match " + hitIn + "." : "")
        },
        {
          name: "The robot collects fuel at the LOAD zone",
          ok: m.noPickup <= allowed,
          why: countLine(m.noPickup, "It collects no fuel") + " Select Intake on the path that ends in the LOAD zone, or add an intake step there. " +
            "The robot must be inside the zone for " + INTAKE_SECONDS + " s."
        },
        {
          name: "The robot scores " + TARGET_SCORE + " pieces",
          ok: m.missedShots <= allowed,
          why: countLine(m.missedShots, "It scores fewer than " + TARGET_SCORE) +
            (missExample ? " Most often: " + missExample + "." : " A shoot step only counts within " + SHOT_RANGE + " m of the goal, holding fuel, with the shooter spun up.") +
            (missIn ? " Watch match " + missIn + "." : "")
        },
        {
          name: "It works in at least " + MATCHES_NEEDED + " of " + MATCHES + " matches",
          ok: m.passed >= MATCHES_NEEDED,
          why: "It works in " + m.passed + ". Click a red match above to watch it fail."
        }
      ];

      output.innerHTML = "";
      var list = el("ul", "cz-exercise__checks");
      var allOk = true;
      checks.forEach(function (c) {
        if (!c.ok) allOk = false;
        var item = el("li", "cz-exercise__check " + (c.ok ? "is-pass" : "is-fail"));
        item.appendChild(el("span", "cz-exercise__check-icon", c.ok ? "✓" : "✗"));
        var body = el("span", "cz-exercise__check-body");
        body.appendChild(el("span", "cz-exercise__check-name", c.name));
        if (!c.ok) body.appendChild(el("span", "cz-exercise__check-message", c.why));
        item.appendChild(body);
        list.appendChild(item);
      });
      output.appendChild(list);

      var tips = timeline.duration <= TIME_LIMIT ? adviceFor(m) : [];
      if (tips.length && (!allOk || m.passed < MATCHES)) {
        var advice = el("ul", "cz-auto__advice");
        tips.forEach(function (t) { advice.appendChild(el("li", "", t)); });
        output.appendChild(advice);
      }

      output.appendChild(el("p", "cz-exercise__verdict " + (allOk ? "is-pass" : "is-fail"),
        allOk ? "The routine works in " + m.passed + " of " + MATCHES + " matches, in " + timeline.duration.toFixed(1) +
                " s. Now make it faster, and watch what starts to go wrong."
              : "The routine is not reliable yet. Run the failing matches and find the cause."));
      root.classList.toggle("is-solved", allOk);
    });

    var maxVInput = root.querySelector('[data-limit="maxV"]');
    var maxAInput = root.querySelector('[data-limit="maxA"]');
    function showLimits() {
      root.querySelector('[data-readout="maxV"]').textContent = limits.maxV.toFixed(1) + " m/s";
      root.querySelector('[data-readout="maxA"]').textContent = limits.maxA.toFixed(1) + " m/s²";
      maxVInput.value = limits.maxV;
      maxAInput.value = limits.maxA;
    }
    maxVInput.addEventListener("input", function () {
      limits.maxV = Math.max(0.5, parseFloat(maxVInput.value) || DEFAULT_LIMITS.maxV);
      showLimits();
      rebuild(true);
    });
    maxAInput.addEventListener("input", function () {
      limits.maxA = Math.max(0.5, parseFloat(maxAInput.value) || DEFAULT_LIMITS.maxA);
      showLimits();
      rebuild(true);
    });
    showLimits();

    /* ---- editing on the field ---- */

    function waypointsOf(step) {
      if (!step) return [];
      if (step.kind === "path") return step.waypoints;
      if (step.kind === "driveTo") return [step.pose];
      return [];
    }

    function hitWaypoint(point) {
      var list = waypointsOf(routine.steps[selected]);
      for (var i = 0; i < list.length; i++) {
        if (Math.hypot(list[i].x - point.x, list[i].y - point.y) < 0.35) return i;
      }
      return -1;
    }

    // Keep a dragged point where the whole robot still fits on the field.
    function onField(point) {
      var halfX = CZField.ROBOT.length / 2;
      var halfY = CZField.ROBOT.width / 2;
      return {
        x: CZField.clamp(point.x, halfX, CZField.FIELD.length - halfX),
        y: CZField.clamp(point.y, halfY, CZField.FIELD.width - halfY)
      };
    }

    canvas.addEventListener("mousedown", function (e) {
      var point = onField(view.pointFromEvent(e));

      // The start marker is fixed. Absorb clicks on it, so an attempt to drag
      // it does not leave a waypoint under the robot.
      if (Math.hypot(routine.startPose.x - point.x, routine.startPose.y - point.y) < 0.5) return;

      var hit = hitWaypoint(point);
      if (hit !== -1) { dragging = hit; return; }
      var step = routine.steps[selected];
      if (!step) return;
      if (step.kind === "path") { step.waypoints.push(point); rebuild(); }
      else if (step.kind === "driveTo") { step.pose.x = point.x; step.pose.y = point.y; rebuild(); }
    });

    window.addEventListener("mousemove", function (e) {
      if (dragging === null) return;
      var point = onField(view.pointFromEvent(e));
      var list = waypointsOf(routine.steps[selected]);
      if (list[dragging]) { list[dragging].x = point.x; list[dragging].y = point.y; }
      rebuild(true);
    });

    window.addEventListener("mouseup", function () { dragging = null; });

    canvas.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      var hit = hitWaypoint(view.pointFromEvent(e));
      var step = routine.steps[selected];
      if (typeof hit === "number" && hit >= 0 && step && step.kind === "path") {
        step.waypoints.splice(hit, 1);
        rebuild();
      }
    });

    /* ---- drawing ---- */

    function drawHud(now) {
      hud.innerHTML = "";
      function chip(label, value, on) {
        var node = el("span", "cz-oi__chip" + (on ? " is-on" : ""));
        node.appendChild(el("span", "cz-oi__chip-label", label));
        node.appendChild(el("span", "cz-oi__chip-value", value));
        return node;
      }
      hud.appendChild(chip("fuel", now && now.hasFuel ? "loaded" : "empty", now && now.hasFuel));
      hud.appendChild(chip("shooter", now ? Math.round(now.shooter * 100) + "%" : "0%", now && now.shooter >= READY_SPEED));
      hud.appendChild(chip("score", (now ? now.score : 0) + " / " + TARGET_SCORE, now && now.score >= TARGET_SCORE));
      if (now && now.slipping) hud.appendChild(chip("wheels", "slipping", false)).classList.add("is-warn");
      if (result.collided) hud.appendChild(chip("crash", "barrier " + result.collisionWith, false)).classList.add("is-warn");
    }

    function draw() {
      if (!view.resize()) return;
      var ctx = view.ctx;
      view.drawField();

      // The plan says where the robot should be; the match says where it is.
      var planned = poseAtTime(timeline, playhead) || {
        x: routine.startPose.x, y: routine.startPose.y, heading: deg2rad(routine.startPose.heading)
      };
      var now = stateAtTime(result, playhead);
      var pose = now ? { x: now.x, y: now.y, heading: now.heading, entry: planned.entry } : planned;

      view.drawZone(LOAD, {
        label: "LOAD",
        color: inZone(pose, LOAD) ? "rgba(240,147,43,0.34)" : "rgba(240,147,43,0.12)",
        outline: "rgba(240,147,43,0.9)",
        dashed: !inZone(pose, LOAD)
      });
      // The goal and the ring you have to be inside to score. The ring
      // brightens when the robot is within range, so "close enough" is a
      // thing you can see rather than a number you have to remember.
      var ranged = inShotRange(pose);
      ctx.save();
      ctx.strokeStyle = ranged ? "rgba(76,195,138,0.85)" : "rgba(76,195,138,0.30)";
      ctx.lineWidth = ranged ? 2.5 : 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(view.px(GOAL.x), view.py(GOAL.y), SHOT_RANGE * view.scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ranged ? "rgba(76,195,138,0.9)" : "rgba(76,195,138,0.55)";
      ctx.beginPath();
      ctx.arc(view.px(GOAL.x), view.py(GOAL.y), 0.35 * view.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(230,235,245,0.9)";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("GOAL", view.px(GOAL.x), view.py(GOAL.y) - 0.55 * view.scale);
      ctx.restore();

      // Barriers, hatched so they read as solid rather than as another zone.
      BARRIERS.forEach(function (b) {
        var touching = robotHitsBox(pose, b, CZField.ROBOT);
        var x = view.px(b.x - b.w / 2);
        var y = view.py(b.y + b.h / 2);
        var w = b.w * view.scale;
        var h = b.h * view.scale;
        ctx.save();
        ctx.fillStyle = touching ? "rgba(242,119,122,0.55)" : "rgba(150,158,178,0.30)";
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = touching ? "#f2777a" : "rgba(190,198,215,0.75)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.strokeStyle = touching ? "rgba(242,119,122,0.6)" : "rgba(190,198,215,0.30)";
        ctx.lineWidth = 1;
        for (var d = -h; d < w; d += 9) {
          ctx.beginPath();
          ctx.moveTo(x + d, y + h);
          ctx.lineTo(x + d + h, y);
          ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = "rgba(230,235,245,0.85)";
        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(b.label, x + w / 2, y + h / 2);
      });

      // Every path in the routine, the selected one brightest.
      timeline.entries.forEach(function (entry, index) {
        if (!entry.points || entry.points.length < 2) return;
        var isSelected = index === selected;
        ctx.save();
        ctx.strokeStyle = entry.kind === "driveTo"
          ? (isSelected ? "#b6a8ff" : "rgba(155,140,255,0.45)")
          : (isSelected ? "#f0932b" : "rgba(240,147,43,0.40)");
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.setLineDash(entry.kind === "driveTo" ? [6, 4] : []);
        ctx.beginPath();
        entry.points.forEach(function (p, i) {
          if (i === 0) ctx.moveTo(view.px(p.x), view.py(p.y));
          else ctx.lineTo(view.px(p.x), view.py(p.y));
        });
        ctx.stroke();
        ctx.restore();
      });

      drawTags(ctx, now);
      drawTrace(ctx);

      waypointsOf(routine.steps[selected]).forEach(function (w, i) {
        view.drawMarker(w, {
          radius: 0.28, color: "#f0932b", outline: "rgba(255,255,255,0.9)",
          label: String(i + 1), labelColor: "#1a1a1a"
        });
      });
      // Fixed start: a bracket rather than a handle, so it does not look
      // like something to drag.
      var sx = view.px(routine.startPose.x);
      var sy = view.py(routine.startPose.y);
      var arm = 0.55 * view.scale;
      ctx.save();
      ctx.strokeStyle = "rgba(76,195,138,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - arm, sy - arm * 0.45);
      ctx.lineTo(sx - arm, sy + arm * 0.45);
      ctx.moveTo(sx + arm, sy - arm * 0.45);
      ctx.lineTo(sx + arm, sy + arm * 0.45);
      ctx.stroke();
      ctx.fillStyle = "rgba(76,195,138,0.95)";
      ctx.font = "10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("START", sx, sy + arm * 0.6);
      ctx.restore();

      // Where the crash happens, if it does.
      if (result.collided && result.collisionPose) {
        view.drawRobot(result.collisionPose, { color: "#f2777a", alpha: 0.45 });
        view.drawMarker(result.collisionPose, { radius: 0.3, color: "rgba(242,119,122,0.9)", label: "!", labelColor: "#fff" });
      }

      // Where the plan wants the robot right now, while it follows a path.
      if (now && planned.entry && planned.entry.kind === "path" && Math.hypot(planned.x - now.x, planned.y - now.y) > 0.08) {
        ctx.save();
        ctx.strokeStyle = "rgba(240,147,43,0.7)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(view.px(now.x), view.py(now.y));
        ctx.lineTo(view.px(planned.x), view.py(planned.y));
        ctx.stroke();
        ctx.restore();
      }
      if (planned.entry && planned.entry.kind === "path") {
        view.drawMarker(planned, { radius: 0.11, color: "#f0932b", outline: "rgba(0,0,0,0.6)" });
      }

      view.drawRobot(pose, { color: now && now.hasFuel ? "#f0932b" : "#57a8ff" });
      drawRobotState(ctx, pose, now);
      if (now) drawEstimate(ctx, now);
      drawHud(now);
      drawChart(now);

      var entry = pose.entry;
      var doing = "ready";
      if (entry) {
        if (entry.kind === "path") doing = "driving path";
        else if (entry.kind === "driveTo") doing = "driving to pose";
        else if (entry.kind === "action") doing = entry.parallel[0];
        else doing = "waiting";
        if (entry.kind !== "action" && entry.parallel.length) doing += " + " + entry.parallel.join(" + ");
      }
      clockLabel.textContent = playhead.toFixed(1) + " s / " + timeline.duration.toFixed(1) + " s — " + doing;
      clockLabel.classList.toggle("is-over", timeline.duration > TIME_LIMIT);
    }

    /* AprilTags, and a line to the one the camera is reading. */
    function drawTags(ctx, now) {
      var s = view.scale;
      ctx.save();
      TAGS.forEach(function (tag) {
        var x = view.px(tag.x), y = view.py(tag.y), half = 0.14 * s;
        ctx.fillStyle = "#e8ecf4";
        ctx.fillRect(x - half, y - half, half * 2, half * 2);
        ctx.fillStyle = "#16181e";
        ctx.fillRect(x - half * 0.5, y - half * 0.5, half, half);
      });
      if (now && now.vision !== "none") {
        var nearest = null, best = Infinity;
        TAGS.forEach(function (tag) {
          var d = Math.hypot(tag.x - now.x, tag.y - now.y);
          if (d < best) { best = d; nearest = tag; }
        });
        ctx.strokeStyle = now.vision === "fix" ? "rgba(127,215,230,0.75)" : "rgba(127,215,230,0.25)";
        ctx.lineWidth = 1;
        ctx.setLineDash(now.vision === "fix" ? [] : [2, 4]);
        ctx.beginPath();
        ctx.moveTo(view.px(nearest.x), view.py(nearest.y));
        ctx.lineTo(view.px(now.x), view.py(now.y));
        ctx.stroke();
      }
      ctx.restore();
    }

    /* Where the robot really went: faint for the whole match, bright up to
       now, red where the wheels were slipping. Camera readings are dots. */
    function drawTrace(ctx) {
      var trace = result.trace;
      if (trace.length < 2) return;
      ctx.save();
      ctx.lineCap = "round";
      for (var i = 1; i < trace.length; i++) {
        var a = trace[i - 1], b = trace[i];
        var past = b.t <= playhead;
        ctx.strokeStyle = b.slipping
          ? (past ? "rgba(242,119,122,0.95)" : "rgba(242,119,122,0.35)")
          : (past ? "rgba(230,235,245,0.85)" : "rgba(230,235,245,0.22)");
        ctx.lineWidth = b.slipping ? 3 : 1.5;
        ctx.beginPath();
        ctx.moveTo(view.px(a.x), view.py(a.y));
        ctx.lineTo(view.px(b.x), view.py(b.y));
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(127,215,230,0.9)";
      trace.forEach(function (p) {
        if (!p.fix || p.t > playhead || p.t < playhead - 1.0) return;
        ctx.beginPath();
        ctx.arc(view.px(p.fix.x), view.py(p.fix.y), 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    /* Where the robot thinks it is: an outline, apart from the robot when
       odometry has drifted. */
    function drawEstimate(ctx, now) {
      if (now.error < 0.03) return;
      var s = view.scale;
      ctx.save();
      ctx.translate(view.px(now.ex), view.py(now.ey));
      ctx.rotate(-now.heading);
      ctx.strokeStyle = "rgba(127,215,230,0.95)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      var w = CZField.ROBOT.length * s, h = CZField.ROBOT.width * s;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }

    /* Three lanes against time: speed, grip used, and how wrong the
       robot's idea of where it is. */
    function drawChart(now) {
      var ratio = window.devicePixelRatio || 1;
      var W = chart.clientWidth, H = chart.clientHeight;
      if (!W || !H) return;
      if (chart.width !== Math.round(W * ratio) || chart.height !== Math.round(H * ratio)) {
        chart.width = Math.round(W * ratio);
        chart.height = Math.round(H * ratio);
      }
      var ctx = chart.getContext("2d");
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var trace = result.trace;
      var span = Math.max(timeline.duration, TIME_LIMIT);
      var left = 6, right = W - 6;
      var X = function (t) { return left + (t / span) * (right - left); };
      var gap = 4, laneH = (H - gap * 2) / 3;
      var topSpeed = Math.max(PHYSICS.topSpeed, limits.maxV) + 0.5;
      var worst = Math.max(0.3, result.worstError);
      var lanes = [
        { name: "speed", top: 0, max: topSpeed, unit: "m/s" },
        { name: "grip used", top: laneH + gap, max: 1.6, unit: "%" },
        { name: "pose error", top: (laneH + gap) * 2, max: worst * 1.15, unit: "cm" }
      ];
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.textBaseline = "top";

      function Y(lane, v) { return lane.top + laneH - (Math.min(v, lane.max) / lane.max) * (laneH - 2); }
      function line(lane, pick, colour, width, dash) {
        ctx.save();
        ctx.strokeStyle = colour;
        ctx.lineWidth = width;
        ctx.setLineDash(dash || []);
        ctx.beginPath();
        trace.forEach(function (p, i) {
          var x = X(p.t), y = Y(lane, pick(p));
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.restore();
      }
      function level(lane, v, colour, label) {
        var y = Y(lane, v);
        ctx.save();
        ctx.strokeStyle = colour;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
        ctx.fillStyle = colour;
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillText(label, right - 3, y + 2);
        ctx.restore();
      }

      lanes.forEach(function (lane) {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(left, lane.top, right - left, laneH);
      });
      // Slipping, shaded across every lane.
      ctx.fillStyle = "rgba(242,119,122,0.16)";
      trace.forEach(function (p) {
        if (!p.slipping) return;
        var w = Math.max(1, (right - left) / span / 50 + 0.5);
        lanes.forEach(function (lane) { ctx.fillRect(X(p.t), lane.top, w, laneH); });
      });

      var speed = lanes[0], grip = lanes[1], err = lanes[2];
      level(speed, PHYSICS.topSpeed, "rgba(255,255,255,0.35)", "motors' top speed");
      line(speed, function (p) { return p.planSpeed; }, "#f0932b", 1.5, [4, 2]);
      line(speed, function (p) { return p.speed; }, "#57a8ff", 1.5);
      level(grip, 1, "rgba(242,119,122,0.7)", "all the grip there is");
      line(grip, function (p) { return p.demand / result.grip; }, "#e8ecf4", 1.2);
      line(err, function (p) { return p.error; }, "#7fd7e6", 1.5);
      ctx.fillStyle = "rgba(127,215,230,0.6)";
      trace.forEach(function (p) { if (p.fix) ctx.fillRect(X(p.t), err.top + laneH - 3, 1, 3); });

      // Labels with the values at the playhead.
      var labels = [
        "speed  plan " + (now ? now.planSpeed.toFixed(1) : "0.0") + " · real " + (now ? now.speed.toFixed(1) : "0.0") + " m/s",
        "grip used  " + (now ? Math.round((now.demand / result.grip) * 100) : 0) + "%" + (now && now.slipping ? "  slipping" : ""),
        "pose error  " + (now ? Math.round(now.error * 100) : 0) + " cm  camera: " +
          (!now || now.vision === "none" ? "no tag in view" : now.vision === "fix" ? "reading a tag" : "too blurred")
      ];
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      lanes.forEach(function (lane, i) {
        ctx.fillStyle = "rgba(15,17,21,0.75)";
        ctx.fillRect(left + 1, lane.top + 1, ctx.measureText(labels[i]).width + 7, 13);
        ctx.fillStyle = "rgba(230,235,245,0.9)";
        ctx.fillText(labels[i], left + 4, lane.top + 3);
      });

      // Now.
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(X(playhead), 0);
      ctx.lineTo(X(playhead), H);
      ctx.stroke();
      // The end of the period.
      ctx.strokeStyle = "rgba(242,119,122,0.6)";
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(X(TIME_LIMIT), 0);
      ctx.lineTo(X(TIME_LIMIT), H);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Scrub through the match by dragging along the chart.
    var scrubbing = false;
    function scrubTo(e) {
      var rect = chart.getBoundingClientRect();
      var span = Math.max(timeline.duration, TIME_LIMIT);
      var f = (e.clientX - rect.left - 6) / (rect.width - 12);
      playhead = Math.max(0, Math.min(timeline.duration, f * span));
      playing = false;
      playBtn.textContent = "Run routine";
    }
    chart.addEventListener("pointerdown", function (e) { scrubbing = true; scrubTo(e); });
    window.addEventListener("pointermove", function (e) { if (scrubbing) scrubTo(e); });
    window.addEventListener("pointerup", function () { scrubbing = false; });

    /* What the mechanisms are doing, drawn on the robot itself. */
    function drawRobotState(ctx, pose, now) {
      if (!now) return;
      var s = view.scale;
      var px = view.px(pose.x);
      var py = view.py(pose.y);

      if (now.acting.indexOf("intake") !== -1) {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-pose.heading);
        ctx.strokeStyle = "#f0932b";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        var back = -CZField.ROBOT.length / 2 * s - 3;
        var half = CZField.ROBOT.width / 2 * s * 0.8;
        ctx.beginPath();
        ctx.moveTo(back, -half);
        ctx.lineTo(back, half);
        ctx.stroke();
        ctx.restore();
      }

      if (now.shooter > 0.02) {
        ctx.save();
        var ready = now.shooter >= READY_SPEED;
        ctx.strokeStyle = ready ? "#4cc38a" : "rgba(87,168,255,0.85)";
        ctx.lineWidth = ready ? 3 : 2;
        ctx.beginPath();
        ctx.arc(px, py, 0.75 * s, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * now.shooter);
        ctx.stroke();
        ctx.restore();
      }

      if (now.hasFuel) {
        ctx.save();
        ctx.fillStyle = "#ffd28a";
        ctx.beginPath();
        ctx.arc(px, py, 0.14 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    var last = null;
    function frame(now) {
      if (last === null) last = now;
      var dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playing) {
        playhead += dt;
        if (playhead >= timeline.duration) {
          playhead = timeline.duration;
          playing = false;
          playBtn.textContent = "Run routine";
        }
      }
      if (stripBox.__head && stripBox.__span) {
        stripBox.__head.style.left = (playhead / stripBox.__span) * 100 + "%";
      }
      draw();
      window.requestAnimationFrame(frame);
    }

    rebuild();
    window.requestAnimationFrame(frame);
  }

  function init() {
    var blocks = document.querySelectorAll(".cz-auto");
    for (var i = 0; i < blocks.length; i++) setup(blocks[i]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
