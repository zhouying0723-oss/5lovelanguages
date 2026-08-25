"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";

type LoveKey = "words" | "time" | "gifts" | "acts" | "touch";
type Phase = "intro" | "quiz" | "tiebreak" | "result";

const LOVE: Record<LoveKey, { name: string; short: string; color: string; desc: string; receive: string; give: string }> = {
  words: { name: "肯定的言词", short: "言词", color: "#d96d62", desc: "真诚的赞美、感谢与鼓励，让爱被清楚地说出来。", receive: "你在意对方是否把欣赏与关心说出口。", give: "你习惯用鼓励、感谢和真诚表达支持别人。" },
  time: { name: "精心的时刻", short: "陪伴", color: "#9c6b92", desc: "放下干扰，专注地陪伴、倾听与共同经历。", receive: "全心投入的陪伴，会让你感到自己被珍视。", give: "你愿意留出完整时间，认真进入对方的世界。" },
  gifts: { name: "用心的礼物", short: "礼物", color: "#c18a45", desc: "不在价格，而在“我看见你、也记得你”的心意。", receive: "有纪念意义的小物，会让你感到被放在心上。", give: "你常用挑选、制作或带回一份心意表达惦念。" },
  acts: { name: "服务的行动", short: "行动", color: "#557f70", desc: "以实际行动分担、照顾，让承诺变成可感知的支持。", receive: "有人主动分担和解决实际问题，会令你安心。", give: "你擅长用可靠的行动照顾对方的现实需要。" },
  touch: { name: "身体的接触", short: "接触", color: "#ad6a74", desc: "在尊重边界与彼此同意下，以拥抱、牵手传递亲近。", receive: "安全、合意的身体接触能给你直接的温暖。", give: "你自然地用拥抱、牵手等方式传递亲近感。" },
};

const questions: { mode: "receive" | "give"; key: LoveKey; text: string }[] = [
  { mode: "receive", key: "words", text: "当重要的人明确说出欣赏与肯定，我会感到被爱。" }, { mode: "receive", key: "time", text: "对方放下手机、专心听我说话，对我非常重要。" },
  { mode: "receive", key: "gifts", text: "收到一件专门为我挑选的小礼物，会让我心里很暖。" }, { mode: "receive", key: "acts", text: "当对方主动帮我分担麻烦的事情，我会感到被照顾。" },
  { mode: "receive", key: "touch", text: "在彼此都舒适时，一个拥抱能让我感到安心。" }, { mode: "receive", key: "words", text: "遇到低谷时，我尤其需要听到真诚的鼓励。" },
  { mode: "receive", key: "time", text: "一起做件小事，只要全心投入，就会让我很满足。" }, { mode: "receive", key: "gifts", text: "对方记住我的喜好并带回一份心意，会令我感动。" },
  { mode: "receive", key: "acts", text: "比起口头承诺，我更容易被落实到细节的行动打动。" }, { mode: "receive", key: "touch", text: "久别重逢时，我期待用牵手或拥抱表达亲近。" },
  { mode: "receive", key: "words", text: "重要的人向别人表达对我的认可，会让我很开心。" }, { mode: "receive", key: "time", text: "一段不被打扰的深入交谈，比热闹聚会更能滋养我。" },
  { mode: "receive", key: "gifts", text: "在普通日子收到带有纪念意义的东西，我会珍藏很久。" }, { mode: "receive", key: "acts", text: "忙碌时有人主动替我处理一件琐事，会让我感受到爱。" },
  { mode: "receive", key: "touch", text: "在难过时，如果我愿意，轻拍肩膀或握住手会给我力量。" },
  { mode: "give", key: "words", text: "我会主动告诉重要的人：我欣赏你，也为你感到骄傲。" }, { mode: "give", key: "time", text: "我愿意为重要的人留出一段完整、不被打扰的时间。" },
  { mode: "give", key: "gifts", text: "看到适合对方的东西时，我会想带回去送给TA。" }, { mode: "give", key: "acts", text: "我常通过做些实际的事，帮助对方轻松一点。" },
  { mode: "give", key: "touch", text: "在尊重对方意愿的前提下，我会用拥抱表达关心。" }, { mode: "give", key: "words", text: "我很自然地表达感谢，也会具体说出对方哪里做得好。" },
  { mode: "give", key: "time", text: "对方需要倾诉时，我愿意停下手头的事认真陪伴。" }, { mode: "give", key: "gifts", text: "我喜欢亲手准备一份有个人意义的小惊喜。" },
  { mode: "give", key: "acts", text: "我会记住对方的难处，并主动把能解决的部分做好。" }, { mode: "give", key: "touch", text: "见面或告别时，我常想用合适的身体接触传递温暖。" },
  { mode: "give", key: "words", text: "即使有分歧，我也愿意用温和的话让对方知道我仍然在乎。" }, { mode: "give", key: "time", text: "我喜欢和重要的人创造只属于彼此的共同回忆。" },
  { mode: "give", key: "gifts", text: "对我来说，送礼是表达“我一直惦记着你”的方式。" }, { mode: "give", key: "acts", text: "我认为把答应的事情做好，本身就是一种爱的表达。" },
  { mode: "give", key: "touch", text: "当语言不够用时，我会在得到允许后用握手或拥抱陪伴。" },
];

const scale = [{ n: 1, label: "完全不像我" }, { n: 2, label: "不太像我" }, { n: 3, label: "有点像我" }, { n: 4, label: "比较像我" }, { n: 5, label: "非常像我" }];

const tieCopy: Record<"receive" | "give", Record<LoveKey, string>> = {
  receive: {
    words: "听到对方真诚说出欣赏、感谢与鼓励",
    time: "拥有一段不被打扰、全心投入的相处时间",
    gifts: "收到一份专门为我挑选、带着心意的小礼物",
    acts: "对方主动替我分担一件现实中的麻烦事",
    touch: "在彼此舒适和同意时，得到一个温暖的拥抱",
  },
  give: {
    words: "把欣赏、感谢与鼓励清楚地说给对方听",
    time: "放下其他事情，专心陪伴和倾听对方",
    gifts: "为对方挑选或制作一份有个人意义的心意",
    acts: "主动完成一件能真正减轻对方负担的事情",
    touch: "在对方愿意时，用拥抱或牵手表达亲近",
  },
};

function calc(answers: number[], mode: "receive" | "give") {
  const totals = Object.fromEntries(Object.keys(LOVE).map(k => [k, 0])) as Record<LoveKey, number>;
  questions.forEach((q, i) => { if (q.mode === mode) totals[q.key] += answers[i] || 0; });
  return (Object.keys(LOVE) as LoveKey[]).map(key => ({ key, score: totals[key], pct: Math.round((totals[key] / 15) * 100) })).sort((a, b) => b.score - a.score);
}

type TieQuestion = { mode: "receive" | "give"; a: LoveKey; b: LoveKey };

function makeTieQuestions(data: ReturnType<typeof calc>, mode: "receive" | "give"): TieQuestion[] {
  const candidates = data.filter(item => data[0].score - item.score <= 2).map(item => item.key);
  if (candidates.length < 2) return [];
  if (candidates.length === 2) return [{ mode, a: candidates[0], b: candidates[1] }];
  return candidates.slice(0, 5).map((key, i, list) => ({ mode, a: key, b: list[(i + 1) % list.length] }));
}

function rankWithTies(data: ReturnType<typeof calc>, choices: LoveKey[]) {
  const votes = Object.fromEntries(Object.keys(LOVE).map(k => [k, 0])) as Record<LoveKey, number>;
  choices.forEach(key => { votes[key] += 1; });
  return data.map(item => ({ ...item, tieVotes: votes[item.key] })).sort((a, b) => {
    if (Math.abs(a.score - b.score) > 2) return b.score - a.score;
    return votes[b.key] - votes[a.key] || b.score - a.score;
  });
}

function ResultList({ title, eyebrow, data, mode }: { title: string; eyebrow: string; data: ReturnType<typeof rankWithTies>; mode: "receive" | "give" }) {
  const balanced = data[0].score - data[1].score <= 2 && data[0].tieVotes === data[1].tieVotes;
  return <section className="result-card"><span className="result-eyebrow">{eyebrow}</span><h2>{balanced ? "多语言均衡型" : title}</h2>
    <div className="primary-love" style={{ "--accent": LOVE[data[0].key].color } as React.CSSProperties}><div className="rank-mark">01</div><div><strong>{balanced ? `${LOVE[data[0].key].name} · ${LOVE[data[1].key].name}` : LOVE[data[0].key].name}</strong><p>{balanced ? "你的核心偏好非常接近，不必勉强自己只属于一种类型。" : LOVE[data[0].key][mode]}</p></div></div>
    <div className="bars">{data.map((item, i) => <div className="bar-row" key={item.key}><div className="bar-label"><span>{i + 1}. {LOVE[item.key].name}</span><b>{item.pct}%</b></div><div className="bar-track"><span style={{ width: `${item.pct}%`, background: LOVE[item.key].color }} /></div></div>)}</div>
  </section>;
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("intro"); const [index, setIndex] = useState(0); const [answers, setAnswers] = useState<number[]>(Array(30).fill(0)); const [tieIndex, setTieIndex] = useState(0); const [tieChoices, setTieChoices] = useState<{ receive: LoveKey[]; give: LoveKey[] }>({ receive: [], give: [] }); const [posterOpen, setPosterOpen] = useState(false); const canvasRef = useRef<HTMLCanvasElement>(null);
  const rawReceive = useMemo(() => calc(answers, "receive"), [answers]); const rawGive = useMemo(() => calc(answers, "give"), [answers]);
  const tieQuestions = useMemo(() => [...makeTieQuestions(rawReceive, "receive"), ...makeTieQuestions(rawGive, "give")], [rawReceive, rawGive]);
  const receive = useMemo(() => rankWithTies(rawReceive, tieChoices.receive), [rawReceive, tieChoices.receive]); const give = useMemo(() => rankWithTies(rawGive, tieChoices.give), [rawGive, tieChoices.give]);
  useEffect(() => { if (phase === "quiz" || phase === "tiebreak") window.scrollTo({ top: 0, behavior: "smooth" }); }, [index, tieIndex, phase]);
  const choose = (n: number) => { const next = [...answers]; next[index] = n; setAnswers(next); window.setTimeout(() => { if (index < 29) setIndex(index + 1); else { const nextReceive = calc(next, "receive"); const nextGive = calc(next, "give"); const hasTies = makeTieQuestions(nextReceive, "receive").length + makeTieQuestions(nextGive, "give").length > 0; setPhase(hasTies ? "tiebreak" : "result"); } }, 180); };
  const chooseTie = (key: LoveKey) => { const q = tieQuestions[tieIndex]; setTieChoices(current => ({ ...current, [q.mode]: [...current[q.mode], key] })); window.setTimeout(() => tieIndex === tieQuestions.length - 1 ? setPhase("result") : setTieIndex(tieIndex + 1), 180); };
  const restart = () => { setAnswers(Array(30).fill(0)); setIndex(0); setTieIndex(0); setTieChoices({ receive: [], give: [] }); setPhase("quiz"); setPosterOpen(false); };
  const createPoster = async () => {
    setPosterOpen(true); await new Promise(r => setTimeout(r, 40)); const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return; canvas.width = 1080; canvas.height = 1440;
    const grad = ctx.createLinearGradient(0, 0, 1080, 1440); grad.addColorStop(0, "#fffaf4"); grad.addColorStop(1, "#f4e3dd"); ctx.fillStyle = grad; ctx.fillRect(0, 0, 1080, 1440);
    ctx.fillStyle = "#b95548"; ctx.beginPath(); ctx.arc(920, 125, 240, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.13)"; ctx.beginPath(); ctx.arc(860, 160, 135, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8f443c"; ctx.font = "500 28px 'PingFang SC', sans-serif"; ctx.fillText("爱的五种语言 · 双向测试", 74, 112); ctx.fillStyle = "#382824"; ctx.font = "700 64px 'Songti SC', serif"; ctx.fillText("我的爱，有两种方向", 74, 202); ctx.font = "400 28px 'PingFang SC', sans-serif"; ctx.fillStyle = "#79635c"; ctx.fillText("看见我如何接收爱，也看见我如何给予爱", 76, 254);
    const card = (y: number, label: string, item: typeof receive[number], copy: string, accent: string) => { ctx.fillStyle = "rgba(255,255,255,.9)"; roundRect(ctx, 64, y, 952, 350, 34); ctx.fill(); ctx.fillStyle = accent; ctx.font = "600 24px 'PingFang SC', sans-serif"; ctx.fillText(label, 110, y + 68); ctx.fillStyle = "#382824"; ctx.font = "700 52px 'Songti SC', serif"; ctx.fillText(LOVE[item.key].name, 110, y + 142); ctx.fillStyle = "#79635c"; ctx.font = "400 25px 'PingFang SC', sans-serif"; wrapText(ctx, copy, 110, y + 200, 820, 40); ctx.fillStyle = "#eadbd4"; roundRect(ctx, 110, y + 292, 800, 16, 8); ctx.fill(); ctx.fillStyle = LOVE[item.key].color; roundRect(ctx, 110, y + 292, 800 * item.pct / 100, 16, 8); ctx.fill(); ctx.fillStyle = "#79635c"; ctx.font = "600 22px sans-serif"; ctx.fillText(`${item.pct}%`, 920, y + 308); };
    card(326, "我喜欢这样被爱", receive[0], LOVE[receive[0].key].receive, "#b95548"); card(706, "我愿意这样去爱", give[0], LOVE[give[0].key].give, "#557f70");
    const url = "https://zhouying.cn/5lovelanguages"; const qr = await QRCode.toDataURL(url, { width: 230, margin: 2, color: { dark: "#382824", light: "#fffaf4" } }); const img = new Image(); img.src = qr; await new Promise<void>(resolve => { img.onload = () => resolve(); }); ctx.drawImage(img, 76, 1145, 190, 190);
    ctx.fillStyle = "#382824"; ctx.font = "600 30px 'PingFang SC', sans-serif"; ctx.fillText("扫码，发现你的爱的语言", 300, 1218); ctx.fillStyle = "#79635c"; ctx.font = "400 23px 'PingFang SC', sans-serif"; ctx.fillText("30 道题 · 约 5 分钟 · 不收集个人信息", 300, 1266); ctx.font = "400 20px sans-serif"; ctx.fillText("zhouying.cn/5lovelanguages", 300, 1307); ctx.fillStyle = "#b95548"; ctx.font = "700 28px serif"; ctx.fillText("LOVE FLOWS BOTH WAYS", 74, 1382);
  };
  const download = () => { const a = document.createElement("a"); a.download = "我的爱的语言.png"; a.href = canvasRef.current?.toDataURL("image/png") || ""; a.click(); };

  if (phase === "intro") return <main className="home"><nav><div className="brand"><span>五</span> 爱的语言</div><div className="nav-note">双向关系自测</div></nav><section className="hero"><div className="hero-copy"><p className="kicker">LOVE FLOWS BOTH WAYS</p><h1>你期待怎样被爱，<br />又习惯怎样去爱？</h1><p className="lead">爱并不只有一种表达方式。这份双向测试，帮你分别看见自己的接收偏好与付出习惯。</p><button className="primary" onClick={() => setPhase("quiz")}>开始探索 <span>→</span></button><div className="meta"><span>30 道原创题目</span><i /><span>约 5 分钟</span><i /><span>结果仅留在本机</span></div></div><div className="love-orbit" aria-label="五种爱的语言"><div className="orbit-core"><small>LOVE</small><strong>爱</strong><em>向内感受<br />向外流动</em></div>{(Object.keys(LOVE) as LoveKey[]).map((k, i) => <div key={k} className={`orbit-tag tag-${i}`}><b>{LOVE[k].short}</b><span>{LOVE[k].name}</span></div>)}</div></section><section className="promise"><div><b>01</b><h2>看见需要</h2><p>了解什么最容易让你感到被珍惜。</p></div><div><b>02</b><h2>理解表达</h2><p>发现你最自然、最常用的付出方式。</p></div><div><b>03</b><h2>让爱抵达</h2><p>用更具体的语言开启一场关系对话。</p></div></section><footer>基于“爱的五种语言”概念设计的非诊断性自我探索工具</footer></main>;
  if (phase === "quiz") { const q = questions[index]; const done = answers.filter(Boolean).length; return <main className="quiz-page"><header className="quiz-head"><button className="mini-brand" onClick={() => setPhase("intro")}><span>五</span> 爱的语言</button><div className="step-text">{q.mode === "receive" ? "第一部分 · 我如何接收爱" : "第二部分 · 我如何给予爱"}</div><div className="count">{String(index + 1).padStart(2, "0")} / 30</div></header><div className="progress"><span style={{ width: `${(done / 30) * 100}%` }} /></div><section className="question-wrap"><div className="question-no">QUESTION {String(index + 1).padStart(2, "0")}</div><h1>{q.text}</h1><p>凭第一感觉，选择它与你真实状态的相符程度</p><div className="scale">{scale.map(s => <button key={s.n} className={answers[index] === s.n ? "selected" : ""} onClick={() => choose(s.n)}><b>{s.n}</b><span>{s.label}</span></button>)}</div><div className="quiz-actions"><button disabled={index === 0} onClick={() => setIndex(index - 1)}>← 上一题</button><span>没有标准答案，诚实就是最好的答案</span><button disabled={!answers[index] || index === 29} onClick={() => setIndex(index + 1)}>下一题 →</button></div></section></main>; }
  if (phase === "tiebreak") { const q = tieQuestions[tieIndex]; return <main className="quiz-page tie-page"><header className="quiz-head"><div className="mini-brand"><span>五</span> 爱的语言</div><div className="step-text">再靠近一点 · {q.mode === "receive" ? "我如何接收爱" : "我如何给予爱"}</div><div className="count">{tieIndex + 1} / {tieQuestions.length}</div></header><div className="progress"><span style={{ width: `${((tieIndex + 1) / tieQuestions.length) * 100}%` }} /></div><section className="question-wrap tie-wrap"><div className="question-no">A GENTLE TIEBREAKER</div><h1>如果此刻只能保留一种，<br />哪一个对你更重要？</h1><p>你的几种爱的语言都很突出。没有两全选项，请凭第一感觉选择。</p><div className="tie-options"><button onClick={() => chooseTie(q.a)}><small>{LOVE[q.a].name}</small><strong>{tieCopy[q.mode][q.a]}</strong><span>选择这个 →</span></button><i>或</i><button onClick={() => chooseTie(q.b)}><small>{LOVE[q.b].name}</small><strong>{tieCopy[q.mode][q.b]}</strong><span>选择这个 →</span></button></div><div className="tie-note">决胜选择只用于排列分数接近的类型，不会改变你的原始五维分数</div></section></main>; }
  return <main className="result-page"><header className="result-head"><div className="mini-brand"><span>五</span> 爱的语言</div><button onClick={restart}>重新测试 ↻</button></header><section className="result-intro"><p className="kicker">YOUR LOVE PROFILE</p><h1>爱，从看见彼此开始。</h1><p>你的接收偏好与付出方式不必相同。差异不是问题，它是理解自己与重要之人的新入口。</p></section><div className="result-grid"><ResultList title={LOVE[receive[0].key].name} eyebrow="我喜欢这样被爱" data={receive} mode="receive"/><ResultList title={LOVE[give[0].key].name} eyebrow="我愿意这样去爱" data={give} mode="give"/></div><section className="insight"><div className="insight-mark">“</div><div><span>给你的关系提示</span><h2>{receive[0].key === give[0].key ? "你的爱，表达与接收有着自然的一致性。" : "你给予爱的方式，未必是你最渴望收到的方式。"}</h2><p>{receive[0].key === give[0].key ? `你很容易理解同样偏爱“${LOVE[receive[0].key].name}”的人。也别忘了询问对方真正需要什么，让熟悉的表达持续保有新鲜感。` : `你偏爱通过“${LOVE[receive[0].key].name}”感受爱，却更常用“${LOVE[give[0].key].name}”表达爱。把这份差异说出来，也好奇对方的答案，爱就更容易抵达。`}</p></div></section><section className="all-loves"><h2>五种爱的语言，没有高低之分</h2><div>{(Object.keys(LOVE) as LoveKey[]).map(k => <article key={k}><i style={{ background: LOVE[k].color }} /><h3>{LOVE[k].name}</h3><p>{LOVE[k].desc}</p></article>)}</div></section><section className="share"><div><p>把理解，带进一段关系</p><h2>生成你的专属结果海报</h2><span>邀请重要的人也测一测，再交换彼此的答案。</span></div><button className="primary" onClick={createPoster}>生成分享海报 <span>↗</span></button></section><p className="disclaimer">本测试用于自我探索与关系沟通，不构成心理测评或专业诊断。人的偏好会随情境与阶段变化，身体接触始终以双方自愿、舒适和尊重边界为前提。</p>{posterOpen && <div className="modal" role="dialog" aria-modal="true" aria-label="分享海报"><button className="close" onClick={() => setPosterOpen(false)}>×</button><div className="poster-box"><canvas ref={canvasRef} /><div><button className="primary" onClick={download}>下载高清海报</button><p>长按图片也可保存到手机</p></div></div></div>}</main>;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, line: number) { let row = "", yy = y; for (const c of text) { if (ctx.measureText(row + c).width > max) { ctx.fillText(row, x, yy); row = c; yy += line; } else row += c; } ctx.fillText(row, x, yy); }
