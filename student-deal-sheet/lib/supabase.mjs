const table = "week7_case_submissions";

function config() {
  const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Submission storage is not configured.");
  return { url, key };
}

async function request(path, options = {}) {
  const { url, key } = config();
  const authHeaders = key.startsWith("sb_")
    ? {}
    : { Authorization: `Bearer ${key}` };
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      ...authHeaders,
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.message || body?.hint || "Database request failed.");
    error.status = response.status;
    error.code = body?.code;
    throw error;
  }
  return body;
}

export async function createSubmission(row) {
  return request(table, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row)
  });
}

export async function updateSubmission(id, editTokenHash, row) {
  const filter = `${table}?id=eq.${encodeURIComponent(id)}&edit_token_hash=eq.${encodeURIComponent(editTokenHash)}`;
  return request(filter, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row)
  });
}

export async function listSubmissions() {
  const fields = [
    "id", "code", "group_names", "case_id", "case_about", "what_happened",
    "first_reaction", "question_answers", "figure_selections", "created_at", "updated_at"
  ].join(",");
  return request(`${table}?select=${fields}&order=updated_at.desc`, { method: "GET" });
}

export async function listRoleSubmissions(activityMarker) {
  const fields = [
    "id", "code", "group_names", "case_id", "what_happened",
    "first_reaction", "question_answers", "created_at", "updated_at"
  ].join(",");
  const marker = encodeURIComponent(activityMarker);
  return request(`${table}?select=${fields}&case_about=eq.${marker}&order=updated_at.desc`, { method: "GET" });
}

export async function checkConnection() {
  await request(`${table}?select=id&limit=1`, { method: "GET" });
  return true;
}
