#!/usr/bin/env node
/*
 * Checks the tutorial pages against the parts of ASD-STE100 that a script can
 * measure.
 *
 *   node tools/check-ste.js [file ...]
 *
 * No dependencies. With no arguments it checks every interactive tutorial.
 *
 * This is a helper, not a certification. It measures sentence length, banned
 * words, contractions and paragraph length. It cannot check whether a word is
 * used in its approved part of speech, so read the result rather than trusting
 * a clean report.
 */
const fs = require("fs");
const path = require("path");

const MAX_WORDS = 25;        // STE limit for a descriptive sentence
const TARGET_WORDS = 20;     // STE limit for a procedural sentence
const MAX_SENTENCES = 6;     // STE limit for a paragraph

// Words and phrases that are informal, figurative, or ambiguous. STE wants
// one meaning for one word, and no idioms.
const BANNED = [
  "a bit", "backfire", "bail out", "big deal", "bite", "blow past", "clean up",
  "come back to", "crawl", "cute", "dribble", "earn its keep", "eat into",
  "figure out", "get away with", "give it a go", "gotcha", "hunt for",
  "kill the", "knock", "laid out", "let alone", "lousy", "mess", "muscle memory",
  "nail it", "neat", "nice work", "on the fly", "paper over", "pick up on",
  "pin down", "play with", "pretty much", "ring", "sail", "scream", "shave",
  "smack", "sneak", "sort out", "stumble", "sweet spot", "take a look",
  "tricky", "wobble", "work out", "wrap up"
];

const CONTRACTIONS = /\b\w+['’](s|t|re|ll|ve|d|m)\b/gi;

function stripMarkdown(text) {
  return text
    .replace(/^---[\s\S]*?^---/m, "")            // front matter
    .replace(/```[\s\S]*?```/g, "")              // fenced code
    .replace(/^\s*\|.*\|\s*$/gm, "")             // tables
    .replace(/<[^>]+>/g, "")                     // inline html
    .replace(/\{[%:][\s\S]*?[%}]\}/g, "")        // liquid and kramdown attrs
    .replace(/`[^`]*`/g, "CODE")                 // inline code counts as a word
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")     // links keep their text
    .replace(/^#{1,6}\s.*/gm, "")                // headings
    // STE encourages vertical lists, so each item is its own unit rather than
    // part of a long paragraph. Give every item its own block.
    .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, "\n\n")
    // A blockquote line is its own unit for the same reason.
    .replace(/^\s*>\s?/gm, "\n\n")
    .replace(/[*_]/g, "");
}

function sentencesOf(block) {
  return block
    .split(/(?<=[.!?:])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

function check(file) {
  const raw = fs.readFileSync(file, "utf8");
  const body = stripMarkdown(raw);
  const findings = [];

  body.split(/\n\s*\n/).forEach((para) => {
    const clean = para.replace(/\s+/g, " ").trim();
    if (!clean) return;
    const sentences = sentencesOf(clean);
    if (sentences.length > MAX_SENTENCES) {
      findings.push({ kind: "paragraph", detail: `${sentences.length} sentences (limit ${MAX_SENTENCES})`, text: clean.slice(0, 60) });
    }
    sentences.forEach((sentence) => {
      const words = sentence.split(/\s+/).filter(Boolean).length;
      if (words > MAX_WORDS) {
        findings.push({ kind: "long", detail: `${words} words (limit ${MAX_WORDS})`, text: sentence.slice(0, 70) });
      } else if (words > TARGET_WORDS) {
        findings.push({ kind: "long-ish", detail: `${words} words (procedural limit ${TARGET_WORDS})`, text: sentence.slice(0, 70) });
      }
    });
  });

  const lower = body.toLowerCase();
  BANNED.forEach((word) => {
    const re = new RegExp("\\b" + word.replace(/ /g, "\\s+") + "\\b", "g");
    const hits = lower.match(re);
    if (hits) findings.push({ kind: "word", detail: `"${word}" x${hits.length}`, text: "" });
  });

  const contractions = body.match(CONTRACTIONS);
  if (contractions) {
    const unique = [...new Set(contractions.map((c) => c.toLowerCase()))];
    findings.push({ kind: "contraction", detail: unique.join(", "), text: "" });
  }

  return findings;
}

const DEFAULT = [
  "docs/Code/Tutorials/tutorials.md",
  "docs/Code/Tutorials/first-button.md",
  "docs/Code/Tutorials/first-sequence.md",
  "docs/Code/Tutorials/first-rule.md",
  "docs/Code/Tutorials/joystick-deadband.md",
  "docs/Code/Tutorials/unit-conversions.md",
  "docs/Code/Tutorials/swerve-module-optimization.md",
  "docs/Code/Controls/tuning.md",
  "docs/Code/Controls/tuning-flywheel.md",
  "docs/Code/Controls/tuning-arm.md",
  "docs/Code/Controls/tuning-elevator.md",
  "docs/Code/Controls/operator-interface.md",
  "docs/Code/Autonomous/planning-an-auto.md"
].map((f) => path.join(__dirname, "..", f));

const files = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT;
let hard = 0;
for (const file of files) {
  const findings = check(file);
  const label = path.relative(path.join(__dirname, ".."), file);
  const errors = findings.filter((f) => f.kind !== "long-ish");
  hard += errors.length;
  if (!findings.length) { console.log(`ok    ${label}`); continue; }
  console.log(`\n${errors.length ? "CHECK" : "note "} ${label}`);
  findings.forEach((f) => {
    console.log(`   ${f.kind.padEnd(12)} ${f.detail}${f.text ? "  |  " + f.text : ""}`);
  });
}
console.log(hard === 0 ? "\nNo hard findings." : `\n${hard} finding(s) to review.`);
