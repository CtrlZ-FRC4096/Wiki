#!/usr/bin/env node
/*
 * Encrypt the answers so the website does not contain them.
 *
 * A password that only hides a button is not a password: the answer is still
 * in the page, and any student who opens the developer tools can read it. So
 * the answers are encrypted here, and the page ships the ciphertext. It turns
 * back into text in the browser, once, when somebody types the password.
 *
 * The password never goes into the repository. Pass it in:
 *
 *     CZ_ANSWER_PASSWORD='...' node tools/lock-answers.js
 *
 * Run it again whenever you change a solution. `node tools/lock-answers.js
 * --check` says whether anything has drifted, and needs no password.
 *
 * What this does not do: the exercise files in _data/ still hold the answers
 * in plain text, because the validators grade with them, and this repository
 * is public. This keeps the answers off the website. It does not keep them
 * off GitHub.
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "_data", "locked.yml");
const ITERATIONS = 150000;
const PHRASE = "the answers are unlocked";

/* Every answer the website would otherwise hand out. */
function answers() {
  const found = {};
  for (const [prefix, dir] of [["exercise", "exercises"], ["oi", "oi_tasks"]]) {
    const folder = path.join(ROOT, "_data", dir);
    if (!fs.existsSync(folder)) continue;
    for (const file of fs.readdirSync(folder).filter((f) => f.endsWith(".yml"))) {
      const text = fs.readFileSync(path.join(folder, file), "utf8");
      const solution = block(text, "solution");
      if (solution) found[prefix + "." + file.replace(/\.yml$/, "")] = solution;
    }
  }
  return found;
}

/* Everything the exercises deliberately give away: every starter, prompt and
 * hint, from every exercise. One exercise often hands you the answer to an
 * earlier one on purpose, so a line found here belongs on the site and the
 * audit must not call it a leak. */
function givenAway() {
  let all = "";
  for (const dir of ["exercises", "oi_tasks"]) {
    const folder = path.join(ROOT, "_data", dir);
    if (!fs.existsSync(folder)) continue;
    for (const file of fs.readdirSync(folder).filter((f) => f.endsWith(".yml"))) {
      const text = fs.readFileSync(path.join(folder, file), "utf8");
      const at = text.indexOf("\nsolution: |");
      all += (at === -1 ? text : text.slice(0, at)) + "\n";
    }
  }
  return all;
}

/* Read one `name: |` block out of a YAML file. The files here are simple
 * enough that this beats taking on a YAML dependency. */
function block(text, name) {
  const marker = "\n" + name + ": |";
  const at = text.indexOf(marker);
  if (at === -1) return null;
  const body = text.slice(text.indexOf("\n", at + 1) + 1);
  const lines = [];
  for (const line of body.split("\n")) {
    if (line.trim() && !line.startsWith("  ")) break;
    lines.push(line.replace(/^ {2}/, ""));
  }
  return lines.join("\n").trimEnd();
}

const sha = (text) => crypto.createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);

function encrypt(key, text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(text, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return { iv: iv.toString("base64"), data: data.toString("base64") };
}

function quote(text) {
  return '"' + String(text).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

/* ---- is what we shipped still what the answers say? ---- */

function readLocked() {
  if (!fs.existsSync(OUT)) return null;
  const text = fs.readFileSync(OUT, "utf8");
  const out = { answers: {} };
  let current = null;
  for (const line of text.split("\n")) {
    const top = line.match(/^([a-z]+):\s*(.*)$/);
    if (top && top[1] !== "answers") {
      out[top[1]] = top[2].replace(/^"|"$/g, "");
      continue;
    }
    const id = line.match(/^ {2}(\S.*?):\s*$/);
    if (id) {
      current = id[1];
      out.answers[current] = {};
      continue;
    }
    const field = line.match(/^    ([a-z]+):\s*"?([^"]*)"?\s*$/);
    if (field && current) out.answers[current][field[1]] = field[2];
  }
  return out;
}

function check() {
  const locked = readLocked();
  const now = answers();
  if (!locked) {
    console.log("FAIL  there is no _data/locked.yml. Run this with a password.");
    return 1;
  }
  let bad = 0;
  for (const [id, text] of Object.entries(now)) {
    const have = locked.answers[id];
    if (!have) {
      console.log("FAIL  %s has no locked copy", id);
      bad++;
    } else if (have.sha !== sha(text)) {
      console.log("FAIL  %s changed since it was locked", id);
      bad++;
    }
  }
  for (const id of Object.keys(locked.answers)) {
    if (!(id in now)) {
      console.log("FAIL  %s is locked but no longer exists", id);
      bad++;
    }
  }
  console.log(bad === 0
    ? "ok    all " + Object.keys(now).length + " answers are locked and current"
    : bad + " problem(s). Run: CZ_ANSWER_PASSWORD='...' node tools/lock-answers.js");
  return bad === 0 ? 0 : 1;
}

/* ---- lock them ---- */

function lock(password) {
  const found = answers();
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256");

  const lines = [
    "# Written by tools/lock-answers.js. Do not edit by hand.",
    "#",
    "# The answers, encrypted with the team password. The website ships this",
    "# and never the answers themselves. Run the tool again after you change a",
    "# solution, or `node tools/lock-answers.js --check` to see if you need to.",
    "salt: " + quote(salt.toString("base64")),
    "iterations: " + ITERATIONS,
    "phrase: " + quote(PHRASE),
    "check:"
  ];
  const proof = encrypt(key, PHRASE);
  lines.push("  iv: " + quote(proof.iv));
  lines.push("  data: " + quote(proof.data));
  lines.push("answers:");
  for (const id of Object.keys(found).sort()) {
    const blob = encrypt(key, found[id]);
    lines.push("  " + id + ":");
    lines.push("    iv: " + quote(blob.iv));
    lines.push("    data: " + quote(blob.data));
    lines.push("    sha: " + quote(sha(found[id])));
  }
  fs.writeFileSync(OUT, lines.join("\n") + "\n");
  console.log("locked %d answers into _data/locked.yml", Object.keys(found).length);
  return 0;
}

/* ---- did any answer reach the built site? ---- */

function audit() {
  const site = path.join(ROOT, "_site");
  if (!fs.existsSync(site)) {
    console.log("FAIL  there is no _site. Build first, then audit.");
    return 1;
  }
  const pages = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html") || entry.name.endsWith(".json")) pages.push(full);
    }
  })(site);

  const text = pages.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  const elsewhere = givenAway();
  let leaks = 0;
  for (const [id, answer] of Object.entries(answers())) {
    // The longest real line of the answer. If that is on the site, so is the
    // answer.
    const line = answer
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 25 && !l.startsWith("#") && !elsewhere.includes(l))
      .sort((a, b) => b.length - a.length)[0];
    if (!line) continue;
    if (text.includes(line)) {
      console.log("FAIL  %s is readable on the site: %s", id, line.slice(0, 60));
      leaks++;
    }
  }
  console.log(leaks === 0
    ? "ok    none of the " + Object.keys(answers()).length + " answers reached the built site"
    : leaks + " answer(s) leaked into the site");
  return leaks === 0 ? 0 : 1;
}

if (process.argv.includes("--audit")) {
  process.exit(audit());
}

if (process.argv.includes("--check")) {
  process.exit(check());
}

const password = process.env.CZ_ANSWER_PASSWORD;
if (!password) {
  console.error("Set the password first:\n\n  CZ_ANSWER_PASSWORD='...' node tools/lock-answers.js\n");
  process.exit(2);
}
process.exit(lock(password));
