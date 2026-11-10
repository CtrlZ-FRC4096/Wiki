/*
 * Ctrl-Z Wiki — Python exercise worker.
 *
 * Runs student code in a Web Worker so a runaway loop can be killed without
 * freezing the page. Python itself is Pyodide (CPython compiled to WebAssembly),
 * downloaded from a CDN the first time somebody presses Run.
 *
 * To move to a newer Python, bump PYODIDE_VERSION and re-test the exercises.
 *
 * An exercise can also ask for a library of plain-Python modules, such as the
 * browser copy of RobotPy in assets/py/robotpy. The page sends the URL of its
 * manifest.json. The worker downloads the files one time, writes them into
 * Pyodide's file system, and removes the modules from sys.modules before each
 * run, so every run imports them again and starts from a clean state.
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
  "def _cz_run(user_code, tests_json, setup_code=''):",
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
  "    # Anything the checks share goes in after the student's code, so that",
  "    # the checks always get the harness the exercise intended.",
  "    if setup_code:",
  "        try:",
  "            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):",
  "                exec(compile(setup_code, 'the checks', 'exec'), ns)",
  "        except BaseException:",
  "            result['stdout'] = out.getvalue()",
  "            result['error'] = _cz_trace()",
  "            return json.dumps(result)",
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
  "",
  "def _cz_forget(packages_json):",
  "    # Remove a library's modules, so the next import runs them again.",
  "    packages = json.loads(packages_json)",
  "    for name in list(sys.modules):",
  "        if any(name == p or name.startswith(p + '.') for p in packages):",
  "            del sys.modules[name]",
  "",
  "def _cz_add_path(path):",
  "    import importlib",
  "    if path not in sys.path:",
  "        sys.path.insert(0, path)",
  "    importlib.invalidate_caches()",
  ""
].join("\n");

var libraries = {};

/* Download a library's files one time and write them into Pyodide's files. */
function loadLibrary(url) {
  if (!libraries[url]) {
    var cut = url.indexOf("?");
    var query = cut === -1 ? "" : url.slice(cut);
    var base = (cut === -1 ? url : url.slice(0, cut)).replace(/[^\/]*$/, "");
    var name = base.replace(/\/$/, "").split("/").pop() || "lib";
    var root = "/home/pyodide/czlib/" + name;
    libraries[url] = fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error("Could not download " + url + " (" + response.status + ")");
        return response.json();
      })
      .then(function (manifest) {
        return Promise.all(manifest.files.map(function (file) {
          return fetch(base + file + query).then(function (response) {
            if (!response.ok) throw new Error("Could not download " + file + " (" + response.status + ")");
            return response.text().then(function (text) { return { file: file, text: text }; });
          });
        })).then(function (files) {
          files.forEach(function (entry) {
            var path = root + "/" + entry.file;
            pyodide.FS.mkdirTree(path.replace(/\/[^\/]*$/, ""));
            pyodide.FS.writeFile(path, entry.text);
          });
          var addPath = pyodide.globals.get("_cz_add_path");
          try { addPath(root); } finally { addPath.destroy(); }
          return { packages: manifest.packages || [] };
        });
      })
      .catch(function (err) {
        delete libraries[url];
        throw err;
      });
  }
  return libraries[url];
}

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
    if (!msg.library) return null;
    self.postMessage({ id: id, type: "status", message: "Loading the robot libraries…" });
    return loadLibrary(msg.library);
  }).then(function (library) {
    self.postMessage({ id: id, type: "status", message: "Running…" });
    if (library) {
      var forget = pyodide.globals.get("_cz_forget");
      try { forget(JSON.stringify(library.packages)); } finally { forget.destroy(); }
    }
    var runner = pyodide.globals.get("_cz_run");
    var raw;
    try {
      raw = runner(msg.code || "", JSON.stringify(msg.tests || []), msg.setup || "");
    } finally {
      runner.destroy();
    }
    self.postMessage({ id: id, type: "result", payload: JSON.parse(raw) });
  }).catch(function (err) {
    bootPromise = null;
    self.postMessage({ id: id, type: "fatal", message: String((err && err.message) || err) });
  });
};
