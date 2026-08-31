/*
 * Ctrl-Z Wiki — operator interface task.
 *
 * Students write button bindings in the same decorator style as robot/oi.py,
 * the page loads them into a live Python session, and then they drive the
 * robot with the keyboard to see whether their bindings actually work.
 */
(function () {
  "use strict";

  var STORAGE_PREFIX = "czwiki.oitask.";
  var TICK_HZ = 50;

  /* Keyboard to controller. Shown on screen so nobody has to guess. */
  var KEYMAP = {
    KeyJ: "A",
    KeyK: "B",
    KeyU: "LEFT_BUMPER",
    KeyI: "RIGHT_BUMPER",
    ShiftLeft: "LEFT_TRIGGER_AS_BUTTON",
    ShiftRight: "LEFT_TRIGGER_AS_BUTTON",
    KeyL: "RIGHT_TRIGGER_AS_BUTTON",
    ArrowUp: "POV_UP",
    ArrowDown: "POV_DOWN",
    ArrowLeft: "POV_LEFT",
    ArrowRight: "POV_RIGHT"
  };

  var DRIVE_KEYS = ["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE"];

  /* Field layout for this task, in metres. */
  var DEPOT = { x: 2.6, y: 4.0, w: 3.6, h: 3.4 };
  var GOAL = { x: 16.4, y: 4.0, w: 0.7, h: 2.2 };
  var SHOT_RANGE = 6.0;
  var TARGET_SCORE = 2;
  var INTAKE_SECONDS = 0.5;
  var SPINUP_SECONDS = 1.2;
  var READY_SPEED = 0.9;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function inZone(pose, zone) {
    return Math.abs(pose.x - zone.x) <= zone.w / 2 && Math.abs(pose.y - zone.y) <= zone.h / 2;
  }

  function setup(root) {
    var CZField = window.CZField;
    var taskId = root.getAttribute("data-task-id");
    var workerUrl = root.getAttribute("data-worker-url");
    var data = JSON.parse(root.querySelector(".cz-oi__data").textContent);

    var textarea = root.querySelector(".cz-oi__code");
    var canvas = root.querySelector(".cz-oi__canvas");
    var statusLine = root.querySelector(".cz-oi__status");
    var hud = root.querySelector(".cz-oi__hud");
    var logBox = root.querySelector(".cz-oi__log");
    var output = root.querySelector(".cz-oi__output");
    var loadBtn = root.querySelector('[data-action="load"]');
    var resetBtn = root.querySelector('[data-action="reset"]');
    var restoreBtn = root.querySelector('[data-action="restore"]');
    var hintBtn = root.querySelector('[data-action="hint"]');
    var solutionBtn = root.querySelector('[data-action="solution"]');
    var hintBox = root.querySelector(".cz-oi__hints");
    var stage = root.querySelector(".cz-oi__stage");

    var storageKey = STORAGE_PREFIX + taskId;
    function store(v) { try { window.localStorage.setItem(storageKey, v); } catch (e) {} }
    function load() { try { return window.localStorage.getItem(storageKey); } catch (e) { return null; } }

    var saved = load();
    textarea.value = saved === null ? data.starter : saved;
    textarea.addEventListener("input", function () { store(textarea.value); });

    // Same editing behaviour as the Python exercises: tab indents rather than
    // jumping focus, and a new line keeps the block you are in.
    textarea.addEventListener("keydown", function (e) {
      if (e.key === "Tab") {
        e.preventDefault();
        var start = textarea.selectionStart;
        if (e.shiftKey) {
          var lineStart = textarea.value.lastIndexOf("\n", start - 1) + 1;
          var trim = textarea.value.slice(lineStart, lineStart + 4).match(/^ {1,4}/);
          if (trim) {
            textarea.setRangeText("", lineStart, lineStart + trim[0].length, "end");
            textarea.selectionStart = textarea.selectionEnd = start - trim[0].length;
          }
        } else {
          textarea.setRangeText("    ", start, textarea.selectionEnd, "end");
        }
        store(textarea.value);
        return;
      }
      if (e.key === "Enter") {
        var upto = textarea.value.slice(0, textarea.selectionStart);
        var indent = (upto.slice(upto.lastIndexOf("\n") + 1).match(/^[ \t]*/) || [""])[0];
        if (upto.trimEnd().endsWith(":")) indent += "    ";
        if (indent) {
          e.preventDefault();
          textarea.setRangeText("\n" + indent, textarea.selectionStart, textarea.selectionEnd, "end");
          store(textarea.value);
        }
      }
    });

    var view = new CZField.FieldView(canvas);
    var chassis = new CZField.Chassis({ x: 6.5, y: 4.0, heading: 0 });
    var buttons = {};
    var latched = {};
    var pressedKeys = {};
    var intent = { intake_running: false, shooter_spinning: false, shoot: false };
    var game = { hasFuel: false, shooter: 0, score: 0, intakeTimer: 0, loaded: false, boundKinds: [], shots: [], flash: 0 };
    var worker = null;
    var tickInFlight = false;
    var nextId = 1;
    var messages = [];

    function say(text) {
      messages.unshift(text);
      messages = messages.slice(0, 4);
      logBox.innerHTML = "";
      messages.forEach(function (m) { logBox.appendChild(el("div", "cz-oi__log-line", m)); });
    }

    /* ---------------- Python session ---------------- */

    function ensureWorker() {
      if (worker) return worker;
      worker = new Worker(workerUrl);
      worker.onmessage = function (event) {
        var msg = event.data || {};
        if (msg.type === "status") { statusLine.textContent = msg.message; return; }

        if (msg.type === "loaded") {
          statusLine.textContent = "";
          if (msg.payload.error) {
            game.loaded = false;
            showError("The bindings did not load", msg.payload.error);
            return;
          }
          game.loaded = true;
          game.boundKinds = msg.payload.kinds || [];
          output.innerHTML = "";
          say("Bindings loaded: " + (msg.payload.bound.join(", ") || "none"));
          resetMatch();
          stage.focus();
          return;
        }

        if (msg.type === "state") {
          tickInFlight = false;
          intent = msg.payload;
          if (msg.payload.errors && msg.payload.errors.length) {
            msg.payload.errors.forEach(function (e) { say("Error in a binding — " + e); });
          }
          return;
        }

        if (msg.type === "fatal") {
          tickInFlight = false;
          game.loaded = false;
          showError("Python stopped", msg.message);
        }
      };
      return worker;
    }

    function showError(title, detail) {
      output.innerHTML = "";
      var box = el("div", "cz-exercise__error");
      box.appendChild(el("div", "cz-exercise__error-label", title));
      box.appendChild(el("pre", null, detail));
      output.appendChild(box);
    }

    function resetMatch() {
      chassis = new CZField.Chassis({ x: 6.5, y: 4.0, heading: 0 });
      game.hasFuel = false;
      game.shooter = 0;
      game.score = 0;
      game.intakeTimer = 0;
      game.shots = [];
      game.flash = 0;
      buttons = {};
      latched = {};
      pressedKeys = {};
      root.classList.remove("is-solved");
    }

    loadBtn.addEventListener("click", function () {
      output.innerHTML = "";
      ensureWorker().postMessage({ id: nextId++, type: "load", code: textarea.value });
    });

    resetBtn.addEventListener("click", function () {
      // Puts the robot back on the field. Leaves your bindings alone.
      resetMatch();
      output.innerHTML = "";
      say("The robot is reset. The bindings are still loaded.");
    });

    if (restoreBtn) {
      restoreBtn.addEventListener("click", function () {
        if (!window.confirm("Replace your bindings with the starter code? Your version is then lost.")) return;
        textarea.value = data.starter;
        store(textarea.value);
        output.innerHTML = "";
        game.loaded = false;
        resetMatch();
      });
    }

    if (hintBtn) {
      var hintsShown = 0;
      hintBtn.addEventListener("click", function () {
        hintBox.hidden = false;
        hintsShown++;
        hintBox.innerHTML = "";
        (data.hints || []).slice(0, hintsShown).forEach(function (hint, i) {
          var item = el("div", "cz-exercise__hint");
          item.appendChild(el("strong", null, "Hint " + (i + 1) + ": "));
          item.appendChild(document.createTextNode(hint));
          hintBox.appendChild(item);
        });
        if (hintsShown >= (data.hints || []).length) hintBtn.disabled = true;
      });
    }

    /* The bindings are not in the page. They are encrypted, and only the team
     * password turns them back into code. */
    if (solutionBtn) {
      solutionBtn.addEventListener("click", function () {
        if (!window.confirm("Show working bindings? Try the hints first.")) return;

        var node = root.querySelector(".cz-oi__locked");
        var blob = null;
        try {
          blob = node ? JSON.parse(node.textContent) : null;
        } catch (err) {
          blob = null;
        }
        if (!blob || !window.CZLock) return;

        solutionBtn.disabled = true;
        window.CZLock.reveal(blob, "working bindings").then(function (solution) {
          if (!solution) {
            solutionBtn.disabled = false;
            return;
          }
          textarea.value = solution;
          store(textarea.value);
        });
      });
    }

    /* ---------------- keyboard ---------------- */

    stage.addEventListener("keydown", function (e) {
      if (e.repeat) return;
      if (KEYMAP[e.code] || DRIVE_KEYS.indexOf(e.code) !== -1) {
        e.preventDefault();
        pressedKeys[e.code] = true;
        if (KEYMAP[e.code]) {
          buttons[KEYMAP[e.code]] = true;
          latched[KEYMAP[e.code]] = true;
        }
      }
    });

    stage.addEventListener("keyup", function (e) {
      if (KEYMAP[e.code] || DRIVE_KEYS.indexOf(e.code) !== -1) {
        e.preventDefault();
        pressedKeys[e.code] = false;
        if (KEYMAP[e.code]) buttons[KEYMAP[e.code]] = false;
      }
    });

    stage.addEventListener("blur", function () {
      // Losing focus mid-press would otherwise leave a button stuck on.
      pressedKeys = {};
      buttons = {};
      latched = {};
    });

    /* ---------------- simulation ---------------- */

    var last = null;
    var tickAccumulator = 0;

    function step(dt) {
      // Driver input: WASD translates field-relative, Q/E spins.
      var cmdVx = ((pressedKeys.KeyD ? 1 : 0) - (pressedKeys.KeyA ? 1 : 0)) * CZField.MAX_SPEED;
      var cmdVy = ((pressedKeys.KeyW ? 1 : 0) - (pressedKeys.KeyS ? 1 : 0)) * CZField.MAX_SPEED;
      var cmdW = ((pressedKeys.KeyQ ? 1 : 0) - (pressedKeys.KeyE ? 1 : 0)) * 4.0;
      chassis.driveFieldRelative(cmdVx, cmdVy, cmdW, dt);

      // Intake: only picks fuel up inside the depot, and takes a moment.
      var atDepot = inZone(chassis.pose(), DEPOT);
      if (intent.intake_running && !game.hasFuel && atDepot) {
        game.nagTimer = 0;
        game.intakeTimer += dt;
        if (game.intakeTimer >= INTAKE_SECONDS) {
          game.hasFuel = true;
          game.intakeTimer = 0;
          say("Fuel collected.");
        }
      } else if (!intent.intake_running) {
        game.intakeTimer = 0;
        game.nagTimer = 0;
      } else if (!game.hasFuel && !atDepot) {
        // Running the intake in the wrong place is the commonest confusion
        // here, so name it rather than leaving nothing happening.
        game.nagTimer = (game.nagTimer || 0) + dt;
        if (game.nagTimer > 1.2) {
          game.nagTimer = 0;
          say("The intake operates, but the robot is not in the depot.");
        }
      }

      // Shooter spins up while commanded, coasts down when not.
      var target = intent.shooter_spinning ? 1 : 0;
      var rate = dt / SPINUP_SECONDS;
      game.shooter += CZField.clamp(target - game.shooter, -rate * 1.5, rate);
      game.shooter = CZField.clamp(game.shooter, 0, 1);

      stepShots(dt);

      // Firing is a single pulse, so it only counts on the loop it happened.
      if (intent.shoot) {
        var range = CZField.distance(chassis.pose(), { x: GOAL.x, y: GOAL.y });
        if (!game.hasFuel) say("You shot with no fuel.");
        else if (game.shooter < READY_SPEED) {
          game.hasFuel = false;
          launch(false, 0.35 + game.shooter * 0.4);
          say("The shooter is at " + Math.round(game.shooter * 100) + "%. The piece stopped before the goal.");
        } else if (range > SHOT_RANGE) {
          game.hasFuel = false;
          launch(false, SHOT_RANGE / range);
          say("The range is " + range.toFixed(1) + " m. Move to less than " + SHOT_RANGE + " m.");
        }
        else {
          game.hasFuel = false;
          game.score++;
          launch(true);
          say("Scored " + game.score + " of " + TARGET_SCORE + ".");
          if (game.score >= TARGET_SCORE) finish();
        }
        intent.shoot = false;
      }
    }

    // A piece leaving the shooter, drawn arcing towards the goal. `reach` is
    // how much of the way it gets: 1 for a made shot, less for a bad one.
    function launch(scored, reach) {
      var from = chassis.pose();
      var span = reach === undefined ? 1 : reach;
      game.shots.push({
        from: { x: from.x, y: from.y },
        to: { x: GOAL.x, y: GOAL.y },
        reach: span,
        scored: scored,
        t: 0,
        life: 0.55 + 0.25 * span
      });
    }

    function stepShots(dt) {
      for (var i = game.shots.length - 1; i >= 0; i--) {
        var shot = game.shots[i];
        shot.t += dt;
        if (shot.t >= shot.life) {
          if (shot.scored) game.flash = 0.45;
          game.shots.splice(i, 1);
        }
      }
      if (game.flash > 0) game.flash = Math.max(0, game.flash - dt);
    }

    function finish() {
      root.classList.add("is-solved");
      output.innerHTML = "";
      var list = el("ul", "cz-exercise__checks");
      var needed = [
        { label: "The intake is bound to the left trigger", ok: game.boundKinds.some(function (k) { return k.indexOf("LEFT_TRIGGER_AS_BUTTON") === 0; }) },
        { label: "The shooter is bound to a button", ok: game.boundKinds.some(function (k) { return k.indexOf("A:") === 0 || k.indexOf("B:") === 0 || k.indexOf("Y:") === 0 || k.indexOf("X:") === 0; }) },
        { label: "The shot is bound to the right trigger", ok: game.boundKinds.some(function (k) { return k.indexOf("RIGHT_TRIGGER_AS_BUTTON") === 0; }) },
        { label: "Scored " + TARGET_SCORE + " pieces of fuel", ok: true }
      ];
      needed.forEach(function (n) {
        var item = el("li", "cz-exercise__check " + (n.ok ? "is-pass" : "is-fail"));
        item.appendChild(el("span", "cz-exercise__check-icon", n.ok ? "✓" : "✗"));
        var body = el("span", "cz-exercise__check-body");
        body.appendChild(el("span", "cz-exercise__check-name", n.label));
        item.appendChild(body);
        list.appendChild(item);
      });
      output.appendChild(list);
      output.appendChild(el("p", "cz-exercise__verdict is-pass", "The cycle is complete. These bindings operate correctly."));
    }

    function drawHud() {
      hud.innerHTML = "";
      function chip(label, value, state) {
        var node = el("span", "cz-oi__chip" + (state ? " is-" + state : ""));
        node.appendChild(el("span", "cz-oi__chip-label", label));
        node.appendChild(el("span", "cz-oi__chip-value", value));
        return node;
      }
      hud.appendChild(chip("fuel", game.hasFuel ? "loaded" : "empty", game.hasFuel ? "on" : ""));
      hud.appendChild(chip("shooter", Math.round(game.shooter * 100) + "%", game.shooter >= READY_SPEED ? "on" : ""));
      hud.appendChild(chip("intake", intent.intake_running ? "running" : "off", intent.intake_running ? "on" : ""));
      hud.appendChild(chip("score", game.score + " / " + TARGET_SCORE, game.score >= TARGET_SCORE ? "on" : ""));
      var pose = chassis.pose();
      hud.appendChild(chip("pose", pose.x.toFixed(1) + ", " + pose.y.toFixed(1) + " m",
        inZone(pose, DEPOT) ? "on" : ""));
    }

    function draw() {
      if (!view.resize()) return;
      var ctx = view.ctx;
      view.drawField();
      var atDepot = inZone(chassis.pose(), DEPOT);
      view.drawZone(DEPOT, {
        label: "FUEL DEPOT",
        color: atDepot ? "rgba(240,147,43,0.34)" : "rgba(240,147,43,0.12)",
        outline: atDepot ? "rgba(240,147,43,1)" : "rgba(240,147,43,0.6)",
        dashed: !atDepot
      });

      // Goal flashes when a piece goes in.
      var goalGlow = game.flash > 0;
      view.drawZone(GOAL, {
        label: "GOAL",
        color: goalGlow ? "rgba(76,195,138,0.75)" : "rgba(76,195,138,0.20)",
        outline: "rgba(76,195,138,0.9)"
      });

      // Shooting range ring, so "close enough" is visible rather than guessed.
      var pose = chassis.pose();
      var inRange = CZField.distance(pose, { x: GOAL.x, y: GOAL.y }) <= SHOT_RANGE;
      ctx.save();
      ctx.strokeStyle = inRange ? "rgba(76,195,138,0.65)" : "rgba(76,195,138,0.25)";
      ctx.setLineDash([4, 5]);
      ctx.lineWidth = inRange ? 2 : 1;
      ctx.beginPath();
      ctx.arc(view.px(GOAL.x), view.py(GOAL.y), SHOT_RANGE * view.scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Pieces in flight, arcing towards the goal.
      game.shots.forEach(function (shot) {
        var f = Math.min(1, shot.t / shot.life);
        var span = f * shot.reach;
        var x = shot.from.x + (shot.to.x - shot.from.x) * span;
        var y = shot.from.y + (shot.to.y - shot.from.y) * span;
        var lift = Math.sin(Math.PI * f) * 0.5 * view.scale;
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = shot.scored ? "#4cc38a" : "#f2777a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(view.px(shot.from.x), view.py(shot.from.y));
        ctx.lineTo(view.px(x), view.py(y) - lift);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = shot.scored ? "#4cc38a" : "#f2777a";
        ctx.beginPath();
        ctx.arc(view.px(x), view.py(y) - lift, 0.16 * view.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      view.drawRobot(pose, { color: game.hasFuel ? "#f0932b" : "#57a8ff" });
      drawRobotState(ctx, pose);
      drawHud();
    }

    /* What the mechanisms are doing, drawn on the robot: a bar across the
       intake side while it runs, and a ring that fills as the shooter comes
       up to speed. */
    function drawRobotState(ctx, pose) {
      var s = view.scale;
      var px = view.px(pose.x);
      var py = view.py(pose.y);

      if (intent.intake_running) {
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

      if (game.shooter > 0.02) {
        ctx.save();
        var ready = game.shooter >= READY_SPEED;
        ctx.strokeStyle = ready ? "#4cc38a" : "rgba(87,168,255,0.85)";
        ctx.lineWidth = ready ? 3 : 2;
        ctx.beginPath();
        ctx.arc(px, py, 0.75 * s, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * game.shooter);
        ctx.stroke();
        ctx.restore();
      }

      if (game.hasFuel) {
        ctx.save();
        ctx.fillStyle = "#ffd28a";
        ctx.beginPath();
        ctx.arc(px, py, 0.14 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function frame(now) {
      if (last === null) last = now;
      var dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      if (game.loaded) {
        tickAccumulator += dt;
        if (tickAccumulator >= 1 / TICK_HZ && !tickInFlight) {
          tickAccumulator = 0;
          tickInFlight = true;
          // Send held buttons plus anything tapped since the last tick, so a
          // press shorter than one robot loop still registers.
          var payload = {};
          Object.keys(buttons).forEach(function (k) { if (buttons[k]) payload[k] = true; });
          Object.keys(latched).forEach(function (k) { if (latched[k]) payload[k] = true; });
          latched = {};
          worker.postMessage({ id: nextId++, type: "tick", buttons: payload });
        }
        step(dt);
      }
      draw();
      window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  function init() {
    var blocks = document.querySelectorAll(".cz-oi");
    for (var i = 0; i < blocks.length; i++) setup(blocks[i]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
