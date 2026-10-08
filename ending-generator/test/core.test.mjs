import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAnthropicRequest,
  buildOpenAIRequest,
  buildDealText,
  checkAnthropicAnswer,
  checkOpenAIAnswer,
  cleanDeal,
  DEMO_MODEL,
  demoEnding,
  getLlmConfig,
  runEnding
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
      { term: "role", quote: "The AI actress has no role", why: "This keeps the AI actress off screen." },
      { term: "pay", quote: "Invented quotation", why: "This is not in the deal." }
    ]
  }), "Role (Agreed): The AI actress has no role.");
  assert.equal(result.reasons.length, 1);
  assert.equal(result.reasons[0].quote, "The AI actress has no role");
});

test("a refusal stop reason fails", () => {
  assert.throws(() => checkAnthropicAnswer(rawAnswer(validAnswer, "refusal"), "Role: no role"), /model did not answer/i);
});

test("the Anthropic request uses the configured model and structured output", () => {
  const body = buildAnthropicRequest("Deal name: Section 1", { LLM_MODEL: "chosen-anthropic-model" });
  assert.equal(body.model, "chosen-anthropic-model");
  assert.equal(body.output_config.format.type, "json_schema");
  assert.equal(body.fallbacks, "default");
  assert.equal("thinking" in body, false);
  assert.equal("temperature" in body, false);
  assert.deepEqual(body.messages, [{ role: "user", content: "Deal name: Section 1" }]);
});

test("the OpenAI request uses the Responses API structured output shape", () => {
  const body = buildOpenAIRequest("Deal name: Section 1", { LLM_MODEL: "chosen-openai-model" });
  assert.equal(body.model, "chosen-openai-model");
  assert.equal(body.text.format.type, "json_schema");
  assert.equal(body.text.format.name, "classroom_deal_ending");
  assert.equal(body.text.format.strict, true);
  assert.equal(body.input[0].role, "system");
  assert.deepEqual(body.input[1], { role: "user", content: "Deal name: Section 1" });
});

test("OpenAI output text is parsed and checked", () => {
  const raw = {
    status: "completed",
    output: [{ content: [{ type: "output_text", text: JSON.stringify(validAnswer) }] }]
  };
  assert.equal(checkOpenAIAnswer(raw, "Role: no role").ending_id, "humans_only");
});

test("provider configuration requires a model when an API key is present", () => {
  assert.deepEqual(getLlmConfig({}), { demo: true, provider: "demo", model: DEMO_MODEL, apiKey: "", baseUrl: "" });
  assert.throws(() => getLlmConfig({ LLM_API_KEY: "secret", LLM_PROVIDER: "openai" }), /LLM_MODEL/);
  assert.equal(getLlmConfig({ LLM_API_KEY: "secret", LLM_PROVIDER: "openai", LLM_MODEL: "model-id" }).provider, "openai");
});

const samples = [
  ["humans_only", deal({
    role: "The AI actress has no role. A human actor plays the part.",
    consent: "Not needed, because the AI actress is not in the film.",
    pay: "The studio pays the human actor.",
    credit: "The human actor's name only.",
    audience: "Nothing to tell.",
    newsFlash: "The studio asked again. The union said no. The studio accepted."
  })],
  ["studio_takes_all", deal({
    role: "The AI actress is the lead.",
    consent: "No permission needed. The studio owns the film.",
    pay: "The fee goes to the AI company only.",
    credit: "AI performer.",
    audience: "A small line at the end of the credits.",
    newsFlash: "The AI actress stays the lead in the sequel."
  })],
  ["ai_actress_with_conditions", deal({
    role: "A supporting role, less than 10 minutes on screen.",
    consent: "The union must approve.",
    pay: "10 percent of the AI actress's fee goes to an actors' fund.",
    credit: "AI actress (AI performer).",
    audience: "A label on the poster and at the start of the film.",
    newsFlash: "The AI actress stays in a supporting role. A human plays the lead."
  })],
  ["open_book", deal({
    role: "The lead role in the sequel.",
    consent: "The actors whose work trained the AI actress must agree.",
    pay: "Actors get paid every time the AI actress is used.",
    credit: "AI actress, AI performer.",
    audience: "A label at the start of the film.",
    newsFlash: "The union accepted the lead because the AI company published the material used to train the AI actress."
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

test("OpenAI provider uses the configured Responses endpoint", async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => ({
        status: "completed",
        output: [{ content: [{ type: "output_text", text: JSON.stringify(validAnswer) }] }]
      })
    };
  };
  const output = await runEnding(samples[0][1], {
    LLM_PROVIDER: "openai",
    LLM_API_KEY: "test-key",
    LLM_MODEL: "chosen-openai-model"
  }, fetchImpl);
  assert.equal(request.url, "https://api.openai.com/v1/responses");
  assert.equal(request.options.headers.Authorization, "Bearer test-key");
  assert.equal(output.provider, "openai");
  assert.equal(output.model, "chosen-openai-model");
  assert.equal(output.demo, false);
});

test("the deal text uses the required line format", () => {
  const text = buildDealText(cleanDeal(samples[4][1]));
  assert.match(text, /^Deal name: Section 1\nOverall result: No deal/m);
  assert.match(text, /Role \(Not agreed\): Studio: the lead/);
  assert.match(text, /Consent \(Agreed\): \(no text\)/);
  assert.match(text, /After the news flash: The news flash ended the deal\.$/);
});
