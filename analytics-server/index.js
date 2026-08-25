import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import express from "express";

const port = Number(process.env.PORT || 3025);
const password = process.env.ADMIN_PASSWORD || "";
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "analytics.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id TEXT NOT NULL,
    attempt_id TEXT,
    event_type TEXT NOT NULL,
    device_type TEXT NOT NULL,
    occurred_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS results (
    attempt_id TEXT PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    receive_result TEXT NOT NULL,
    give_result TEXT NOT NULL,
    used_tiebreak INTEGER NOT NULL DEFAULT 0,
    device_type TEXT NOT NULL,
    completed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_events_type_time ON events(event_type, occurred_at);
  CREATE INDEX IF NOT EXISTS idx_events_visitor_time ON events(visitor_id, occurred_at);
  CREATE INDEX IF NOT EXISTS idx_results_visitor_time ON results(visitor_id, completed_at);
`);
db.pragma("optimize");

const allowedEvents = new Set(["page_view", "quiz_start", "quiz_complete", "poster_generate", "poster_download"]);
const insertEvent = db.prepare("INSERT INTO events (visitor_id, attempt_id, event_type, device_type) VALUES (?, ?, ?, ?)");
const insertResult = db.prepare("INSERT OR IGNORE INTO results (attempt_id, visitor_id, receive_result, give_result, used_tiebreak, device_type) VALUES (?, ?, ?, ?, ?, ?)");
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

function validId(value) { return typeof value === "string" && /^[a-zA-Z0-9-]{8,80}$/.test(value); }
function safeDevice(value) { return ["mobile", "tablet", "desktop"].includes(value) ? value : "desktop"; }
function safeResult(value) {
  if (!Array.isArray(value) || value.length !== 5) return null;
  const clean = value.map(item => ({ key: String(item?.key || ""), index: Number(item?.index) }));
  return clean.every(item => ["words", "time", "gifts", "acts", "touch"].includes(item.key) && Number.isInteger(item.index) && item.index >= 0 && item.index <= 100) ? clean : null;
}
function authorized(req) {
  if (!password) return false;
  const [scheme, token] = String(req.headers.authorization || "").split(" ");
  if (scheme !== "Basic" || !token) return false;
  let decoded = ""; try { decoded = Buffer.from(token, "base64").toString("utf8"); } catch { return false; }
  const supplied = decoded.slice(decoded.indexOf(":") + 1);
  const a = Buffer.from(supplied); const b = Buffer.from(password);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function requireAdmin(req, res, next) { if (!authorized(req)) return res.status(401).json({ error: "unauthorized" }); next(); }

app.post("/api/events", (req, res) => {
  const { visitorId, attemptId = null, eventType, deviceType, result } = req.body || {};
  if (!validId(visitorId) || !allowedEvents.has(eventType) || (attemptId && !validId(attemptId))) return res.status(400).json({ error: "invalid_event" });
  const device = safeDevice(deviceType);
  const transaction = db.transaction(() => {
    insertEvent.run(visitorId, attemptId, eventType, device);
    if (eventType === "quiz_complete") {
      const receive = safeResult(result?.receive); const give = safeResult(result?.give);
      if (!attemptId || !receive || !give) throw new Error("invalid_result");
      insertResult.run(attemptId, visitorId, JSON.stringify(receive), JSON.stringify(give), result?.usedTiebreak ? 1 : 0, device);
    }
  });
  try { transaction(); res.status(202).json({ ok: true }); } catch { res.status(400).json({ error: "invalid_result" }); }
});

app.get("/api/admin/summary", requireAdmin, (_req, res) => {
  const totals = db.prepare(`SELECT
    SUM(event_type='page_view') AS pageViews,
    COUNT(DISTINCT CASE WHEN event_type='page_view' THEN visitor_id END) AS visitors,
    COUNT(DISTINCT CASE WHEN event_type='quiz_start' THEN attempt_id END) AS starts,
    COUNT(DISTINCT CASE WHEN event_type='quiz_complete' THEN attempt_id END) AS completions,
    SUM(event_type='poster_generate') AS posterGenerates,
    SUM(event_type='poster_download') AS posterDownloads
    FROM events`).get();
  const repeatVisitors = db.prepare("SELECT COUNT(*) AS value FROM (SELECT visitor_id FROM results GROUP BY visitor_id HAVING COUNT(*) > 1)").get().value;
  const daily = db.prepare(`SELECT date(occurred_at, 'localtime') AS day,
    SUM(event_type='page_view') AS pageViews,
    COUNT(DISTINCT CASE WHEN event_type='page_view' THEN visitor_id END) AS visitors,
    COUNT(DISTINCT CASE WHEN event_type='quiz_start' THEN attempt_id END) AS starts,
    COUNT(DISTINCT CASE WHEN event_type='quiz_complete' THEN attempt_id END) AS completions,
    SUM(event_type='poster_download') AS posterDownloads
    FROM events GROUP BY day ORDER BY day DESC LIMIT 60`).all().reverse();
  const distribution = db.prepare("SELECT receive_result, give_result FROM results").all().reduce((acc, row) => {
    const receive = JSON.parse(row.receive_result)[0]?.key; const give = JSON.parse(row.give_result)[0]?.key;
    if (receive) acc.receive[receive] = (acc.receive[receive] || 0) + 1;
    if (give) acc.give[give] = (acc.give[give] || 0) + 1;
    return acc;
  }, { receive: {}, give: {} });
  res.json({ totals: { ...totals, repeatVisitors, completionRate: totals.starts ? Math.round(totals.completions / totals.starts * 1000) / 10 : 0 }, daily, distribution });
});

app.get("/api/admin/results", requireAdmin, (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const rows = db.prepare(`SELECT attempt_id AS attemptId, visitor_id AS visitorId, receive_result AS receiveResult,
    give_result AS giveResult, used_tiebreak AS usedTiebreak, device_type AS deviceType, completed_at AS completedAt
    FROM results ORDER BY completed_at DESC LIMIT ?`).all(limit).map(row => ({ ...row, visitorId: row.visitorId.slice(0, 8), receiveResult: JSON.parse(row.receiveResult), giveResult: JSON.parse(row.giveResult) }));
  res.json({ results: rows });
});

app.get("/api/admin/export.csv", requireAdmin, (_req, res) => {
  const rows = db.prepare("SELECT attempt_id, visitor_id, receive_result, give_result, used_tiebreak, device_type, completed_at FROM results ORDER BY completed_at DESC").all();
  const quote = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = ["attempt_id,visitor_id,receive_result,give_result,used_tiebreak,device_type,completed_at", ...rows.map(row => Object.values(row).map(quote).join(","))].join("\n");
  res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=love-language-results.csv" }).send(`\ufeff${csv}`);
});

app.get("/health", (_req, res) => res.json({ ok: true }));
if (process.env.NODE_ENV !== "test") app.listen(port, "127.0.0.1", () => console.log(`Analytics listening on ${port}`));

export { app, db };
