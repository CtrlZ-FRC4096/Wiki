/*
 * Ctrl-Z Wiki — interactive Python exercises.
 *
 * Wires up every `.cz-exercise` block on the page. Nothing is downloaded until
 * a student presses Run, so pages with exercises stay as light as any other
 * wiki page until they are actually used.
 */
(function () {
  "use strict";

  var RUN_TIMEOUT_MS = 20000;
  var STORAGE_PREFIX = "czwiki.exercise.";

  var worker = null;
  var workerSrc = null;
  var pending = {};
  var nextRunId = 1;

  function getWorker(src) {
    if (!worker) {
      workerSrc = src;
      worker = new Worker(src);
      worker.onmessage = function (event) {
        var msg = event.data || {};
        var entry = pending[msg.id];
        if (!entry) return;
        if (msg.type === "status") {
          entry.onStatus(msg.message);
          return;
        }
        window.clearTimeout(entry.timer);
        delete pending[msg.id];
        if (msg.type === "result") entry.onResult(msg.payload);
        else entry.onFatal(msg.message);
      };
      worker.onerror = function (event) {
        Object.keys(pending).forEach(function (id) {
          window.clearTimeout(pending[id].timer);
          pending[id].onFatal(event.message || "The Python sandbox failed to start.");
          delete pending[id];
        });
        killWorker();
      };
    }
    return worker;
  }

  function killWorker() {
    if (worker) {
      worker.terminate();
      worker = null;
    }
  }

  function runPython(src, code, tests, setup, handlers) {
    var id = nextRunId++;
    pending[id] = {
      onStatus: handlers.onStatus,
      onResult: handlers.onResult,
      onFatal: handlers.onFatal,
      timer: window.setTimeout(function () {
        delete pending[id];
        killWorker();
        handlers.onFatal(
          "Your code operated for more than " + RUN_TIMEOUT_MS / 1000 +
          " seconds. The page stopped it. Usually a loop does not end."
        );
      }, RUN_TIMEOUT_MS)
    };
    getWorker(src).postMessage({ id: id, code: code, tests: tests, setup: setup });
  }

  /* ------------------------------------------------------------------ */
  /* Editor behaviour: a plain textarea that behaves enough like an IDE. */
  /* ------------------------------------------------------------------ */

  function autoSize(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = Math.max(textarea.scrollHeight, 120) + "px";
  }

  function replaceSelection(textarea, text) {
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    textarea.setRangeText(text, start, end, "end");
  }

  function currentLineIndent(textarea) {
    var upto = textarea.value.slice(0, textarea.selectionStart);
    var line = upto.slice(upto.lastIndexOf("\n") + 1);
    return (line.match(/^[ \t]*/) || [""])[0];
  }

  function bindEditor(textarea, onRun) {
    autoSize(textarea);
    textarea.addEventListener("input", function () { autoSize(textarea); });

    textarea.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        onRun();
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        if (event.shiftKey) {
          var start = textarea.selectionStart;
          var lineStart = textarea.value.lastIndexOf("\n", start - 1) + 1;
          var head = textarea.value.slice(lineStart, lineStart + 4);
          var trim = head.match(/^ {1,4}/);
          if (trim) {
            textarea.setRangeText("", lineStart, lineStart + trim[0].length, "end");
            textarea.selectionStart = textarea.selectionEnd = start - trim[0].length;
          }
        } else {
          replaceSelection(textarea, "    ");
        }
        autoSize(textarea);
        return;
      }

      if (event.key === "Enter") {
        var indent = currentLineIndent(textarea);
        var before = textarea.value.slice(0, textarea.selectionStart).trimEnd();
        if (before.endsWith(":")) indent += "    ";
        if (indent) {
          event.preventDefault();
          replaceSelection(textarea, "\n" + indent);
          autoSize(textarea);
        }
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Rendering results                                                   */
  /* ------------------------------------------------------------------ */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderResult(output, payload) {
    output.innerHTML = "";

    if (payload.stdout) {
      var printed = el("div", "cz-exercise__stdout");
      printed.appendChild(el("div", "cz-exercise__stdout-label", "Printed output"));
      printed.appendChild(el("pre", null, payload.stdout.replace(/\s+$/, "")));
      output.appendChild(printed);
    }

    if (payload.error) {
      var box = el("div", "cz-exercise__error");
      box.appendChild(el("div", "cz-exercise__error-label", "Your code did not operate"));
      box.appendChild(el("pre", null, payload.error));
      output.appendChild(box);
      return false;
    }

    var list = el("ul", "cz-exercise__checks");
    var allPassed = true;
    payload.tests.forEach(function (test) {
      if (!test.passed) allPassed = false;
      var item = el("li", "cz-exercise__check " + (test.passed ? "is-pass" : "is-fail"));
      item.appendChild(el("span", "cz-exercise__check-icon", test.passed ? "✓" : "✗"));
      var body = el("span", "cz-exercise__check-body");
      body.appendChild(el("span", "cz-exercise__check-name", test.name));
      if (!test.passed && test.message) {
        body.appendChild(el("span", "cz-exercise__check-message", test.message));
      }
      item.appendChild(body);
      list.appendChild(item);
    });
    output.appendChild(list);

    if (payload.tests.length) {
      output.appendChild(
        el(
          "p",
          "cz-exercise__verdict " + (allPassed ? "is-pass" : "is-fail"),
          allPassed ? "All the checks passed." : "One or more checks failed. Read the message above, then correct your code."
        )
      );
    }
    return allPassed;
  }

  /* ------------------------------------------------------------------ */

  function setup(root) {
    var id = root.getAttribute("data-exercise-id");
    var workerUrl = root.getAttribute("data-worker-url");
    var dataNode = root.querySelector(".cz-exercise__data");
    if (!dataNode) return;
    var data = JSON.parse(dataNode.textContent);

    var textarea = root.querySelector(".cz-exercise__code");
    var output = root.querySelector(".cz-exercise__output");
    var status = root.querySelector(".cz-exercise__status");
    var runBtn = root.querySelector('[data-action="run"]');
    var resetBtn = root.querySelector('[data-action="reset"]');
    var hintBtn = root.querySelector('[data-action="hint"]');
    var solutionBtn = root.querySelector('[data-action="solution"]');
    var hintBox = root.querySelector(".cz-exercise__hints");

    var storageKey = STORAGE_PREFIX + id;
    var solvedKey = storageKey + ".solved";

    function store(key, value) {
      try { window.localStorage.setItem(key, value); } catch (e) { /* private mode */ }
    }
    function load(key) {
      try { return window.localStorage.getItem(key); } catch (e) { return null; }
    }

    var saved = load(storageKey);
    if (saved !== null) textarea.value = saved;
    if (load(solvedKey) === "1") root.classList.add("is-solved");

    textarea.addEventListener("input", function () { store(storageKey, textarea.value); });

    function run() {
      runBtn.disabled = true;
      root.classList.add("is-running");
      output.innerHTML = "";
      status.textContent = "Starting…";

      runPython(workerUrl, textarea.value, data.tests || [], data.setup || "", {
        onStatus: function (message) { status.textContent = message; },
        onResult: function (payload) {
          runBtn.disabled = false;
          root.classList.remove("is-running");
          status.textContent = "";
          var passed = renderResult(output, payload);
          if (passed && (data.tests || []).length) {
            root.classList.add("is-solved");
            store(solvedKey, "1");
          } else {
            root.classList.remove("is-solved");
            store(solvedKey, "0");
          }
        },
        onFatal: function (message) {
          runBtn.disabled = false;
          root.classList.remove("is-running");
          status.textContent = "";
          output.innerHTML = "";
          var box = el("div", "cz-exercise__error");
          box.appendChild(el("div", "cz-exercise__error-label", "Stopped"));
          box.appendChild(el("pre", null, message));
          output.appendChild(box);
        }
      });
    }

    runBtn.addEventListener("click", run);
    bindEditor(textarea, run);

    resetBtn.addEventListener("click", function () {
      textarea.value = data.starter || "";
      store(storageKey, textarea.value);
      output.innerHTML = "";
      status.textContent = "";
      autoSize(textarea);
      textarea.focus();
    });

    if (hintBtn) {
      var hintsShown = 0;
      hintBtn.addEventListener("click", function () {
        hintBox.hidden = false;
        hintsShown += 1;
        hintBox.innerHTML = "";
        (data.hints || []).slice(0, hintsShown).forEach(function (hint, index) {
          var item = el("div", "cz-exercise__hint");
          item.appendChild(el("strong", null, "Hint " + (index + 1) + ": "));
          item.appendChild(document.createTextNode(hint));
          hintBox.appendChild(item);
        });
        if (hintsShown >= (data.hints || []).length) hintBtn.disabled = true;
      });
    }

    /* The answer is not in the page. It is encrypted, and it only becomes text
     * once somebody types the team password. */
    if (solutionBtn) {
      solutionBtn.addEventListener("click", function () {
        if (!window.confirm("Show one working solution? Try the hints first — you learn more from a failed attempt than from reading an answer.")) return;

        var node = root.querySelector(".cz-exercise__locked");
        var blob = null;
        try {
          blob = node ? JSON.parse(node.textContent) : null;
        } catch (err) {
          blob = null;
        }
        if (!blob || !window.CZLock) {
          status.textContent = "The answer is not on this page.";
          return;
        }

        solutionBtn.disabled = true;
        window.CZLock.reveal(blob, "one working solution").then(function (solution) {
          if (!solution) {
            solutionBtn.disabled = false;   // wrong password, or they changed their mind
            return;
          }
          textarea.value = solution;
          store(storageKey, textarea.value);
          autoSize(textarea);
        });
      });
    }
  }

  function init() {
    // .cz-exercise is the shared styling class every widget uses. Select the
    // Python exercises specifically, or this script picks up a tuning
    // simulator or a swerve dial and fails on the missing data.
    var blocks = document.querySelectorAll(".cz-pyex");
    for (var i = 0; i < blocks.length; i++) setup(blocks[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
