// Lifecycle test: proves that re-injecting content.js (as the service worker
// does after an extension reload) results in exactly ONE live Apply listener
// — no duplicate submissions — and that the newest instance owns capture.
//
// Dependency-free: a tiny event-target DOM + a fake LinkedIn apply button.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extDir = path.resolve(__dirname, "..");

// --- Minimal element with event + closest support --------------------------
class El {
  constructor(tag = "div") {
    this.tag = tag.toLowerCase();
    this.children = [];
    this.parent = null;
    this.classList = new Set();
    this.id = "";
    this.value = "";
    this._text = "";
    this._listeners = {};
  }
  get className() { return [...this.classList].join(" "); }
  set className(v) { this.classList = new Set(String(v).split(/\s+/).filter(Boolean)); }
  getAttribute(k) { return k === "aria-label" ? this._aria || null : null; }
  setAttribute(k, v) { if (k === "aria-label") this._aria = v; }
  append(c) { c.parent = this; this.children.push(c); return c; }
  get textContent() { return this._text || this.children.map((c) => c.textContent).join(" "); }
  set textContent(v) { this._text = v; }
  get innerText() { return this.textContent; }
  _descendants() { const o = []; const w = (n) => n.children.forEach((c) => { o.push(c); w(c); }); w(this); return o; }
  _matches(sel) {
    sel = sel.trim();
    let m = sel.match(/^([a-z0-9]*)\[class\*=['"]([^'"]+)['"]\]$/);
    if (m) { const [, tag, val] = m; if (tag && this.tag !== tag) return false; return this.className.includes(val); }
    m = sel.match(/^([a-z0-9]*)\[([a-zA-Z-]+)\*=['"]([^'"]+)['"]\]$/);
    if (m) return false;
    if (sel.startsWith("#")) return this.id === sel.slice(1);
    if (sel.startsWith(".")) return sel.slice(1).split(".").every((c) => this.classList.has(c));
    if (sel.includes("[")) return false;
    return this.tag === sel.toLowerCase();
  }
  _matchesAny(list) { return list.split(",").map((s) => s.trim()).some((s) => this._matches(s)); }
  querySelector(list) { for (const e of this._descendants()) if (e._matchesAny(list)) return e; return null; }
  querySelectorAll(list) { return this._descendants().filter((e) => e._matchesAny(list)); }
  closest(list) { let n = this; while (n) { if (n._matchesAny(list)) return n; n = n.parent; } return null; }
}

// A document that is itself an event target supporting capture-phase dispatch.
class FakeDoc extends El {
  constructor() {
    super("document-root");
    this._docListeners = [];
    this.body = this;
  }
  addEventListener(type, fn) { this._docListeners.push({ type, fn }); }
  removeEventListener(type, fn) {
    this._docListeners = this._docListeners.filter((l) => !(l.type === type && l.fn === fn));
  }
  getElementById(id) { return this._descendants().find((e) => e.id === id) || null; }
  createElement(tag) { return new El(tag); }
  dispatchClick(target) {
    const evt = { type: "click", target };
    // Call all currently-registered click listeners (capture-phase order).
    for (const l of [...this._docListeners]) if (l.type === "click") l.fn(evt);
  }
  liveClickListeners() { return this._docListeners.filter((l) => l.type === "click").length; }
}

function buildDom() {
  const doc = new FakeDoc();
  const detail = new El("div");
  detail.className = "jobs-search__job-details--container";
  const topcard = new El("div");
  topcard.className = "job-details-jobs-unified-top-card__container";
  const title = new El("h1");
  title.className = "job-details-jobs-unified-top-card__job-title";
  title.textContent = "Product Intern";
  const companyWrap = new El("div");
  companyWrap.className = "job-details-jobs-unified-top-card__company-name";
  const companyA = new El("a");
  companyA.textContent = "Lumenci";
  companyWrap.append(companyA);
  const applyBtn = new El("button");
  applyBtn.className = "jobs-apply-button";
  applyBtn.textContent = "Easy Apply";
  topcard.append(title);
  topcard.append(companyWrap);
  topcard.append(applyBtn);
  detail.append(topcard);
  doc.append(detail);
  return { doc, applyBtn };
}

function makeSandbox(doc, sendMessageSpy) {
  const win = {};
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    window: Object.assign(win, { location: { hostname: "www.linkedin.com", href: "https://www.linkedin.com/jobs/view/1/" } }),
    document: doc,
    setTimeout: () => {},
    globalThis: null,
    chrome: {
      runtime: { id: "live-id", lastError: null, sendMessage: (msg, cb) => { sendMessageSpy(msg); cb && cb({ type: "JOB_CREATED", job: {} }); } },
      storage: { local: { get: (_k, cb) => cb({ token: "t" }) } },
    },
  };
  // window and globalThis must be the SAME object so the init guard persists
  // across re-injections into the same page.
  sandbox.window = win;
  sandbox.globalThis = sandbox;
  // Mirror the window guard flags onto window across injections.
  return sandbox;
}

function inject(sandbox) {
  const coreSrc = fs.readFileSync(path.join(extDir, "lib", "jobTracker.core.js"), "utf8");
  const contentSrc = fs.readFileSync(path.join(extDir, "content.js"), "utf8");
  vm.runInContext(coreSrc, sandbox, { filename: "jobTracker.core.js" });
  vm.runInContext(contentSrc, sandbox, { filename: "content.js" });
}

test("re-injection yields exactly ONE live click listener (no duplicates)", () => {
  const { doc, applyBtn } = buildDom();
  let sends = 0;
  const sandbox = makeSandbox(doc, () => { sends++; });
  vm.createContext(sandbox);

  inject(sandbox); // initial (manifest) injection
  assert.equal(doc.liveClickListeners(), 1, "one listener after first injection");

  inject(sandbox); // service-worker re-injection after extension reload
  assert.equal(doc.liveClickListeners(), 1, "still one listener after re-injection");

  inject(sandbox); // a third, for good measure
  assert.equal(doc.liveClickListeners(), 1, "still one listener after third injection");

  // A single Apply click must produce exactly ONE submission.
  doc.dispatchClick(applyBtn);
  assert.equal(sends, 1, "exactly one job submission per Apply click");
});

test("after re-injection, capture still works (job sent)", () => {
  const { doc, applyBtn } = buildDom();
  let lastMsg = null;
  const sandbox = makeSandbox(doc, (m) => { lastMsg = m; });
  vm.createContext(sandbox);
  inject(sandbox);
  inject(sandbox); // simulate extension reload re-injection
  doc.dispatchClick(applyBtn);
  assert.ok(lastMsg, "a LOG_JOB message was sent");
  assert.equal(lastMsg.type, "LOG_JOB");
  assert.equal(lastMsg.data.position, "Product Intern");
  assert.equal(lastMsg.data.status, "applied");
});
