/*
 * Ctrl-Z Wiki — swerve module dial.
 *
 * One module, drawn as a dial. Move the current angle and the commanded angle
 * and compare how far the module turns with and without the optimisation.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "czwiki.swervedial";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function css(node, name, fallback) {
    var v = getComputedStyle(node).getPropertyValue(name).trim();
    return v || fallback;
  }

  function setup(root) {
    var S = window.CZSwerve;
    var canvas = root.querySelector(".cz-dial__canvas");
    var ctx = canvas.getContext("2d");
    var readout = root.querySelector(".cz-dial__readout");
    var slidersBox = root.querySelector(".cz-dial__sliders");

    var state = { current: 0, target: 170, speed: 3.0 };
    try {
      var saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      if (saved) Object.keys(state).forEach(function (k) {
        if (typeof saved[k] === "number") state[k] = saved[k];
      });
    } catch (e) { /* nothing saved */ }

    function persist() {
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    }

    var SPECS = [
      { key: "current", label: "module is at", min: -180, max: 180, step: 5, unit: "°" },
      { key: "target", label: "command", min: -180, max: 180, step: 5, unit: "°" },
      { key: "speed", label: "speed", min: 0, max: 4.75, step: 0.25, unit: " m/s" }
    ];
    var readouts = {};

    SPECS.forEach(function (spec) {
      var row = el("div", "cz-sim__slider");
      var label = el("label", "cz-sim__slider-label");
      label.setAttribute("for", "cz-dial-" + spec.key);
      label.appendChild(el("span", "cz-sim__gain-name", spec.label));
      var value = el("span", "cz-sim__gain-value", state[spec.key] + spec.unit);
      label.appendChild(value);

      var input = document.createElement("input");
      input.type = "range";
      input.id = "cz-dial-" + spec.key;
      input.min = spec.min; input.max = spec.max; input.step = spec.step;
      input.value = state[spec.key];
      input.addEventListener("input", function () {
        state[spec.key] = parseFloat(input.value);
        value.textContent = state[spec.key] + spec.unit;
        persist();
        draw();
      });

      row.appendChild(label);
      row.appendChild(input);
      slidersBox.appendChild(row);
      readouts[spec.key] = { input: input, value: value };
    });

    function resize() {
      var ratio = window.devicePixelRatio || 1;
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return false;
      if (canvas.width !== Math.round(w * ratio)) {
        canvas.width = Math.round(w * ratio);
        canvas.height = Math.round(h * ratio);
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      canvas.__w = w; canvas.__h = h;
      return true;
    }

    /* Screen angle: 0 degrees points right, positive turns anticlockwise, the
       same convention the robot code uses. */
    function point(cx, cy, r, deg) {
      var a = (deg * Math.PI) / 180;
      return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
    }

    function arrow(cx, cy, r, deg, colour, width, dashed) {
      var p = point(cx, cy, r, deg);
      ctx.save();
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.setLineDash(dashed ? [6, 5] : []);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.setLineDash([]);
      var head = 9;
      var a = (deg * Math.PI) / 180;
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - head * Math.cos(a - 0.4), p.y + head * Math.sin(a - 0.4));
      ctx.lineTo(p.x - head * Math.cos(a + 0.4), p.y + head * Math.sin(a + 0.4));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    /* The arc the module actually sweeps through, so the saving is visible
       rather than only a number in a table. */
    function sweep(cx, cy, r, from, to, colour, width) {
      ctx.save();
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -(from * Math.PI) / 180, -(to * Math.PI) / 180, to > from);
      ctx.stroke();
      ctx.restore();
    }

    function draw() {
      if (!resize()) return;
      var w = canvas.__w, h = canvas.__h;
      var cx = w / 2, cy = h / 2;
      var r = Math.min(w, h) * 0.33;

      var body = css(canvas, "--cz-plot-body", "rgba(255,255,255,0.7)");
      var text = css(canvas, "--cz-plot-text", "rgba(255,255,255,0.6)");
      var blue = css(canvas, "--cz-plot-actual", "#57a8ff");
      var orange = css(canvas, "--cz-plot-setpoint", "#f0932b");
      var green = css(canvas, "--cz-pass", "#4cc38a");

      ctx.clearRect(0, 0, w, h);

      // dial face
      ctx.strokeStyle = body;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = text;
      ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      [0, 90, 180, 270].forEach(function (deg) {
        var p = point(cx, cy, r + 14, deg);
        ctx.fillText(((deg + 180) % 360 - 180) + "°", p.x, p.y);
      });

      var result = S.compare(state.current, state.target, state.speed);

      // the two sweeps, so the difference in movement is visible
      sweep(cx, cy, r * 0.78, state.current, result.naiveAngle, "rgba(240,147,43,0.45)", 7);
      sweep(cx, cy, r * 0.60, state.current, result.optimizedAngle, green, 7);

      arrow(cx, cy, r, state.target, orange, 2, true);
      arrow(cx, cy, r * 0.9, result.optimizedAngle, green, 4, false);
      arrow(cx, cy, r * 0.5, state.current, blue, 3, false);

      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();

      // which way the wheel drives
      ctx.fillStyle = result.reversed ? orange : green;
      ctx.font = "bold 11px ui-monospace, monospace";
      ctx.textBaseline = "top";
      ctx.fillText(result.reversed ? "wheel driven BACKWARDS" : "wheel driven forwards", cx, h - 16);

      renderReadout(result);
    }

    function renderReadout(result) {
      readout.innerHTML = "";
      var rows = [
        ["command", state.target.toFixed(0) + "°"],
        ["turn without optimising", result.naiveTurn.toFixed(0) + "°"],
        ["turn with optimising", result.optimizedTurn.toFixed(0) + "°"],
        ["module goes to", result.optimizedAngle.toFixed(0) + "°"],
        ["speed sent to the motor", result.speed.toFixed(2) + " m/s"]
      ];
      var table = el("table", "cz-dial__table");
      rows.forEach(function (row, i) {
        var tr = el("tr", i === 2 ? "is-key" : null);
        tr.appendChild(el("th", null, row[0]));
        tr.appendChild(el("td", null, row[1]));
        table.appendChild(tr);
      });
      readout.appendChild(table);

      var saved = result.naiveTurn - result.optimizedTurn;
      readout.appendChild(el("p", "cz-dial__note" + (saved > 0.5 ? " is-saved" : ""),
        saved > 0.5
          ? "The optimisation saves " + saved.toFixed(0) + "° of steering and reverses the wheel."
          : "This command is already less than 90° away. The optimisation changes nothing."));
    }

    root.querySelector('[data-action="worst"]').addEventListener("click", function () {
      // The command that needs the most steering: 180 degrees away.
      state.target = state.current + 180 > 180 ? state.current - 180 : state.current + 180;
      readouts.target.input.value = state.target;
      readouts.target.value.textContent = state.target + "°";
      persist();
      draw();
    });

    window.addEventListener("resize", draw);
    draw();
  }

  function init() {
    var blocks = document.querySelectorAll(".cz-dial");
    for (var i = 0; i < blocks.length; i++) setup(blocks[i]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
