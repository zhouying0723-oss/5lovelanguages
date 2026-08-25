import { FormEvent, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./admin.css";

const names: Record<string, string> = {
  words: "肯定的言词",
  time: "精心的时刻",
  gifts: "用心的礼物",
  acts: "服务的行动",
  touch: "身体的接触",
};
type Summary = {
  totals: Record<string, number>;
  daily: Array<Record<string, number | string>>;
  distribution: {
    receive: Record<string, number>;
    give: Record<string, number>;
  };
};
type Result = {
  attemptId: string;
  visitorId: string;
  nickname: string;
  receiveResult: Array<{ key: string; index: number }>;
  giveResult: Array<{ key: string; index: number }>;
  usedTiebreak: number;
  deviceType: string;
  completedAt: string;
};

function Admin() {
  const [password, setPassword] = useState("");
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState("");
  const auth = useMemo(() => `Basic ${btoa(`admin:${password}`)}`, [password]);
  const load = async (credential = password) => {
    const header = `Basic ${btoa(`admin:${credential}`)}`;
    const [a, b] = await Promise.all([
      fetch("../api/admin/summary", { headers: { Authorization: header } }),
      fetch("../api/admin/results", { headers: { Authorization: header } }),
    ]);
    if (!a.ok || !b.ok) throw new Error("登录失败");
    setSummary(await a.json());
    setResults((await b.json()).results);
    setPassword(credential);
    setError("");
  };
  const login = (event: FormEvent) => {
    event.preventDefault();
    load(input).catch(() => setError("密码不正确，请重试"));
  };
  const exportCsv = async () => {
    const response = await fetch("../api/admin/export.csv", {
      headers: { Authorization: auth },
    });
    const blob = await response.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "love-language-results.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  if (!summary)
    return (
      <main className="login">
        <form onSubmit={login}>
          <span>五</span>
          <p>PRIVATE ANALYTICS</p>
          <h1>数据后台</h1>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="管理员密码"
          />
          <button>登录</button>
          {error && <em>{error}</em>}
        </form>
      </main>
    );
  const t = summary.totals;
  const maxPV = Math.max(...summary.daily.map((d) => Number(d.pageViews)), 1);
  return (
    <main className="dashboard">
      <header>
        <div>
          <span>五</span>
          <strong>爱的五种语言 · 数据后台</strong>
        </div>
        <div>
          <button onClick={exportCsv}>导出 CSV</button>
          <button
            onClick={() => {
              setSummary(null);
              setPassword("");
              setInput("");
            }}
          >
            退出
          </button>
        </div>
      </header>
      <section className="intro">
        <p>ANONYMOUS INSIGHTS</p>
        <h1>关系探索，留下了怎样的足迹？</h1>
        <span>仅统计匿名行为与最终结果，不保存逐题答案。</span>
      </section>
      <section className="metrics">
        {[
          ["访问次数", t.pageViews, "PV"],
          ["访问人数", t.visitors, "UV"],
          ["开始答题", t.starts, "次"],
          ["完成测试", t.completions, "次"],
          ["完成率", `${t.completionRate}%`, "开始→结果"],
          ["复测人数", t.repeatVisitors, "人"],
          ["海报生成", t.posterGenerates, "次"],
          ["海报下载", t.posterDownloads, "次"],
        ].map(([label, value, unit]) => (
          <article key={String(label)}>
            <small>{label}</small>
            <b>{value}</b>
            <em>{unit}</em>
          </article>
        ))}
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>每日访问趋势</h2>
          <span>最近 60 天</span>
        </div>
        <div className="chart">
          {summary.daily.length ? (
            summary.daily.map((d) => (
              <div
                className="day"
                key={String(d.day)}
                title={`${d.day} · PV ${d.pageViews} · UV ${d.visitors}`}
              >
                <div
                  style={{
                    height: `${Math.max((Number(d.pageViews) / maxPV) * 100, 3)}%`,
                  }}
                />
                <span>{String(d.day).slice(5)}</span>
              </div>
            ))
          ) : (
            <p>暂无数据</p>
          )}
        </div>
      </section>
      <section className="twocol">
        <div className="panel">
          <div className="panel-head">
            <h2>喜欢接收的爱</h2>
          </div>
          <Distribution values={summary.distribution.receive} />
        </div>
        <div className="panel">
          <div className="panel-head">
            <h2>愿意付出的爱</h2>
          </div>
          <Distribution values={summary.distribution.give} />
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>最近完成记录</h2>
          <span>同一匿名访客会沿用相同昵称</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>完成时间</th>
                <th>访客昵称</th>
                <th>匿名编号</th>
                <th>接收爱</th>
                <th>付出爱</th>
                <th>决胜</th>
                <th>设备</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.attemptId}>
                  <td>{r.completedAt}</td>
                  <td>
                    <strong className="visitor-name">{r.nickname}</strong>
                  </td>
                  <td>{r.visitorId}…</td>
                  <td>{names[r.receiveResult[0]?.key]}</td>
                  <td>{names[r.giveResult[0]?.key]}</td>
                  <td>{r.usedTiebreak ? "是" : "否"}</td>
                  <td>{r.deviceType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
function Distribution({ values }: { values: Record<string, number> }) {
  const max = Math.max(...Object.values(values), 1);
  return (
    <div className="distribution">
      {Object.keys(names).map((k) => (
        <div key={k}>
          <span>{names[k]}</span>
          <i>
            <b style={{ width: `${((values[k] || 0) / max) * 100}%` }} />
          </i>
          <strong>{values[k] || 0}</strong>
        </div>
      ))}
    </div>
  );
}
createRoot(document.getElementById("admin-root")!).render(<Admin />);
