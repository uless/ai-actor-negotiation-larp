import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import roleSubmissions, { publicRow, validate } from "../api/role-submissions.mjs";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const teachHtml = await readFile(new URL("../teach.html", import.meta.url), "utf8");
const js = await readFile(new URL("../assets/role-deal-app.js", import.meta.url), "utf8");
const teachJs = await readFile(new URL("../assets/role-teach.js", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const api = await readFile(new URL("../api/role-submissions.mjs", import.meta.url), "utf8");
const supabase = await readFile(new URL("../lib/supabase.mjs", import.meta.url), "utf8");

for (const id of [
  "setupForm", "casePicker", "workspace", "caseIntro", "roleBrief", "caseFacts",
  "studioPlan", "filmGenre", "aiActressRole", "extraEvidence",
  "sideName", "dealTerms", "roleOpening", "roleFinal", "consentOpening", "consentFinal",
  "payOpening", "payFinal", "creditOpening", "creditFinal", "audienceOpening", "audienceFinal", "submitButton"
]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `Missing #${id}`);
}

for (const phrase of [
  "You are the studio",
  "You are the actors' union (SAG-AFTRA)",
  "You are the company that made the AI actress",
  "Choose the genre and the role you want the AI actress to play.",
  "Decide what the studio and the AI company must agree to before your union says yes.",
  "A real role and a screen credit could help you get the next studio interested too.",
  "The AI actress in your film, at a cost that you can afford.",
  "No AI actor is made from an actor's work without that actor's consent.",
  "A promise to say what material was used to train her",
  "requires informed consent and compensation",
  "Lionsgate announced a partnership with Runway",
  "The Hollywood Reporter interview with Tyler Perry, February 2024, as reported by NPR, February 28, 2024.",
  "Lionsgate and Runway announcement, September 2024."
]) {
  assert.ok(js.includes(phrase), `Missing content: ${phrase}`);
}

for (const phrase of [
  "Choose your movie",
  "Build your case",
  "think of another example, search for one, or use AI to find one that supports your side",
  "Role: How big a part can the AI actress play?",
  "Consent: Whose permission is needed?",
  "Pay: Who gets paid, and how?",
  "Credit: Whose name goes in the credits?",
  "Telling the audience: Does the film say the actress is AI, and where?",
  "Complete both boxes for all five terms."
]) {
  assert.ok(html.includes(phrase), `Missing rule-sheet text: ${phrase}`);
}

for (const removed of [
  "Negotiate with the other two groups",
  "Round 1: opening offers.",
  "Round 2: answer and bargain.",
  "Round 3: final offers and one deal.",
  "Meta's celebrity chatbots",
  "CarynAI",
  "Robin Williams",
  "Figure 2",
  "There are no right answers",
  "The rule that all three groups agreed on",
  "If you did not agree, your side's version of the rule"
]) {
  assert.ok(!`${html}\n${js}`.includes(removed), `Old or extra student-facing content remains: ${removed}`);
}

assert.ok(html.includes('/assets/role-deal-app.js'), "Five-term client script is not connected");
assert.ok(teachHtml.includes('/assets/role-teach.js'), "Role-card teacher script is not connected");
assert.ok(js.includes('fetch("/api/role-submissions"'), "Student submission API is not connected");
assert.ok(teachJs.includes('fetch("/api/role-submissions"'), "Teacher submission API is not connected");
assert.ok(api.includes("Week 7 Class 2 five-term negotiation"), "Activity data marker is missing");
assert.ok(supabase.includes("listRoleSubmissions"), "Filtered instructor query is missing");
assert.ok(css.includes("#14213d"), "Ole Miss navy is missing");
assert.ok(css.includes("#ce1126"), "Ole Miss crimson is missing");
assert.ok(!/[—–]/.test(`${html}\n${js}`), "Student-facing copy contains an em or en dash");

const invalidRequest = { method: "POST", body: {}, headers: {}, url: "/api/role-submissions" };
const invalidResponse = {
  statusCode: 0,
  headers: {},
  setHeader(name, value) { this.headers[name] = value; },
  end(value) { this.body = value; }
};
await roleSubmissions(invalidRequest, invalidResponse);
assert.equal(invalidResponse.statusCode, 400, "Invalid submissions should be rejected before database access");

const completeTerms = {
  role: "Opening role term",
  consent: "Opening consent term",
  pay: "Opening pay term",
  credit: "Opening credit term",
  audience: "Opening audience term"
};
const checked = validate({
  groupNames: "Ava and Eli",
  caseId: "A",
  filmGenre: "Mystery comedy",
  aiActressRole: "The detective's rival",
  extraEvidence: "A checked example from another production.",
  openingOffers: completeTerms,
  finalPositions: Object.fromEntries(Object.entries(completeTerms).map(([key, value]) => [key, `Final ${value}`]))
});
assert.equal(checked.openingOffers.role, "Opening role term");
assert.equal(checked.filmGenre, "Mystery comedy");
assert.throws(
  () => validate({ groupNames: "Ava", caseId: "A", openingOffers: completeTerms, finalPositions: completeTerms }),
  /movie genre and the AI actress's role/
);
assert.throws(
  () => validate({ groupNames: "Ava", caseId: "B", openingOffers: completeTerms, finalPositions: { ...completeTerms, pay: "" } }),
  /all five terms/
);

const decoded = publicRow({
  id: "1",
  code: "ABC123",
  group_names: "Ava and Eli",
  case_id: "A",
  what_happened: JSON.stringify({ ...completeTerms, filmGenre: "Mystery comedy", aiActressRole: "The detective's rival" }),
  first_reaction: "A checked example from another production.",
  question_answers: JSON.stringify(Object.fromEntries(Object.entries(completeTerms).map(([key, value]) => [key, `Final ${value}`]))),
  created_at: "2026-10-07T00:00:00.000Z",
  updated_at: "2026-10-07T00:00:00.000Z"
});
assert.equal(decoded.opening_offers.audience, "Opening audience term");
assert.equal(decoded.final_positions.pay, "Final Opening pay term");
assert.equal(decoded.film_genre, "Mystery comedy");
assert.equal(decoded.ai_actress_role, "The detective's rival");
assert.equal(decoded.extra_evidence, "A checked example from another production.");

console.log("Role negotiation smoke checks passed");
