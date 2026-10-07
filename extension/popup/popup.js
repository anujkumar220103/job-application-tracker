// Popup: shows the authenticated user's recent applications fetched directly
// from the backend. chrome.storage.local holds only the auth token, not jobs.

const CONFIG = globalThis.JOB_TRACKER_CONFIG || {
  API_BASE_URL: "http://localhost:5000/api",
  FRONTEND_BASE_URL: "http://localhost:3000",
};

const authEl = document.getElementById("auth");
const contentEl = document.getElementById("content");

function setAuth(text) {
  authEl.textContent = text;
}

function render(html) {
  contentEl.innerHTML = html;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

function renderJobs(jobs) {
  if (!jobs.length) {
    render('<div class="state">No applications yet. Apply to a job to see it here.</div>');
    return;
  }
  const items = jobs
    .map((j) => {
      const meta = [j.location, j.status].filter(Boolean).map(escapeHtml).join(" • ");
      const date = formatDate(j.createdAt);
      return `
        <div class="job">
          <div class="pos">${escapeHtml(j.position || "Untitled role")}</div>
          <div class="co">${escapeHtml(j.company || "Unknown company")}</div>
          <div class="meta">${meta}${date ? " • " + escapeHtml(date) : ""}</div>
        </div>`;
    })
    .join("");
  render(items);
}

function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get("token", ({ token }) => resolve(token || null));
  });
}

async function loadJobs() {
  const token = await getToken();

  if (!token) {
    setAuth("Not signed in");
    render('<div class="state">Log in to your Job Tracker to view applications.</div>');
    return;
  }

  setAuth("✓ Signed in");
  render('<div class="state">Loading…</div>');

  let res;
  try {
    res = await fetch(`${CONFIG.API_BASE_URL}/jobs?limit=10&sortBy=createdAt&sortOrder=desc`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    render('<div class="state error">Could not reach the server.</div>');
    return;
  }

  if (res.status === 401) {
    setAuth("Session expired");
    render('<div class="state error">Your session expired. Please log in again.</div>');
    return;
  }

  if (!res.ok) {
    render('<div class="state error">Could not load applications.</div>');
    return;
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  const jobs = Array.isArray(payload?.data) ? payload.data : [];
  renderJobs(jobs);
}

document.getElementById("open-dashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: `${CONFIG.FRONTEND_BASE_URL}/dashboard` });
});

void loadJobs();
