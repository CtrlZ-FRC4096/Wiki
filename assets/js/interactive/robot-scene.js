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
      sensor: 40            // centimetres to the piece in the intake
    };
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
    if (world.pieceOnFloor && world.intakeOn && world.armAngle > 0.8 &&
        Math.abs(world.x - PIECE_AT) < REACH) {
      world.sensor = Math.max(2, world.sensor - 55 * dt);
      if (world.sensor <= 4) {
        world.pieceOnFloor = false;
        world.hasPiece = true;
      }
    } else if (!world.hasPiece) {
      world.sensor = Math.min(40, world.sensor + 60 * dt);
    }

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

    // the game piece on the floor
    if (world.pieceOnFloor) {
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

    // the piece the robot is carrying
    if (world.hasPiece) {
      drawPiece(ctx, x, top + bodyH * 0.42, height * 0.05, c.piece || "#f0932b");
    }

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

  return {
    PIECE_AT: PIECE_AT,
    GOAL_AT: GOAL_AT,
    createWorld: createWorld,
    step: step,
    draw: draw,
    shoot: shoot,
    atPiece: atPiece,
    atGoal: atGoal
  };
});
