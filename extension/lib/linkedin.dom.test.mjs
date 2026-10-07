// Dependency-free fake-DOM test for the LinkedIn extraction in content.js.
// Loads content.js in a vm sandbox with a minimal DOM so we can verify
// extractLinkedInJob() reads the SELECTED job detail panel and that
// isLinkedInApplyAction() only fires on real apply controls.
//
// This does not need jsdom; it implements just enough DOM surface for the
// selectors content.js uses.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extDir = path.resolve(__dirname, "..");

// --- Minimal DOM node -------------------------------------------------------
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
  get className() {
    return [...this.classList].join(" ");
  }
  set className(v) {
    this.classList = new Set(String(v).split(/\s+/).filter(Boolean));
  }
  setAttribute(k, v) {
    this.attrs[k] = v;
  }
  getAttribute(k) {
    return this.attrs[k] ?? null;
  }
  append(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }
  get textContent() {
    if (this._text) return this._text;
    return this.children.map((c) => c.textContent).join(" ");
  }
  set textContent(v) {
    this._text = v;
  }
  get innerText() {
    return this.textContent;
  }
  _descendants() {
    const out = [];
    const walk = (n) => {
      for (const c of n.children) {
        out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }
  _matches(sel) {
    // Supports: tag, .class, #id, [attr], [attr='v'], a[href*='x'],
    // [class*='x'], and comma lists handled by caller.
    sel = sel.trim();
    // attribute contains: tag[attr*='v'] or [attr*='v']
    let m = sel.match(/^([a-z0-9]*)\[([a-zA-Z-]+)\*=['"]([^'"]+)['"]\]$/);
    if (m) {
      const [, tag, attr, val] = m;
      if (tag && this.tag !== tag) return false;
      const have = attr === "class" ? this.className : this.getAttribute(attr) || "";
      return have.includes(val);
    }
    // attribute equals: [attr='v']
    m = sel.match(/^([a-z0-9]*)\[([a-zA-Z-]+)=['"]([^'"]+)['"]\]$/);
    if (m) {
      const [, tag, attr, val] = m;
      if (tag && this.tag !== tag) return false;
      return (this.getAttribute(attr) || "") === val;
    }
    // attribute present: [attr]
    m = sel.match(/^([a-z0-9]*)\[([a-zA-Z-]+)\]$/);
    if (m) {
      const [, tag, attr] = m;
      if (tag && this.tag !== tag) return false;
      return this.getAttribute(attr) !== null;
    }
    // #id
    if (sel.startsWith("#")) return this.id === sel.slice(1);
    // .class
    if (sel.startsWith(".")) return this.classList.has(sel.slice(1));
    // tag
    return this.tag === sel.toLowerCase();
  }
  _matchesAny(selectorList) {
    return selectorList.split(",").map((s) => s.trim()).some((s) => this._matches(s));
  }
  querySelector(selectorList) {
    for (const el of this._descendants()) {
      if (el._matchesAny(selectorList)) return el;
    }
    return null;
  }
  querySelectorAll(selectorList) {
    return this._descendants().filter((el) => el._matchesAny(selectorList));
  }
  closest(selectorList) {
    let n = this;
    while (n) {
      if (n._matchesAny && n._matchesAny(selectorList)) return n;
      n = n.parent;
    }
    return null;
  }
}

function el(tag, props = {}) {
  const e = new FakeEl(tag);
  if (props.class) e.className = props.class;
  if (props.id) e.id = props.id;
  if (props.text) e.textContent = props.text;
  if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) e.setAttribute(k, v);
  return e;
}

// --- Build a realistic LinkedIn selected-job detail panel -------------------
function buildLinkedInDom(opts = {}) {
  const company = opts.company || "Lumenci";
  const position = opts.position || "Product Intern";
  const location = opts.location || "India (Remote)";

  const doc = new FakeEl("document-root");

  // Left rail (a sidebar job card with its OWN /company/ link that must be IGNORED)
  const sidebar = el("div", { class: "jobs-search-results-list" });
  sidebar.append(el("h2", { text: "Sidebar Job — Should Be Ignored" }));
  const sidebarCompany = el("a", { text: "WrongCompany", attrs: { href: "https://www.linkedin.com/company/wrongcompany/" } });
  sidebar.append(sidebarCompany);
  doc.append(sidebar);

  // Right: selected job detail container
  const detail = el("div", { class: "jobs-search__job-details--container" });
  const topcard = el("div", { class: "job-details-jobs-unified-top-card__container" });
  // position
  const title = el("h1", { class: "job-details-jobs-unified-top-card__job-title", text: position });
  // company (anchor to /company/)
  const companyWrap = el("div", { class: "job-details-jobs-unified-top-card__company-name" });
  const companyLink = el("a", { text: company, attrs: { href: `https://www.linkedin.com/company/${company.toLowerCase()}/` } });
  companyWrap.append(companyLink);
  // primary description "Company · Location · ago · applicants"
  const primary = el("div", {
    class: "job-details-jobs-unified-top-card__primary-description-container",
    text: `${company} · ${location} · 2 weeks ago · 30 applicants`,
  });
  // apply button
  const applyBtn = el("button", { class: "jobs-apply-button artdeco-button", text: "Easy Apply" });

  topcard.append(title);
  topcard.append(companyWrap);
  topcard.append(primary);
  topcard.append(applyBtn);
  // A "similar jobs" company link lower in the detail panel (also must be ignored).
  const similar = el("div", { class: "jobs-similar-jobs" });
  similar.append(el("a", { text: "AnotherCompany", attrs: { href: "https://www.linkedin.com/company/anothercompany/" } }));
  detail.append(topcard);
  detail.append(similar);
  doc.append(detail);

  return { doc, applyBtn, sidebarHeading: sidebar.children[0] };
}

// --- Load content.js in a sandbox ------------------------------------------
function loadContentScript(doc) {
  const coreSrc = fs.readFileSync(path.join(extDir, "lib", "jobTracker.core.js"), "utf8");
  const contentSrc = fs.readFileSync(path.join(extDir, "content.js"), "utf8");

  const addedListeners = [];
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    window: { location: { hostname: "www.linkedin.com", href: "https://www.linkedin.com/jobs/view/123/" } },
    document: Object.assign(doc, {
      addEventListener: (type, fn) => addedListeners.push({ type, fn }),
      getElementById: (id) => doc._descendants().find((e) => e.id === id) || null,
      createElement: (tag) => el(tag),
      body: doc,
    }),
    chrome: {
      runtime: { id: "test-id", lastError: null, sendMessage: () => {} },
      storage: { local: { get: () => {} } },
    },
    setTimeout: () => {},
    globalThis: {},
  };
  sandbox.globalThis = sandbox; // content.js reads globalThis.JobTrackerCore
  sandbox.__JOBTRACKER_EXPOSE_FOR_TEST__ = true; // ask content.js to expose internals
  vm.createContext(sandbox);

  // Load core first (sets globalThis.JobTrackerCore), then content.js. The
  // content script exposes globalThis.__test when the flag above is set.
  vm.runInContext(coreSrc, sandbox, { filename: "jobTracker.core.js" });
  vm.runInContext(contentSrc, sandbox, { filename: "content.js" });
  return { sandbox, addedListeners };
}

test("LinkedIn: extractLinkedInJob reads the selected job detail panel", () => {
  const { doc, applyBtn } = buildLinkedInDom();
  const { sandbox } = loadContentScript(doc);
  const job = sandbox.__test.extractLinkedInJob();

  assert.equal(job.position, "Product Intern");
  assert.equal(job.company, "Lumenci");
  assert.equal(job.location, "India (Remote)");
  assert.equal(job.status, "applied");
  assert.equal(job.link, "https://www.linkedin.com/jobs/view/123/");
  // Ensure we did NOT pick up the sidebar job.
  assert.notEqual(job.position, "Sidebar Job — Should Be Ignored");
  void applyBtn;
});

test("LinkedIn: company comes from the selected top card, NOT sidebar/similar jobs", () => {
  const { doc } = buildLinkedInDom({ company: "Lumenci" });
  const { sandbox } = loadContentScript(doc);
  const job = sandbox.__test.extractLinkedInJob();
  assert.equal(job.company, "Lumenci");
  assert.notEqual(job.company, "WrongCompany"); // sidebar /company/ link
  assert.notEqual(job.company, "AnotherCompany"); // similar-jobs /company/ link
});

test("LinkedIn: different jobs yield different companies (not always the same)", () => {
  const a = loadContentScript(buildLinkedInDom({ company: "Lumenci", position: "Product Intern" }).doc).sandbox.__test.extractLinkedInJob();
  const b = loadContentScript(buildLinkedInDom({ company: "Stripe", position: "Backend Engineer" }).doc).sandbox.__test.extractLinkedInJob();
  const c = loadContentScript(buildLinkedInDom({ company: "Figma", position: "Designer" }).doc).sandbox.__test.extractLinkedInJob();
  assert.equal(a.company, "Lumenci");
  assert.equal(b.company, "Stripe");
  assert.equal(c.company, "Figma");
});



test("LinkedIn: isLinkedInApplyAction fires on the Easy Apply button, not the sidebar", () => {
  const { doc, applyBtn, sidebarHeading } = buildLinkedInDom();
  const { sandbox } = loadContentScript(doc);

  assert.ok(sandbox.__test.isLinkedInApplyAction(applyBtn), "should detect Easy Apply button");
  assert.equal(
    sandbox.__test.isLinkedInApplyAction(sidebarHeading),
    null,
    "should NOT fire on a sidebar heading",
  );
});

test("LinkedIn: isLinkedIn() true on linkedin.com host", () => {
  const { doc } = buildLinkedInDom();
  const { sandbox } = loadContentScript(doc);
  assert.equal(sandbox.__test.isLinkedIn(), true);
});
