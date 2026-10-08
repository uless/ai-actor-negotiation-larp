const roles = {
  A: {
    header: "MCOM 2010 · Week 7 · Group A", title: "You are the studio", sideName: "Group A · The studio",
    description: "You have a movie to make and a budget to protect. Choose the genre and the role you want the AI actress to play. Then decide what you will trade to cast her.",
    want: "The AI actress in your film, at a cost that you can afford.",
    wont: "The right to decide who is in your film.",
    offers: ["Money for the performers whose work trained the AI actress", "A smaller role for the AI actress", "A line in the credits or on the poster that says the actress is AI", "Jobs for human actors in other roles"],
    firstJob: "Decide what film you are making and which role the AI actress plays. Then write your opening offer for each of the five terms on the deal sheet.",
    facts: ["In July 2025, Netflix said that AI made one of its scenes ten times faster, at a cost that a small show could afford.", "In February 2024, a director and producer, Tyler Perry, put an $800 million studio expansion on hold after he saw what the AI video tool Sora could do."],
    sources: ["TechRadar and IBC, July 2025, on Netflix's July 2025 earnings call.", "The Hollywood Reporter interview with Tyler Perry, February 2024, as reported by NPR, February 28, 2024."]
  },
  B: {
    header: "MCOM 2010 · Week 7 · Group B", title: "You are the actors' union (SAG-AFTRA)", sideName: "Group B · The actors' union",
    description: "A studio wants to give an AI actress a role that could go to a person. Decide what the studio and the AI company must agree to before your union says yes.",
    who: "SAG-AFTRA is the main union for actors in the United States, with about 160,000 members.",
    want: "Work for human actors, and pay for the performers whose work trained the AI actress.",
    wont: "No AI actor is made from an actor's work without that actor's consent.",
    offers: ["Accept the AI actress in a small or background role", "Accept her if the film tells the audience that she is AI", "Accept her if performers get paid every time she is used"],
    firstJob: "Write your opening offer for each of the five terms on the deal sheet.",
    facts: ["SAG-AFTRA says its 2023 TV and film agreement requires informed consent and compensation for creating and using digital replicas of performers.", "From July 2024 to July 2025, video game actors went on strike for 11 months, mostly about AI. They won a rule: studios must get consent before they use AI to copy a performer's voice, face, or movement."],
    sources: ["SAG-AFTRA, 2023 TV/Theatrical Contracts AI provisions.", "Deadline, July 2025, on the video game agreement."]
  },
  C: {
    header: "MCOM 2010 · Week 7 · Group C", title: "You are the company that made the AI actress", sideName: "Group C · The AI company",
    description: "A studio is interested in your AI actress. A real role and a screen credit could help you get the next studio interested too. Decide what you can trade without losing control of your product.",
    want: "A real role for the AI actress, credited as an AI performer, so that other studios hire her too.",
    wont: "Control of your product and how she is credited.",
    offers: ["Part of the actress's fee for the performers whose work trained her", "A label that tells the audience that she is AI", "A promise to say what material was used to train her", "Limits on the kind of roles that she plays"],
    firstJob: "Write your opening offer for each of the five terms on the deal sheet.",
    facts: ["In September 2024, Lionsgate announced a partnership with Runway to build a custom AI model trained on the studio's film and TV catalog.", "In July 2025, Netflix said that AI made one of its scenes ten times faster, at a cost that a small show could afford."],
    sources: ["Lionsgate and Runway announcement, September 2024.", "TechRadar and IBC, July 2025, on Netflix's July 2025 earnings call."]
  }
};

const termKeys = ["role", "consent", "pay", "credit", "audience"];
const termNames = { role: "Role", consent: "Consent", pay: "Pay", credit: "Credit", audience: "Telling the audience" };
const fieldIds = [...termKeys.flatMap((key) => [`${key}Opening`, `${key}Final`]), "filmGenre", "aiActressRole", "extraEvidence"];
const storageKey = "mcom2010-week7-role-negotiation-v2";
const state = {
  groupNames: "", caseId: "", answers: Object.fromEntries(fieldIds.map((id) => [id, ""])), submission: null, updatedAt: ""
};

const $ = (selector) => document.querySelector(selector);
const all = (selector) => [...document.querySelectorAll(selector)];
const clean = (value) => String(value || "").trim();

function readSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return saved && roles[saved.caseId] ? saved : null;
  } catch { return null; }
}

function applyState(saved) {
  state.groupNames = clean(saved.groupNames).slice(0, 160);
  state.caseId = roles[saved.caseId] ? saved.caseId : "";
  state.submission = saved.submission?.id && saved.submission?.editToken ? saved.submission : null;
  state.updatedAt = clean(saved.updatedAt);
  fieldIds.forEach((id) => {
    state.answers[id] = String(saved.answers?.[id] || "").slice(0, Number($(`#${id}`).maxLength));
  });
}

function save() {
  state.updatedAt = new Date().toISOString();
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* The form still works without storage. */ }
  $("#saveStatus").textContent = state.submission?.dirty ? "Changes saved here, but not submitted" : "Draft saved in this browser";
}

let saveTimer;
function scheduleSave() {
  $("#saveStatus").textContent = "Saving draft...";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 250);
}

function markChanged() {
  if (state.submission) state.submission.dirty = true;
  $("#submitNotice").hidden = true;
  scheduleSave();
}

function selectCase(caseId) {
  state.caseId = roles[caseId] ? caseId : "";
  all("#casePicker button").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.case === state.caseId)));
}

function textBlock(title, text) {
  const section = document.createElement("section");
  section.className = "brief-block";
  const heading = document.createElement("h2");
  heading.textContent = title;
  const body = document.createElement("p");
  body.textContent = text;
  section.append(heading, body);
  return section;
}

function offerBlock(offers) {
  const section = document.createElement("section");
  section.className = "brief-block offer-block";
  const heading = document.createElement("h2");
  heading.textContent = "What you can offer";
  const list = document.createElement("ul");
  offers.forEach((offer) => {
    const item = document.createElement("li");
    item.textContent = offer;
    list.append(item);
  });
  section.append(heading, list);
  return section;
}

function renderRole() {
  const selected = roles[state.caseId];
  if (!selected) return;
  $("#caseHeader").textContent = selected.header;
  $("#caseTitle").textContent = selected.title;
  $("#caseIntro").textContent = selected.description;
  $("#sideName").textContent = selected.sideName;
  $("#studioPlan").hidden = state.caseId !== "A";

  const brief = $("#roleBrief");
  brief.replaceChildren();
  if (selected.who) brief.append(textBlock("Who you are", selected.who));
  brief.append(textBlock("What you want most", selected.want), textBlock("What you will not give up", selected.wont), offerBlock(selected.offers), textBlock("Your first job", selected.firstJob));

  const facts = $("#caseFacts");
  facts.replaceChildren();
  selected.facts.forEach((fact) => {
    const item = document.createElement("li");
    item.textContent = fact;
    facts.append(item);
  });

  const sources = $("#caseSources");
  sources.replaceChildren();
  selected.sources.forEach((source) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = source;
    sources.append(paragraph);
  });
}

function renderAnswers() {
  fieldIds.forEach((id) => { $(`#${id}`).value = state.answers[id] || ""; });
  $("#submitButton").textContent = state.submission ? "Update deal sheet" : "Submit deal sheet";
}

function openWorkspace() {
  renderRole();
  renderAnswers();
  $("#setupPanel").hidden = true;
  $("#workspace").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
  save();
}

function openSetup() {
  $("#groupNames").value = state.groupNames;
  selectCase(state.caseId);
  $("#workspace").hidden = true;
  $("#setupPanel").hidden = false;
  $("#savedWork").hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function dealPayload() {
  return {
    openingOffers: Object.fromEntries(termKeys.map((key) => [key, state.answers[`${key}Opening`]])),
    finalPositions: Object.fromEntries(termKeys.map((key) => [key, state.answers[`${key}Final`]])),
    filmGenre: state.caseId === "A" ? state.answers.filmGenre : "",
    aiActressRole: state.caseId === "A" ? state.answers.aiActressRole : "",
    extraEvidence: state.answers.extraEvidence
  };
}

function incompleteTerms() {
  return termKeys.filter((key) => !clean(state.answers[`${key}Opening`]) || !clean(state.answers[`${key}Final`]));
}

async function submitResponse() {
  const notice = $("#submitNotice");
  const button = $("#submitButton");
  if (state.caseId === "A" && (!clean(state.answers.filmGenre) || !clean(state.answers.aiActressRole))) {
    notice.textContent = "Choose the movie genre and the AI actress's role before submitting.";
    notice.classList.add("error");
    notice.hidden = false;
    return;
  }
  const missing = incompleteTerms();
  if (missing.length) {
    notice.textContent = `Complete both boxes for: ${missing.map((key) => termNames[key]).join(", ")}.`;
    notice.classList.add("error");
    notice.hidden = false;
    return;
  }
  button.disabled = true;
  button.textContent = "Submitting...";
  notice.hidden = true;
  try {
    const response = await fetch("/api/role-submissions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: state.submission?.id || null, editToken: state.submission?.editToken || null, groupNames: state.groupNames, caseId: state.caseId, ...dealPayload() })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The deal sheet could not be submitted.");
    state.submission = { id: result.id, code: result.code, editToken: result.editToken || state.submission?.editToken, groupNames: state.groupNames, caseId: state.caseId, submittedAt: result.updatedAt, dirty: false };
    save();
    button.textContent = "Update deal sheet";
    notice.classList.remove("error");
    notice.textContent = `Submitted. Your group code is ${result.code}. You can edit the deal sheet and submit an update from this browser.`;
    notice.hidden = false;
  } catch (error) {
    notice.classList.add("error");
    notice.textContent = error.message || "The deal sheet could not be submitted. Please try again.";
    notice.hidden = false;
    button.textContent = state.submission ? "Update deal sheet" : "Submit deal sheet";
  } finally { button.disabled = false; }
}

all("#casePicker button").forEach((button) => button.addEventListener("click", () => selectCase(button.dataset.case)));
$("#setupForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const names = clean($("#groupNames").value);
  const error = $("#setupError");
  if (!names || !state.caseId) {
    error.textContent = !names ? "Enter the first names of the people in your group." : "Choose the side your instructor assigned.";
    error.hidden = false;
    return;
  }
  error.hidden = true;
  if (state.submission && (state.submission.groupNames !== names || state.submission.caseId !== state.caseId)) state.submission = null;
  state.groupNames = names;
  openWorkspace();
});

fieldIds.forEach((id) => $(`#${id}`).addEventListener("input", (event) => {
  state.answers[id] = event.target.value;
  markChanged();
}));
$("#changeCaseButton").addEventListener("click", openSetup);
$("#submitButton").addEventListener("click", submitResponse);

const saved = readSavedState();
if (saved) {
  applyState(saved);
  $("#savedWorkSummary").textContent = `${roles[state.caseId].sideName} · ${state.groupNames}`;
  $("#savedWork").hidden = false;
  $("#continueButton").addEventListener("click", openWorkspace);
  $("#groupNames").value = state.groupNames;
  selectCase(state.caseId);
}
const requestedCase = new URLSearchParams(location.search).get("group")?.toUpperCase();
if (!saved && roles[requestedCase]) selectCase(requestedCase);
