import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAnthropicRequest,
  buildDealText,
  checkAnthropicAnswer,
  cleanDeal,
  DEFAULT_MODEL,
  demoEnding
} from "../lib/core.mjs";

function terms(values = {}, notAgreed = []) {
  return Object.fromEntries(["role", "consent", "pay", "credit", "audience"].map((key) => [key, {
    text: values[key] || "",
    agreed: !notAgreed.includes(key)
  }]));
}

function deal(values = {}, notAgreed = []) {
  return {
    dealName: values.dealName || "Section 1",
    overallResult: values.overallResult || "Deal",
    terms: terms(values, notAgreed),
    newsFlash: values.newsFlash || ""
  };
}

function rawAnswer(value, stopReason = "end_turn") {
  return { stop_reason: stopReason, content: [{ type: "text", text: JSON.stringify(value) }] };
}

const validAnswer = {
  ending_id: "humans_only",
  fit: "clear",
  runner_up_id: "none",
  reasons: [],
  scores: { studio: 5, union: 8, ai_company: 1 },
  epilogue: "A human actor kept the role."
};

test("a wrong ending id fails", () => {
  assert.throws(() => checkAnthropicAnswer(rawAnswer({ ...validAnswer, ending_id: "unknown" }), "Role: no role"), /model did not answer/i);
});

test("scores are rounded and kept from zero to ten", () => {
  const result = checkAnthropicAnswer(rawAnswer({
    ...validAnswer,
    scores: { studio: 15.4, union: -2, ai_company: 6.6 }
  }), "Role: no role");
  assert.deepEqual(result.scores, { studio: 10, union: 0, ai_company: 7 });
});

test("a reason with a quotation outside the deal is removed", () => {
  const result = checkAnthropicAnswer(rawAnswer({
    ...validAnswer,
    reasons: [
      { term: "role", quote: "Tilly has no role", why: "This keeps Tilly off screen." },
      { term: "pay", quote: "Invented quotation", why: "This is not in the deal." }
    ]
  }), "Role (Agreed): Tilly has no role.");
  assert.equal(result.reasons.length, 1);
  assert.equal(result.reasons[0].quote, "Tilly has no role");
});

test("a refusal stop reason fails", () => {
  assert.throws(() => checkAnthropicAnswer(rawAnswer(validAnswer, "refusal"), "Role: no role"), /model did not answer/i);
});

test("the Anthropic request uses the required structured output and default model", () => {
  const body = buildAnthropicRequest("Deal name: Section 1", {});
  assert.equal(body.model, DEFAULT_MODEL);
  assert.equal(body.model, "claude-opus-5-5");
  assert.equal(body.output_config.format.type, "json_schema");
  assert.equal(body.fallbacks, "default");
  assert.equal("thinking" in body, false);
  assert.equal("temperature" in body, false);
  assert.deepEqual(body.messages, [{ role: "user", content: "Deal name: Section 1" }]);
});

const samples = [
  ["humans_only", deal({
    role: "Tilly has no role. A human actor plays the part.",
    consent: "Not needed, because Tilly is not in the film.",
    pay: "The studio pays the human actor.",
    credit: "The human actor's name only.",
    audience: "Nothing to tell.",
    newsFlash: "The studio asked again. The union said no. The studio accepted."
  })],
  ["studio_takes_all", deal({
    role: "Tilly is the lead.",
    consent: "No permission needed. The studio owns the film.",
    pay: "The fee goes to the AI company only.",
    credit: "Tilly Norwood.",
    audience: "A small line at the end of the credits.",
    newsFlash: "Tilly stays the lead in the sequel."
  })],
  ["tilly_with_conditions", deal({
    role: "A supporting role, less than 10 minutes on screen.",
    consent: "The union must approve.",
    pay: "10 percent of Tilly's fee goes to an actors' fund.",
    credit: "Tilly Norwood (AI performer).",
    audience: "A label on the poster and at the start of the film.",
    newsFlash: "Tilly stays in a supporting role. A human plays the lead."
  })],
  ["open_book", deal({
    role: "The lead role in the sequel.",
    consent: "The actors whose work trained Tilly must agree.",
    pay: "Actors get paid every time Tilly is used.",
    credit: "Tilly Norwood, AI performer.",
    audience: "A label at the start of the film.",
    newsFlash: "The union accepted the lead because the AI company published the material used to train Tilly."
  })],
  ["back_to_table", deal({
    overallResult: "No deal",
    role: "Studio: the lead. Union: a background role only.",
    pay: "Studio: no extra pay. Union: pay for each use.",
    newsFlash: "The news flash ended the deal."
  }, ["role", "pay"])]
];

for (const [expected, sample] of samples) {
  test(`demo mode selects ${expected}`, () => {
    assert.equal(demoEnding(sample).ending_id, expected);
  });
}

test("the deal text uses the required line format", () => {
  const text = buildDealText(cleanDeal(samples[4][1]));
  assert.match(text, /^Deal name: Section 1\nOverall result: No deal/m);
  assert.match(text, /Role \(Not agreed\): Studio: the lead/);
  assert.match(text, /Consent \(Agreed\): \(no text\)/);
  assert.match(text, /After the news flash: The news flash ended the deal\.$/);
});
