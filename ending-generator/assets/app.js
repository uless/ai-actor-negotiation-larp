const ENDINGS = [
  {
    id: "humans_only",
    number: 1,
    title: "Humans Only",
    tagline: "Every role went to a human. For now.",
    color: "#00E5FF",
    realWorld: "The real union did not get a full ban on AI performers.",
    question: "Could the studio film in another country, or hire non-union actors?"
  },
  {
    id: "studio_takes_all",
    number: 2,
    title: "Lights, Camera, Strike",
    tagline: "The AI actress got the lead. The actors got nothing. Then the actors walked out.",
    color: "#D6006E",
    realWorld: "When talks with studios failed, workers went on strike: writers and actors in 2023, and video game performers for 11 months, from July 2024 to July 2025.",
    question: "What does the union do next?"
  },
  {
    id: "ai_actress_with_conditions",
    number: 3,
    title: "AI Actress, With Conditions",
    tagline: "The AI actress got a small part, with a rule on every line of the deal.",
    color: "#F7B801",
    realWorld: "Your deal is close to the real one.",
    question: "Is your rule stricter or looser than the real one?"
  },
  {
    id: "open_book",
    number: 4,
    title: "Open Book",
    tagline: "The AI actress got a bigger part. Her makers had to say how she was made.",
    color: "#9B8CFF",
    realWorld: "Next week, we look at training data and consent.",
    question: "How would actors know that their work trained the AI actress?"
  },
  {
    id: "back_to_table",
    number: 5,
    title: "Back to the Table",
    tagline: "One small yes, then a much bigger ask. The deal fell apart.",
    color: "#FF6B6B",
    realWorld: "In 2023, talks failed, and the writers and the actors went on strike. The writers' strike lasted from May 2 to September 27, 2023.",
    question: "Did a small yes open the door?"
  }
];

const COMMON_QUESTIONS = [
  "Which term was the hardest?",
  "What did the news flash change?",
  "If your deal goes into the labor section of our class code of conduct, what is its first sentence?"
];

const SAMPLE_DEALS = [
  {
    id: "humans_only",
    overallResult: "Deal",
    role: "The AI actress has no role. A human actor plays the part.",
    consent: "Not needed, because the AI actress is not in the film.",
    pay: "The studio pays the human actor.",
    credit: "The human actor's name only.",
    audience: "Nothing to tell.",
    newsFlash: "The studio asked again. The union said no. The studio accepted."
  },
  {
    id: "studio_takes_all",
    overallResult: "Deal",
    role: "The AI actress is the lead.",
    consent: "No permission needed. The studio owns the film.",
    pay: "The fee goes to the AI company only.",
    credit: "AI performer.",
    audience: "A small line at the end of the credits.",
    newsFlash: "The AI actress stays the lead in the sequel."
  },
  {
    id: "ai_actress_with_conditions",
    overallResult: "Deal",
    role: "A supporting role, less than 10 minutes on screen.",
    consent: "The union must approve.",
    pay: "10 percent of the AI actress's fee goes to an actors' fund.",
    credit: "AI actress (AI performer).",
    audience: "A label on the poster and at the start of the film.",
    newsFlash: "The AI actress stays in a supporting role. A human plays the lead."
  },
  {
    id: "open_book",
    overallResult: "Deal",
    role: "The lead role in the sequel.",
    consent: "The actors whose work trained the AI actress must agree.",
    pay: "Actors get paid every time the AI actress is used.",
    credit: "AI actress, AI performer.",
    audience: "A label at the start of the film.",
    newsFlash: "The union accepted the lead because the AI company published the material used to train the AI actress."
  },
  {
    id: "back_to_table",
    overallResult: "No deal",
    role: "Studio: the lead. Union: a background role only.",
    consent: "",
    pay: "Studio: no extra pay. Union: pay for each use.",
    credit: "",
    audience: "",
    newsFlash: "The news flash ended the deal.",
    notAgreed: ["role", "pay"]
  }
];

const ids = [
  "loginScreen", "loginForm", "teacherCode", "loginError", "entryScreen", "dealForm", "dealName",
  "overallResult", "termFields", "role", "consent", "pay", "credit", "audience", "newsFlash",
  "showEndingButton", "characterCount", "dealError", "manualEndings", "demoSamples", "sampleButtons",
  "modelName", "demoLabel", "endingScreen", "changeEndingButton", "endingIntro", "closestLabel",
  "endingNumber", "endingTitle", "endingTagline", "epilogueBlock", "epilogueText", "scoresBlock",
  "scoreBars", "reasonsBlock", "reasonList", "realWorldBlock", "realWorldEnding", "questionsBlock",
  "questionList", "stageProgress", "collectionScreen", "collectionHeading", "collectionCards",
  "showAllButton", "startAgainButton", "endingPicker", "dialogEndings"
];

const els = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
const state = {
  teacherCode: "",
  session: null,
  current: null,
  ending: null,
  stages: [],
  stageIndex: 0,
  typingTimer: null,
  typingDone: true,
  found: readFound(),
  revealAll: false
};

function readFound() {
  try {
    const value = JSON.parse(localStorage.getItem("mcom2010-week7-endings") || "[]");
    return new Set(Array.isArray(value) ? value.filter((id) => ENDINGS.some((ending) => ending.id === id)) : []);
  } catch {
    return new Set();
  }
}

function writeFound() {
  try { localStorage.setItem("mcom2010-week7-endings", JSON.stringify([...state.found])); }
  catch { /* The activity still works when storage is blocked. */ }
}

function clearFound() {
  state.found.clear();
  try { localStorage.removeItem("mcom2010-week7-endings"); }
  catch { /* The in-memory list is already clear. */ }
}

function setError(element, message = "") {
  element.textContent = message;
  element.hidden = !message;
}

function showScreen(screen) {
  [els.loginScreen, els.entryScreen, els.endingScreen, els.collectionScreen].forEach((item) => {
    item.hidden = item !== screen;
  });
  window.scrollTo(0, 0);
}

async function api(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The app could not finish that request.");
  return data;
}

function endingById(id) {
  return ENDINGS.find((ending) => ending.id === id);
}

function makeEndingButtons(container, onPick) {
  container.replaceChildren();
  ENDINGS.forEach((ending) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ending-choice";
    button.innerHTML = `<span>Ending ${ending.number}</span>${ending.title}`;
    button.addEventListener("click", () => onPick(ending.id));
    container.append(button);
  });
}

function setOverallResult(result) {
  els.overallResult.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.result === result));
  });
}

function setAgreement(row, agreed) {
  const button = row.querySelector(".agreement-toggle");
  button.setAttribute("aria-pressed", String(agreed));
  button.textContent = agreed ? "Agreed" : "Not agreed";
}

function collectDeal() {
  const terms = {};
  els.termFields.querySelectorAll(".term-row").forEach((row) => {
    const key = row.dataset.term;
    terms[key] = {
      text: row.querySelector("textarea").value.trim(),
      agreed: row.querySelector(".agreement-toggle").getAttribute("aria-pressed") === "true"
    };
  });
  const overall = els.overallResult.querySelector("button[aria-pressed='true']")?.dataset.result || "Deal";
  return {
    dealName: els.dealName.value.trim(),
    overallResult: overall,
    terms,
    newsFlash: els.newsFlash.value.trim()
  };
}

function countText(deal = collectDeal()) {
  return deal.dealName.length + deal.newsFlash.length + Object.values(deal.terms).reduce((sum, term) => sum + term.text.length, 0);
}

function updateCharacterCount() {
  const count = countText();
  els.characterCount.textContent = `${count.toLocaleString()} / 4,000`;
  els.characterCount.classList.toggle("over-limit", count > 4000);
}

function hasDealText(deal) {
  return Boolean(deal.newsFlash || Object.values(deal.terms).some((term) => term.text));
}

function manualResult(id) {
  return {
    result: {
      ending_id: id,
      fit: "clear",
      runner_up_id: "none",
      reasons: [],
      scores: { studio: 0, union: 0, ai_company: 0 },
      epilogue: ""
    },
    manual: true
  };
}

function pickManualEnding(id, replacing = false) {
  if (els.endingPicker.open) els.endingPicker.close();
  if (replacing) state.current = null;
  startEnding(manualResult(id));
}

function renderScores(scores) {
  const rows = [
    ["Studio", scores.studio],
    ["Actors' union", scores.union],
    ["AI company", scores.ai_company]
  ];
  els.scoreBars.replaceChildren();
  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "score-row";
    row.innerHTML = `<span>${label}</span><div class="score-track"><div class="score-fill" style="width:${value * 10}%"></div></div><span class="score-value">${value}/10</span>`;
    els.scoreBars.append(row);
  });
}

function renderReasons(reasons) {
  els.reasonList.replaceChildren();
  reasons.forEach((reason) => {
    const item = document.createElement("article");
    item.className = "reason";
    const quote = document.createElement("blockquote");
    quote.textContent = `"${reason.quote}"`;
    const why = document.createElement("p");
    why.textContent = reason.why;
    item.append(quote, why);
    els.reasonList.append(item);
  });
}

function renderQuestions(ending) {
  els.questionList.replaceChildren();
  [ending.question, ...COMMON_QUESTIONS].forEach((question) => {
    const item = document.createElement("li");
    item.textContent = question;
    els.questionList.append(item);
  });
}

function stopTyping(showAll = false) {
  if (state.typingTimer) clearInterval(state.typingTimer);
  state.typingTimer = null;
  if (showAll && state.current) els.epilogueText.textContent = state.current.result.epilogue;
  state.typingDone = true;
}

function typeEpilogue(text) {
  stopTyping();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    els.epilogueText.textContent = text;
    return;
  }
  let index = 0;
  state.typingDone = false;
  els.epilogueText.textContent = "";
  state.typingTimer = setInterval(() => {
    index += 1;
    els.epilogueText.textContent = text.slice(0, index);
    if (index >= text.length) stopTyping();
  }, 28);
}

function renderProgress() {
  els.stageProgress.replaceChildren();
  state.stages.forEach((_stage, index) => {
    const dot = document.createElement("span");
    if (index <= state.stageIndex) dot.className = "active";
    els.stageProgress.append(dot);
  });
}

function showStage(stage) {
  stopTyping();
  [els.endingIntro, els.epilogueBlock, els.scoresBlock, els.reasonsBlock, els.realWorldBlock, els.questionsBlock].forEach((block) => {
    block.hidden = true;
  });
  const blocks = {
    intro: els.endingIntro,
    epilogue: els.epilogueBlock,
    scores: els.scoresBlock,
    reasons: els.reasonsBlock,
    world: els.realWorldBlock,
    questions: els.questionsBlock
  };
  blocks[stage].hidden = false;
  if (stage === "epilogue") typeEpilogue(state.current.result.epilogue);
  renderProgress();
}

function startEnding(output) {
  const ending = endingById(output.result.ending_id);
  if (!ending) return;
  state.current = output;
  state.ending = ending;
  state.stageIndex = 0;
  state.stages = output.manual
    ? ["intro", "world", "questions"]
    : ["intro", "epilogue", "scores", ...(output.result.reasons.length ? ["reasons"] : []), "world", "questions"];

  els.endingScreen.style.setProperty("--accent", ending.color);
  els.closestLabel.hidden = output.result.fit !== "closest";
  els.endingNumber.textContent = `Ending ${ending.number} of 5`;
  els.endingTitle.textContent = ending.title;
  els.endingTagline.textContent = ending.tagline;
  els.epilogueText.textContent = output.result.epilogue;
  renderScores(output.result.scores);
  renderReasons(output.result.reasons);
  els.realWorldEnding.textContent = ending.realWorld;
  renderQuestions(ending);
  showScreen(els.endingScreen);
  showStage(state.stages[0]);
  els.endingScreen.focus();
}

function advanceEnding() {
  if (state.stages[state.stageIndex] === "epilogue" && !state.typingDone) {
    stopTyping(true);
    return;
  }
  if (state.stageIndex < state.stages.length - 1) {
    state.stageIndex += 1;
    showStage(state.stages[state.stageIndex]);
    return;
  }
  state.found.add(state.ending.id);
  writeFound();
  renderCollection();
  showScreen(els.collectionScreen);
}

function renderCollection() {
  els.collectionHeading.textContent = `Endings found: ${state.found.size} of 5`;
  els.collectionCards.replaceChildren();
  ENDINGS.forEach((ending) => {
    const unlocked = state.revealAll || state.found.has(ending.id);
    const card = document.createElement("article");
    card.className = `collection-card${unlocked ? "" : " locked"}`;
    card.style.setProperty("--card-accent", ending.color);
    card.innerHTML = unlocked
      ? `<p class="collection-number">${ending.number}</p><h2>${ending.title}</h2><p>${ending.tagline}</p>`
      : `<p class="collection-number">${ending.number}</p><h2>???</h2>`;
    els.collectionCards.append(card);
  });
  els.showAllButton.hidden = state.revealAll;
}

function loadSample(sample) {
  els.dealName.value = `Sample: ${endingById(sample.id).title}`;
  setOverallResult(sample.overallResult);
  ["role", "consent", "pay", "credit", "audience"].forEach((key) => {
    els[key].value = sample[key];
    const row = els.termFields.querySelector(`[data-term="${key}"]`);
    setAgreement(row, !sample.notAgreed?.includes(key));
  });
  els.newsFlash.value = sample.newsFlash;
  setError(els.dealError);
  updateCharacterCount();
  els.dealForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetForm() {
  els.dealForm.reset();
  setOverallResult("Deal");
  els.termFields.querySelectorAll(".term-row").forEach((row) => setAgreement(row, true));
  updateCharacterCount();
  setError(els.dealError);
}

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError(els.loginError);
  const button = els.loginForm.querySelector("button");
  button.disabled = true;
  try {
    const teacherCode = els.teacherCode.value.trim();
    const session = await api("/api/session", { teacherCode });
    state.teacherCode = teacherCode;
    state.session = session;
    els.modelName.textContent = session.demo ? "Built-in demo rules" : `Model: ${session.provider} / ${session.model}`;
    els.demoLabel.hidden = !session.demo;
    els.demoSamples.hidden = !session.demo;
    showScreen(els.entryScreen);
  } catch (error) {
    setError(els.loginError, error.message);
  } finally {
    button.disabled = false;
  }
});

els.overallResult.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-result]");
  if (button) setOverallResult(button.dataset.result);
});

els.termFields.addEventListener("click", (event) => {
  const button = event.target.closest(".agreement-toggle");
  if (!button) return;
  const agreed = button.getAttribute("aria-pressed") !== "true";
  setAgreement(button.closest(".term-row"), agreed);
});

els.dealForm.addEventListener("input", updateCharacterCount);

els.dealForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError(els.dealError);
  const deal = collectDeal();
  if (!hasDealText(deal)) return setError(els.dealError, "Type at least one part of the deal.");
  if (countText(deal) > 4000) return setError(els.dealError, "The deal is too long. Keep all text to 4,000 characters.");
  els.showEndingButton.disabled = true;
  els.showEndingButton.textContent = "Asking the model...";
  try {
    const output = await api("/api/ending", { teacherCode: state.teacherCode, deal });
    startEnding(output);
  } catch (error) {
    setError(els.dealError, error.message);
  } finally {
    els.showEndingButton.disabled = false;
    els.showEndingButton.textContent = "Show the ending";
  }
});

els.endingScreen.addEventListener("click", (event) => {
  if (event.target.closest("button")) return;
  advanceEnding();
});

document.addEventListener("keydown", (event) => {
  if (els.endingScreen.hidden || els.endingPicker.open) return;
  if (event.key === " " || event.key === "ArrowRight") {
    event.preventDefault();
    advanceEnding();
  }
});

els.changeEndingButton.addEventListener("click", () => els.endingPicker.showModal());

els.showAllButton.addEventListener("click", () => {
  state.revealAll = true;
  renderCollection();
});

els.startAgainButton.addEventListener("click", () => {
  clearFound();
  state.revealAll = false;
  state.current = null;
  state.ending = null;
  resetForm();
  showScreen(els.entryScreen);
});

makeEndingButtons(els.manualEndings, (id) => pickManualEnding(id));
makeEndingButtons(els.dialogEndings, (id) => pickManualEnding(id, true));

SAMPLE_DEALS.forEach((sample, index) => {
  const ending = endingById(sample.id);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "sample-choice";
  button.textContent = `${index + 1}. ${ending.title}`;
  button.addEventListener("click", () => loadSample(sample));
  els.sampleButtons.append(button);
});

updateCharacterCount();
