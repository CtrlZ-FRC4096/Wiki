/*
 * Ctrl-Z Wiki — Python exercise worker.
 *
 * Runs student code in a Web Worker so a runaway loop can be killed without
 * freezing the page. Python itself is Pyodide (CPython compiled to WebAssembly),
 * downloaded from a CDN the first time somebody presses Run.
 *
 * To move to a newer Python, bump PYODIDE_VERSION and re-test the exercises.
 */

var PYODIDE_VERSION = "0.29.4";
var PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v" + PYODIDE_VERSION + "/full/";

importScripts(PYODIDE_BASE + "pyodide.js");

var pyodide = null;
var bootPromise = null;

/* The grading harness. Lives in Python so tracebacks stay readable. */
var HARNESS = [
  "import contextlib, io, json, sys, traceback",
  "",
  "def _cz_trace():",
  "    etype, evalue, tb = sys.exc_info()",
  "    if tb is not None:",
  "        tb = tb.tb_next  # hide this harness's own frame",
  "    return ''.join(traceback.format_exception(etype, evalue, tb)).rstrip()",
  "",
  "def _cz_run(user_code, tests_json):",
  "    tests = json.loads(tests_json)",
  "    result = {'stdout': '', 'error': None, 'tests': []}",
  "    ns = {'__name__': '__main__'}",
  "    out = io.StringIO()",
  "    try:",
  "        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):",
  "            exec(compile(user_code, 'your code', 'exec'), ns)",
  "    except BaseException:",
  "        result['stdout'] = out.getvalue()",
  "        result['error'] = _cz_trace()",
  "        return json.dumps(result)",
  "    for test in tests:",
  "        entry = {'name': test.get('name', 'check'), 'passed': True, 'message': ''}",
  "        label = 'check: ' + entry['name']",
  "        try:",
  "            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):",
  "                exec(compile(test['code'], label, 'exec'), ns)",
  "        except AssertionError as exc:",
  "            entry['passed'] = False",
  "            entry['message'] = str(exc) or 'This check failed.'",
  "        except BaseException as exc:",
  "            entry['passed'] = False",
  "            entry['message'] = type(exc).__name__ + ': ' + str(exc)",
  "        result['tests'].append(entry)",
  "    result['stdout'] = out.getvalue()",
  "    return json.dumps(result)",
  ""
].join("\n");

function boot() {
  if (!bootPromise) {
    bootPromise = loadPyodide({ indexURL: PYODIDE_BASE }).then(function (py) {
      pyodide = py;
      pyodide.runPython(HARNESS);
    });
  }
  return bootPromise;
}

self.onmessage = function (event) {
  var msg = event.data || {};
  var id = msg.id;

  self.postMessage({ id: id, type: "status", message: pyodide ? "Running…" : "Downloading Python (first run only)…" });

  boot().then(function () {
    self.postMessage({ id: id, type: "status", message: "Running…" });
    var runner = pyodide.globals.get("_cz_run");
    var raw;
    try {
      raw = runner(msg.code || "", JSON.stringify(msg.tests || []));
    } finally {
      runner.destroy();
    }
    self.postMessage({ id: id, type: "result", payload: JSON.parse(raw) });
  }).catch(function (err) {
    bootPromise = null;
    self.postMessage({ id: id, type: "fatal", message: String((err && err.message) || err) });
  });
};
