const roleNames = {
  A: "The studio",
  B: "The actors' union",
  C: "The AI company"
};

const termLabels = {
  role: "Role",
  consent: "Consent",
  pay: "Pay",
  credit: "Credit",
  audience: "Telling the audience"
};

const $ = (selector) => document.querySelector(selector);

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function dealTable(row) {
  const table = element("div", "teacher-deal-table");
  const headings = element("div", "teacher-deal-row teacher-deal-headings");
  headings.append(element("strong", "", "Term"), element("strong", "", "Opening offer"), element("strong", "", "Final deal, or each side's position"));
  table.append(headings);
  Object.entries(termLabels).forEach(([key, label]) => {
    const line = element("div", "teacher-deal-row");
    const term = element("strong", "teacher-term", label);
    const opening = element("p", "", row.opening_offers?.[key] || "No response");
    opening.dataset.label = "Opening offer";
    const final = element("p", "", row.final_positions?.[key] || "No response");
    final.dataset.label = "Final deal or positions";
    line.append(term, opening, final);
    table.append(line);
  });
  return table;
}

function submissionContext(row) {
  const details = [];
  if (row.case_id === "A") {
    details.push(["Movie genre", row.film_genre || "No response"]);
    details.push(["AI actress's role", row.ai_actress_role || "No response"]);
  }
  if (row.extra_evidence) {
    details.push(["One more example for this side", row.extra_evidence]);
  }
  if (!details.length) return null;

  const context = element("div", "submission-context");
  details.forEach(([label, value]) => {
    const item = element("div", "submission-context-item");
    item.append(element("strong", "", label), element("p", "", value));
    context.append(item);
  });
  return context;
}

function renderSubmissions(rows) {
  const list = $("#submissionList");
  const summary = $("#dashboardSummary");
  list.replaceChildren();
  summary.replaceChildren();

  const counts = { A: 0, B: 0, C: 0 };
  rows.forEach((row) => {
    if (counts[row.case_id] !== undefined) counts[row.case_id] += 1;
  });
  summary.append(
    element("span", "summary-chip", `${rows.length} total`),
    element("span", "summary-chip", `${counts.A} studio`),
    element("span", "summary-chip", `${counts.B} union`),
    element("span", "summary-chip", `${counts.C} AI company`)
  );

  if (!rows.length) {
    list.append(element("div", "panel empty-state", "No groups have submitted yet."));
    return;
  }

  rows.forEach((row) => {
    const card = element("article", "panel submission-card");
    const heading = element("div", "submission-heading");
    const identity = element("div");
    identity.append(
      element("h2", "", `${row.group_names} · Group ${row.case_id}: ${roleNames[row.case_id]}`),
      element("span", "submission-code", row.code)
    );
    heading.append(identity, element("span", "", `Updated ${formatDate(row.updated_at)}`));
    card.append(heading);
    const context = submissionContext(row);
    if (context) card.append(context);
    card.append(dealTable(row));
    list.append(card);
  });
}

function showLogin(message = "") {
  $("#dashboard").hidden = true;
  $("#loginPanel").hidden = false;
  if (message) {
    $("#loginError").textContent = message;
    $("#loginError").hidden = false;
  }
}

async function loadSubmissions() {
  const notice = $("#dashboardNotice");
  notice.hidden = true;
  try {
    const response = await fetch("/api/role-submissions", { cache: "no-store" });
    if (response.status === 401) return showLogin();
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Submissions could not be loaded.");
    $("#loginPanel").hidden = true;
    $("#dashboard").hidden = false;
    renderSubmissions(result.submissions || []);
  } catch (error) {
    notice.textContent = error.message;
    notice.hidden = false;
  }
}

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = $("#loginError");
  error.hidden = true;
  try {
    const response = await fetch("/api/teacher-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: $("#teacherPassword").value })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Sign-in failed.");
    $("#teacherPassword").value = "";
    await loadSubmissions();
  } catch (loginError) {
    error.textContent = loginError.message;
    error.hidden = false;
  }
});

$("#refreshButton").addEventListener("click", loadSubmissions);

$("#exportButton").addEventListener("click", async () => {
  const response = await fetch("/api/role-submissions?format=csv", { cache: "no-store" });
  if (response.status === 401) return showLogin("Please sign in again before exporting.");
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    $("#dashboardNotice").textContent = result.error || "The CSV could not be created.";
    $("#dashboardNotice").hidden = false;
    return;
  }
  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "mcom2010-week7-role-negotiation.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
});

$("#logoutButton").addEventListener("click", async () => {
  await fetch("/api/teacher-logout", { method: "POST" });
  showLogin();
});

loadSubmissions();
