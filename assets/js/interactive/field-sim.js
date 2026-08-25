/*
 * Ctrl-Z Wiki — shared 2D field view.
 *
 * A top-down field with a swerve robot on it, used by both the operator
 * interface task and the autonomous path planner. Everything is in metres
 * with the origin at the blue-alliance back-right corner, matching
 * FieldConstants in the robot code: +X down the length of the field,
 * +Y across its width.
 *
 * Constants come from robot/const.py on the 2026 robot.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CZField = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var FIELD = { length: 17.55, width: 8.05 };
  var ROBOT = { length: 0.79, width: 0.86 };   // bumper to bumper
  var MAX_SPEED = 4.75;                        // m/s, SWERVE_MAX_SPEED
  var MAX_TURN = 8.0;                          // rad/s

  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }

  /* ------------------------------------------------------------------ *
   * Canvas view: metres in, pixels out.
   * ------------------------------------------------------------------ */
  function FieldView(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.margin = 8;
  }

  FieldView.prototype.resize = function () {
    var ratio = window.devicePixelRatio || 1;
    var w = this.canvas.clientWidth;
    var h = this.canvas.clientHeight;
    if (!w || !h) return false;
    if (this.canvas.width !== Math.round(w * ratio)) {
      this.canvas.width = Math.round(w * ratio);
      this.canvas.height = Math.round(h * ratio);
    }
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.width = w;
    this.height = h;
    this.scale = Math.min(
      (w - this.margin * 2) / FIELD.length,
      (h - this.margin * 2) / FIELD.width
    );
    this.originX = (w - FIELD.length * this.scale) / 2;
    this.originY = (h - FIELD.width * this.scale) / 2;
    return true;
  };

  // Field X runs left to right; field Y runs up the screen, so it is flipped.
  FieldView.prototype.px = function (x) { return this.originX + x * this.scale; };
  FieldView.prototype.py = function (y) { return this.originY + (FIELD.width - y) * this.scale; };
  FieldView.prototype.mx = function (px) { return (px - this.originX) / this.scale; };
  FieldView.prototype.my = function (py) { return FIELD.width - (py - this.originY) / this.scale; };

  FieldView.prototype.pointFromEvent = function (event) {
    var rect = this.canvas.getBoundingClientRect();
    return {
      x: clamp(this.mx(event.clientX - rect.left), 0, FIELD.length),
      y: clamp(this.my(event.clientY - rect.top), 0, FIELD.width)
    };
  };

  FieldView.prototype.style = function (name, fallback) {
    var v = getComputedStyle(this.canvas).getPropertyValue(name).trim();
    return v || fallback;
  };

  FieldView.prototype.drawField = function () {
    var ctx = this.ctx;
    var s = this.scale;
    var carpet = this.style("--cz-field-carpet", "#1b1d24");
    var line = this.style("--cz-field-line", "rgba(255,255,255,0.30)");
    var blue = this.style("--cz-field-blue", "rgba(60,130,220,0.30)");
    var red = this.style("--cz-field-red", "rgba(220,70,70,0.30)");

    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = carpet;
    ctx.fillRect(this.px(0), this.py(FIELD.width), FIELD.length * s, FIELD.width * s);

    // alliance zones, a third of the field at each end
    var zone = FIELD.length / 3;
    ctx.fillStyle = blue;
    ctx.fillRect(this.px(0), this.py(FIELD.width), zone * s, FIELD.width * s);
    ctx.fillStyle = red;
    ctx.fillRect(this.px(FIELD.length - zone), this.py(FIELD.width), zone * s, FIELD.width * s);

    ctx.strokeStyle = line;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(this.px(0), this.py(FIELD.width), FIELD.length * s, FIELD.width * s);

    ctx.beginPath();
    ctx.moveTo(this.px(FIELD.length / 2), this.py(0));
    ctx.lineTo(this.px(FIELD.length / 2), this.py(FIELD.width));
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.px(FIELD.length / 2), this.py(FIELD.width / 2), 1.2 * s, 0, Math.PI * 2);
    ctx.stroke();
  };

  FieldView.prototype.drawRobot = function (pose, options) {
    options = options || {};
    var ctx = this.ctx;
    var s = this.scale;
    var body = options.color || this.style("--cz-field-robot", "#57a8ff");
    ctx.save();
    ctx.translate(this.px(pose.x), this.py(pose.y));
    ctx.rotate(-pose.heading);
    ctx.globalAlpha = options.alpha === undefined ? 1 : options.alpha;

    ctx.fillStyle = body;
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 1.5;
    var w = ROBOT.length * s, h = ROBOT.width * s;
    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill();
    ctx.stroke();

    // a nose so the heading is readable at a glance
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2 - 0.18 * s, -0.16 * s);
    ctx.lineTo(w / 2 - 0.18 * s, 0.16 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  FieldView.prototype.drawMarker = function (point, options) {
    options = options || {};
    var ctx = this.ctx;
    var r = (options.radius || 0.22) * this.scale;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.px(point.x), this.py(point.y), r, 0, Math.PI * 2);
    ctx.fillStyle = options.color || "#f0932b";
    ctx.globalAlpha = options.alpha === undefined ? 1 : options.alpha;
    ctx.fill();
    if (options.outline) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = options.outline;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (options.label) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = options.labelColor || "#fff";
      ctx.font = "bold " + Math.max(9, r) + "px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(options.label, this.px(point.x), this.py(point.y));
    }
    ctx.restore();
  };

  FieldView.prototype.drawZone = function (zone, options) {
    options = options || {};
    var ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = options.color || "rgba(76,195,138,0.18)";
    ctx.strokeStyle = options.outline || "rgba(76,195,138,0.8)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash(options.dashed ? [5, 4] : []);
    var x = this.px(zone.x - zone.w / 2);
    var y = this.py(zone.y + zone.h / 2);
    ctx.fillRect(x, y, zone.w * this.scale, zone.h * this.scale);
    ctx.strokeRect(x, y, zone.w * this.scale, zone.h * this.scale);
    if (options.label) {
      ctx.setLineDash([]);
      ctx.fillStyle = options.outline || "rgba(255,255,255,0.8)";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(options.label, this.px(zone.x), y - 4);
    }
    ctx.restore();
  };

  /* ------------------------------------------------------------------ *
   * Robot motion. Not a full swerve model — a holonomic chassis with
   * acceleration limits, which is close enough to feel right and simple
   * enough to reason about.
   * ------------------------------------------------------------------ */
  function Chassis(pose) {
    this.x = pose.x;
    this.y = pose.y;
    this.heading = pose.heading || 0;
    this.vx = 0;
    this.vy = 0;
    this.omega = 0;
    this.maxAccel = 9.0;      // m/s^2
    this.maxAngAccel = 25.0;  // rad/s^2
  }

  Chassis.prototype.driveFieldRelative = function (cmdVx, cmdVy, cmdOmega, dt) {
    var dv = this.maxAccel * dt;
    this.vx += clamp(cmdVx - this.vx, -dv, dv);
    this.vy += clamp(cmdVy - this.vy, -dv, dv);
    var dw = this.maxAngAccel * dt;
    this.omega += clamp(cmdOmega - this.omega, -dw, dw);

    this.x = clamp(this.x + this.vx * dt, ROBOT.length / 2, FIELD.length - ROBOT.length / 2);
    this.y = clamp(this.y + this.vy * dt, ROBOT.width / 2, FIELD.width - ROBOT.width / 2);
    this.heading += this.omega * dt;
  };

  Chassis.prototype.pose = function () {
    return { x: this.x, y: this.y, heading: this.heading };
  };

  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  return {
    FIELD: FIELD,
    ROBOT: ROBOT,
    MAX_SPEED: MAX_SPEED,
    MAX_TURN: MAX_TURN,
    FieldView: FieldView,
    Chassis: Chassis,
    distance: distance,
    clamp: clamp
  };
});
