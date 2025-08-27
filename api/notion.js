// Shared Notion helpers for Vercel Serverless (Node.js 18+).
// Reads env vars: NOTION_TOKEN, PARENT_PAGE_ID, DB_TITLE (optional).

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

// ===== Env & Headers =====
function getEnv() {
  const token = process.env.NOTION_TOKEN;
  const parentPageId = process.env.PARENT_PAGE_ID;
  const dbTitle = process.env.DB_TITLE || "School Register";
  if (!token) throw new Error("Missing NOTION_TOKEN");
  if (!parentPageId) throw new Error("Missing PARENT_PAGE_ID");
  return { token, parentPageId, dbTitle };
}

function headers(token) {
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION
  };
}

// ===== Utilities =====
function dbPropertiesDefinition() {
  const weeks = {};
  for (let i = 1; i <= 12; i++) weeks[`Week${i}`] = { checkbox: {} };
  return {
    "Name": { "title": {} },
    "S/N": { "number": {} },
    "Phone": { "rich_text": {} },
    ...weeks
  };
}

function dbTitleString(db) {
  const t = (db.title || [])
    .map(x => x.plain_text || (x.text && x.text.content) || "")
    .join("")
    .trim();
  return t;
}

function parseStudentFromPage(page) {
  const p = page.properties || {};
  const rec = {
    pageId: page.id,
    SN: p["S/N"]?.number || null,
    Name: (p["Name"]?.title || []).map(x => x.plain_text || "").join(""),
    Phone: (p["Phone"]?.rich_text || []).map(x => x.plain_text || "").join("")
  };
  for (let i = 1; i <= 12; i++) rec[`Week${i}`] = !!(p[`Week${i}`]?.checkbox);
  return rec;
}

// ===== Database Setup =====
async function searchDatabasesInParent(token, parentPageId) {
  const res = await fetch(`${NOTION_API}/search`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      filter: { property: "object", value: "database" },
      page_size: 100
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Search failed: ${data.message || res.statusText}`);
  const results = (data.results || []).filter(db =>
    db.parent?.type === "page_id" &&
    db.parent.page_id.replace(/-/g, "") === parentPageId.replace(/-/g, "")
  );
  return results;
}

async function createDatabaseIfMissing() {
  const { token, parentPageId, dbTitle } = getEnv();
  const inParent = await searchDatabasesInParent(token, parentPageId);
  let found = inParent.find(db => dbTitleString(db).toLowerCase() === dbTitle.toLowerCase());
  if (found) return { databaseId: found.id, created: false };

  const body = {
    parent: { page_id: parentPageId },
    title: [{ type: "text", text: { content: dbTitle } }],
    properties: dbPropertiesDefinition()
  };
  const res = await fetch(`${NOTION_API}/databases`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Create database failed: ${data.message || res.statusText}`);
  return { databaseId: data.id, created: true };
}

// ===== Core Actions =====
async function listStudents(databaseId) {
  const { token } = getEnv();
  const res = await fetch(`${NOTION_API}/databases/${databaseId}/query`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ page_size: 2000 })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Query failed: ${data.message || res.statusText}`);
  return (data.results || []).map(parseStudentFromPage);
}

async function addStudent(databaseId, { name, phone, sn }) {
  const { token } = getEnv();
  const props = {
    "Name": { title: [{ text: { content: name } }] },
    "Phone": { rich_text: [{ text: { content: phone || "" } }] }
  };
  if (sn !== undefined) props["S/N"] = { number: Number(sn) };
  for (let i = 1; i <= 12; i++) props[`Week${i}`] = { checkbox: false };

  const res = await fetch(`${NOTION_API}/pages`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ parent: { database_id: databaseId }, properties: props })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Add student failed: ${data.message || res.statusText}`);
  return parseStudentFromPage(data);
}

async function updateAttendance({ pageId, week, present }) {
  const { token } = getEnv();
  const propName = `Week${week}`;
  const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify({ properties: { [propName]: { checkbox: !!present } } })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Update attendance failed: ${data.message || res.statusText}`);
  return parseStudentFromPage(data);
}

function toCSV(rows) {
  const header = ["S/N", "Name", "Phone", ...Array.from({ length: 12 }, (_, i) => `Week${i + 1}`)];
  const lines = [header.join(",")];
  for (const r of rows) {
    const row = [
      r.SN ?? "",
      r.Name ?? "",
      r.Phone ?? "",
      ...Array.from({ length: 12 }, (_, i) => (r[`Week${i + 1}`] ? "Present" : "Absent"))
    ];
    lines.push(row.join(","));
  }
  return lines.join("\n");
}

module.exports = {
  getEnv,
  createDatabaseIfMissing,
  listStudents,
  addStudent,
  updateAttendance,
  toCSV
};
