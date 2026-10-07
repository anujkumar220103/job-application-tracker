// MANDATORY Internshala regression: confirms the generic path (used by
// Internshala/Unstop) is unchanged by the LinkedIn fix. Reuses the same
// dependency-free fake DOM approach.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extDir = path.resolve(__dirname, "..");

class FakeEl {
  constructor(tag = "div") {
    this.tag = tag.toLowerCase();
    this.children = [];
    this.parent = null;
    this.attrs = {};
    this.classList = new Set();
    this._text = "";
    this.id = "";
    this.value = "";
  }
  get className() { return [...this.classList].join(" "); }
  set className(v) { this.classList = new Set(String(v).split(/\s+/).filter(Boolean)); }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k] ?? null; }
  append(child) { child.parent = this; this.children.push(child); return child; }
  get textContent() { return this._text || this.children.map((c) => c.textContent).join(" "); }
  set textContent(v) { this._text = v; }
  get innerText() { return this.textContent; }
  _descendants() { const out = []; const walk = (n) => { for (const c of n.children) { out.push(c); walk(c); } }; walk(this); return out; }
  _matches(sel) {
    sel = sel.trim();
    let m = sel.match(/^([a-z0-9]*)\[([a-zA-Z-]+)\*=['"]([^'"]+)['"]\]$/);
    if (m) { const [, tag, attr, val] = m; if (tag && this.tag !== tag) return false; const have = attr === "class" ? this.className : this.getAttribute(attr) || ""; return have.includes(val); }
    m = sel.match(/^([a-z0-9]*)\[([a-zA-Z-]+)=['"]([^'"]+)['"]\]$/);
    if (m) { const [, tag, attr, val] = m; if (tag && this.tag !== tag) return false; return (this.getAttribute(attr) || "") === val; }
    m = sel.match(/^([a-z0-9]*)\[([a-zA-Z-]+)\]$/);
    if (m) { const [, tag, attr] = m; if (tag && this.tag !== tag) return false; return this.getAttribute(attr) !== null; }
    if (sel.startsWith("#")) return this.id === sel.slice(1);
    if (sel.startsWith(".")) { return sel.slice(1).split(".").every((c) => this.classList.has(c)); }
    return this.tag === sel.toLowerCase();
  }
  _matchesAny(list) { return list.split(",").map((s) => s.trim()).some((s) => this._matches(s)); }
  querySelector(list) { for (const e of this._descendants()) if (e._matchesAny(list)) return e; return null; }
  querySelectorAll(list) { return this._descendants().filter((e) => e._matchesAny(list)); }
  closest(list) { let n = this; while (n) { if (n._matchesAny && n._matchesAny(list)) return n; n = n.parent; } return null; }
}
function el(tag, props = {}) {
  const e = new FakeEl(tag);
  if (props.class) e.className = props.class;
  if (props.id) e.id = props.id;
  if (props.text) e.textContent = props.text;
  return e;
}

function buildInternshalaDom() {
  const doc = new FakeEl("document-root");
  const detail = el("div", { class: "individual_internship_details" });
  detail.append(el("h1", { class: "profile-header", text: "Software Development Intern" }));
  detail.append(el("div", { class: "company-name", text: "ABC Company" }));
  detail.append(el("div", { id: "location_names", text: "Bengaluru" }));
  const applyBtn = el("button", { text: "Apply now" });
  detail.append(applyBtn);
  doc.append(detail);
  return { doc, applyBtn };
}

function loadContentScript(doc, hostname) {
  const coreSrc = fs.readFileSync(path.join(extDir, "lib", "jobTracker.core.js"), "utf8");
  const contentSrc = fs.readFileSync(path.join(extDir, "content.js"), "utf8");
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    window: { location: { hostname, href: `https://${hostname}/internship/detail/123` } },
    document: Object.assign(doc, {
      addEventListener: () => {},
      getElementById: (id) => doc._descendants().find((e) => e.id === id) || null,
      createElement: (tag) => el(tag),
      body: doc,
    }),
    chrome: { runtime: { id: "test-id", lastError: null, sendMessage: () => {} }, storage: { local: { get: () => {} } } },
    setTimeout: () => {},
    globalThis: {},
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(coreSrc, sandbox, { filename: "jobTracker.core.js" });
  vm.runInContext(contentSrc + "\n;globalThis.__test = { extractJob, findApplyControl, isLinkedIn };", sandbox, { filename: "content.js" });
  return sandbox;
}

test("Internshala regression: generic extractJob still reads company/position/location", () => {
  const { doc } = buildInternshalaDom();
  const sandbox = loadContentScript(doc, "internshala.com");

  // The LinkedIn branch must NOT engage on Internshala.
  assert.equal(sandbox.__test.isLinkedIn(), false);

  const job = sandbox.__test.extractJob();
  assert.equal(job.position, "Software Development Intern");
  assert.equal(job.company, "ABC Company");
  assert.equal(job.location, "Bengaluru");
  assert.equal(job.status, "applied");
  assert.ok(job.link.startsWith("https://internshala.com/"));
});

test("Internshala regression: generic findApplyControl detects 'Apply now'", () => {
  const { doc, applyBtn } = buildInternshalaDom();
  const sandbox = loadContentScript(doc, "internshala.com");
  assert.ok(sandbox.__test.findApplyControl(applyBtn));
});
