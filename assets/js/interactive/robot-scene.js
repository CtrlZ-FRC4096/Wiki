/*
 * Ctrl-Z Wiki — the robot used by the first three tutorials.
 *
 * One side-on cartoon robot shared by all three beginner widgets, so a student
 * learns to read one picture and then keeps it. There is no physics here. The
 * widget sets what the robot is trying to do, and this file moves it there and
 * draws it.
 *
 * Distances are a fraction of the floor: 0 at the left wall, 1 at the right.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CZScene = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PIECE_AT = 0.46;   // where the game piece sits on the floor
  var GOAL_AT = 0.88;    // where the goal is
  var REACH = 0.07;      // how close the robot must be to touch something
  var EMPTY = 40;        // what the intake sensor reads with nothing in it
  var IN_AT = 18;        // the piece is inside the robot at this reading
  var JAM_AT = 5;        // below this, the piece is against the Jamomatic

  function createWorld(options) {
    options = options || {};
    return {
      x: 0.08,
      targetX: 0.08,
      armDown: false,
      armAngle: 0,          // 0 is up, 1 is fully down
      intakeOn: false,
      spin: 0,
      shooterSpeed: 0,
      shooterOn: false,
      hasPiece: Boolean(options.startWithPiece),
      pieceOnFloor: options.pieceOnFloor !== false,
      shot: null,           // a piece in the air
      scored: false,
      missed: false,
      message: "",
      sensor: EMPTY,        // centimetres to the piece in the intake
      current: 0,           // amps the indexer motor is pulling
      indexerOn: options.indexerOn !== false,   // the indexer wheel is turning
      indexSpin: 0,
      // The first tutorial has no game piece at all, so it hides the ball
      // path. A path with nothing on it is only a distraction there.
      showIndexer: options.showIndexer !== false,
      jam: false,           // the piece is stuck against the Jamomatic
      // How fast the piece comes in, in cm per second. The sensor tutorial
      // slows this down, because there the student has to watch the number.
      intakeRate: options.intakeRate || 55
    };
  }

  /* What the intake motor pulls, in amps. A real intake motor works harder as
   * the game piece touches the roller, and it stalls if the piece cannot go
   * any further. That is why a current rule can find a game piece without a
   * distance sensor.
   *
   *   free (nothing touching)          8 A
   *   touching, 30 cm down to 18 cm    8 A up to 26 A
   *   inside,   18 cm down to  5 cm   26 A up to 38 A
   *   jammed,   5 cm or less          55 A
   */
  var FREE_CURRENT = 8;
  var TOUCH_AT = 30;
  var SEATED_CURRENT = 26;
  var JAM_CURRENT = 55;

  function currentDemand(world) {
    if (!world.indexerOn || !world.intakeOn) return 0;
    if (world.armAngle < 0.8) return FREE_CURRENT;
    var cm = world.sensor;
    if (cm <= 5) return JAM_CURRENT;
    if (cm >= TOUCH_AT) return FREE_CURRENT;
    if (cm >= 18) {
      return FREE_CURRENT + (SEATED_CURRENT - FREE_CURRENT) * (TOUCH_AT - cm) / (TOUCH_AT - 18);
    }
    return SEATED_CURRENT + (38 - SEATED_CURRENT) * (18 - cm) / (18 - 5);
  }

  function approach(value, target, rate, dt) {
    if (value < target) return Math.min(target, value + rate * dt);
    return Math.max(target, value - rate * dt);
  }

  function step(world, dt) {
    world.x = approach(world.x, world.targetX, 0.42, dt);
    world.armAngle = approach(world.armAngle, world.armDown ? 1 : 0, 2.2, dt);
    world.spin += (world.intakeOn ? 14 : 0) * dt;
    world.shooterSpeed = approach(world.shooterSpeed, world.shooterOn ? 1 : 0, 1.1, dt);

    // Collecting a piece needs the intake down, running, and next to the piece.
    // The indexer is what carries it along the path once it is in.
    var atThePiece = world.pieceOnFloor && world.intakeOn && world.armAngle > 0.8 &&
      Math.abs(world.x - PIECE_AT) < REACH;
    if (atThePiece && world.indexerOn) {
      world.sensor = Math.max(2, world.sensor - world.intakeRate * dt);
      if (world.sensor <= 4) {
        world.pieceOnFloor = false;
        world.hasPiece = true;
      }
    } else if (!world.hasPiece && !atThePiece) {
      // The robot left without it, so the path is empty again. A piece that is
      // part of the way in stays where the indexer left it.
      world.sensor = Math.min(EMPTY, world.sensor + 60 * dt);
    }

    world.indexSpin += (world.indexerOn && world.intakeOn ? 9 : 0) * dt;

    // The motor takes a moment to reach a new current, as a real one does.
    world.current = approach(world.current, currentDemand(world), 120, dt);

    if (world.shot) {
      world.shot.t += dt;
      if (world.shot.t >= 0.75) {
        if (world.shot.good) world.scored = true;
        else world.missed = true;
        world.shot = null;
      }
    }
    return world;
  }

  /* Fire whatever the robot is holding. It only goes in from close enough. */
  function shoot(world) {
    if (!world.hasPiece) {
      world.message = "The robot shot nothing. It is not holding a game piece.";
      return false;
    }
    var close = Math.abs(world.x - GOAL_AT) < 0.22;
    world.hasPiece = false;
    world.shot = { t: 0, from: world.x, good: close };
    world.message = close ? "" : "The robot was too far from the goal.";
    return close;
  }

  function atPiece(world) { return Math.abs(world.x - PIECE_AT) < REACH; }
  function atGoal(world) { return Math.abs(world.x - GOAL_AT) < 0.22; }

  /* ------------------------------------------------------------------ */

  function draw(ctx, width, height, world, colours) {
    var c = colours || {};
    var floor = height * 0.78;
    var px = function (u) { return width * (0.06 + u * 0.88); };

    ctx.clearRect(0, 0, width, height);

    // floor
    ctx.strokeStyle = c.line || "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, floor);
    ctx.lineTo(width, floor);
    ctx.stroke();

    // goal: a post with a hoop
    var goalX = px(GOAL_AT);
    var hoopY = floor - height * 0.42;
    ctx.strokeStyle = world.scored ? (c.pass || "#4cc38a") : (c.line || "rgba(255,255,255,0.5)");
    ctx.lineWidth = world.scored ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(goalX, floor);
    ctx.lineTo(goalX, hoopY);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(goalX - width * 0.03, hoopY, width * 0.035, height * 0.025, 0, 0, Math.PI * 2);
    ctx.stroke();

    // The game piece on the floor. Once the roller starts to pull it in, the
    // robot draws it on the indexer instead, so it is only in one place.
    if (world.pieceOnFloor && world.sensor >= EMPTY) {
      drawPiece(ctx, px(PIECE_AT), floor - height * 0.055, height * 0.055, c.piece || "#f0932b");
    }

    // a piece in flight
    if (world.shot) {
      var t = world.shot.t / 0.75;
      var endX = world.shot.good ? goalX - width * 0.03 : px(world.shot.from) + width * 0.16;
      var startX = px(world.shot.from) + width * 0.05;
      var sx = startX + (endX - startX) * t;
      var sy = floor - height * 0.30 - Math.sin(Math.PI * t) * height * 0.22 + (world.shot.good ? 0 : t * t * height * 0.4);
      drawPiece(ctx, sx, sy, height * 0.04, c.piece || "#f0932b");
    }

    drawRobot(ctx, px(world.x), floor, width, height, world, c);
  }

  /* The indexer: the path a game piece takes through the robot. It starts at
   * the roller, runs back along the floor of the robot and turns up at the
   * back. The Jamomatic is the block at the end that the piece stops against.
   *
   * The path is a list of corners. A piece is placed on it by distance along
   * the path, so the picture and the sensor reading always agree.
   */
  /* The indexer wheel sits in the middle of the robot. The game piece goes
   * half way around it: in at the front and low, under the wheel, then up and
   * back to the Jamomatic. A short straight piece joins the roller to the
   * circle. Angles are in the drawing, where y goes down the picture. */
  var ARC_START = 35 * Math.PI / 180;
  var ARC_SWEEP = Math.PI;                 // half a circle
  var ARC_STEPS = 20;

  function indexerHub(x, top, bodyW, bodyH) {
    return {
      x: x + bodyW * 0.04,
      y: top + bodyH * 0.46,
      r: Math.min(bodyW * 0.36, bodyH * 0.32)
    };
  }

  function indexerPath(x, top, bodyW, bodyH) {
    var hub = indexerHub(x, top, bodyW, bodyH);
    var points = [{ x: x + bodyW * 0.66, y: top + bodyH * 0.66 }];   // the roller
    for (var i = 0; i <= ARC_STEPS; i++) {
      var a = ARC_START + ARC_SWEEP * (i / ARC_STEPS);
      points.push({ x: hub.x + hub.r * Math.cos(a), y: hub.y + hub.r * Math.sin(a) });
    }
    return points;
  }

  function pathLengths(points) {
    var parts = [], total = 0;
    for (var i = 1; i < points.length; i++) {
      var dx = points[i].x - points[i - 1].x;
      var dy = points[i].y - points[i - 1].y;
      var len = Math.sqrt(dx * dx + dy * dy);
      parts.push(len);
      total += len;
    }
    return { parts: parts, total: total };
  }

  /* Where a piece sits after it has gone `u` of the way along, 0 to 1. */
  function pointAt(points, u) {
    var m = pathLengths(points);
    var want = Math.max(0, Math.min(1, u)) * m.total;
    for (var i = 0; i < m.parts.length; i++) {
      if (want <= m.parts[i] || i === m.parts.length - 1) {
        var f = m.parts[i] ? Math.min(1, want / m.parts[i]) : 0;
        return {
          x: points[i].x + (points[i + 1].x - points[i].x) * f,
          y: points[i].y + (points[i + 1].y - points[i].y) * f
        };
      }
      want -= m.parts[i];
    }
    return points[points.length - 1];
  }

  /* The part of the path between two positions, for colouring a zone. */
  function slicePath(points, u0, u1) {
    var out = [pointAt(points, u0)];
    var m = pathLengths(points);
    var at = 0;
    for (var i = 0; i < m.parts.length; i++) {
      at += m.parts[i] / m.total;
      if (at > u0 && at < u1) out.push(points[i + 1]);
    }
    out.push(pointAt(points, u1));
    return out;
  }

  function strokePath(ctx, points, colour, widthPx) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = widthPx;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    points.forEach(function (p, i) {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }

  /* How far along the indexer the piece is, from the sensor reading. */
  function pieceProgress(world) {
    if (world.sensor >= EMPTY) return world.hasPiece ? 1 : 0;
    return (EMPTY - world.sensor) / (EMPTY - 2);
  }

  function sensorToU(cm) { return (EMPTY - cm) / (EMPTY - 2); }

  function drawPiece(ctx, x, y, r, colour) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRobot(ctx, x, floor, width, height, world, c) {
    var bodyW = width * 0.17;
    var bodyH = height * 0.27;
    var top = floor - bodyH;

    // body
    ctx.fillStyle = c.body || "#2b6cb0";
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(x - bodyW / 2, top, bodyW, bodyH);
    ctx.fill();
    ctx.stroke();

    // wheels
    ctx.fillStyle = c.line || "rgba(255,255,255,0.5)";
    [-1, 1].forEach(function (side) {
      ctx.beginPath();
      ctx.arc(x + side * bodyW * 0.3, floor - height * 0.015, height * 0.034, 0, Math.PI * 2);
      ctx.fill();
    });

    // the shooter, on top, with a ring that fills as it comes up to speed
    if (world.shooterSpeed > 0.02) {
      ctx.strokeStyle = world.shooterSpeed > 0.9 ? (c.pass || "#4cc38a") : (c.body2 || "#57a8ff");
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, top - height * 0.04, height * 0.036,
        -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * world.shooterSpeed);
      ctx.stroke();
    }

    // The indexer, the Jamomatic and the piece travelling between them.
    if (world.showIndexer) drawIndexer(ctx, x, top, bodyW, bodyH, width, height, world, c);
    else if (world.hasPiece) drawPiece(ctx, x, top + bodyH * 0.42, height * 0.05, c.piece || "#f0932b");

    // the intake arm, hinged at the front of the body
    var hinge = { x: x + bodyW * 0.5, y: top + bodyH * 0.25 };
    var armLen = width * 0.085;
    var angle = (world.armAngle * 62) * Math.PI / 180;
    var end = { x: hinge.x + armLen * Math.cos(angle), y: hinge.y + armLen * Math.sin(angle) };

    ctx.strokeStyle = c.arm || "#9aa4b8";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(hinge.x, hinge.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // the roller on the end of the arm, with spokes so it visibly turns
    var r = height * 0.045;
    ctx.strokeStyle = world.intakeOn ? (c.piece || "#f0932b") : (c.line || "rgba(255,255,255,0.5)");
    ctx.lineWidth = world.intakeOn ? 3 : 2;
    ctx.beginPath();
    ctx.arc(end.x, end.y, r, 0, Math.PI * 2);
    ctx.stroke();
    for (var i = 0; i < 3; i++) {
      var a = world.spin + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(end.x + r * Math.cos(a), end.y + r * Math.sin(a));
      ctx.stroke();
    }
  }

  /* The ball path inside the robot, the block at the end of it, and the piece
   * on its way. The zones use the same colours as the scale under the field:
   * green where the piece is inside, red where it is against the block. */
  function drawIndexer(ctx, x, top, bodyW, bodyH, width, height, world, c) {
    var path = indexerPath(x, top, bodyW, bodyH);
    var hub = indexerHub(x, top, bodyW, bodyH);
    var ball = Math.max(4, height * 0.032);
    var track = Math.max(2, ball * 0.42);

    // The indexer wheel. The game piece rolls half way around it, so the
    // spokes show at a glance whether the indexer is still turning.
    ctx.strokeStyle = world.indexerOn && world.intakeOn
      ? (c.piece || "#f0932b") : (c.line || "rgba(255,255,255,0.5)");
    ctx.lineWidth = world.indexerOn && world.intakeOn ? 2.5 : 1.5;
    var wheel = hub.r * 0.52;
    ctx.beginPath();
    ctx.arc(hub.x, hub.y, wheel, 0, Math.PI * 2);
    ctx.stroke();
    for (var k = 0; k < 4; k++) {
      var sa = world.indexSpin + (k * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(hub.x, hub.y);
      ctx.lineTo(hub.x + wheel * Math.cos(sa), hub.y + wheel * Math.sin(sa));
      ctx.stroke();
    }

    // The track, then the two zones on it, in the colours of the scale.
    strokePath(ctx, path, "rgba(255,255,255,0.28)", track);
    strokePath(ctx, slicePath(path, sensorToU(IN_AT), sensorToU(JAM_AT)),
      c.pass || "#4cc38a", track);
    strokePath(ctx, slicePath(path, sensorToU(JAM_AT), 1), c.fail || "#f2777a", track);

    // The Jamomatic: the block across the end that the piece stops against.
    var end = path[path.length - 1];
    var before = path[path.length - 2];
    var jammed = Boolean(world.jam);
    var a = Math.atan2(end.y - before.y, end.x - before.x);
    ctx.save();
    ctx.translate(end.x, end.y);
    ctx.rotate(a);
    ctx.fillStyle = jammed ? (c.fail || "#f2777a") : (c.arm || "#9aa4b8");
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(ball * 0.35, -ball * 1.25, Math.max(3, ball * 0.62), ball * 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // The name, with a line back to the block so it is clear what it names.
    // The robot drives to both ends of the picture, so hold the name inside.
    var labelY = top - height * 0.055;
    ctx.font = "600 " + Math.max(9, Math.round(height * 0.048)) + "px system-ui, sans-serif";
    ctx.textAlign = "center";
    var half = ctx.measureText("Jamomatic").width / 2 + 4;
    var labelX = Math.max(half, Math.min(width - half, end.x));

    ctx.strokeStyle = jammed ? (c.fail || "#f2777a") : "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(end.x, end.y - ball);
    ctx.lineTo(labelX, labelY + height * 0.012);
    ctx.stroke();

    ctx.fillStyle = jammed ? (c.fail || "#f2777a") : (c.muted || "rgba(255,255,255,0.6)");
    ctx.fillText("Jamomatic", labelX, labelY);

    // The piece itself, wherever it has reached along the track.
    if (world.hasPiece || world.sensor < EMPTY) {
      var at = pointAt(path, pieceProgress(world));
      drawPiece(ctx, at.x, at.y, ball, c.piece || "#f0932b");
    }
  }

  return {
    PIECE_AT: PIECE_AT,
    EMPTY: EMPTY,
    IN_AT: IN_AT,
    JAM_AT: JAM_AT,
    GOAL_AT: GOAL_AT,
    createWorld: createWorld,
    step: step,
    draw: draw,
    shoot: shoot,
    atPiece: atPiece,
    atGoal: atGoal
  };
});
