import { createHash, randomBytes } from "node:crypto";
import { hasTeacherSession } from "../lib/auth.mjs";
import { createSubmission, listRoleSubmissions, updateSubmission } from "../lib/supabase.mjs";

const allowedCases = new Set(["A", "B", "C"]);
const activityMarker = "Week 7 Class 2 five-term negotiation";
const termKeys = ["role", "consent", "pay", "credit", "audience"];
const noExtraEvidence = "__NO_EXTRA_EVIDENCE__";

function json(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

function clean(value, max) {
  return String(value || "").trim().slice(0, max);
}

function tokenHash(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

function submissionCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
}

function parseBody(request) {
  if (typeof request.body === "string") return JSON.parse(request.body || "{}");
  return request.body || {};
}

function cleanTerms(value, max) {
  return Object.fromEntries(termKeys.map((key) => [key, clean(value?.[key], max)]));
}

function parseRecord(value) {
  try {
    return JSON.parse(String(value || "{}"));
  } catch {
    return {};
  }
}

export function validate(body) {
  const data = {
    groupNames: clean(body.groupNames, 160),
    caseId: clean(body.caseId, 1).toUpperCase(),
    filmGenre: clean(body.filmGenre, 120),
    aiActressRole: clean(body.aiActressRole, 120),
    extraEvidence: clean(body.extraEvidence, 450),
    openingOffers: cleanTerms(body.openingOffers, 260),
    finalPositions: cleanTerms(body.finalPositions, 500),
    submissionId: clean(body.submissionId, 80),
    editToken: clean(body.editToken, 180)
  };

  if (!data.groupNames) throw new Error("Group members are missing.");
  if (!allowedCases.has(data.caseId)) throw new Error("Choose group A, B, or C.");
  const missing = termKeys.filter((key) => !data.openingOffers[key] || !data.finalPositions[key]);
  if (missing.length) throw new Error("Complete both boxes for all five terms.");
  if (JSON.stringify(data.openingOffers).length > 1800 || JSON.stringify(data.finalPositions).length > 3000) {
    throw new Error("The deal sheet is too long. Shorten one or more answers.");
  }
  if (Boolean(data.submissionId) !== Boolean(data.editToken)) throw new Error("The saved edit information is incomplete.");
  if (data.caseId === "A" && (!data.filmGenre || !data.aiActressRole)) {
    throw new Error("Choose the movie genre and the AI actress's role before submitting.");
  }

  const openingRecord = {
    ...data.openingOffers,
    filmGenre: data.filmGenre,
    aiActressRole: data.aiActressRole,
  };
  if (JSON.stringify(openingRecord).length > 1800) {
    throw new Error("The deal sheet is too long. Shorten a few answers and try again.");
  }

  return data;
}

function databaseRow(data) {
  return {
    group_names: data.groupNames,
    case_id: data.caseId,
    case_about: activityMarker,
    what_happened: JSON.stringify({
      ...data.openingOffers,
      filmGenre: data.filmGenre,
      aiActressRole: data.aiActressRole,
    }),
    first_reaction: data.extraEvidence || noExtraEvidence,
    question_answers: JSON.stringify(data.finalPositions),
    figure_selections: [],
    updated_at: new Date().toISOString()
  };
}

export function publicRow(row) {
  const opening = parseRecord(row.what_happened);
  const finalPositions = parseRecord(row.question_answers);
  return {
    id: row.id,
    code: row.code,
    group_names: row.group_names,
    case_id: row.case_id,
    film_genre: clean(opening.filmGenre, 120),
    ai_actress_role: clean(opening.aiActressRole, 120),
    extra_evidence: [noExtraEvidence, "five-term-deal-sheet"].includes(row.first_reaction)
      ? ""
      : clean(row.first_reaction, 450),
    opening_offers: Object.fromEntries(termKeys.map((key) => [key, clean(opening[key], 1000)])),
    final_positions: Object.fromEntries(termKeys.map((key) => [key, clean(finalPositions[key], 1000)])),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function csv(rows) {
  const columns = [
    ["Code", "code"],
    ["Group members", "group_names"],
    ["Side", "case_id"],
    ["Film genre", "film_genre"],
    ["AI actress's role", "ai_actress_role"],
    ["Extra evidence", "extra_evidence"],
    ...termKeys.flatMap((key) => [
      [`${key} opening offer`, `opening_${key}`],
      [`${key} final deal or positions`, `final_${key}`]
    ]),
    ["Submitted", "created_at"],
    ["Updated", "updated_at"]
  ];
  const flattened = rows.map((row) => ({
    ...row,
    ...Object.fromEntries(termKeys.flatMap((key) => [
      [`opening_${key}`, row.opening_offers[key]],
      [`final_${key}`, row.final_positions[key]]
    ]))
  }));
  return [
    columns.map(([label]) => csvCell(label)).join(","),
    ...flattened.map((row) => columns.map(([, key]) => csvCell(row[key])).join(","))
  ].join("\r\n");
}

async function saveSubmission(request, response) {
  let data;
  try {
    data = validate(parseBody(request));
  } catch (error) {
    return json(response, 400, { error: error.message || "Check the submission and try again." });
  }

  try {
    if (data.submissionId) {
      const rows = await updateSubmission(data.submissionId, tokenHash(data.editToken), databaseRow(data));
      if (!rows?.length) return json(response, 403, { error: "This saved response can no longer be edited from this browser." });
      const row = rows[0];
      return json(response, 200, { id: row.id, code: row.code, updatedAt: row.updated_at });
    }

    const editToken = randomBytes(32).toString("base64url");
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const rows = await createSubmission({
          ...databaseRow(data),
          code: submissionCode(),
          edit_token_hash: tokenHash(editToken)
        });
        const row = rows[0];
        return json(response, 201, { id: row.id, code: row.code, editToken, updatedAt: row.updated_at });
      } catch (error) {
        if (error.code !== "23505" || attempt === 3) throw error;
      }
    }
  } catch (error) {
    const unconfigured = /not configured/i.test(error.message || "");
    return json(response, unconfigured ? 503 : 500, {
      error: unconfigured ? "Submission storage is not connected yet." : "The deal sheet could not be saved. Please try again."
    });
  }
}

async function readSubmissions(request, response) {
  if (!hasTeacherSession(request)) return json(response, 401, { error: "Please sign in again." });
  try {
    const rows = (await listRoleSubmissions(activityMarker)).map(publicRow);
    const url = new URL(request.url, "http://localhost");
    if (url.searchParams.get("format") === "csv") {
      response.statusCode = 200;
      response.setHeader("Content-Type", "text/csv; charset=utf-8");
      response.setHeader("Content-Disposition", "attachment; filename=mcom2010-week7-role-negotiation.csv");
      response.setHeader("Cache-Control", "no-store");
      return response.end(`\ufeff${csv(rows)}`);
    }
    return json(response, 200, { submissions: rows });
  } catch (error) {
    const unconfigured = /not configured/i.test(error.message || "");
    return json(response, unconfigured ? 503 : 500, {
      error: unconfigured ? "Submission storage is not connected yet." : "Submissions could not be loaded."
    });
  }
}

export default async function handler(request, response) {
  if (request.method === "POST") return saveSubmission(request, response);
  if (request.method === "GET") return readSubmissions(request, response);
  response.setHeader("Allow", "GET, POST");
  return json(response, 405, { error: "Method not allowed." });
}
