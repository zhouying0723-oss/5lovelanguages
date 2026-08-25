"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";

type LoveKey = "words" | "time" | "gifts" | "acts" | "touch";
type Phase = "intro" | "quiz" | "tiebreak" | "result";
type MatchProfile = { receive: number[]; give: number[] };
const LOVE_KEYS: LoveKey[] = ["words", "time", "gifts", "acts", "touch"];

function LoveMark() {
  return <span className="heart-mark" aria-hidden="true" />;
}

function anonymousId(key: string) {
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const value = crypto.randomUUID();
    localStorage.setItem(key, value);
    return value;
  } catch {
    return crypto.randomUUID();
  }
}
function deviceType() {
  const width = window.innerWidth;
  return width < 600 ? "mobile" : width < 1024 ? "tablet" : "desktop";
}
function trackEvent(eventType: string, attemptId?: string, result?: unknown) {
  const body = JSON.stringify({
    visitorId: anonymousId("love_language_visitor_id"),
    attemptId: attemptId || null,
    eventType,
    deviceType: deviceType(),
    result,
  });
  fetch("/5lovelanguages/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

const LOVE: Record<
  LoveKey,
  {
    name: string;
    short: string;
    color: string;
    desc: string;
    receive: string;
    give: string;
  }
> = {
  words: {
    name: "肯定的言词",
    short: "言词",
    color: "#d96d62",
    desc: "真诚的赞美、感谢与鼓励，让爱被清楚地说出来。",
    receive: "你在意对方是否把欣赏与关心说出口。",
    give: "你习惯用鼓励、感谢和真诚表达支持别人。",
  },
  time: {
    name: "精心的时刻",
    short: "陪伴",
    color: "#9c6b92",
    desc: "放下干扰，专注地陪伴、倾听与共同经历。",
    receive: "全心投入的陪伴，会让你感到自己被珍视。",
    give: "你愿意留出完整时间，认真进入对方的世界。",
  },
  gifts: {
    name: "用心的礼物",
    short: "礼物",
    color: "#c18a45",
    desc: "不在价格，而在“我看见你、也记得你”的心意。",
    receive: "有纪念意义的小物，会让你感到被放在心上。",
    give: "你常用挑选、制作或带回一份心意表达惦念。",
  },
  acts: {
    name: "服务的行动",
    short: "行动",
    color: "#557f70",
    desc: "以实际行动分担、照顾，让承诺变成可感知的支持。",
    receive: "有人主动分担和解决实际问题，会令你安心。",
    give: "你擅长用可靠的行动照顾对方的现实需要。",
  },
  touch: {
    name: "身体的接触",
    short: "接触",
    color: "#ad6a74",
    desc: "在尊重边界与彼此同意下，以拥抱、牵手传递亲近。",
    receive: "安全、合意的身体接触能给你直接的温暖。",
    give: "你自然地用拥抱、牵手等方式传递亲近感。",
  },
};

const REPORT: Record<
  LoveKey,
  { need: string; strength: string; watch: string; action: string }
> = {
  words: {
    need: "你需要爱被明确地说出来。具体的肯定、感谢和鼓励，比笼统的赞美更容易真正抵达你。",
    strength: "你能敏锐地看见他人的努力，并用语言赋予对方信心与被理解的感觉。",
    watch: "沉默、敷衍回应或带刺的评价，可能比对方预想得更容易让你受伤。",
    action:
      "试着直接告诉重要的人：‘当你具体说出欣赏我的地方时，我会很有力量。’",
  },
  time: {
    need: "你重视的是专注，而不只是相处时长。没有屏幕和事务打断的共同时间，会让你感到被优先选择。",
    strength: "你愿意倾听、投入，并通过共同经历让关系逐渐拥有深度。",
    watch:
      "人在身边却心不在焉，可能会被你体验为疏远；但对方未必意识到这种落差。",
    action: "提前约定一段短而完整的专属时间，并一起决定这段时间怎样度过。",
  },
  gifts: {
    need: "你在意礼物背后的记得、观察与心意，而不是价格。一件贴合你的物品，会成为关系的有形记忆。",
    strength: "你善于留意细节，并把抽象的惦念转化成可以被保存、被回想的象征。",
    watch:
      "错过纪念日或过于随意的礼物可能令你失落，也要避免把花费等同于爱的多少。",
    action:
      "可以分享自己的收藏与偏好，也说明：有意义的小物或手写卡片就足以让你开心。",
  },
  acts: {
    need: "可靠的行动最能带给你安全感。主动分担、兑现承诺和解决具体问题，会让你确认自己不是独自承担。",
    strength: "你务实、可靠，常能在别人真正需要时提供有用而具体的支持。",
    watch:
      "只说不做或反复失约容易消耗你的信任；同时也别默默包办到自己筋疲力尽。",
    action:
      "把需要说得具体可执行，例如：‘这周如果你能负责晚饭，我会感到被支持。’",
  },
  touch: {
    need: "在双方同意、舒适与安全的前提下，合适的身体接触能让亲近感直接而真实地发生。",
    strength: "你能用温柔的非语言方式传递安慰、欢迎与陪伴。",
    watch: "身体边界会随关系、情境和状态改变；亲密不等于默认许可。",
    action:
      "用一句简单的询问建立安全感，例如：‘你现在想要一个拥抱吗？’并尊重任何答案。",
  },
};

type Question = {
  mode: "receive" | "give";
  scene: string;
  options: [{ key: LoveKey; text: string }, { key: LoveKey; text: string }];
};
const questions: Question[] = [
  {
    mode: "receive",
    scene: "你为一件事熬了很久，终于走到终点，哪种回应更触动你？",
    options: [
      {
        key: "words",
        text: "对方看着你说：‘我知道这一路有多难，你真的让我很骄傲。’",
      },
      {
        key: "time",
        text: "对方放下所有事情，陪你慢慢回顾那些几乎想放弃的时刻。",
      },
    ],
  },
  {
    mode: "receive",
    scene: "在一个毫无纪念意义的普通日子，哪份心意更让你鼻子一酸？",
    options: [
      {
        key: "words",
        text: "忽然收到一段很长的消息，写着那些你自己都没发现的闪光之处。",
      },
      {
        key: "gifts",
        text: "对方递来一件不贵的小东西，说：‘看到它时，我第一眼就想到了你。’",
      },
    ],
  },
  {
    mode: "receive",
    scene: "你累到不想说“我撑不住了”时，哪种爱更容易被你接住？",
    options: [
      {
        key: "words",
        text: "对方说：‘在我这里，你不需要逞强，也不用永远表现得很好。’",
      },
      {
        key: "acts",
        text: "对方没等你开口，就接过最头疼的事情，说：‘这件事交给我。’",
      },
    ],
  },
  {
    mode: "receive",
    scene: "一次失败让你开始否定自己，哪种安慰更能穿过你的难过？",
    options: [
      {
        key: "words",
        text: "对方听完后说：‘一次没做好，不会改变我眼里的你。’",
      },
      {
        key: "touch",
        text: "对方先问你愿不愿意，然后抱住你，让你暂时不用坚强。",
      },
    ],
  },
  {
    mode: "receive",
    scene: "哪个瞬间更让你确信：对方真的把你的喜欢放在了心上？",
    options: [
      {
        key: "time",
        text: "对方抽出一大段时间，陪你看完一部自己并不感兴趣的电影。",
      },
      {
        key: "gifts",
        text: "对方带回你很久前随口提过的小东西，连你自己都快忘了。",
      },
    ],
  },
  {
    mode: "receive",
    scene: "生活把你耗得没剩多少力气时，哪种照顾更让你想松一口气？",
    options: [
      {
        key: "time",
        text: "对方把一整个下午留给你，不赶时间，只陪你慢慢走、慢慢说。",
      },
      {
        key: "acts",
        text: "回到家时，最烦的杂事都已做好，你终于可以什么也不管。",
      },
    ],
  },
  {
    mode: "receive",
    scene: "很久没见的人终于站在你面前，哪一刻最让想念落到实处？",
    options: [
      {
        key: "time",
        text: "对方留出完整的晚上，听你把错过的那些日子一点点讲回来。",
      },
      {
        key: "touch",
        text: "在你愿意时，对方什么都没说，只是走过来紧紧抱住你。",
      },
    ],
  },
  {
    mode: "receive",
    scene: "在人生的重要时刻，哪种付出更让你感到自己被郑重珍惜？",
    options: [
      {
        key: "gifts",
        text: "收到一件你喜欢很久、能够多年留存并记住这一刻的礼物。",
      },
      {
        key: "acts",
        text: "对方提前很久默默筹备，把所有繁琐安排妥当，只为让你安心。",
      },
    ],
  },
  {
    mode: "receive",
    scene: "爱没有说出口的普通一天里，哪个细节更容易留在你心里？",
    options: [
      {
        key: "gifts",
        text: "对方从远方带回一件小物，说旅途中看到它时，一下就想到了你。",
      },
      {
        key: "touch",
        text: "在人群里，对方自然牵住你的手，让你知道彼此没有走散。",
      },
    ],
  },
  {
    mode: "receive",
    scene: "你生病躺着、连照顾自己都觉得吃力时，哪一幕更让你安心？",
    options: [
      {
        key: "acts",
        text: "醒来时药、热水和清淡的饭都在手边，家里的事也照料好了。",
      },
      {
        key: "touch",
        text: "在你愿意时，对方坐在床边握着你的手，安静守着你睡着。",
      },
    ],
  },
  {
    mode: "give",
    scene: "对方终于迈出追寻梦想的一步，你最想怎样回应？",
    options: [
      {
        key: "words",
        text: "认真告诉对方：‘我知道你为今天走了多远，我真的为你骄傲。’",
      },
      {
        key: "time",
        text: "把这一天完整地留给对方，听TA讲一路上的害怕、坚持与期待。",
      },
    ],
  },
  {
    mode: "give",
    scene: "对方生日那天你无法陪在身边，你更想留下什么？",
    options: [
      {
        key: "words",
        text: "写一封很长的信，把平时不好意思说的感谢和爱都写进去。",
      },
      {
        key: "gifts",
        text: "寄去一份精心准备的包裹，每件东西都藏着你们共同的回忆。",
      },
    ],
  },
  {
    mode: "give",
    scene: "重要的一天到来前，对方紧张得怀疑自己，你会怎么做？",
    options: [
      {
        key: "words",
        text: "看着对方说：‘无论结果怎样，你已经是我心里很了不起的人。’",
      },
      {
        key: "acts",
        text: "提前准备好早餐、资料和出门路线，让对方醒来后可以从容一些。",
      },
    ],
  },
  {
    mode: "give",
    scene: "争吵过后，你很想让对方知道：爱没有因为分歧而消失。",
    options: [
      {
        key: "words",
        text: "坦诚说出自己的歉意，也清楚告诉对方：‘我仍然在乎我们。’",
      },
      {
        key: "touch",
        text: "轻声问‘我可以抱抱你吗’，得到允许后把对方拥进怀里。",
      },
    ],
  },
  {
    mode: "give",
    scene: "你想让对方感到：TA喜欢的事，也值得被你认真对待。",
    options: [
      {
        key: "time",
        text: "花一大段时间陪TA看喜欢的电影，即使那并不是你的兴趣。",
      },
      {
        key: "gifts",
        text: "悄悄找到TA念叨很久却没舍得买的东西，在普通一天送出去。",
      },
    ],
  },
  {
    mode: "give",
    scene: "对方被生活追着跑了很久，你想为TA留出一点喘息。",
    options: [
      {
        key: "time",
        text: "空出一个没有安排的下午，陪TA慢慢走、慢慢说，不催着去哪里。",
      },
      {
        key: "acts",
        text: "默默接过那些压得TA疲惫的杂事，让TA终于可以放心睡一觉。",
      },
    ],
  },
  {
    mode: "give",
    scene: "明天就要分别很久，今晚你更想怎样陪伴对方？",
    options: [
      {
        key: "time",
        text: "陪TA聊到很晚，把想说的话说完，也把沉默安静地坐完。",
      },
      {
        key: "touch",
        text: "在彼此愿意时，久久抱住TA，让这个拥抱替你记住此刻。",
      },
    ],
  },
  {
    mode: "give",
    scene: "对方完成了人生中一个重要阶段，你想送上怎样的心意？",
    options: [
      {
        key: "gifts",
        text: "准备一件TA喜欢很久、能够多年留存并纪念这一刻的礼物。",
      },
      {
        key: "acts",
        text: "替TA把庆祝、接送和繁琐安排全部做好，让TA只需要享受这一天。",
      },
    ],
  },
  {
    mode: "give",
    scene: "对方度过了糟糕的一天，不想说话，你会怎样靠近？",
    options: [
      {
        key: "gifts",
        text: "把TA喜欢的小吃或小物轻轻放在身边，不追问，只让TA知道你记得。",
      },
      {
        key: "touch",
        text: "先问TA愿不愿意靠一会儿，再安静地坐近，让肩膀成为依靠。",
      },
    ],
  },
  {
    mode: "give",
    scene: "对方正经历一段很难熬的失去，你最想怎样守在身边？",
    options: [
      {
        key: "acts",
        text: "替TA准备饭菜、处理杂事，把眼前那些不得不做的事情一件件接住。",
      },
      {
        key: "touch",
        text: "在TA愿意时握住手，什么也不催、什么也不劝，只陪TA慢慢度过。",
      },
    ],
  },
];

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

function calc(answers: Array<LoveKey | null>, mode: "receive" | "give") {
  const totals = Object.fromEntries(
    Object.keys(LOVE).map((k) => [k, 0]),
  ) as Record<LoveKey, number>;
  questions.forEach((q, i) => {
    const key = answers[i];
    if (q.mode === mode && key) totals[key] += 1;
  });
  return (Object.keys(LOVE) as LoveKey[])
    .map((key) => ({
      key,
      score: totals[key],
      pct: Math.round((totals[key] / 4) * 100),
    }))
    .sort((a, b) => b.score - a.score);
}

function encodeProfile(profile: MatchProfile) {
  const bytes = new TextEncoder().encode(JSON.stringify(profile));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decodeProfile(value: string | null): MatchProfile | null {
  if (!value) return null;
  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as MatchProfile;
    return parsed.receive.length === 5 &&
      parsed.give.length === 5 &&
      [...parsed.receive, ...parsed.give].every(
        (score) => Number.isInteger(score) && score >= 0 && score <= 4,
      )
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function MatchReport({
  inviter,
  mine,
}: {
  inviter: MatchProfile;
  mine: MatchProfile;
}) {
  const fit = (need: number[], expression: number[]) =>
    Math.round(
      100 -
        (need.reduce(
          (sum, score, i) => sum + Math.abs(score - expression[i]),
          0,
        ) /
          20) *
          100,
    );
  const receiveFit = fit(mine.receive, inviter.give);
  const giveFit = fit(inviter.receive, mine.give);
  const overall = Math.round((receiveFit + giveFit) / 2);
  const warmKey = LOVE_KEYS.slice().sort(
    (a, b) =>
      Math.min(
        mine.receive[LOVE_KEYS.indexOf(b)],
        inviter.give[LOVE_KEYS.indexOf(b)],
      ) -
      Math.min(
        mine.receive[LOVE_KEYS.indexOf(a)],
        inviter.give[LOVE_KEYS.indexOf(a)],
      ),
  )[0];
  const gapKey = LOVE_KEYS.slice().sort(
    (a, b) =>
      Math.abs(
        mine.receive[LOVE_KEYS.indexOf(b)] - inviter.give[LOVE_KEYS.indexOf(b)],
      ) -
      Math.abs(
        mine.receive[LOVE_KEYS.indexOf(a)] - inviter.give[LOVE_KEYS.indexOf(a)],
      ),
  )[0];
  const level =
    overall >= 80
      ? "很会接住彼此"
      : overall >= 60
        ? "有默契，也有探索空间"
        : "爱的翻译比爱的多少更重要";
  return (
    <section className="match-report">
      <div className="match-score">
        <small>双向爱语默契度</small>
        <strong>
          {overall}
          <i>%</i>
        </strong>
        <h2>{level}</h2>
        <p>
          这不是关系评分，而是两个人当前“需要的爱”与“自然表达的爱”之间的贴合程度。
        </p>
      </div>
      <div className="match-directions">
        <article>
          <span>对方表达 → 你的需要</span>
          <b>{receiveFit}%</b>
          <p>衡量对方习惯给予的爱，有多少容易被你直接感受到。</p>
        </article>
        <article>
          <span>你的表达 → 对方的需要</span>
          <b>{giveFit}%</b>
          <p>衡量你自然表达的爱，有多少容易被对方直接接收到。</p>
        </article>
      </div>
      <div className="match-guide">
        <article>
          <small>你们容易彼此接住的地方</small>
          <h3>{LOVE[warmKey].name}</h3>
          <p>
            {LOVE[warmKey].desc}这是你们可以有意识保留、继续创造的共同语言。
          </p>
        </article>
        <article>
          <small>最值得主动翻译的地方</small>
          <h3>{LOVE[gapKey].name}</h3>
          <p>
            这一项的需要与自然表达存在较大差异。差异不代表不爱，只是需要更明确地说出“怎样做，我会更容易感受到”。
          </p>
        </article>
      </div>
      <div className="match-practice">
        <h3>给你们的三步相处指南</h3>
        <ol>
          <li>各自说出最近一次明显感到被爱的瞬间，不猜答案。</li>
          <li>每人从对方的核心需要中选一件本周能做到的小事。</li>
          <li>做完后询问“这次有被你收到吗”，再按真实感受调整。</li>
        </ol>
      </div>
    </section>
  );
}

type TieGroup = { mode: "receive" | "give"; candidates: LoveKey[] };

function makeTieGroup(
  data: ReturnType<typeof calc>,
  mode: "receive" | "give",
): TieGroup | null {
  const candidates = data
    .filter((item) => data[0].score - item.score <= 2)
    .map((item) => item.key);
  return candidates.length < 2
    ? null
    : { mode, candidates: candidates.slice(0, 5) };
}

function rankWithTies(
  data: ReturnType<typeof calc>,
  choices: LoveKey[],
  winner?: LoveKey,
) {
  const votes = Object.fromEntries(
    Object.keys(LOVE).map((k) => [k, 0]),
  ) as Record<LoveKey, number>;
  choices.forEach((key) => {
    votes[key] += 1;
  });
  const ranked = data
    .map((item) => ({
      ...item,
      tieVotes: votes[item.key],
      tieRecency: choices.lastIndexOf(item.key),
      adjustedScore:
        item.score + votes[item.key] * 1.5 + (winner === item.key ? 3 : 0),
    }))
    .sort((a, b) => {
      if (Math.abs(a.score - b.score) > 2) return b.score - a.score;
      if (winner && (a.key === winner || b.key === winner))
        return a.key === winner ? -1 : 1;
      return (
        votes[b.key] - votes[a.key] ||
        b.tieRecency - a.tieRecency ||
        b.score - a.score
      );
    });
  const maximum = Math.max(...ranked.map((item) => item.adjustedScore));
  return ranked.map((item) => ({
    ...item,
    resultPct: Math.round((item.adjustedScore / maximum) * 100),
  }));
}

function ResultList({
  title,
  eyebrow,
  data,
  mode,
}: {
  title: string;
  eyebrow: string;
  data: ReturnType<typeof rankWithTies>;
  mode: "receive" | "give";
}) {
  const leaders = data.filter((item) => item.score === data[0].score);
  const total = data.reduce((sum, item) => sum + item.score, 0) || 1;
  const gradient = data
    .reduce<{ end: number; segments: string[] }>(
      (result, item) => {
        const end = result.end + (item.score / total) * 100;
        return {
          end,
          segments: [
            ...result.segments,
            `${LOVE[item.key].color} ${result.end}% ${end}%`,
          ],
        };
      },
      { end: 0, segments: [] },
    )
    .segments.join(",");
  return (
    <section className="result-card">
      <span className="result-eyebrow">{eyebrow}</span>
      <h2>{leaders.length > 1 ? "并列核心偏好" : title}</h2>
      <div
        className="primary-love"
        style={
          {
            "--accent":
              leaders.length > 1 ? "#b95548" : LOVE[data[0].key].color,
          } as React.CSSProperties
        }
      >
        <div className="rank-mark">{leaders.length > 1 ? "=" : "01"}</div>
        <div>
          <strong>
            {leaders.map((item) => LOVE[item.key].name).join(" · ")}
          </strong>
          <p>
            {leaders.length > 1
              ? `这 ${leaders.length} 项得分相同，共同构成你的核心偏好，不必从中强行选出第一名。`
              : LOVE[data[0].key][mode]}
          </p>
        </div>
      </div>
      <div className="pie-result">
        <div
          className="pie-chart"
          style={{ background: `conic-gradient(${gradient})` }}
        >
          <span>
            共 {total}
            <br />
            次选择
          </span>
        </div>
        <div className="pie-legend">
          {data.map((item) => (
            <div key={item.key}>
              <i style={{ background: LOVE[item.key].color }} />
              <span>{LOVE[item.key].name}</span>
              <b>{Math.round((item.score / total) * 100)}%</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DetailedReport({
  receive,
  give,
}: {
  receive: ReturnType<typeof rankWithTies>;
  give: ReturnType<typeof rankWithTies>;
}) {
  const receiveMain = receive[0].key;
  const giveMain = give[0].key;
  const receiveLeaders = receive.filter(
    (item) => item.score === receive[0].score,
  );
  const giveLeaders = give.filter((item) => item.score === give[0].score);
  const receiveSecond =
    receive[0].score > receive[1].score && receive[1].score > receive[2].score
      ? receive[1]
      : null;
  const giveSecond =
    give[0].score > give[1].score && give[1].score > give[2].score
      ? give[1]
      : null;
  return (
    <section className="detailed-report">
      <div className="report-heading">
        <span>DETAILED REPORT</span>
        <h2>你的双向爱语报告</h2>
        <p>分数代表当下的相对偏好，不是能力高低，也不是固定不变的人格标签。</p>
      </div>
      <div className="report-grid">
        <article>
          <small>01 · 内在需要</small>
          <h3>
            {receiveLeaders.map((item) => LOVE[item.key].name).join(" · ")}
          </h3>
          {receiveLeaders.length > 1 ? (
            <p>
              这些偏好得分相同。你可能需要多种方式共同出现，才能更完整地感受到爱；具体需要也会随情境变化。
            </p>
          ) : (
            <>
              <p>{REPORT[receiveMain].need}</p>
              <h4>关系中的敏感点</h4>
              <p>{REPORT[receiveMain].watch}</p>
            </>
          )}
        </article>
        <article>
          <small>02 · 自然表达</small>
          <h3>{giveLeaders.map((item) => LOVE[item.key].name).join(" · ")}</h3>
          {giveLeaders.length > 1 ? (
            <p>
              这些表达方式得分相同。你会根据对方和场景，自然地在多种爱语之间切换，不需要定义唯一的主要方式。
            </p>
          ) : (
            <>
              <p>{REPORT[giveMain].strength}</p>
              <h4>可以立刻尝试</h4>
              <p>{REPORT[giveMain].action}</p>
            </>
          )}
        </article>
      </div>
      <div className="report-secondary">
        <div>
          <small>
            {receiveSecond || giveSecond ? "明确的第二偏好" : "双向关系观察"}
          </small>
          {(receiveSecond || giveSecond) && (
            <strong>
              {receiveSecond && <>接收：{LOVE[receiveSecond.key].name}</>}
              {receiveSecond && giveSecond && " · "}
              {giveSecond && <>付出：{LOVE[giveSecond.key].name}</>}
            </strong>
          )}
        </div>
        <p>
          {receiveLeaders.length > 1 || giveLeaders.length > 1
            ? "你的结果中存在并列核心偏好，这不是测量失败，而是说明你对爱的感受或表达具有多种同样重要的入口。"
            : receiveMain === giveMain
              ? "你接收与表达爱的主要方式一致，通常更容易用自己熟悉的方式理解爱。仍要记得询问对方真正需要什么。"
              : `你倾向通过“${LOVE[receiveMain].name}”确认被爱，却更自然地用“${LOVE[giveMain].name}”表达爱。把这份差异说清楚，能减少“明明在爱，却没有被收到”的错位。`}
        </p>
      </div>
      <div className="report-actions">
        <h3>给你们的一次关系对话</h3>
        <ol>
          <li>最近哪一个瞬间，让我最明显地感到被爱？</li>
          <li>我做过什么，让你感到被理解或被支持？</li>
          <li>这周我们可以各做一件什么具体的小事？</li>
        </ol>
      </div>
    </section>
  );
}

export default function Home() {
  const inviterProfile = useMemo(
    () =>
      decodeProfile(new URLSearchParams(window.location.search).get("match")),
    [],
  );
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<LoveKey | null>>(
    Array(questions.length).fill(null),
  );
  const [tieGroupIndex, setTieGroupIndex] = useState(0);
  const [tieOpponentIndex, setTieOpponentIndex] = useState(1);
  const [tieChampion, setTieChampion] = useState<LoveKey | null>(null);
  const [tieChoices, setTieChoices] = useState<{
    receive: LoveKey[];
    give: LoveKey[];
  }>({ receive: [], give: [] });
  const [tieWinners, setTieWinners] = useState<
    Partial<Record<"receive" | "give", LoveKey>>
  >({});
  const [posterOpen, setPosterOpen] = useState(false);
  const [posterUrl, setPosterUrl] = useState("");
  const [shareHint, setShareHint] = useState("");
  const [matchHint, setMatchHint] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const attemptIdRef = useRef("");
  const completionTrackedRef = useRef(false);
  const rawReceive = useMemo(() => calc(answers, "receive"), [answers]);
  const rawGive = useMemo(() => calc(answers, "give"), [answers]);
  const tieGroups = useMemo(
    () =>
      [
        makeTieGroup(rawReceive, "receive"),
        makeTieGroup(rawGive, "give"),
      ].filter((group): group is TieGroup => group !== null),
    [rawReceive, rawGive],
  );
  const receive = useMemo(
    () => rankWithTies(rawReceive, tieChoices.receive, tieWinners.receive),
    [rawReceive, tieChoices.receive, tieWinners.receive],
  );
  const give = useMemo(
    () => rankWithTies(rawGive, tieChoices.give, tieWinners.give),
    [rawGive, tieChoices.give, tieWinners.give],
  );
  const tieTotal = tieGroups.reduce(
    (sum, group) => sum + group.candidates.length - 1,
    0,
  );
  const tieDone =
    tieGroups
      .slice(0, tieGroupIndex)
      .reduce((sum, group) => sum + group.candidates.length - 1, 0) +
    tieOpponentIndex -
    1;
  useEffect(() => {
    trackEvent("page_view");
  }, []);
  useEffect(() => {
    if (phase !== "result" || completionTrackedRef.current) return;
    completionTrackedRef.current = true;
    trackEvent("quiz_complete", attemptIdRef.current, {
      receive: receive.map((item) => ({
        key: item.key,
        index: item.resultPct,
      })),
      give: give.map((item) => ({ key: item.key, index: item.resultPct })),
      usedTiebreak: tieChoices.receive.length + tieChoices.give.length > 0,
    });
  }, [phase, receive, give, tieChoices]);
  useEffect(() => {
    if (phase === "quiz" || phase === "tiebreak")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }, [index, tieGroupIndex, tieOpponentIndex, phase]);
  const choose = (key: LoveKey) => {
    const next = [...answers];
    next[index] = key;
    setAnswers(next);
    window.setTimeout(() => {
      if (index < questions.length - 1) setIndex(index + 1);
      else setPhase("result");
    }, 180);
  };
  const chooseTie = (key: LoveKey) => {
    const group = tieGroups[tieGroupIndex];
    setTieChoices((current) => ({
      ...current,
      [group.mode]: [...current[group.mode], key],
    }));
    window.setTimeout(() => {
      if (tieOpponentIndex < group.candidates.length - 1) {
        setTieChampion(key);
        setTieOpponentIndex(tieOpponentIndex + 1);
        return;
      }
      setTieWinners((current) => ({ ...current, [group.mode]: key }));
      if (tieGroupIndex < tieGroups.length - 1) {
        const nextGroup = tieGroups[tieGroupIndex + 1];
        setTieGroupIndex(tieGroupIndex + 1);
        setTieOpponentIndex(1);
        setTieChampion(nextGroup.candidates[0]);
      } else setPhase("result");
    }, 180);
  };
  const startQuiz = () => {
    attemptIdRef.current = crypto.randomUUID();
    completionTrackedRef.current = false;
    trackEvent("quiz_start", attemptIdRef.current);
    setPhase("quiz");
  };
  const restart = () => {
    setAnswers(Array(questions.length).fill(null));
    setIndex(0);
    setTieGroupIndex(0);
    setTieOpponentIndex(1);
    setTieChampion(null);
    setTieChoices({ receive: [], give: [] });
    setTieWinners({});
    setPosterOpen(false);
    setPosterUrl("");
    setShareHint("");
    startQuiz();
  };
  const createPoster = async () => {
    trackEvent("poster_generate", attemptIdRef.current);
    setPosterOpen(true);
    await new Promise((r) => setTimeout(r, 40));
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 1080;
    canvas.height = 1440;
    const grad = ctx.createLinearGradient(0, 0, 1080, 1440);
    grad.addColorStop(0, "#fffaf4");
    grad.addColorStop(1, "#f4e3dd");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1440);
    ctx.fillStyle = "#b95548";
    ctx.beginPath();
    ctx.arc(920, 125, 240, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.13)";
    ctx.beginPath();
    ctx.arc(860, 160, 135, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8f443c";
    ctx.font = "500 28px 'PingFang SC', sans-serif";
    ctx.fillText("爱的五种语言 · 双向测试", 74, 112);
    ctx.fillStyle = "#382824";
    ctx.font = "700 64px 'Songti SC', serif";
    ctx.fillText("我的爱，有两种方向", 74, 202);
    ctx.font = "400 28px 'PingFang SC', sans-serif";
    ctx.fillStyle = "#79635c";
    ctx.fillText("看见我如何接收爱，也看见我如何给予爱", 76, 254);
    const card = (
      y: number,
      label: string,
      data: typeof receive,
      copy: string,
      accent: string,
    ) => {
      const leaders = data.filter((item) => item.score === data[0].score);
      const secondary =
        leaders.length === 1 && data[1].score > data[2].score ? data[1] : null;
      const total = data.reduce((sum, item) => sum + item.score, 0) || 1;
      ctx.fillStyle = "rgba(255,255,255,.9)";
      roundRect(ctx, 64, y, 952, 360, 34);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.font = "600 24px 'PingFang SC', sans-serif";
      ctx.fillText(label, 110, y + 62);
      ctx.fillStyle = "#382824";
      ctx.font = `700 ${leaders.length > 2 ? 31 : 42}px 'Songti SC', serif`;
      wrapText(
        ctx,
        leaders.map((item) => LOVE[item.key].name).join(" · "),
        110,
        y + 128,
        540,
        42,
      );
      ctx.fillStyle = "#79635c";
      ctx.font = "400 22px 'PingFang SC', sans-serif";
      wrapText(
        ctx,
        leaders.length > 1
          ? "并列核心偏好：这些方式对我同样重要，不作单独排序。"
          : copy,
        110,
        y + 200,
        525,
        35,
      );
      ctx.font = "500 19px 'PingFang SC', sans-serif";
      ctx.fillText(
        secondary
          ? `第二偏好 · ${LOVE[secondary.key].name}`
          : "其余偏好较接近，不单独排序",
        110,
        y + 318,
      );
      let angle = -Math.PI / 2;
      data.forEach((item) => {
        const next = angle + (item.score / total) * Math.PI * 2;
        ctx.fillStyle = LOVE[item.key].color;
        ctx.beginPath();
        ctx.moveTo(830, y + 165);
        ctx.arc(830, y + 165, 88, angle, next);
        ctx.closePath();
        ctx.fill();
        angle = next;
      });
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(830, y + 165, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#79635c";
      ctx.textAlign = "center";
      ctx.font = "500 17px 'PingFang SC', sans-serif";
      ctx.fillText("选择占比", 830, y + 171);
      const legendX = [700, 815, 930, 755, 875];
      data.forEach((item, i) => {
        const yy = y + (i < 3 ? 282 : 312);
        ctx.fillStyle = LOVE[item.key].color;
        ctx.beginPath();
        ctx.arc(legendX[i] - 8, yy - 5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#79635c";
        ctx.textAlign = "left";
        ctx.font = "500 16px 'PingFang SC', sans-serif";
        ctx.fillText(
          `${LOVE[item.key].short} ${Math.round((item.score / total) * 100)}%`,
          legendX[i],
          yy,
        );
      });
      ctx.textAlign = "left";
    };
    card(
      326,
      "简略报告 · 我喜欢这样被爱",
      receive,
      LOVE[receive[0].key].receive,
      "#b95548",
    );
    card(
      706,
      "简略报告 · 我愿意这样去爱",
      give,
      LOVE[give[0].key].give,
      "#557f70",
    );
    const url = "https://zhouying.cn/5lovelanguages";
    const qr = await QRCode.toDataURL(url, {
      width: 230,
      margin: 2,
      color: { dark: "#382824", light: "#fffaf4" },
    });
    const img = new Image();
    img.src = qr;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
    });
    ctx.drawImage(img, 76, 1145, 190, 190);
    ctx.fillStyle = "#382824";
    ctx.font = "600 30px 'PingFang SC', sans-serif";
    ctx.fillText("扫码，发现你的爱的语言", 300, 1218);
    ctx.fillStyle = "#79635c";
    ctx.font = "400 23px 'PingFang SC', sans-serif";
    ctx.fillText("20 道情境二选一 · 约 3 分钟 · 不收集个人信息", 300, 1266);
    ctx.font = "400 20px sans-serif";
    ctx.fillText("zhouying.cn/5lovelanguages", 300, 1307);
    ctx.fillStyle = "#b95548";
    ctx.font = "700 28px serif";
    ctx.fillText("LOVE FLOWS BOTH WAYS", 74, 1382);
    setPosterUrl(canvas.toDataURL("image/png"));
  };
  const posterFile = async () => {
    const blob = await (await fetch(posterUrl)).blob();
    return new File([blob], "我的爱的语言.png", { type: "image/png" });
  };
  const download = async () => {
    if (!posterUrl) return;
    trackEvent("poster_download", attemptIdRef.current);
    const isiOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isiOS) {
      const file = await posterFile();
      if (
        navigator.share &&
        (!navigator.canShare || navigator.canShare({ files: [file] }))
      ) {
        try {
          setShareHint("请在弹出的系统面板中选择“存储到照片”。");
          await navigator.share({ files: [file] });
          return;
        } catch (error) {
          if ((error as DOMException).name === "AbortError") return;
        }
      }
      setShareHint("请长按上方海报，在菜单中选择“保存图片”或“存储到照片”。");
      return;
    }
    const a = document.createElement("a");
    a.download = "我的爱的语言.png";
    a.href = posterUrl;
    a.click();
    setShareHint("图片已下载；可从相册或下载目录选择它进行分享。");
  };
  const sharePoster = async () => {
    if (!posterUrl) return;
    const file = await posterFile();
    if (
      navigator.share &&
      (!navigator.canShare || navigator.canShare({ files: [file] }))
    ) {
      try {
        await navigator.share({
          title: "我的爱的语言",
          text: "这是我的双向爱语报告",
          files: [file],
        });
        return;
      } catch (error) {
        if ((error as DOMException).name === "AbortError") return;
      }
    }
    setShareHint(
      "微信暂不允许网页直接发布朋友圈。请长按海报保存图片，再从朋友圈选择该图片发布。 ",
    );
  };
  const shareMatchInvite = async () => {
    const profile: MatchProfile = {
      receive: LOVE_KEYS.map(
        (key) => receive.find((item) => item.key === key)?.score ?? 0,
      ),
      give: LOVE_KEYS.map(
        (key) => give.find((item) => item.key === key)?.score ?? 0,
      ),
    };
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("match", encodeProfile(profile));
    const shareData = {
      title: "和我一起测爱的五种语言",
      text: "我已经完成测试，邀请你来看看我们怎样更好地接住彼此。",
      url: url.toString(),
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setMatchHint("邀请已分享，等对方完成后即可看到双人指南。");
        return;
      } catch (error) {
        if ((error as DOMException).name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(url.toString());
    setMatchHint("邀请链接已复制，可以发给另一半了。");
  };

  if (phase === "intro")
    return (
      <main className="home">
        <nav>
          <div className="brand">
            <LoveMark /> 爱的五种语言
          </div>
          <div className="nav-note">双向关系自测</div>
        </nav>
        <section className="hero">
          <div className="hero-copy">
            <p className="kicker">LOVE FLOWS BOTH WAYS</p>
            <h1>
              你期待怎样被爱，
              <br />
              又习惯怎样去爱？
            </h1>
            <p className="lead">
              爱并不只有一种表达方式。这份双向测试，帮你分别看见自己的接收偏好与付出习惯。
            </p>
            {inviterProfile && (
              <div className="invite-arrived">
                <b>TA 已经完成测试</b>
                <span>
                  现在轮到你。完成后即可查看你们的双向默契度与相处指南。
                </span>
              </div>
            )}
            <button className="primary" onClick={startQuiz}>
              开始探索 <span>→</span>
            </button>
            <div className="meta">
              <span>20 道情境二选一</span>
              <i />
              <span>约 3 分钟</span>
              <i />
              <span>匿名统计，不保存逐题答案</span>
            </div>
          </div>
          <div className="love-orbit" aria-label="五种爱的语言">
            <div className="orbit-core">
              <small>LOVE</small>
              <strong>爱</strong>
              <em>
                向内感受
                <br />
                向外流动
              </em>
            </div>
            {(Object.keys(LOVE) as LoveKey[]).map((k, i) => (
              <div key={k} className={`orbit-tag tag-${i}`}>
                <b>{LOVE[k].short}</b>
                <span>{LOVE[k].name}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="promise">
          <div>
            <b>01</b>
            <h2>看见需要</h2>
            <p>了解什么最容易让你感到被珍惜。</p>
          </div>
          <div>
            <b>02</b>
            <h2>理解表达</h2>
            <p>发现你最自然、最常用的付出方式。</p>
          </div>
          <div>
            <b>03</b>
            <h2>让爱抵达</h2>
            <p>用更具体的语言开启一场关系对话。</p>
          </div>
        </section>
        <footer>
          基于“爱的五种语言”概念设计的非诊断性自我探索工具 ·
          匿名记录访问、完成情况与最终结果，不收集姓名、联系方式及逐题答案
        </footer>
      </main>
    );
  if (phase === "quiz") {
    const q = questions[index];
    const done = answers.filter(Boolean).length;
    return (
      <main className="quiz-page">
        <header className="quiz-head">
          <button className="mini-brand" onClick={() => setPhase("intro")}>
            <LoveMark /> 爱的五种语言
          </button>
          <div className="step-text">
            {q.mode === "receive"
              ? "第一部分 · 哪种方式更让我感到被爱"
              : "第二部分 · 我更自然地怎样表达爱"}
          </div>
          <div className="count">
            {String(index + 1).padStart(2, "0")} / {questions.length}
          </div>
        </header>
        <div className="progress">
          <span style={{ width: `${(done / questions.length) * 100}%` }} />
        </div>
        <section className="question-wrap choice-wrap">
          <div className="question-no">
            CHOICE {String(index + 1).padStart(2, "0")}
          </div>
          <p className="choice-prompt">{q.scene}</p>
          <div
            className="binary-options"
            role="group"
            aria-label="请选择更符合你的一项"
          >
            {q.options.map((option, optionIndex) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={answers[index] === option.key}
                className={answers[index] === option.key ? "selected" : ""}
                onClick={() => choose(option.key)}
              >
                <small>{optionIndex === 0 ? "A" : "B"}</small>
                <strong>{option.text}</strong>
                <span>选择这一项 →</span>
              </button>
            ))}
          </div>
          <p className="choice-note">不比较客观价值，只凭第一感觉选择</p>
          <div className="quiz-actions">
            <button disabled={index === 0} onClick={() => setIndex(index - 1)}>
              ← 上一题
            </button>
            <span>没有标准答案，凭第一感觉选择</span>
            <button
              disabled={!answers[index] || index === questions.length - 1}
              onClick={() => setIndex(index + 1)}
            >
              下一题 →
            </button>
          </div>
        </section>
      </main>
    );
  }
  if (phase === "tiebreak") {
    const group = tieGroups[tieGroupIndex];
    const challenger = group.candidates[tieOpponentIndex];
    const champion = tieChampion ?? group.candidates[0];
    return (
      <main className="quiz-page tie-page">
        <header className="quiz-head">
          <div className="mini-brand">
            <LoveMark /> 爱的五种语言
          </div>
          <div className="step-text">
            再靠近一点 ·{" "}
            {group.mode === "receive" ? "我如何接收爱" : "我如何给予爱"}
          </div>
          <div className="count">
            {tieDone + 1} / {tieTotal}
          </div>
        </header>
        <div className="progress">
          <span style={{ width: `${((tieDone + 1) / tieTotal) * 100}%` }} />
        </div>
        <section className="question-wrap tie-wrap">
          <div className="question-no">A GENTLE TIEBREAKER</div>
          <h1>
            如果此刻只能保留一种，
            <br />
            哪一个对你更重要？
          </h1>
          <p>这一题的选择会继续迎战下一个接近类型，直到产生明确的核心偏好。</p>
          <div className="tie-options">
            <button onClick={() => chooseTie(champion)}>
              <small>{LOVE[champion].name}</small>
              <strong>{tieCopy[group.mode][champion]}</strong>
              <span>选择这个 →</span>
            </button>
            <i>或</i>
            <button onClick={() => chooseTie(challenger)}>
              <small>{LOVE[challenger].name}</small>
              <strong>{tieCopy[group.mode][challenger]}</strong>
              <span>选择这个 →</span>
            </button>
          </div>
          <div className="tie-note">
            胜出的选择会进入下一轮；最终胜者将成为结果页的“决胜后核心偏好”
          </div>
        </section>
      </main>
    );
  }
  const isiOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  const receiveLeaders = receive.filter(
    (item) => item.score === receive[0].score,
  );
  const giveLeaders = give.filter((item) => item.score === give[0].score);
  const hasTiedCore = receiveLeaders.length > 1 || giveLeaders.length > 1;
  const relationshipTitle = hasTiedCore
    ? "你的核心偏好不止一种。"
    : receive[0].key === give[0].key
      ? "你的爱，表达与接收有着自然的一致性。"
      : "你给予爱的方式，未必是你最渴望收到的方式。";
  const relationshipCopy = hasTiedCore
    ? `你在${receiveLeaders.length > 1 ? "接收爱" : "表达爱"}的方向上出现并列核心偏好。它们同样重要，不需要从中强行挑出一个代表你。`
    : receive[0].key === give[0].key
      ? `你很容易理解同样偏爱“${LOVE[receive[0].key].name}”的人。也别忘了询问对方真正需要什么，让熟悉的表达持续保有新鲜感。`
      : `你偏爱通过“${LOVE[receive[0].key].name}”感受爱，却更常用“${LOVE[give[0].key].name}”表达爱。把这份差异说出来，也好奇对方的答案，爱就更容易抵达。`;
  return (
    <main className="result-page">
      <header className="result-head">
        <div className="mini-brand">
          <LoveMark /> 爱的五种语言
        </div>
        <button onClick={restart}>重新测试 ↻</button>
      </header>
      <section className="result-intro">
        <p className="kicker">YOUR LOVE PROFILE</p>
        <h1>爱，从看见彼此开始。</h1>
        <p>
          你的接收偏好与付出方式不必相同。差异不是问题，它是理解自己与重要之人的新入口。
        </p>
      </section>
      <div className="result-grid">
        <ResultList
          title={LOVE[receive[0].key].name}
          eyebrow="我喜欢这样被爱"
          data={receive}
          mode="receive"
        />
        <ResultList
          title={LOVE[give[0].key].name}
          eyebrow="我愿意这样去爱"
          data={give}
          mode="give"
        />
      </div>
      <DetailedReport receive={receive} give={give} />
      {inviterProfile ? (
        <MatchReport
          inviter={inviterProfile}
          mine={{
            receive: LOVE_KEYS.map(
              (key) => receive.find((item) => item.key === key)?.score ?? 0,
            ),
            give: LOVE_KEYS.map(
              (key) => give.find((item) => item.key === key)?.score ?? 0,
            ),
          }}
        />
      ) : (
        <section className="match-invite">
          <div>
            <p>LOVE, TOGETHER</p>
            <h2>邀请另一半，看看爱有没有被彼此接住</h2>
            <span>
              对方完成测试后，将生成双向默契度、容易契合与需要翻译的地方，以及具体相处指南。
            </span>
            {matchHint && <em>{matchHint}</em>}
          </div>
          <button className="primary" onClick={shareMatchInvite}>
            邀请另一半测匹配度 <span>↗</span>
          </button>
        </section>
      )}
      <section className="insight">
        <div className="insight-mark">“</div>
        <div>
          <span>给你的关系提示</span>
          <h2>{relationshipTitle}</h2>
          <p>{relationshipCopy}</p>
        </div>
      </section>
      <section className="all-loves">
        <h2>五种爱的语言，没有高低之分</h2>
        <div>
          {(Object.keys(LOVE) as LoveKey[]).map((k) => (
            <article key={k}>
              <i style={{ background: LOVE[k].color }} />
              <h3>{LOVE[k].name}</h3>
              <p>{LOVE[k].desc}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="share">
        <div>
          <p>把理解，带进一段关系</p>
          <h2>生成你的专属结果海报</h2>
          <span>海报展示核心偏好与简要解读，适合分享。</span>
        </div>
        <button className="primary" onClick={createPoster}>
          生成分享海报 <span>↗</span>
        </button>
      </section>
      <p className="disclaimer">
        本测试用于自我探索与关系沟通，不构成心理测评或专业诊断。人的偏好会随情境与阶段变化，身体接触始终以双方自愿、舒适和尊重边界为前提。
      </p>
      {posterOpen && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-label="分享海报"
        >
          <button className="close" onClick={() => setPosterOpen(false)}>
            ×
          </button>
          <div className="poster-box">
            <canvas ref={canvasRef} className="poster-canvas" />
            {posterUrl && <img src={posterUrl} alt="我的爱的语言分享海报" />}
            <div>
              <button className="primary" onClick={sharePoster}>
                分享海报
              </button>
              <button className="poster-download" onClick={download}>
                {isiOS ? "存储到照片" : "保存图片"}
              </button>
              <p>
                {isiOS
                  ? "也可长按海报，选择“保存图片”"
                  : "微信内可长按海报保存，再从相册发布到朋友圈"}
              </p>
              {shareHint && <em>{shareHint}</em>}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  max: number,
  line: number,
) {
  let row = "",
    yy = y;
  for (const c of text) {
    if (ctx.measureText(row + c).width > max) {
      ctx.fillText(row, x, yy);
      row = c;
      yy += line;
    } else row += c;
  }
  ctx.fillText(row, x, yy);
}
