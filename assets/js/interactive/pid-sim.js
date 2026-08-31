/*
 * Ctrl-Z Wiki — controller tuning widget.
 *
 * Draws sliders for one mechanism's gains, replays the scenario live, and
 * grades a tuning against the checks the plant defines in mechanism-sim.js.
 */
(function () {
  "use strict";

  var STORAGE_PREFIX = "czwiki.tuning.";
  // How close the wheel speed has to be for the shot to actually go in.
  // A real shooter is this fussy, which is the entire reason we tune it.
  var SHOT_TOLERANCE = 0.05;

  function drawBall(ctx, x, y, r, colour) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function decimals(step) {
    var s = String(step);
    var dot = s.indexOf(".");
    return dot === -1 ? 0 : s.length - dot - 1;
  }

  function css(node, name) {
    return getComputedStyle(node).getPropertyValue(name).trim();
  }

  /* ------------------------------------------------------------------ *
   * Drawing
   * ------------------------------------------------------------------ */
  function Renderer(canvas, plant) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.plant = plant;
  }

  Renderer.prototype.colors = function () {
    var node = this.canvas;
    return {
      grid: css(node, "--cz-plot-grid") || "rgba(255,255,255,0.12)",
      axis: css(node, "--cz-plot-axis") || "rgba(255,255,255,0.45)",
      setpoint: css(node, "--cz-plot-setpoint") || "#cb5f01",
      actual: css(node, "--cz-plot-actual") || "#57a8ff",
      volts: css(node, "--cz-plot-volts") || "rgba(255,255,255,0.30)",
      body: css(node, "--cz-plot-body") || "rgba(255,255,255,0.75)",
      text: css(node, "--cz-plot-text") || "rgba(255,255,255,0.6)",
      pass: css(node, "--cz-pass") || "#4cc38a",
      fail: css(node, "--cz-fail") || "#f2777a"
    };
  };

  Renderer.prototype.resize = function () {
    var ratio = window.devicePixelRatio || 1;
    var width = this.canvas.clientWidth;
    var height = this.canvas.clientHeight;
    if (!width || !height) return false;
    if (this.canvas.width !== Math.round(width * ratio)) {
      this.canvas.width = Math.round(width * ratio);
      this.canvas.height = Math.round(height * ratio);
    }
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.width = width;
    this.height = height;
    return true;
  };

  Renderer.prototype.draw = function (run) {
    if (!this.resize()) return;
    var ctx = this.ctx;
    var c = this.colors();
    ctx.clearRect(0, 0, this.width, this.height);

    var mechW = Math.min(190, this.width * 0.32);
    this.drawMechanism(ctx, c, run, 0, 0, mechW, this.height);
    this.drawPlot(ctx, c, run, mechW + 12, 0, this.width - mechW - 12, this.height);
  };

  Renderer.prototype.drawPlot = function (ctx, c, run, x0, y0, w, h) {
    var plant = this.plant;
    var pad = { l: 38, r: 6, t: 10, b: 20 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b - 14; // leave a strip for the voltage bar
    var lo = plant.range[0], hi = plant.range[1];
    var duration = run.duration;

    function px(t) { return x0 + pad.l + (t / duration) * pw; }
    function py(v) { return y0 + pad.t + ph - ((v - lo) / (hi - lo)) * ph; }

    // grid + y labels
    ctx.strokeStyle = c.grid;
    ctx.fillStyle = c.text;
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 1;
    var ticks = 4;
    for (var i = 0; i <= ticks; i++) {
      var value = lo + ((hi - lo) * i) / ticks;
      var y = py(value);
      ctx.beginPath();
      ctx.moveTo(x0 + pad.l, y);
      ctx.lineTo(x0 + pad.l + pw, y);
      ctx.stroke();
      ctx.fillText(Math.round(value) + "", x0 + pad.l - 5, y);
    }

    // x labels
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (var s = 0; s <= duration; s += 2) {
      ctx.fillText(s + "s", px(s), y0 + pad.t + ph + 4);
    }

    // the moment the ball hits, if this scenario has one
    run.events.forEach(function (ev) {
      if (!ev.disturb) return;
      ctx.strokeStyle = c.axis;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(px(ev.t), y0 + pad.t);
      ctx.lineTo(px(ev.t), y0 + pad.t + ph);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    var samples = run.samples;
    if (!samples.length) return;

    function trace(key, color, dashed, width) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dashed ? [4, 3] : []);
      ctx.beginPath();
      for (var k = 0; k < samples.length; k++) {
        var X = px(samples[k].t);
        var Y = py(samples[k][key]);
        if (k === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    trace("sp", c.setpoint, true, 1.5);
    trace("y", c.actual, false, 2);

    // voltage strip along the bottom: how close the motor is to saturating
    var stripTop = y0 + h - 12;
    ctx.strokeStyle = c.volts;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var v = 0; v < samples.length; v++) {
      var vx = px(samples[v].t);
      var vy = stripTop + 5 - (samples[v].volts / 12) * 5;
      if (v === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
    }
    ctx.stroke();
    ctx.fillStyle = c.text;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText("volts", x0 + pad.l - 5, stripTop + 5);
  };

  Renderer.prototype.drawMechanism = function (ctx, c, run, x0, y0, w, h) {
    var plant = this.plant;
    var cx = x0 + w / 2;
    var cy = y0 + h / 2;
    var value = run.samples.length ? run.samples[run.samples.length - 1].y : 0;
    var target = run.samples.length ? run.samples[run.samples.length - 1].goal : 0;

    ctx.save();
    ctx.lineCap = "round";
    // Keep the mechanism inside its own panel; a long shot must not scribble
    // across the plot next to it.
    ctx.beginPath();
    ctx.rect(x0, y0, w, h);
    ctx.clip();

    if (plant.id === "flywheel") {
      var wheel = { x: x0 + w * 0.26, y: y0 + h * 0.60, r: Math.min(w, h) * 0.17 };
      var goal = { x: x0 + w * 0.84, y: y0 + h * 0.20, r: Math.min(w, h) * 0.11 };

      // The goal, so "fast enough" is something you can see rather than infer.
      ctx.strokeStyle = run.scored ? c.pass : c.body;
      ctx.lineWidth = run.scored ? 3 : 2;
      ctx.beginPath();
      ctx.arc(goal.x, goal.y, goal.r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = c.body;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(wheel.x, wheel.y, wheel.r, 0, Math.PI * 2);
      ctx.stroke();

      // A spoke, so the wheel visibly spins. Slowed down for the eye.
      this.spin = (this.spin || 0) + value * 0.02 * 0.6;
      ctx.strokeStyle = c.actual;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(wheel.x, wheel.y);
      ctx.lineTo(wheel.x + wheel.r * Math.cos(this.spin), wheel.y + wheel.r * Math.sin(this.spin));
      ctx.stroke();

      var hitAt = null;
      run.events.forEach(function (ev) { if (ev.disturb) hitAt = ev.t; });

      if (hitAt !== null) {
        var ballR = Math.max(3, wheel.r * 0.28);
        var feed = { x: x0 + w * 0.06, y: y0 + h * 0.88 };
        var FLIGHT = 1.1;
        var t = run.t;

        if (t >= hitAt - 1.0 && t < hitAt) {
          // Rolling up the feed chute towards the wheel.
          var f = (t - (hitAt - 1.0)) / 1.0;
          drawBall(ctx, feed.x + (wheel.x - feed.x) * f,
                        feed.y + (wheel.y + wheel.r * 0.7 - feed.y) * f, ballR, c.setpoint);
        } else if (t >= hitAt) {
          // Exit speed sets how far the ball goes, and the goal is narrow:
          // too slow drops it short, too fast sails it long. A shooter 20%
          // fast misses just as surely as one 20% slow.
          var ratio = (run.launchSpeed || 0) / (run.setpoint || 1);
          var scored = ratio >= 1 - SHOT_TOLERANCE && ratio <= 1 + SHOT_TOLERANCE;
          run.scored = scored;
          run.shotVerdict = scored ? "in" : (ratio < 1 ? "short" : "long");

          var reach = Math.min(1.7, ratio);
          var span = { x: goal.x - wheel.x, y: goal.y - wheel.y };
          var len = Math.hypot(span.x, span.y) || 1;
          var age = t - hitAt;

          // Position at any point in the shot. Sampling this gives a trail
          // that follows the ball instead of cutting the corner.
          function shotAt(a) {
            var u = Math.min(1, a / FLIGHT);
            var pt = {
              x: wheel.x + span.x * reach * u,
              y: wheel.y + span.y * reach * u - Math.sin(Math.PI * u) * h * 0.16 * Math.min(1, reach)
            };
            if (a > FLIGHT && !scored) {
              var over = a - FLIGHT;
              if (ratio > 1) {
                // Sailed past the goal: still travelling, now falling.
                pt.x += (span.x / len) * over * 190;
                pt.y += (span.y / len) * over * 190 + over * over * 320;
              } else {
                // Ran out of energy short of the goal: it just drops.
                pt.y += over * over * 420;
              }
            }
            return pt;
          }

          var shotColour = scored ? c.pass : c.fail;
          ctx.strokeStyle = shotColour;
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (var a = 0; a <= age; a += 0.03) {
            var pt = shotAt(a);
            if (a === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;

          var ball = shotAt(age);
          drawBall(ctx, ball.x, ball.y, ballR, shotColour);

          if (age >= FLIGHT) {
            ctx.fillStyle = shotColour;
            ctx.font = "bold 11px ui-monospace, monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(run.shotVerdict.toUpperCase(), goal.x, goal.y + goal.r + 12);
          }
        }
      }

      ctx.fillStyle = c.text;
      ctx.font = "11px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(value.toFixed(1) + " rps", x0 + 4, y0 + h - 30);
      ctx.fillText(Math.round(value * 60) + " RPM", x0 + 4, y0 + h - 16);
    } else if (plant.id === "arm") {
      var len = Math.min(w, h) * 0.38;
      var rad = (value * Math.PI) / 180;
      var tRad = (target * Math.PI) / 180;
      ctx.strokeStyle = c.setpoint;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + len * Math.cos(-tRad), cy + len * Math.sin(-tRad));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = c.actual;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + len * Math.cos(-rad), cy + len * Math.sin(-rad));
      ctx.stroke();
      ctx.fillStyle = c.body;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.text;
      ctx.font = "11px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(value.toFixed(1) + "°", cx, y0 + h - 16);
    } else {
      var trackH = h * 0.7;
      var top = cy - trackH / 2;
      var frac = (value - plant.range[0]) / (plant.range[1] - plant.range[0]);
      var tFrac = (target - plant.range[0]) / (plant.range[1] - plant.range[0]);
      ctx.strokeStyle = c.body;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, top);
      ctx.lineTo(cx, top + trackH);
      ctx.stroke();
      ctx.strokeStyle = c.setpoint;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx - 20, top + trackH * (1 - tFrac));
      ctx.lineTo(cx + 20, top + trackH * (1 - tFrac));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = c.actual;
      ctx.fillRect(cx - 14, top + trackH * (1 - frac) - 6, 28, 12);
      ctx.fillStyle = c.text;
      ctx.font = "11px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(value.toFixed(1) + " in", cx, y0 + h - 16);
    }
    ctx.restore();
  };

  /* ------------------------------------------------------------------ *
   * Widget
   * ------------------------------------------------------------------ */
  function setup(root) {
    var plantId = root.getAttribute("data-plant");
    var plant = window.CZSim.plants[plantId];
    if (!plant) return;

    var storageKey = STORAGE_PREFIX + plantId;
    var canvas = root.querySelector(".cz-sim__canvas");
    var slidersBox = root.querySelector(".cz-sim__sliders");
    var output = root.querySelector(".cz-sim__output");
    var playBtn = root.querySelector('[data-action="play"]');
    var checkBtn = root.querySelector('[data-action="check"]');
    var resetBtn = root.querySelector('[data-action="reset"]');
    var answerBtn = root.querySelector('[data-action="answer"]');

    var gains = {};
    plant.gains.forEach(function (k) { gains[k] = 0; });
    var setpoint = plant.setpoint.value;

    try {
      var saved = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      if (saved) {
        plant.gains.forEach(function (k) { if (typeof saved[k] === "number") gains[k] = saved[k]; });
        if (typeof saved.setpoint === "number") setpoint = saved.setpoint;
      }
    } catch (e) { /* private mode, or nothing saved */ }

    function persist() {
      try {
        var blob = Object.assign({}, gains, { setpoint: setpoint });
        window.localStorage.setItem(storageKey, JSON.stringify(blob));
      } catch (e) { /* ignore */ }
    }

    /* Fixed gains always apply — they are not the student's to get wrong. */
    function effective() {
      var g = {};
      if (plant.fixed) Object.keys(plant.fixed).forEach(function (k) { g[k] = plant.fixed[k]; });
      plant.gains.forEach(function (k) { g[k] = gains[k]; });
      Object.keys(mode.force).forEach(function (k) { if (k in g) g[k] = mode.force[k]; });
      return g;
    }

    // Each mode runs the same scenario its matching check is judged on, so
    // what you are watching is what gets graded.
    function scenarioFor() { return mode.scenario; }

    // Which gain you are isolating. Each mode parks the mechanism where that
    // gain is visible and zeroes the ones that would otherwise mask it.
    var modes = plant.modes || [{ id: "full", label: "Full loop", scenario: Object.keys(plant.scenarios)[0], force: {} }];
    var mode = modes[0];

    var renderer = new Renderer(canvas, plant);
    var run = new window.CZSim.Run(plantId, effective(), setpoint, scenarioFor());
    var playing = true;
    var restartAt = null;

    function restart() {
      run = new window.CZSim.Run(plantId, effective(), setpoint, scenarioFor());
      restartAt = null;
    }

    // --- sliders ---
    var readouts = {};
    plant.gains.forEach(function (key) {
      var spec = plant.sliders[key];
      var places = decimals(spec.step);
      var row = el("div", "cz-sim__slider");

      var label = el("label", "cz-sim__slider-label");
      label.setAttribute("for", "cz-" + plantId + "-" + key);
      label.appendChild(el("span", "cz-sim__gain-name", key));
      var readout = el("span", "cz-sim__gain-value", gains[key].toFixed(places));
      label.appendChild(readout);
      readouts[key] = { node: readout, places: places };

      var input = document.createElement("input");
      input.type = "range";
      input.id = "cz-" + plantId + "-" + key;
      input.min = spec.min;
      input.max = spec.max;
      input.step = spec.step;
      input.value = gains[key];
      input.addEventListener("input", function () {
        gains[key] = parseFloat(input.value);
        readout.textContent = gains[key].toFixed(places);
        persist();
        restart();
      });

      row.appendChild(label);
      row.appendChild(input);
      slidersBox.appendChild(row);
      readouts[key].input = input;
    });

    // --- setpoint ---
    var spSpec = plant.setpoint;
    var spRow = el("div", "cz-sim__slider cz-sim__slider--setpoint");
    var spLabel = el("label", "cz-sim__slider-label");
    spLabel.setAttribute("for", "cz-" + plantId + "-sp");
    spLabel.appendChild(el("span", "cz-sim__gain-name", "target"));
    var spReadout = el("span", "cz-sim__gain-value", setpoint + " " + plant.unit);
    spLabel.appendChild(spReadout);
    var spInput = document.createElement("input");
    spInput.type = "range";
    spInput.id = "cz-" + plantId + "-sp";
    spInput.min = spSpec.min;
    spInput.max = spSpec.max;
    spInput.step = spSpec.step;
    spInput.value = setpoint;
    spInput.addEventListener("input", function () {
      setpoint = parseFloat(spInput.value);
      spReadout.textContent = setpoint + " " + plant.unit;
      persist();
      restart();
    });
    spRow.appendChild(spLabel);
    spRow.appendChild(spInput);
    slidersBox.appendChild(spRow);

    function applyGains(source) {
      plant.gains.forEach(function (k) {
        gains[k] = source[k] || 0;
        readouts[k].input.value = gains[k];
        readouts[k].node.textContent = gains[k].toFixed(readouts[k].places);
      });
      persist();
      restart();
    }

    // --- buttons ---
    playBtn.addEventListener("click", function () {
      playing = !playing;
      playBtn.textContent = playing ? "Pause" : "Play";
    });

    var modeBox = root.querySelector(".cz-sim__modes");
    var modeNote = root.querySelector(".cz-sim__mode-note");
    var modeButtons = {};

    function applyMode(next) {
      mode = next;
      Object.keys(modeButtons).forEach(function (id) {
        modeButtons[id].classList.toggle("is-on", id === mode.id);
        modeButtons[id].setAttribute("aria-pressed", id === mode.id ? "true" : "false");
      });
      if (modeNote) modeNote.textContent = mode.note || "";
      root.classList.toggle("is-isolating", mode.id !== "full");
      // Greying a slider that the mode holds at zero makes it obvious it is
      // not in play, rather than leaving you wondering why it does nothing.
      plant.gains.forEach(function (k) {
        if (readouts[k]) readouts[k].input.disabled = k in mode.force;
      });
      restart();
    }

    if (modeBox) {
      modes.forEach(function (m) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "cz-sim__mode";
        button.textContent = m.label;
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", function () { applyMode(m); });
        modeButtons[m.id] = button;
        modeBox.appendChild(button);
      });
    }

    resetBtn.addEventListener("click", function () {
      var zeros = {};
      plant.gains.forEach(function (k) { zeros[k] = 0; });
      applyGains(zeros);
      output.innerHTML = "";
    });

    if (answerBtn) {
      answerBtn.addEventListener("click", function () {
        if (!window.confirm("Load a known-good tuning? Do the steps above first to learn more.")) return;

        /* Unlike the code answers, these gains cannot be encrypted: the widget
         * grades your tuning against them, so they have to be in the page. The
         * password here stops the button, not a determined reader. */
        if (!window.CZLock || !window.CZLock.locked()) {
          applyGains(plant.reference);
          answerBtn.disabled = true;
          return;
        }
        answerBtn.disabled = true;
        window.CZLock.unlock("a known-good tuning").then(function (key) {
          if (!key) {
            answerBtn.disabled = false;
            return;
          }
          applyGains(plant.reference);
        });
      });
    }

    checkBtn.addEventListener("click", function () {
      var results = window.CZSim.runChecks(plantId, gains, setpoint);
      output.innerHTML = "";
      var list = el("ul", "cz-exercise__checks");
      var allPassed = true;

      results.forEach(function (r) {
        if (!r.passed) allPassed = false;
        var item = el("li", "cz-exercise__check " + (r.passed ? "is-pass" : "is-fail"));
        item.appendChild(el("span", "cz-exercise__check-icon", r.passed ? "✓" : "✗"));
        var body = el("span", "cz-exercise__check-body");
        body.appendChild(el("span", "cz-exercise__check-name", r.name));
        if (!r.passed) {
          var value = r.value === null || r.value === undefined
            ? "never got there"
            : r.metric + " was " + r.value.toFixed(2) + ", needs to be under " + r.limit;
          body.appendChild(el("span", "cz-exercise__check-message", value + " — " + r.hint));
        }
        item.appendChild(body);
        list.appendChild(item);
      });

      output.appendChild(list);
      output.appendChild(el("p", "cz-exercise__verdict " + (allPassed ? "is-pass" : "is-fail"),
        allPassed
          ? "The mechanism is tuned."
          : "The mechanism is not tuned. Correct the failed check above."));
      root.classList.toggle("is-solved", allPassed);
    });

    applyMode(mode);

    // --- animation ---
    var last = null;
    function frame(now) {
      if (last === null) last = now;
      var dt = Math.min(0.25, (now - last) / 1000);
      last = now;

      if (playing) {
        if (restartAt !== null) {
          if (now >= restartAt) restart();
        } else {
          var steps = Math.max(1, Math.round(dt / window.CZSim.CONTROL_DT));
          for (var i = 0; i < steps && !run.finished(); i++) run.tick();
          if (run.finished()) restartAt = now + 900; // pause on the finished trace
        }
      }
      renderer.draw(run);
      window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  function init() {
    var blocks = document.querySelectorAll(".cz-sim");
    for (var i = 0; i < blocks.length; i++) setup(blocks[i]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
