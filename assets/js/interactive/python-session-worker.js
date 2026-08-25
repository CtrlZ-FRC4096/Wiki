/*
 * Ctrl-Z Wiki — long-lived Python session for the operator interface task.
 *
 * Unlike python-worker.js, which runs a snippet once and reports back, this
 * worker keeps a Python interpreter alive: the student's bindings are loaded
 * once, then fed button events every robot loop, exactly like oi.py on the
 * real robot.
 *
 * The Python side gets a stand-in for XboxCommandController with the same
 * decorator names our robot code uses, so what students write here is what
 * they would write in robot/oi.py.
 */

var PYODIDE_VERSION = "0.29.4";
var PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v" + PYODIDE_VERSION + "/full/";
importScripts(PYODIDE_BASE + "pyodide.js");

var pyodide = null;
var bootPromise = null;

var SHIM = [
  "import json, sys, traceback",
  "",
  "BUTTONS = ['A','B','X','Y','LEFT_BUMPER','RIGHT_BUMPER','START','BACK',",
  "           'LEFT_TRIGGER_AS_BUTTON','RIGHT_TRIGGER_AS_BUTTON',",
  "           'POV_UP','POV_DOWN','POV_LEFT','POV_RIGHT']",
  "",
  "class _Binding:",
  "    \"\"\"One button on the controller. Decorators match wpilibextra's CustomButton.\"\"\"",
  "    def __init__(self, name, registry):",
  "        self._name = name",
  "        self._registry = registry",
  "",
  "    def _add(self, kind, fn):",
  "        if not callable(fn):",
  "            raise TypeError('whenPressed/whenHeld/whenReleased take a function')",
  "        self._registry.setdefault((self._name, kind), []).append(fn)",
  "        return fn",
  "",
  "    def whenPressed(self, fn):  return self._add('pressed', fn)",
  "    def whenHeld(self, fn):     return self._add('held', fn)",
  "    def whenReleased(self, fn): return self._add('released', fn)",
  "",
  "class _POV:",
  "    def __init__(self, registry):",
  "        self.UP = _Binding('POV_UP', registry)",
  "        self.DOWN = _Binding('POV_DOWN', registry)",
  "        self.LEFT = _Binding('POV_LEFT', registry)",
  "        self.RIGHT = _Binding('POV_RIGHT', registry)",
  "",
  "class Controller:",
  "    def __init__(self, registry):",
  "        for name in BUTTONS:",
  "            if not name.startswith('POV_'):",
  "                setattr(self, name, _Binding(name, registry))",
  "        self.POV = _POV(registry)",
  "",
  "class Robot:",
  "    \"\"\"What the bindings are allowed to change. The physics lives in the page.\"\"\"",
  "    def __init__(self):",
  "        self.intake_running = False",
  "        self.shooter_spinning = False",
  "        self.shoot = False",
  "",
  "    def _state(self):",
  "        return {'intake_running': bool(self.intake_running),",
  "                'shooter_spinning': bool(self.shooter_spinning),",
  "                'shoot': bool(self.shoot)}",
  "",
  "_registry = {}",
  "driver = Controller(_registry)",
  "robot = Robot()",
  "_previous = {}",
  "",
  "def _cz_load(source):",
  "    global _registry, driver, robot, _previous",
  "    _registry = {}",
  "    driver = Controller(_registry)",
  "    robot = Robot()",
  "    _previous = {}",
  "    ns = {'driver': driver, 'robot': robot, '__name__': '__main__'}",
  "    try:",
  "        exec(compile(source, 'your bindings', 'exec'), ns)",
  "    except BaseException:",
  "        etype, evalue, tb = sys.exc_info()",
  "        if tb is not None: tb = tb.tb_next",
  "        return json.dumps({'error': ''.join(traceback.format_exception(etype, evalue, tb)).rstrip()})",
  "    bound = sorted({name for (name, kind) in _registry})",
  "    kinds = sorted({name + ':' + kind for (name, kind) in _registry})",
  "    return json.dumps({'error': None, 'bound': bound, 'kinds': kinds})",
  "",
  "def _cz_tick(buttons_json):",
  "    \"\"\"One robot loop: fire edge and held callbacks, hand back robot intent.\"\"\"",
  "    buttons = json.loads(buttons_json)",
  "    robot.shoot = False  # a pulse, not a latch",
  "    errors = []",
  "    for name in BUTTONS:",
  "        now = bool(buttons.get(name, False))",
  "        was = bool(_previous.get(name, False))",
  "        fire = []",
  "        if now and not was: fire.append('pressed')",
  "        if now:             fire.append('held')",
  "        if was and not now: fire.append('released')",
  "        for kind in fire:",
  "            for fn in _registry.get((name, kind), []):",
  "                try:",
  "                    fn()",
  "                except BaseException as exc:",
  "                    errors.append(name + ' ' + kind + ': ' + type(exc).__name__ + ': ' + str(exc))",
  "        _previous[name] = now",
  "    out = robot._state()",
  "    out['errors'] = errors",
  "    return json.dumps(out)",
  ""
].join("\n");

function boot() {
  if (!bootPromise) {
    bootPromise = loadPyodide({ indexURL: PYODIDE_BASE }).then(function (py) {
      pyodide = py;
      pyodide.runPython(SHIM);
    });
  }
  return bootPromise;
}

function call(name, arg) {
  var fn = pyodide.globals.get(name);
  try {
    return JSON.parse(fn(arg));
  } finally {
    fn.destroy();
  }
}

self.onmessage = function (event) {
  var msg = event.data || {};

  if (msg.type === "load") {
    self.postMessage({ id: msg.id, type: "status", message: pyodide ? "Loading bindings…" : "Downloading Python (first time only)…" });
    boot()
      .then(function () { self.postMessage({ id: msg.id, type: "loaded", payload: call("_cz_load", msg.code || "") }); })
      .catch(function (err) {
        bootPromise = null;
        self.postMessage({ id: msg.id, type: "fatal", message: String((err && err.message) || err) });
      });
    return;
  }

  if (msg.type === "tick") {
    if (!pyodide) return;
    try {
      self.postMessage({ id: msg.id, type: "state", payload: call("_cz_tick", JSON.stringify(msg.buttons || {})) });
    } catch (err) {
      self.postMessage({ id: msg.id, type: "fatal", message: String((err && err.message) || err) });
    }
  }
};
