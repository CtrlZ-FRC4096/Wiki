/*
 * Ctrl-Z Wiki — autonomous routine planner (widget).
 *
 * Draws the field, handles waypoint editing, plays the routine back and
 * reports against the objective. All the maths lives in auto-core.js.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "czwiki.autoplanner.v3";

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
    var LOAD = A.LOAD, GOAL = A.GOAL, SHOT_RANGE = A.SHOT_RANGE, BARRIERS = A.BARRIERS, ACTIONS = A.ACTIONS;
    var TARGET_SCORE = A.TARGET_SCORE, TIME_LIMIT = A.TIME_LIMIT;
    var INTAKE_SECONDS = A.INTAKE_SECONDS, READY_SPEED = A.READY_SPEED;
    var actionById = A.actionById, inZone = A.inZone, robotHitsBox = A.robotHitsBox;
    var parallelOf = A.parallelOf, buildTimeline = A.buildTimeline, inShotRange = A.inShotRange, rangeToGoal = A.rangeToGoal;
    var poseAtTime = A.poseAtTime, simulateRoutine = A.simulateRoutine;
    var stateAtTime = A.stateAtTime, toPython = A.toPython, deg2rad = A.deg2rad;
    var canvas = root.querySelector(".cz-auto__canvas");
    var stepsBox = root.querySelector(".cz-auto__steps");
    var codeBox = root.querySelector(".cz-auto__code");
    var clockLabel = root.querySelector(".cz-auto__clock");
    var hud = root.querySelector(".cz-auto__hud");
    var stripBox = root.querySelector(".cz-auto__strip");
    var output = root.querySelector(".cz-auto__output");
    var view = new CZField.FieldView(canvas);

    // Enough of a routine to see how the pieces fit, and not enough to finish
    // the task — the second half is the exercise.
    var DEFAULT = {
      name: "wiki_auto",
      startPose: { x: 1.0, y: 2.6, heading: 0 },
      steps: [
        { kind: "path", waypoints: [{ x: 4.6, y: 3.0 }], endHeading: 0, parallel: ["spin_up_shooter"] }
      ]
    };

    var routine = JSON.parse(JSON.stringify(DEFAULT));
    var limits = { maxV: 4.5, maxA: 4.5 };
    var selected = 0;
    var playing = false;
    var playhead = 0;
    var timeline = null;
    var result = null;
    var dragging = null;

    try {
      var saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && saved.routine) { routine = saved.routine; limits = saved.limits || limits; }
    } catch (e) { /* nothing saved */ }

    function persist() {
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ routine: routine, limits: limits })); }
      catch (e) { /* ignore */ }
    }

    function rebuild() {
      timeline = buildTimeline(routine, limits);
      result = simulateRoutine(timeline, CZField.ROBOT);
      codeBox.textContent = toPython(routine, limits);
      renderSteps();
      renderStrip();
      persist();
    }

    /* ---- step list ---- */

    function renderSteps() {
      stepsBox.innerHTML = "";

      var startRow = el("div", "cz-auto__step cz-auto__step--start");
      startRow.appendChild(el("span", "cz-auto__step-kind", "start"));
      var startBody = el("span", "cz-auto__step-body");
      startBody.appendChild(document.createTextNode(
        routine.startPose.x.toFixed(2) + ", " + routine.startPose.y.toFixed(2) + " m facing "));
      startBody.appendChild(numberInput(routine.startPose.heading, -180, 180, 15, function (v) {
        routine.startPose.heading = v; rebuild();
      }));
      startBody.appendChild(document.createTextNode("°"));
      startRow.appendChild(startBody);
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

    root.querySelector('[data-action="check"]').addEventListener("click", function () {
      var checks = [
        {
          name: "The robot does not touch a barrier",
          ok: !result.collided,
          why: result.collided
            ? "The robot touches barrier " + result.collisionWith + " at " + result.collisionAt.toFixed(1) +
              " s. Add a waypoint to move around it."
            : ""
        },
        {
          name: "The robot collects fuel at the LOAD zone",
          ok: result.events.some(function (e) { return e.kind === "pickup"; }),
          why: "Select Intake on the path that ends in the LOAD zone, or add an intake step there. The robot must be inside the zone for " +
            INTAKE_SECONDS + " s."
        },
        {
          name: "The robot scores " + TARGET_SCORE + " pieces",
          ok: result.score >= TARGET_SCORE,
          why: result.misses.length
            ? "Scored " + result.score + ". The last shot failed: " + result.misses[result.misses.length - 1].why + "."
            : "Scored " + result.score + ". A shoot step only counts within " + SHOT_RANGE + " m of the goal, holding fuel, with the shooter spun up."
        },
        {
          name: "The routine is less than " + TIME_LIMIT + " seconds",
          ok: timeline.duration <= TIME_LIMIT,
          why: "This routine is " + timeline.duration.toFixed(1) +
            " s. Move the actions into the paths instead of after them."
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
      output.appendChild(el("p", "cz-exercise__verdict " + (allOk ? "is-pass" : "is-fail"),
        allOk ? "The routine is correct. Now decrease its duration."
              : "The routine is not correct. Run it and find the failure."));
      root.classList.toggle("is-solved", allOk);
    });

    var maxVInput = root.querySelector('[data-limit="maxV"]');
    var maxAInput = root.querySelector('[data-limit="maxA"]');
    maxVInput.value = limits.maxV;
    maxAInput.value = limits.maxA;
    maxVInput.addEventListener("input", function () {
      limits.maxV = Math.max(0.5, parseFloat(maxVInput.value) || 4.5);
      root.querySelector('[data-readout="maxV"]').textContent = limits.maxV.toFixed(1) + " m/s";
      rebuild();
    });
    maxAInput.addEventListener("input", function () {
      limits.maxA = Math.max(0.5, parseFloat(maxAInput.value) || 4.5);
      root.querySelector('[data-readout="maxA"]').textContent = limits.maxA.toFixed(1) + " m/s²";
      rebuild();
    });

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
      if (Math.hypot(routine.startPose.x - point.x, routine.startPose.y - point.y) < 0.35) return "start";
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
      if (dragging === "start") { routine.startPose.x = point.x; routine.startPose.y = point.y; }
      else {
        var list = waypointsOf(routine.steps[selected]);
        if (list[dragging]) { list[dragging].x = point.x; list[dragging].y = point.y; }
      }
      rebuild();
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
      if (result.collided) hud.appendChild(chip("crash", "barrier " + result.collisionWith, false));
    }

    function draw() {
      if (!view.resize()) return;
      var ctx = view.ctx;
      view.drawField();

      var pose = poseAtTime(timeline, playhead) || {
        x: routine.startPose.x, y: routine.startPose.y, heading: deg2rad(routine.startPose.heading)
      };
      var now = stateAtTime(result, playhead);

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

      waypointsOf(routine.steps[selected]).forEach(function (w, i) {
        view.drawMarker(w, {
          radius: 0.28, color: "#f0932b", outline: "rgba(255,255,255,0.9)",
          label: String(i + 1), labelColor: "#1a1a1a"
        });
      });
      view.drawMarker(routine.startPose, { radius: 0.24, color: "#4cc38a", outline: "rgba(255,255,255,0.8)" });

      // Where the crash happens, if it does.
      if (result.collided) {
        var crash = poseAtTime(timeline, result.collisionAt);
        if (crash) {
          view.drawRobot(crash, { color: "#f2777a", alpha: 0.45 });
          view.drawMarker(crash, { radius: 0.3, color: "rgba(242,119,122,0.9)", label: "!", labelColor: "#fff" });
        }
      }

      view.drawRobot(pose, { color: now && now.hasFuel ? "#f0932b" : "#57a8ff" });
      drawRobotState(ctx, pose, now);
      drawHud(now);

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
