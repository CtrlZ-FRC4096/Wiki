/*
 * Ctrl-Z Wiki — the first three tutorials.
 *
 * These are for a student who has never written a line of code. Nothing is
 * typed. Everything is a tap, every target is large enough for a thumb, and
 * no Python interpreter is downloaded. The code panel under each widget is
 * read only: it shows what the student just built, in the language the team
 * uses, so the step to the later tutorials is a short one.
 */
(function () {
  "use strict";

  var STORE = "czwiki.first.";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function save(key, value) {
    try { window.localStorage.setItem(STORE + key, JSON.stringify(value)); } catch (e) {}
  }
  function load(key) {
    try { return JSON.parse(window.localStorage.getItem(STORE + key) || "null"); } catch (e) { return null; }
  }

  function colours(node) {
    var read = function (name, fallback) {
      var v = getComputedStyle(node).getPropertyValue(name).trim();
      return v || fallback;
    };
    return {
      line: read("--cz-scene-line", "rgba(255,255,255,0.4)"),
      body: read("--cz-scene-body", "#2b6cb0"),
      body2: read("--cz-plot-actual", "#57a8ff"),
      arm: read("--cz-scene-arm", "#9aa4b8"),
      piece: read("--cz-scene-piece", "#f0932b"),
      pass: read("--cz-pass", "#4cc38a")
    };
  }

  /* A row of large tap targets. Returns a function to read the choice. */
  function choiceRow(parent, label, options, initial, onPick) {
    var wrap = el("div", "cz-basic__choice");
    wrap.appendChild(el("div", "cz-basic__choice-label", label));
    var row = el("div", "cz-basic__choice-row");
    var chosen = initial;
    var buttons = {};

    options.forEach(function (option) {
      var button = el("button", "cz-basic__opt", option.label);
      button.type = "button";
      button.setAttribute("aria-pressed", String(option.id === chosen));
      button.addEventListener("click", function () {
        chosen = option.id;
        Object.keys(buttons).forEach(function (id) {
          buttons[id].classList.toggle("is-on", id === chosen);
          buttons[id].setAttribute("aria-pressed", String(id === chosen));
        });
        onPick(chosen);
      });
      if (option.id === chosen) button.classList.add("is-on");
      buttons[option.id] = button;
      row.appendChild(button);
    });

    wrap.appendChild(row);
    parent.appendChild(wrap);
    return {
      get: function () { return chosen; },
      set: function (id) { if (buttons[id]) buttons[id].click(); }
    };
  }

  function verdict(output, passed, checks, goodText, badText) {
    output.innerHTML = "";
    var list = el("ul", "cz-exercise__checks");
    checks.forEach(function (check) {
      var item = el("li", "cz-exercise__check " + (check.ok ? "is-pass" : "is-fail"));
      item.appendChild(el("span", "cz-exercise__check-icon", check.ok ? "✓" : "✗"));
      var body = el("span", "cz-exercise__check-body");
      body.appendChild(el("span", "cz-exercise__check-name", check.label));
      if (!check.ok && check.why) body.appendChild(el("span", "cz-exercise__check-message", check.why));
      item.appendChild(body);
      list.appendChild(item);
    });
    output.appendChild(list);
    output.appendChild(el("p", "cz-exercise__verdict " + (passed ? "is-pass" : "is-fail"),
      passed ? goodText : badText));
  }

  /* Start the drawing loop for a widget. `tick` gets the seconds since the
   * last frame and returns the world to draw. */
  function animate(canvas, tick) {
    var ctx = canvas.getContext("2d");
    var last = null;
    function frame(now) {
      if (last === null) last = now;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      var ratio = window.devicePixelRatio || 1;
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (w && h) {
        if (canvas.width !== Math.round(w * ratio)) {
          canvas.width = Math.round(w * ratio);
          canvas.height = Math.round(h * ratio);
        }
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        var world = tick(dt);
        window.CZScene.draw(ctx, w, h, world, colours(canvas));
      }
      window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  /* ================================================================== *
   * 1. Press a button, move the robot
   * ================================================================== */

  var BUTTONS = [
    { id: "LEFT_TRIGGER_AS_BUTTON", label: "Left trigger" },
    { id: "A", label: "A" },
    { id: "B", label: "B" }
  ];

  var JOBS = [
    { id: "none", label: "Nothing" },
    { id: "intake", label: "Run the intake" },
    { id: "shooter", label: "Spin up the shooter" },
    { id: "arm", label: "Lower the arm" }
  ];

  var WHENS = [
    { id: "hold", label: "While I hold it" },
    { id: "press", label: "Once when I press it" }
  ];

  function setupBind(root) {
    var canvas = root.querySelector("canvas");
    var buttonBox = root.querySelector(".cz-bind__buttons");
    var configBox = root.querySelector(".cz-bind__config");
    var warning = root.querySelector(".cz-basic__warning");
    var codeBox = root.querySelector(".cz-basic__code");
    var output = root.querySelector(".cz-basic__output");

    var saved = load("bind");
    var bindings = (saved && saved.bindings) || {};
    BUTTONS.forEach(function (b) {
      if (!bindings[b.id]) bindings[b.id] = { job: "none", when: "hold" };
    });
    var selected = BUTTONS[0].id;
    var held = {};
    var tried = false;

    var world = window.CZScene.createWorld({ pieceOnFloor: false });
    world.targetX = 0.3;

    var tabs = {};
    BUTTONS.forEach(function (b) {
      var tab = el("button", "cz-bind__tab", b.label);
      tab.type = "button";
      tab.addEventListener("click", function () {
        selected = b.id;
        Object.keys(tabs).forEach(function (id) { tabs[id].classList.toggle("is-on", id === selected); });
        renderConfig();
      });
      if (b.id === selected) tab.classList.add("is-on");
      tabs[b.id] = tab;
      buttonBox.appendChild(tab);
    });

    function renderConfig() {
      configBox.innerHTML = "";
      var binding = bindings[selected];
      var name = BUTTONS.filter(function (b) { return b.id === selected; })[0].label;
      configBox.appendChild(el("p", "cz-basic__prompt", "When I use the " + name + " button:"));
      choiceRow(configBox, "Do this", JOBS, binding.job, function (v) {
        binding.job = v; persist(); renderCode();
      });
      choiceRow(configBox, "And do it", WHENS, binding.when, function (v) {
        binding.when = v; persist(); renderCode();
      });
    }

    function persist() { save("bind", { bindings: bindings }); }

    function apply(buttonId, down) {
      var binding = bindings[buttonId];
      if (binding.job === "none") return;
      if (binding.when === "press") {
        if (!down) return;                       // nothing happens on release
        if (binding.job === "intake") world.intakeOn = true;
        if (binding.job === "shooter") world.shooterOn = true;
        if (binding.job === "arm") world.armDown = !world.armDown;
      } else {
        if (binding.job === "intake") world.intakeOn = down;
        if (binding.job === "shooter") world.shooterOn = down;
        if (binding.job === "arm") world.armDown = down;
      }
    }

    BUTTONS.forEach(function (b) {
      var pad = el("button", "cz-bind__pad", b.label);
      pad.type = "button";
      pad.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        pad.classList.add("is-down");
        held[b.id] = true;
        apply(b.id, true);
      });
      var release = function () {
        if (!held[b.id]) return;
        pad.classList.remove("is-down");
        held[b.id] = false;
        tried = true;
        apply(b.id, false);
      };
      pad.addEventListener("pointerup", release);
      pad.addEventListener("pointerleave", release);
      pad.addEventListener("pointercancel", release);
      root.querySelector(".cz-bind__pads").appendChild(pad);
    });

    function renderCode() {
      var lines = [];
      BUTTONS.forEach(function (b) {
        var binding = bindings[b.id];
        if (binding.job === "none") return;
        var flag = binding.job === "intake" ? "robot.intake_running"
          : binding.job === "shooter" ? "robot.shooter_spinning" : "robot.arm_down";
        if (binding.when === "hold") {
          lines.push("@driver." + b.id + ".whenHeld");
          lines.push("def _():");
          lines.push("    " + flag + " = True");
          lines.push("");
          lines.push("@driver." + b.id + ".whenReleased");
          lines.push("def _():");
          lines.push("    " + flag + " = False");
        } else {
          lines.push("@driver." + b.id + ".whenPressed");
          lines.push("def _():");
          lines.push("    " + flag + " = True");
          lines.push("    # Nothing sets it back to False.");
        }
        lines.push("");
      });
      codeBox.textContent = lines.length ? lines.join("\n").trim() : "# Give a button a job to see the code.";
    }

    root.querySelector('[data-action="check"]').addEventListener("click", function () {
      var trigger = bindings.LEFT_TRIGGER_AS_BUTTON;
      var checks = [
        { label: "The left trigger runs the intake", ok: trigger.job === "intake",
          why: "Select the Left trigger above, then choose “Run the intake”." },
        { label: "It runs only while you hold the button", ok: trigger.when === "hold",
          why: "Choose “While I hold it”. With “Once when I press it” nothing ever stops the intake." },
        { label: "You pressed the button and let it go", ok: tried,
          why: "Press and hold the Left trigger pad below, then let it go." },
        { label: "The intake is stopped now", ok: !world.intakeOn,
          why: "The intake is still running. Let go of the button, or change when it runs." }
      ];
      var passed = checks.every(function (c) { return c.ok; });
      verdict(output, passed, checks,
        "Correct. The robot does what you told it, and it stops when you stop telling it.",
        "Not correct yet. Read the first failed line above.");
      root.classList.toggle("is-solved", passed);
    });

    root.querySelector('[data-action="reset"]').addEventListener("click", function () {
      BUTTONS.forEach(function (b) { bindings[b.id] = { job: "none", when: "hold" }; });
      world.intakeOn = false; world.shooterOn = false; world.armDown = false;
      tried = false;
      persist(); renderConfig(); renderCode();
      output.innerHTML = "";
      root.classList.remove("is-solved");
    });

    renderConfig();
    renderCode();

    animate(canvas, function (dt) {
      var anyHeld = Object.keys(held).some(function (k) { return held[k]; });
      warning.textContent = (world.intakeOn && !anyHeld)
        ? "The intake is still running, and you are not holding a button."
        : "";
      warning.classList.toggle("is-on", Boolean(warning.textContent));
      warning.classList.toggle("is-warn", Boolean(warning.textContent));
      return window.CZScene.step(world, dt);
    });
  }

  /* ================================================================== *
   * 2. Put the steps in order
   * ================================================================== */

  var STEPS = [
    { id: "lower", label: "Lower the intake", python: "self.robot.coroutines.lower_intake" },
    { id: "drive_piece", label: "Drive to the game piece", python: "self.robot.PATH_TO_PIECE" },
    { id: "intake", label: "Run the intake", python: "self.robot.coroutines.intake" },
    { id: "drive_goal", label: "Drive to the goal", python: "self.robot.PATH_TO_GOAL" },
    { id: "shoot", label: "Shoot", python: "self.robot.coroutines.shoot" }
  ];

  function stepById(id) {
    return STEPS.filter(function (s) { return s.id === id; })[0];
  }

  function setupSequence(root) {
    var canvas = root.querySelector("canvas");
    var bank = root.querySelector(".cz-seq__bank");
    var list = root.querySelector(".cz-seq__list");
    var codeBox = root.querySelector(".cz-basic__code");
    var output = root.querySelector(".cz-basic__output");
    var playBtn = root.querySelector('[data-action="play"]');
    var status = root.querySelector(".cz-basic__warning");

    var routine = load("sequence") || [];
    var world = window.CZScene.createWorld();
    var running = null;

    STEPS.forEach(function (step) {
      var card = el("button", "cz-seq__card", step.label);
      card.type = "button";
      card.addEventListener("click", function () {
        routine.push(step.id);
        save("sequence", routine);
        render();
      });
      bank.appendChild(card);
    });

    function move(index, delta) {
      var target = index + delta;
      if (target < 0 || target >= routine.length) return;
      var tmp = routine[index];
      routine[index] = routine[target];
      routine[target] = tmp;
      save("sequence", routine);
      render();
    }

    function render() {
      list.innerHTML = "";
      if (!routine.length) {
        list.appendChild(el("p", "cz-basic__empty", "Tap a step above to add it here."));
      }
      routine.forEach(function (id, index) {
        var row = el("div", "cz-seq__row" + (running && running.index === index ? " is-running" : ""));
        row.appendChild(el("span", "cz-seq__num", String(index + 1)));
        row.appendChild(el("span", "cz-seq__name", stepById(id).label));
        var tools = el("span", "cz-seq__tools");
        [["↑", -1], ["↓", 1]].forEach(function (pair) {
          var b = el("button", "cz-basic__icon", pair[0]);
          b.type = "button";
          b.setAttribute("aria-label", pair[1] < 0 ? "Move earlier" : "Move later");
          b.addEventListener("click", function () { move(index, pair[1]); });
          tools.appendChild(b);
        });
        var remove = el("button", "cz-basic__icon", "✕");
        remove.type = "button";
        remove.setAttribute("aria-label", "Remove this step");
        remove.addEventListener("click", function () {
          routine.splice(index, 1);
          save("sequence", routine);
          render();
        });
        tools.appendChild(remove);
        row.appendChild(tools);
        list.appendChild(row);
      });
      renderCode();
    }

    function renderCode() {
      if (!routine.length) {
        codeBox.textContent = "# Add some steps to see the code.";
        return;
      }
      var lines = ["def my_auto(self):", "    return SequentialCommandGroup("];
      routine.forEach(function (id) { lines.push("        " + stepById(id).python + ","); });
      lines.push("    )");
      codeBox.textContent = lines.join("\n");
    }

    function reset() {
      world = window.CZScene.createWorld();
      running = null;
      status.textContent = "";
      status.classList.remove("is-on");
      playBtn.textContent = "Play";
    }

    function beginStep(index) {
      var id = routine[index];
      if (id === "lower") world.armDown = true;
      if (id === "drive_piece") world.targetX = window.CZScene.PIECE_AT;
      if (id === "intake") world.intakeOn = true;
      if (id === "drive_goal") world.targetX = window.CZScene.GOAL_AT;
      if (id === "shoot") window.CZScene.shoot(world);
      running = { index: index, id: id, t: 0 };
      render();
    }

    function stepDone(state) {
      if (state.id === "lower") return world.armAngle > 0.98;
      if (state.id === "drive_piece") return Math.abs(world.x - window.CZScene.PIECE_AT) < 0.004;
      if (state.id === "drive_goal") return Math.abs(world.x - window.CZScene.GOAL_AT) < 0.004;
      if (state.id === "intake") return state.t > 1.4;
      if (state.id === "shoot") return state.t > 1.0;
      return true;
    }

    playBtn.addEventListener("click", function () {
      if (running) { reset(); render(); return; }
      if (!routine.length) return;
      reset();
      output.innerHTML = "";
      playBtn.textContent = "Stop";
      beginStep(0);
    });

    root.querySelector('[data-action="clear"]').addEventListener("click", function () {
      routine.length = 0;
      save("sequence", routine);
      reset();
      output.innerHTML = "";
      root.classList.remove("is-solved");
      render();
    });

    function finish() {
      var why = "";
      if (world.pieceOnFloor) why = "The robot never picked the game piece up. It must lower the intake, drive to the piece, and then run the intake.";
      else if (world.hasPiece) why = "The robot is still holding the game piece. It never shot.";
      else if (world.missed) why = "The robot shot from too far away. Drive to the goal first.";
      else if (!world.scored) why = "The robot shot nothing. It must pick the game piece up before it shoots.";

      var checks = [
        { label: "The robot picked the game piece up", ok: !world.pieceOnFloor,
          why: "Lower the intake and run it while the robot is at the piece." },
        { label: "The robot scored", ok: world.scored, why: why }
      ];
      var passed = checks.every(function (c) { return c.ok; });
      verdict(output, passed, checks,
        "Correct. The steps happen in the order you put them in, and that order is the whole routine.",
        "Not correct yet. Watch the robot again and find the step that is in the wrong place.");
      root.classList.toggle("is-solved", passed);
      running = null;
      playBtn.textContent = "Play";
      render();
    }

    render();

    animate(canvas, function (dt) {
      if (running) {
        running.t += dt;
        status.textContent = "Step " + (running.index + 1) + ": " + stepById(running.id).label;
        status.classList.add("is-on");
        if (stepDone(running)) {
          if (running.id === "intake") world.intakeOn = false;
          var next = running.index + 1;
          if (next < routine.length) beginStep(next);
          else { status.textContent = ""; status.classList.remove("is-on"); finish(); }
        }
      }
      return window.CZScene.step(world, dt);
    });
  }

  /* ================================================================== *
   * 3. Teach the robot to decide
   * ================================================================== */

  var IN_AT = 18;    // the piece is inside the robot at this reading
  var JAM_AT = 5;    // below this, a running intake jams the piece

  function setupRule(root) {
    var canvas = root.querySelector("canvas");
    var builder = root.querySelector(".cz-rule__builder");
    var meter = root.querySelector(".cz-rule__meter-fill");
    var reading = root.querySelector(".cz-rule__reading");
    var codeBox = root.querySelector(".cz-basic__code");
    var output = root.querySelector(".cz-basic__output");
    var playBtn = root.querySelector('[data-action="play"]');

    var saved = load("rule") || {};
    var rule = {
      sensor: saved.sensor || "intake",
      compare: saved.compare || "below",
      value: typeof saved.value === "number" ? saved.value : 30,
      then: saved.then || "stop"
    };

    var world = window.CZScene.createWorld();
    var run = null;

    builder.appendChild(el("p", "cz-basic__prompt", "Build one rule:"));
    choiceRow(builder, "IF", [
      { id: "intake", label: "the intake sensor" },
      { id: "battery", label: "the battery voltage" }
    ], rule.sensor, function (v) { rule.sensor = v; persist(); renderCode(); });

    choiceRow(builder, "IS", [
      { id: "below", label: "below" },
      { id: "above", label: "above" }
    ], rule.compare, function (v) { rule.compare = v; persist(); renderCode(); });

    var slider = el("div", "cz-basic__choice");
    slider.appendChild(el("div", "cz-basic__choice-label", "THIS VALUE"));
    var input = document.createElement("input");
    input.type = "range";
    input.className = "cz-rule__slider";
    input.min = 2; input.max = 40; input.step = 1; input.value = rule.value;
    input.setAttribute("aria-label", "Rule threshold in centimetres");
    var readout = el("span", "cz-rule__value", rule.value + " cm");
    input.addEventListener("input", function () {
      rule.value = parseInt(input.value, 10);
      readout.textContent = rule.value + " cm";
      persist(); renderCode();
    });
    slider.appendChild(input);
    slider.appendChild(readout);
    builder.appendChild(slider);

    choiceRow(builder, "THEN", [
      { id: "stop", label: "stop the intake" },
      { id: "start", label: "start the intake" }
    ], rule.then, function (v) { rule.then = v; persist(); renderCode(); });

    function persist() { save("rule", rule); }

    function renderCode() {
      var read = rule.sensor === "intake"
        ? "self.intake_sensor.getDistance()" : "self.battery.getVoltage()";
      var op = rule.compare === "below" ? "<" : ">";
      var body = rule.then === "stop"
        ? "self.robot.intake_running = False" : "self.robot.intake_running = True";
      codeBox.textContent = [
        "def periodic(self):",
        "    if " + read + " " + op + " " + rule.value + ":",
        "        " + body
      ].join("\n");
    }

    function sensorValue() {
      return rule.sensor === "intake" ? world.sensor : 12.4;
    }

    function ruleIsTrue() {
      var value = sensorValue();
      return rule.compare === "below" ? value < rule.value : value > rule.value;
    }

    playBtn.addEventListener("click", function () {
      if (run) { stop(); return; }
      world = window.CZScene.createWorld();
      world.targetX = window.CZScene.PIECE_AT;
      world.x = window.CZScene.PIECE_AT;
      world.armDown = true;
      world.armAngle = 1;
      world.intakeOn = true;
      run = { t: 0, fired: false, firedAt: null, jammed: false };
      output.innerHTML = "";
      playBtn.textContent = "Stop";
    });

    function stop() {
      run = null;
      playBtn.textContent = "Play";
    }

    function finish(result) {
      var checks = [
        { label: "The rule reads the intake sensor", ok: rule.sensor === "intake",
          why: "The battery voltage does not change when a game piece arrives." },
        { label: "The robot collected the game piece", ok: result.collected,
          why: result.collectedWhy },
        { label: "The intake stopped", ok: result.stopped, why: result.stoppedWhy }
      ];
      var passed = checks.every(function (c) { return c.ok; });
      verdict(output, passed, checks,
        "Correct. The robot read a sensor and decided for itself.",
        "Not correct yet. Change one part of the rule and play it again.");
      root.classList.toggle("is-solved", passed);
      stop();
    }

    renderCode();

    animate(canvas, function (dt) {
      if (run) {
        run.t += dt;
        if (!run.fired && ruleIsTrue()) {
          run.fired = true;
          run.firedAt = world.sensor;
          world.intakeOn = rule.then === "start";
          if (run.firedAt <= IN_AT && rule.then === "stop") {
            // Far enough in to be held. Say so, or the picture contradicts
            // the verdict the student is about to read.
            world.hasPiece = true;
            world.pieceOnFloor = false;
          }
        }

        if (world.intakeOn && world.sensor <= JAM_AT) run.jammed = true;

        if (run.jammed) {
          finish({
            collected: false, stopped: false,
            collectedWhy: "The intake never stopped, so the game piece jammed.",
            stoppedWhy: "Lower the value, or use “below”, so the rule happens before the piece jams."
          });
        } else if (run.fired && !world.intakeOn) {
          var seated = run.firedAt <= IN_AT;
          finish({
            collected: seated, stopped: true,
            collectedWhy: "The rule happened at " + run.firedAt.toFixed(0) +
              " cm, before the piece was inside. It needs to be " + IN_AT + " cm or less.",
            stoppedWhy: ""
          });
        } else if (run.t > 6) {
          finish({
            collected: !world.pieceOnFloor, stopped: false,
            collectedWhy: "The rule never happened.",
            stoppedWhy: "The rule never happened, so nothing stopped the intake."
          });
        }
      }

      var value = sensorValue();
      reading.textContent = value.toFixed(0) + (rule.sensor === "intake" ? " cm" : " V");
      meter.style.width = Math.max(2, Math.min(100, (value / 40) * 100)) + "%";
      meter.classList.toggle("is-on", ruleIsTrue());
      return window.CZScene.step(world, dt);
    });
  }

  /* ================================================================== */

  function init() {
    document.querySelectorAll(".cz-bind").forEach(setupBind);
    document.querySelectorAll(".cz-seq").forEach(setupSequence);
    document.querySelectorAll(".cz-rule").forEach(setupRule);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
