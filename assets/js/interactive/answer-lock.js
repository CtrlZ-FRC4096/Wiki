/*
 * Ctrl-Z Wiki — the lock on the answers.
 *
 * The answers are not in the page. They are encrypted with the team password
 * and only turn back into text once somebody types it. That is the difference
 * between a password and a curtain: a curtain still has the answer behind it,
 * in the page source, for anyone who opens the developer tools.
 *
 * `tools/lock-answers.js` does the encrypting. This does the unlocking.
 *
 * What this cannot do: the wiki is a public repository, so the answers are
 * still readable in _data/exercises/*.yml on GitHub. This stops a student
 * clicking the answer. It does not stop a student who goes looking.
 */
(function (root) {
  "use strict";

  var STORE = "cz-answer-key";
  var cache = null;          // the derived key, once per page
  var asked = null;          // a pending prompt, so two buttons share one

  function bytes(base64) {
    var raw = atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function config() {
    var node = document.querySelector("#cz-answer-lock");
    if (!node) return null;
    try {
      return JSON.parse(node.textContent);
    } catch (err) {
      return null;
    }
  }

  /* Turn the password into an AES key. Slow on purpose: it makes guessing the
   * password expensive. */
  function deriveKey(password, cfg) {
    var encoder = new TextEncoder();
    return crypto.subtle
      .importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"])
      .then(function (material) {
        return crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: bytes(cfg.salt),
            iterations: cfg.iterations,
            hash: "SHA-256"
          },
          material,
          { name: "AES-GCM", length: 256 },
          false,
          ["decrypt"]
        );
      });
  }

  function decryptWith(key, blob) {
    return crypto.subtle
      .decrypt({ name: "AES-GCM", iv: bytes(blob.iv) }, key, bytes(blob.data))
      .then(function (plain) {
        return new TextDecoder().decode(plain);
      });
  }

  /* Does this key really open the answers? The config carries a known phrase
   * encrypted the same way, so a wrong password fails here and not later with
   * a mess on the screen. */
  function verify(key, cfg) {
    return decryptWith(key, cfg.check).then(function (text) {
      return text === cfg.phrase ? key : null;
    }).catch(function () {
      return null;
    });
  }

  function remembered() {
    try {
      return window.localStorage.getItem(STORE);
    } catch (err) {
      return null;
    }
  }

  function remember(password) {
    try {
      window.localStorage.setItem(STORE, password);
    } catch (err) {
      /* A browser that refuses to remember just asks again next time. */
    }
  }

  function forget() {
    try {
      window.localStorage.removeItem(STORE);
    } catch (err) {}
    cache = null;
  }

  /* Get a key, asking for the password if this browser has not been told it.
   * Resolves with null if the person changes their mind. */
  function unlock(what) {
    if (cache) return Promise.resolve(cache);
    if (asked) return asked;

    var cfg = config();
    if (!cfg || !root.crypto || !root.crypto.subtle) {
      return Promise.resolve(null);
    }

    var saved = remembered();
    var start = saved
      ? deriveKey(saved, cfg).then(function (key) { return verify(key, cfg); })
      : Promise.resolve(null);

    asked = start.then(function (key) {
      if (key) return key;
      return ask(cfg, what || "the answer");
    }).then(function (key) {
      asked = null;
      if (key) cache = key;
      return key;
    });
    return asked;
  }

  function ask(cfg, what) {
    var tries = 0;
    function round() {
      var password = window.prompt(
        tries === 0
          ? "The answers are locked. Ask a mentor for the password.\n\n" +
            "You are about to see " + what + "."
          : "That password did not work. Try again, or press Cancel."
      );
      if (password === null) return Promise.resolve(null);
      return deriveKey(password, cfg)
        .then(function (key) { return verify(key, cfg); })
        .then(function (key) {
          if (key) {
            remember(password);
            return key;
          }
          tries += 1;
          return tries < 3 ? round() : null;
        });
    }
    return round();
  }

  /* Unlock, then turn one encrypted blob back into text. */
  function reveal(blob, what) {
    if (!blob) return Promise.resolve(null);
    return unlock(what).then(function (key) {
      if (!key) return null;
      return decryptWith(key, blob).catch(function () { return null; });
    });
  }

  root.CZLock = {
    locked: function () { return Boolean(config()); },
    unlock: unlock,
    reveal: reveal,
    forget: forget
  };
})(typeof self !== "undefined" ? self : this);
