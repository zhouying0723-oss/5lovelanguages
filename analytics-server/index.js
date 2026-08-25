import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import initSqlJs from "sql.js";

const port = Number(process.env.PORT || 3025);
const password = process.env.ADMIN_PASSWORD || "";
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "analytics.sqlite");
fs.mkdirSync(dataDir, { recursive: true });
const SQL = await initSqlJs({
  locateFile: (file) =>
    path.join(process.cwd(), "node_modules/sql.js/dist", file),
});
const db = fs.existsSync(dbPath)
  ? new SQL.Database(fs.readFileSync(dbPath))
  : new SQL.Database();
db.run(`
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

function persist() {
  const temporary = `${dbPath}.tmp`;
  fs.writeFileSync(temporary, Buffer.from(db.export()), { mode: 0o600 });
  fs.renameSync(temporary, dbPath);
}
function all(sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const rows = [];
  while (statement.step()) rows.push(statement.getAsObject());
  statement.free();
  return rows;
}
function one(sql, params = []) {
  return all(sql, params)[0] || {};
}
persist();

const allowedEvents = new Set([
  "page_view",
  "quiz_start",
  "quiz_complete",
  "poster_generate",
  "poster_download",
]);
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

function validId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9-]{8,80}$/.test(value);
}
function safeDevice(value) {
  return ["mobile", "tablet", "desktop"].includes(value) ? value : "desktop";
}
const nicknameAdjectives = [
  "温柔的",
  "明亮的",
  "安静的",
  "勇敢的",
  "浪漫的",
  "真诚的",
  "柔软的",
  "热烈的",
  "清醒的",
  "自由的",
  "坚定的",
  "可爱的",
];
const nicknameNouns = [
  "小玫瑰",
  "云朵",
  "月亮",
  "星星",
  "海风",
  "萤火虫",
  "向日葵",
  "小狐狸",
  "白鲸",
  "山茶花",
  "蒲公英",
  "小宇宙",
];
function visitorNickname(visitorId) {
  const digest = crypto.createHash("sha256").update(String(visitorId)).digest();
  const adjective = nicknameAdjectives[digest[0] % nicknameAdjectives.length];
  const noun = nicknameNouns[digest[1] % nicknameNouns.length];
  const suffix = digest.readUInt16BE(2) % 1000;
  return `${adjective}${noun}·${String(suffix).padStart(3, "0")}`;
}
function safeResult(value) {
  if (!Array.isArray(value) || value.length !== 5) return null;
  const clean = value.map((item) => ({
    key: String(item?.key || ""),
    index: Number(item?.index),
  }));
  return clean.every(
    (item) =>
      ["words", "time", "gifts", "acts", "touch"].includes(item.key) &&
      Number.isInteger(item.index) &&
      item.index >= 0 &&
      item.index <= 100,
  )
    ? clean
    : null;
}
function authorized(req) {
  if (!password) return false;
  const [scheme, token] = String(req.headers.authorization || "").split(" ");
  if (scheme !== "Basic" || !token) return false;
  let decoded = "";
  try {
    decoded = Buffer.from(token, "base64").toString("utf8");
  } catch {
    return false;
  }
  const supplied = decoded.slice(decoded.indexOf(":") + 1);
  const a = Buffer.from(supplied);
  const b = Buffer.from(password);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function requireAdmin(req, res, next) {
  if (!authorized(req)) return res.status(401).json({ error: "unauthorized" });
  next();
}

app.post("/api/events", (req, res) => {
  const {
    visitorId,
    attemptId = null,
    eventType,
    deviceType,
    result,
  } = req.body || {};
  if (
    !validId(visitorId) ||
    !allowedEvents.has(eventType) ||
    (attemptId && !validId(attemptId))
  )
    return res.status(400).json({ error: "invalid_event" });
  const device = safeDevice(deviceType);
  try {
    db.run("BEGIN");
    db.run(
      "INSERT INTO events (visitor_id, attempt_id, event_type, device_type) VALUES (?, ?, ?, ?)",
      [visitorId, attemptId, eventType, device],
    );
    if (eventType === "quiz_complete") {
      const receive = safeResult(result?.receive);
      const give = safeResult(result?.give);
      if (!attemptId || !receive || !give) throw new Error("invalid_result");
      db.run(
        "INSERT OR IGNORE INTO results (attempt_id, visitor_id, receive_result, give_result, used_tiebreak, device_type) VALUES (?, ?, ?, ?, ?, ?)",
        [
          attemptId,
          visitorId,
          JSON.stringify(receive),
          JSON.stringify(give),
          result?.usedTiebreak ? 1 : 0,
          device,
        ],
      );
    }
    db.run("COMMIT");
    persist();
    res.status(202).json({ ok: true });
  } catch {
    try {
      db.run("ROLLBACK");
    } catch {
      /* transaction was not active */
    }
    res.status(400).json({ error: "invalid_result" });
  }
});

app.get("/api/admin/summary", requireAdmin, (_req, res) => {
  const totals = one(`SELECT SUM(event_type='page_view') AS pageViews,
    COUNT(DISTINCT CASE WHEN event_type='page_view' THEN visitor_id END) AS visitors,
    COUNT(DISTINCT CASE WHEN event_type='quiz_start' THEN attempt_id END) AS starts,
    COUNT(DISTINCT CASE WHEN event_type='quiz_complete' THEN attempt_id END) AS completions,
    SUM(event_type='poster_generate') AS posterGenerates, SUM(event_type='poster_download') AS posterDownloads FROM events`);
  Object.keys(totals).forEach((key) => {
    totals[key] = Number(totals[key] || 0);
  });
  const repeatVisitors = Number(
    one(
      "SELECT COUNT(*) AS value FROM (SELECT visitor_id FROM results GROUP BY visitor_id HAVING COUNT(*) > 1)",
    ).value || 0,
  );
  const daily =
    all(`SELECT date(occurred_at, 'localtime') AS day, SUM(event_type='page_view') AS pageViews,
    COUNT(DISTINCT CASE WHEN event_type='page_view' THEN visitor_id END) AS visitors,
    COUNT(DISTINCT CASE WHEN event_type='quiz_start' THEN attempt_id END) AS starts,
    COUNT(DISTINCT CASE WHEN event_type='quiz_complete' THEN attempt_id END) AS completions,
    SUM(event_type='poster_download') AS posterDownloads FROM events GROUP BY day ORDER BY day DESC LIMIT 60`).reverse();
  const distribution = all(
    "SELECT receive_result, give_result FROM results",
  ).reduce(
    (acc, row) => {
      const receive = JSON.parse(row.receive_result)[0]?.key;
      const give = JSON.parse(row.give_result)[0]?.key;
      if (receive) acc.receive[receive] = (acc.receive[receive] || 0) + 1;
      if (give) acc.give[give] = (acc.give[give] || 0) + 1;
      return acc;
    },
    { receive: {}, give: {} },
  );
  res.json({
    totals: {
      ...totals,
      repeatVisitors,
      completionRate: totals.starts
        ? Math.round((totals.completions / totals.starts) * 1000) / 10
        : 0,
    },
    daily,
    distribution,
  });
});

app.get("/api/admin/results", requireAdmin, (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const rows = all(
    `SELECT attempt_id AS attemptId, visitor_id AS visitorId, receive_result AS receiveResult,
    give_result AS giveResult, used_tiebreak AS usedTiebreak, device_type AS deviceType, completed_at AS completedAt
    FROM results ORDER BY completed_at DESC LIMIT ?`,
    [limit],
  ).map((row) => ({
    ...row,
    nickname: visitorNickname(row.visitorId),
    visitorId: String(row.visitorId).slice(0, 8),
    receiveResult: JSON.parse(row.receiveResult),
    giveResult: JSON.parse(row.giveResult),
  }));
  res.json({ results: rows });
});

app.get("/api/admin/export.csv", requireAdmin, (_req, res) => {
  const rows = all(
    "SELECT attempt_id, visitor_id, receive_result, give_result, used_tiebreak, device_type, completed_at FROM results ORDER BY completed_at DESC",
  );
  const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [
    "attempt_id,visitor_id,visitor_nickname,receive_result,give_result,used_tiebreak,device_type,completed_at",
    ...rows.map((row) =>
      [
        row.attempt_id,
        row.visitor_id,
        visitorNickname(row.visitor_id),
        row.receive_result,
        row.give_result,
        row.used_tiebreak,
        row.device_type,
        row.completed_at,
      ]
        .map(quote)
        .join(","),
    ),
  ].join("\n");
  res
    .set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=love-language-results.csv",
    })
    .send(`\ufeff${csv}`);
});

app.get("/health", (_req, res) => res.json({ ok: true }));
if (process.env.NODE_ENV !== "test")
  app.listen(port, "127.0.0.1", () =>
    console.log(`Analytics listening on ${port}`),
  );
export { app, db };
