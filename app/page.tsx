"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";

type LoveKey = "words" | "time" | "gifts" | "acts" | "touch";
type Answer = LoveKey | "none";
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
    name: "肯定言语",
    short: "言语",
    color: "#d96d62",
    desc: "爱被明确说出来：感谢、欣赏、鼓励、想念和喜欢。",
    receive: "你在意对方是否把欣赏与关心说出口。",
    give: "你习惯用鼓励、感谢和真诚表达支持别人。",
  },
  time: {
    name: "专注陪伴",
    short: "陪伴",
    color: "#9c6b92",
    desc: "爱表现为认真在场：倾听、共同经历和不被打扰的相处。",
    receive: "全心投入的陪伴，会让你感到自己被珍视。",
    give: "你愿意留出完整时间，认真进入对方的世界。",
  },
  gifts: {
    name: "用心的礼物",
    short: "礼物",
    color: "#c18a45",
    desc: "爱通过具体心意被留下：小礼物、纪念品、卡片和被记住的喜好。",
    receive: "有纪念意义的小物，会让你感到被放在心上。",
    give: "你常用挑选、制作或带回一份心意表达惦念。",
  },
  acts: {
    name: "实际行动",
    short: "行动",
    color: "#557f70",
    desc: "爱落在具体生活里：主动帮忙、承担事务和减轻现实负担。",
    receive: "有人主动分担和解决实际问题，会令你安心。",
    give: "你擅长用可靠的行动照顾对方的现实需要。",
  },
  touch: {
    name: "身体的接触",
    short: "接触",
    color: "#ad6a74",
    desc: "爱通过双方都舒适的身体靠近传递：拥抱、牵手和依偎。",
    receive: "安全、合意的身体接触能给你直接的温暖。",
    give: "你自然地用拥抱、牵手等方式传递亲近感。",
  },
};

const REPORT: Record<
  LoveKey,
  { need: string; strength: string; watch: string; action: string }
> = {
  words: {
    need: "你在意的，不只是对方心里有没有你，还在意那些心意有没有被说出来。一句具体的欣赏、真诚的感谢或“我知道你很努力”，都可能让你安心很久。你需要的不是漂亮话，而是知道：你真的被看见了。",
    strength: "你能敏锐地看见他人的努力，并用语言赋予对方信心与被理解的感觉。",
    watch: "沉默、敷衍回应或带刺的评价，可能比对方预想得更容易让你受伤。",
    action:
      "试着直接告诉重要的人：‘当你具体说出欣赏我的地方时，我会很有力量。’",
  },
  time: {
    need: "你在意的从来不是陪了多久，而是对方有没有真的来到你身边。哪怕只有二十分钟，只要对方认真听你讲话，你就会觉得：原来我在你心里是有位置的。",
    strength: "你愿意倾听、投入，并通过共同经历让关系逐渐拥有深度。",
    watch:
      "人在身边却心不在焉，可能会被你体验为疏远；但对方未必意识到这种落差。",
    action: "提前约定一段短而完整的专属时间，并一起决定这段时间怎样度过。",
  },
  gifts: {
    need: "你喜欢的未必是礼物本身，而是那句藏在礼物后面的：“我想到你了。”一张票根、一块喜欢的点心或一件随口提过的小东西，都可能让你心动。",
    strength: "你善于留意细节，并把抽象的惦念转化成可以被保存、被回想的象征。",
    watch:
      "错过纪念日或过于随意的礼物可能令你失落，也要避免把花费等同于爱的多少。",
    action:
      "可以分享自己的收藏与偏好，也说明：有意义的小物或手写卡片就足以让你开心。",
  },
  acts: {
    need: "对你来说，爱不能只停在嘴边。当你忙不过来时，有人主动接手一件事情；当你被琐事困住时，有人愿意一起处理。这会让你觉得：生活不是只有你一个人在扛。",
    strength: "你务实、可靠，常能在别人真正需要时提供有用而具体的支持。",
    watch:
      "只说不做或反复失约容易消耗你的信任；同时也别默默包办到自己筋疲力尽。",
    action:
      "把需要说得具体可执行，例如：‘这周如果你能负责晚饭，我会感到被支持。’",
  },
  touch: {
    need: "在双方都愿意的前提下，你很容易从身体的靠近里感受到关系的温度。一只牵过来的手、一个安静的拥抱，或者有人让你靠一会儿，有些爱不用解释就能被感受到。",
    strength: "你能用温柔的非语言方式传递安慰、欢迎与陪伴。",
    watch: "身体边界会随关系、情境和状态改变；亲密不等于默认许可。",
    action:
      "用一句简单的询问建立安全感，例如：‘你现在想要一个拥抱吗？’并尊重任何答案。",
  },
};

const PERSONAL_RESULT: Record<string, { title: string; body: string }> = {
  "words-words": {
    title: "你相信，爱应该被说出来。",
    body: "你希望听见明确的喜欢、感谢和欣赏，也习惯把自己的心意直接告诉对方。你很容易用自己最需要的方式去爱别人。但也要记得，有些人不擅长把爱说出口，却可能一直在用其他方式靠近你。",
  },
  "words-time": {
    title: "你想听见爱，却习惯用时间回答。",
    body: "你希望对方清楚告诉你：喜欢你、欣赏你、把你放在心上。可当你爱一个人时，你更常留出时间认真陪伴。你用“我在这里”表达爱，却希望对方用“我爱你”回应。",
  },
  "words-gifts": {
    title: "你把爱藏进礼物里，却想听它被说出来。",
    body: "你很在意明确的赞美、感谢和情感确认；表达爱时却更习惯记住对方的喜好，带回一点小心意。你送出的是“我想到你了”，想收到的是“你对我很重要”。",
  },
  "words-acts": {
    title: "你做了很多，却也想被认真夸一句。",
    body: "你习惯把爱变成行动：处理琐事、承担责任、照顾生活。但你真正期待的，是有人看见这些并给出明确肯定。你不是天生就该做这些，而是因为在乎才愿意付出。",
  },
  "words-touch": {
    title: "你用拥抱靠近，却想听见一句确定。",
    body: "你习惯通过牵手、拥抱和自然靠近表达亲近，真正让你安心的却是对方明确说出喜欢和在乎。你给出去的是亲近，想收到的是确认。",
  },
  "time-words": {
    title: "你会把爱说出来，却更想有人留下来。",
    body: "你习惯表达感谢、欣赏和喜欢，但最珍贵的回应是对方愿意停下来认真陪你。你可能很会说“我在乎你”，却不一定会直接说“我想让你陪陪我”。",
  },
  "time-time": {
    title: "你相信，真正的在乎是认真在场。",
    body: "你希望有人专心听你说话，也习惯把时间和注意力留给喜欢的人。关系里的连接感，来自完整的聊天、认真投入的约会和共同经历。",
  },
  "time-gifts": {
    title: "你会记得对方喜欢什么，却更想被认真陪伴。",
    body: "你习惯通过小礼物表达惦记，但真正想收到的不是另一份礼物，而是一段不被打断的时间。你想知道的是：你愿不愿意真正陪我待一会儿。",
  },
  "time-acts": {
    title: "你忙着照顾别人，却想有人停下来陪你。",
    body: "你会习惯性地帮忙处理事情，把麻烦挡在前面。但你最想收到的，可能只是有人停下来认真听你说话。你给出去的是支持，想收到的是在场。",
  },
  "time-touch": {
    title: "你用靠近表达爱，却希望被认真听见。",
    body: "你习惯通过拥抱、牵手和依偎表达亲近，但真正让你觉得被爱的是对方愿意认真听你讲心里的话。你需要的不是一直待在一起，而是那段时间里对方真的在。",
  },
  "gifts-words": {
    title: "你把爱说得很清楚，也想知道自己有没有被记住。",
    body: "你习惯直接表达喜欢、欣赏和感谢，却最容易被对方在你不在场时仍记得你的喜好而打动。你在意的不是花了多少钱，而是生活里有没有想到你。",
  },
  "gifts-time": {
    title: "你愿意把时间留给对方，也想被藏进对方的日常。",
    body: "你习惯认真陪伴，愿意一起创造共同经历；期待的回应却是那些可以留下来的小小心意。你给出的是相处时的投入，想收到的是分开时仍存在的惦记。",
  },
  "gifts-gifts": {
    title: "你相信，心意可以被看见，也可以被留下。",
    body: "你会记住对方喜欢的东西，也容易被小惊喜打动。礼物不是价格标签，而是一种具体的记得；真正重要的是心意，不必让礼物变成负担或考核。",
  },
  "gifts-acts": {
    title: "你会替别人解决麻烦，也想被认真惦记。",
    body: "你习惯用行动照顾关系，但真正容易让你心动的是对方记得你说过的一件小事。你给出的是“我来帮你”，想收到的是“我想到你了”。",
  },
  "gifts-touch": {
    title: "你习惯用靠近表达爱，也希望爱能留下痕迹。",
    body: "你自然地用拥抱、牵手和依偎表达亲近，也容易被具体的小心意打动。你给出的是当下的亲近，想收到的是可以被记住的惦记。",
  },
  "acts-words": {
    title: "你会安慰别人，却也希望有人真的帮你一把。",
    body: "你习惯通过鼓励和欣赏让别人感受到爱，但自己需要支持时，更希望有人直接接过一件事情。你真正想听到的也许是：“这件事交给我，你先休息。”",
  },
  "acts-time": {
    title: "你愿意听别人说话，也希望有人和你一起承担。",
    body: "你习惯认真陪伴，但自己被现实问题困住时，更需要有人帮你分担。你给出去的是“我陪你”，想收到的是“我来帮你”。",
  },
  "acts-gifts": {
    title: "你会把爱放进礼物里，却希望有人把爱落到行动上。",
    body: "你容易记住对方的喜好，也愿意用小惊喜表达惦记；但需要被照顾时，你更在意现实负担能否真的减轻。让你安心的不只是被想起，还有被接住。",
  },
  "acts-acts": {
    title: "你相信，爱要落在真实生活里。",
    body: "你会主动帮忙，也希望对方主动分担。共同处理问题会让关系显得可靠有力量。但别让所有爱都变成任务清单，偶尔说一句“谢谢你”也很重要。",
  },
  "acts-touch": {
    title: "你用拥抱安慰别人，却希望有人帮你减轻负担。",
    body: "对方难过时，你可能先靠近和拥抱；轮到自己疲惫时，却更希望有人主动替你处理一件事情。你给出去的是安慰，想收到的是支持。",
  },
  "touch-words": {
    title: "你会把喜欢说出来，也希望被温柔地靠近。",
    body: "你习惯直接表达爱意、欣赏和感谢，但真正让你安心的可能是一只牵过来的手或一个拥抱。在双方都愿意时，亲近会让关系的温度更清楚。",
  },
  "touch-time": {
    title: "你愿意认真陪伴，也希望有人向你靠近。",
    body: "你习惯把时间留给喜欢的人，期待的回应却也包括一个拥抱、一次牵手或安静依偎。你给出的是“我在这里”，想收到的是“我愿意靠近你”。",
  },
  "touch-gifts": {
    title: "你把惦记放进礼物里，却更想被抱一抱。",
    body: "你习惯通过小惊喜和纪念品表达爱，但轮到自己，真正让你觉得被爱的可能只是对方走过来，自然地抱住你。",
  },
  "touch-acts": {
    title: "你替别人撑住生活，也想有人抱住你。",
    body: "你习惯处理问题、承担责任，把事情安排妥当；但你真正想收到的不一定是同样多的事情，而是忙完以后有人走过来抱抱你。你给出的是可靠，想收到的是温柔。",
  },
  "touch-touch": {
    title: "你相信，有些爱不用解释，靠近就能感受到。",
    body: "你习惯通过牵手、拥抱和依偎表达爱，也容易从这些亲近里获得安心。即使双方都喜欢亲近，也要尊重不同时间和情绪下的边界。",
  },
};

const RELATION_RESULT: Record<
  string,
  { title: string; advice: string; say?: string }
> = {
  "words-words": {
    title: "你们都愿意把爱说出来。",
    advice: "多说一句具体的“我欣赏你什么”，会比笼统的“你很好”更有力量。",
  },
  "words-time": {
    title: "对方用陪伴回答，你却想听见答案。",
    advice: "请对方在陪伴时，也把心里的喜欢说出来。",
    say: "你愿意陪我，我很开心。如果你能直接告诉我你在想什么，我会更安心。",
  },
  "words-gifts": {
    title: "对方给了你礼物，你想听见礼物后面的那句话。",
    advice: "让对方说明这份礼物背后的想法。",
    say: "我很喜欢你给我的东西，也想听听你为什么会想到我。",
  },
  "words-acts": {
    title: "对方做了很多，你还是想被认真夸一句。",
    advice: "在行动之外，增加具体的感谢和欣赏。",
    say: "你帮我做这些，我都知道。如果你也能告诉我，你欣赏我哪里，我会觉得更被爱。",
  },
  "words-touch": {
    title: "对方靠近你，你想知道这份靠近意味着什么。",
    advice: "在亲近时，说一句明确的感受。",
    say: "你抱着我的时候，如果也告诉我你在想什么，我会更安心。",
  },
  "time-words": {
    title: "对方说了很多喜欢，你更希望对方留下来。",
    advice: "把表达爱意变成明确的相处安排。",
    say: "你说这些我很开心，但我也想和你认真待一会儿。",
  },
  "time-time": {
    title: "你们都知道，认真在场有多重要。",
    advice: "待在一起不等于真正陪伴，把手机放下，把注意力留给眼前的人。",
  },
  "time-gifts": {
    title: "对方想让你开心，你更想和对方一起度过时间。",
    advice: "把礼物和共同相处结合起来。",
    say: "谢谢你记得我喜欢这个。我们一起出去走走吧，我想和你多待一会儿。",
  },
  "time-acts": {
    title: "对方替你解决问题，你想先被认真听见。",
    advice: "解决问题之前，先确认你更需要陪伴还是帮助。",
    say: "我知道你想帮我，但现在你先听我说一会儿，好吗？",
  },
  "time-touch": {
    title: "对方抱住你，你还想把话说完。",
    advice: "亲近之后，继续给彼此一点认真交流的时间。",
    say: "你抱我，我会觉得安心。然后你能不能再听我说一会儿？",
  },
  "gifts-words": {
    title: "对方说了喜欢，你想知道自己有没有被记在心里。",
    advice: "把说出口的心意留下一点痕迹。",
    say: "你说喜欢我，我很开心。偶尔给我留一点小纪念，我也会觉得特别被惦记。",
  },
  "gifts-time": {
    title: "对方愿意陪你，你也想知道分开时有没有被想起。",
    advice: "为共同经历留下一张照片、一张卡片或一个小纪念。",
  },
  "gifts-gifts": {
    title: "你们都懂得，把惦记变成具体的小心意。",
    advice: "保留仪式感，但不要让礼物变成压力。",
  },
  "gifts-acts": {
    title: "对方照顾你的生活，你还想被悄悄惦记一次。",
    advice: "在日常照顾中增加一点属于你的专属心意。",
    say: "你平时帮我很多，我都知道。偶尔带回一点你觉得我会喜欢的小东西，我也会特别开心。",
  },
  "gifts-touch": {
    title: "对方用靠近表达爱，你也想让这份爱留下来。",
    advice: "把当下的亲近，偶尔变成可以保存的小纪念。",
    say: "我很喜欢你抱我，也想留下一点属于我们的回忆。",
  },
  "acts-words": {
    title: "对方说你辛苦了，你更希望有人接手一件事。",
    advice: "鼓励之后，明确接手一项具体任务。",
    say: "谢谢你理解我。现在如果你能帮我把这件事处理掉，我会更轻松。",
  },
  "acts-time": {
    title: "对方想陪你，你想让对方和你一起承担。",
    advice: "先明确最需要分担的事情，再一起休息和交流。",
    say: "你愿意陪我，我很感激。我们能不能先一起把这件事处理掉？",
  },
  "acts-gifts": {
    title: "对方想送你惊喜，你更需要一点实际支持。",
    advice: "把心意落实到对方最需要支持的地方。",
    say: "礼物我很喜欢，但我现在最需要的是你帮我把这件事接过去。",
  },
  "acts-acts": {
    title: "你们都相信，爱要一起扛起生活。",
    advice: "定期调整分工，也记得感谢彼此，不要让关系只剩任务。",
  },
  "acts-touch": {
    title: "对方想抱你，你更希望有人帮你处理眼前的事。",
    advice: "先问你最需要什么，再决定是拥抱还是帮忙。",
    say: "我知道你想安慰我。我们先把这件事处理完，之后再抱一会儿，好吗？",
  },
  "touch-words": {
    title: "对方说爱你，你也想被轻轻抱住。",
    advice: "在双方都愿意的前提下，把语言和拥抱结合起来。",
    say: "你说这些我很开心。你可以再抱抱我吗？",
  },
  "touch-time": {
    title: "对方愿意陪你，你还希望再靠近一点。",
    advice: "直接说出自己喜欢怎样的身体靠近。",
    say: "我们聊天的时候，你可以牵着我的手吗？",
  },
  "touch-gifts": {
    title: "对方准备了礼物，你更期待见面时的拥抱。",
    advice: "送出礼物时，也问问对方是否想要一个拥抱。",
    say: "我很喜欢你准备的东西，但其实我更想先抱抱你。",
  },
  "touch-acts": {
    title: "对方把事情都安排好了，你只是想被抱一会儿。",
    advice: "忙完之后，留一个双方都舒服的亲近时刻。",
    say: "谢谢你帮我处理这些。现在你能不能抱我一下？",
  },
  "touch-touch": {
    title: "你们都能从靠近里感受到爱。",
    advice: "亲近之前确认意愿，比默认对方应该接受更重要。",
  },
};

const CONFLICT_GUIDE: Record<
  LoveKey,
  { need: string; response: string; avoid: string; request: string }
> = {
  words: {
    need: "争执之后，你最想确认的是：我们有分歧，但你是不是仍然在乎我？",
    response: "我们现在确实有分歧，但我没有否定你，也没有想放弃这段关系。",
    avoid: "“你别想太多”或“这有什么好说的”。",
    request:
      "我知道你已经做了很多，但如果你能告诉我，你欣赏我什么，我会更安心。",
  },
  time: {
    need: "争执之后，你最难受的往往是对方直接回避或沉默。",
    response: "我们都先冷静一下，今晚找半小时，把这件事认真说清楚。",
    avoid: "不说明原因地消失、冷处理，或一边刷手机一边敷衍。",
    request: "我现在不是想让你解决问题，我只是希望你先认真听我说一会儿。",
  },
  gifts: {
    need: "争执之后，你会在意对方有没有认真表达修复关系的心意。",
    response: "我写下了我想和你说的话，也想认真聊聊接下来怎么改。",
    avoid: "只送礼物，却拒绝承认问题或讨论矛盾。",
    request: "我不是一定要贵重礼物，只是偶尔想知道，你在生活里有没有想到过我。",
  },
  acts: {
    need: "争执之后，你更想知道：同样的问题，以后准备怎样避免？",
    response:
      "我知道这件事一直由你承担。以后这部分由我负责，我们过几天再看看是否合适。",
    avoid: "一直道歉，却没有任何具体调整。",
    request: "我知道你关心我，但现在最能让我轻松的，是你帮我接手这件事。",
  },
  touch: {
    need: "争执之后，你可能希望通过拥抱重新连接，但是否愿意被碰仍需确认。",
    response: "我知道你还在生气。你现在想让我抱抱你，还是想先把话说清楚？",
    avoid: "对方明确拒绝后，仍然坚持靠近或触碰。",
    request: "如果你也愿意的话，我现在想要一个拥抱。",
  },
};

type Question = {
  mode: "receive" | "give";
  scene: string;
  options: [{ key: LoveKey; text: string }, { key: LoveKey; text: string }];
};
export const legacyQuestions: Question[] = [
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

const makeQuestion = (
  mode: Question["mode"],
  scene: string,
  first: LoveKey,
  firstText: string,
  second: LoveKey,
  secondText: string,
): Question => ({
  mode,
  scene,
  options: [
    { key: first, text: firstText },
    { key: second, text: secondText },
  ],
});

export const questionsV2: Question[] = [
  makeQuestion(
    "receive",
    "一个平常的晚上，哪件事更容易让你觉得自己被认真放在心上？",
    "words",
    "对方告诉你，最近很欣赏你做的一件事。",
    "time",
    "对方放下手机，专心听你讲今天发生的事情。",
  ),
  makeQuestion(
    "receive",
    "哪件小事更容易让你觉得：“原来你一直记得我”？",
    "gifts",
    "对方路过一家店，带回你之前随口提过喜欢的小东西。",
    "acts",
    "对方记得你最近被一件小事困扰，顺手替你处理好了。",
  ),
  makeQuestion(
    "receive",
    "分开一段时间后再次见面，你更期待：",
    "touch",
    "对方走过来，给你一个久违的拥抱。",
    "words",
    "对方认真告诉你，这段时间有多想你。",
  ),
  makeQuestion(
    "receive",
    "最近生活有些忙乱，但没有特别紧急的事情。你更希望对方：",
    "time",
    "空出一个晚上，陪你聊聊最近的感受。",
    "acts",
    "主动帮你处理一件一直拖着没完成的小事。",
  ),
  makeQuestion(
    "receive",
    "一次愉快的约会结束后，什么更容易让你记住这一天？",
    "gifts",
    "对方留下了一件和这次约会有关的小纪念。",
    "touch",
    "道别时，对方牵住你的手，或者轻轻抱了你一下。",
  ),
  makeQuestion(
    "receive",
    "如果对方想让一个普通的周末变得特别，你更喜欢：",
    "time",
    "安排一段只有你们两个人的相处时间。",
    "gifts",
    "准备一件看得出来很了解你的小礼物。",
  ),
  makeQuestion(
    "receive",
    "哪种表达更容易让你觉得：“对方是真的懂我”？",
    "acts",
    "对方注意到你最近被一件琐事困扰，主动帮你解决。",
    "words",
    "对方说出自己具体欣赏你什么，而不是笼统地夸你。",
  ),
  makeQuestion(
    "receive",
    "当你希望重新找回亲近感时，你更喜欢：",
    "touch",
    "靠在一起，牵牵手，或者安静地抱一会儿。",
    "time",
    "坐下来认真聊聊彼此最近在想什么。",
  ),
  makeQuestion(
    "receive",
    "一个不算忙碌的周末，你更容易被哪件事打动？",
    "acts",
    "对方主动帮你完成一件原本需要你处理的小事。",
    "touch",
    "对方坐到你身边，让你靠着休息一会儿。",
  ),
  makeQuestion(
    "receive",
    "如果对方想表达感谢，哪种方式更让你心动？",
    "words",
    "清楚说出：“我知道你做了什么，也真的很感谢你。”",
    "gifts",
    "准备一张卡片，或者一件有纪念意义的小东西。",
  ),
  makeQuestion(
    "receive",
    "当你分享一件自己很在意的事情时，你更希望：",
    "time",
    "对方认真听你讲完整个过程，并继续追问细节。",
    "words",
    "对方明确告诉你：“你做得很好，我真的很为你高兴。”",
  ),
  makeQuestion(
    "receive",
    "下面哪种日常小事更容易让你心里一暖？",
    "acts",
    "对方看出你最近有点忙，主动替你完成一件小事。",
    "gifts",
    "对方回家时带来你喜欢的小零食，说路过时想起了你。",
  ),
  makeQuestion(
    "receive",
    "在一个值得纪念的日子，你更在意：",
    "gifts",
    "有没有一份可以留下来的、体现心意的小纪念。",
    "time",
    "有没有一段只属于彼此、认真投入的相处时间。",
  ),
  makeQuestion(
    "receive",
    "结束忙碌的一天回到家，你更希望：",
    "touch",
    "对方走过来，给你一个安静的拥抱。",
    "acts",
    "对方已经顺手替你处理了一件让你惦记的事情。",
  ),
  makeQuestion(
    "receive",
    "当你想确认一段关系的温度时，哪种方式更容易让你安心？",
    "words",
    "对方清楚表达喜欢、想念和在乎。",
    "touch",
    "对方自然地牵起你的手，或者靠近你。",
  ),
  makeQuestion(
    "give",
    "最近想让对方知道自己很重要时，你更常做的是：",
    "time",
    "空出时间，认真陪对方说说话或一起做点什么。",
    "words",
    "直接告诉对方，你欣赏什么、感谢什么。",
  ),
  makeQuestion(
    "give",
    "最近想到对方时，你更容易：",
    "acts",
    "留意有没有什么事情可以主动替对方处理。",
    "gifts",
    "留意有没有适合对方的小东西，想找机会带回去。",
  ),
  makeQuestion(
    "give",
    "最近一次表达想念时，你更接近：",
    "words",
    "直接告诉对方：“我很想你。”",
    "touch",
    "见面时主动抱住对方，或者牵住对方的手。",
  ),
  makeQuestion(
    "give",
    "对方最近有点忙时，你更常做的是：",
    "acts",
    "主动接手一件具体的事情，让对方轻松一点。",
    "time",
    "留出时间，陪对方聊聊最近的状态。",
  ),
  makeQuestion(
    "give",
    "一次开心的约会结束后，你更自然会：",
    "touch",
    "牵手、拥抱，或者靠近对方一会儿。",
    "gifts",
    "留下一张照片、一个纪念品或一件小心意。",
  ),
  makeQuestion(
    "give",
    "想让普通的一天变得特别时，你更可能：",
    "gifts",
    "准备一件对方喜欢的小东西。",
    "time",
    "专门安排一段两个人好好相处的时间。",
  ),
  makeQuestion(
    "give",
    "看到对方最近很努力，你更常做的是：",
    "words",
    "直接表达欣赏、感谢或鼓励。",
    "acts",
    "主动分担一件事情，让对方休息一下。",
  ),
  makeQuestion(
    "give",
    "和喜欢的人待在一起时，你更自然会：",
    "time",
    "认真聊天，想知道对方最近在想什么。",
    "touch",
    "靠近对方，牵手、拥抱或依偎。",
  ),
  makeQuestion(
    "give",
    "对方情绪不太好时，你更本能的第一反应是：",
    "touch",
    "给对方一个拥抱，或者安静地靠近对方。",
    "acts",
    "看看有没有具体的事情能替对方处理。",
  ),
  makeQuestion(
    "give",
    "想表达“我一直记得你”时，你更常做的是：",
    "gifts",
    "带回一件对方喜欢的小东西，或者留下小纪念。",
    "words",
    "直接告诉对方，你为什么会想到对方。",
  ),
  makeQuestion(
    "give",
    "最近想表达爱意时，你更接近：",
    "words",
    "清楚说出喜欢、欣赏或感谢。",
    "time",
    "腾出时间，专心和对方待在一起。",
  ),
  makeQuestion(
    "give",
    "平时想照顾对方时，你更容易：",
    "gifts",
    "准备一点对方会喜欢的小心意。",
    "acts",
    "主动处理一件对方最近觉得麻烦的事情。",
  ),
  makeQuestion(
    "give",
    "想为两个人创造一段好回忆时，你更倾向：",
    "time",
    "一起安排一次完整、投入的共同体验。",
    "gifts",
    "准备一件和你们共同回忆有关的小纪念。",
  ),
  makeQuestion(
    "give",
    "对方表现出疲惫时，你更常做的是：",
    "acts",
    "主动接手一件眼前需要处理的事情。",
    "touch",
    "抱抱对方，或者陪对方安静靠一会儿。",
  ),
  makeQuestion(
    "give",
    "想表达关系里的亲近感时，你更自然会：",
    "touch",
    "牵手、拥抱或依偎。",
    "words",
    "直接说出爱意、想念或欣赏。",
  ),
];

const questions: Question[] = [
  makeQuestion(
    "receive",
    "当你完成了一件自己很在意的事情，你更希望对方：",
    "words",
    "告诉你：“我知道你为这件事付出了多少，你真的做得很好。”",
    "time",
    "坐下来听你讲整个过程，认真问你其中的细节。",
  ),
  makeQuestion(
    "receive",
    "平日里，哪件事更容易让你觉得自己被放在心上？",
    "gifts",
    "对方路过一家店，带回你之前说过想尝的点心。",
    "acts",
    "对方知道你最近忙，顺手帮你取回快递。",
  ),
  makeQuestion(
    "receive",
    "分开一段时间后再次见面，你更期待：",
    "touch",
    "对方走过来，给你一个久违的拥抱。",
    "words",
    "对方认真告诉你，这段时间有多想你。",
  ),
  makeQuestion(
    "receive",
    "最近事情有点多，你更希望对方：",
    "time",
    "陪你出去走走，听你说说最近在烦什么。",
    "acts",
    "主动帮你处理一件拖了好几天的待办事项。",
  ),
  makeQuestion(
    "receive",
    "一次开心的约会结束后，哪个瞬间更容易留在你的记忆里？",
    "gifts",
    "对方把当天的电影票根收起来，说想留作纪念。",
    "touch",
    "回家的路上，对方自然地牵住你的手。",
  ),
  makeQuestion(
    "receive",
    "如果对方想为你的生日做点什么，你更期待：",
    "time",
    "留出完整的一天，陪你做喜欢的事情。",
    "gifts",
    "准备一份很符合你喜好的生日礼物。",
  ),
  makeQuestion(
    "receive",
    "当你最近一直在认真做一件事，哪种回应更让你觉得被理解？",
    "acts",
    "对方帮你处理一些其他安排，让你能更专心。",
    "words",
    "对方看见你的努力，具体说出欣赏你的地方。",
  ),
  makeQuestion(
    "receive",
    "一起看完一部很喜欢的电影后，你更希望：",
    "touch",
    "两个人靠在一起，安静享受那一刻。",
    "time",
    "继续聊聊喜欢的情节和各自的感受。",
  ),
  makeQuestion(
    "receive",
    "一个悠闲的周末，哪件事更容易让你心里一暖？",
    "acts",
    "对方主动帮你装好拖了很久都没处理的东西。",
    "touch",
    "对方坐到你身边，让你靠着休息一会儿。",
  ),
  makeQuestion(
    "receive",
    "如果对方想感谢你最近的付出，你更希望：",
    "words",
    "对方认真说出：“我都看到了，也真的很感谢你。”",
    "gifts",
    "对方为你准备一件你一直想要的小东西。",
  ),
  makeQuestion(
    "receive",
    "当你心情低落时，你更希望对方：",
    "time",
    "放下手里的事情，让你慢慢把心里的话说完。",
    "words",
    "告诉你：“你已经很努力了，不用总对自己这么严格。”",
  ),
  makeQuestion(
    "receive",
    "下班回家时，哪件事更容易让你感受到对方的惦记？",
    "acts",
    "对方已经帮你处理好一件你原本准备回家再做的事。",
    "gifts",
    "对方顺路带回你喜欢的饮料或小零食。",
  ),
  makeQuestion(
    "receive",
    "纪念日当天，你更看重：",
    "gifts",
    "一份经过认真挑选、能看出心意的纪念日礼物。",
    "time",
    "一段不被工作和手机打断的二人时光。",
  ),
  makeQuestion(
    "receive",
    "结束忙碌的一周后，你更希望：",
    "touch",
    "对方走过来抱抱你，让你放松一会儿。",
    "acts",
    "对方提前安排好你原本还需要操心的事情。",
  ),
  makeQuestion(
    "receive",
    "当你想确认一段关系的温度时，哪种方式更容易让你安心？",
    "words",
    "对方明确告诉你：“你对我来说真的很重要。”",
    "touch",
    "对方轻轻牵住你的手，或者自然地靠近你。",
  ),
  makeQuestion(
    "give",
    "对方告诉你一个好消息时，你更常做的是：",
    "time",
    "继续追问细节，认真听对方讲事情的来龙去脉。",
    "words",
    "直接告诉对方：“我就知道你能做到，你真的很厉害。”",
  ),
  makeQuestion(
    "give",
    "准备去见对方之前，你更容易想到：",
    "acts",
    "有没有什么对方最近觉得麻烦的事情，自己可以顺手帮忙。",
    "gifts",
    "要不要给对方带一份喜欢的甜点或者饮料。",
  ),
  makeQuestion(
    "give",
    "一段时间没见后，你更自然的反应是：",
    "words",
    "直接告诉对方：“我这几天真的很想你。”",
    "touch",
    "见面时先抱住对方，或者牵起对方的手。",
  ),
  makeQuestion(
    "give",
    "发现对方最近有点累，你更常做的是：",
    "acts",
    "主动接过一件对方还没来得及处理的事情。",
    "time",
    "约对方一起散步，听听最近都发生了什么。",
  ),
  makeQuestion(
    "give",
    "一次开心的约会结束后，你更容易：",
    "touch",
    "在分别前给对方一个拥抱。",
    "gifts",
    "想把当天拍的照片洗出来，或者做成一份小礼物。",
  ),
  makeQuestion(
    "give",
    "想给平淡的一天增加一点惊喜，你更可能：",
    "gifts",
    "路过花店或甜品店时，买一份对方会喜欢的东西。",
    "time",
    "提议一起出门吃饭，留出一个晚上专心相处。",
  ),
  makeQuestion(
    "give",
    "对方为一件事情忙了很久，你更常做的是：",
    "words",
    "告诉对方：“我知道你有多努力，也很佩服你。”",
    "acts",
    "主动接手其他安排，让对方能先休息一下。",
  ),
  makeQuestion(
    "give",
    "周末待在一起时，你更自然会：",
    "time",
    "找点两个人都喜欢的事情一起做，边玩边聊天。",
    "touch",
    "靠近对方，牵手、依偎或者抱一会儿。",
  ),
  makeQuestion(
    "give",
    "对方情绪不太好时，你更本能的第一反应是：",
    "touch",
    "先抱抱对方，或者安静地陪对方靠一会儿。",
    "acts",
    "看看有没有什么现实问题是自己能先解决的。",
  ),
  makeQuestion(
    "give",
    "出门时看到一件和对方有关的东西，你更可能：",
    "gifts",
    "买下来，想着见面时送给对方。",
    "words",
    "发消息告诉对方：“看到这个，我一下就想到你了。”",
  ),
  makeQuestion(
    "give",
    "在一个普通的晚上，你更常用哪种方式表达爱意？",
    "words",
    "直接说出感谢、喜欢，或者自己欣赏对方的地方。",
    "time",
    "把手机放到一边，专心陪对方聊聊天。",
  ),
  makeQuestion(
    "give",
    "知道对方最近在期待某样东西，你更可能：",
    "gifts",
    "悄悄记下来，找机会买给对方。",
    "acts",
    "留意对方眼下有没有更需要帮忙处理的事情。",
  ),
  makeQuestion(
    "give",
    "如果想认真庆祝一个属于你们的日子，你更倾向：",
    "time",
    "安排一次两个人都能投入其中的约会。",
    "gifts",
    "挑一份和你们共同经历有关的纪念品。",
  ),
  makeQuestion(
    "give",
    "对方忙了一整天，终于停下来时，你更常做的是：",
    "acts",
    "帮对方处理还没完成的事情，让对方早点休息。",
    "touch",
    "走过去抱抱对方，或者陪对方安静靠一会儿。",
  ),
  makeQuestion(
    "give",
    "想让对方感受到你的喜欢，你更自然会：",
    "touch",
    "牵住对方的手，或者主动靠近对方。",
    "words",
    "清楚地告诉对方：“我真的很喜欢和你在一起。”",
  ),
];

const PROGRESS_KEY = "love_language_quiz_progress_v3";
type SavedProgress = {
  answers: Array<Answer | null>;
  index: number;
  attemptId: string;
};
function loadSavedProgress(): SavedProgress | null {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(PROGRESS_KEY) || "null",
    ) as SavedProgress | null;
    if (
      !parsed ||
      parsed.answers.length !== questions.length ||
      !parsed.answers.every(
        (answer) =>
          answer === null || answer === "none" || LOVE_KEYS.includes(answer),
      ) ||
      !Number.isInteger(parsed.index) ||
      parsed.index < 0 ||
      parsed.index >= questions.length ||
      !parsed.answers.some(Boolean) ||
      parsed.answers.every(Boolean) ||
      !/^[a-zA-Z0-9-]{8,80}$/.test(parsed.attemptId)
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
}

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

function calc(answers: Array<Answer | null>, mode: "receive" | "give") {
  const totals = Object.fromEntries(
    Object.keys(LOVE).map((k) => [k, 0]),
  ) as Record<LoveKey, number>;
  questions.forEach((q, i) => {
    const key = answers[i];
    if (q.mode === mode && key && key !== "none") totals[key] += 1;
  });
  return (Object.keys(LOVE) as LoveKey[])
    .map((key) => ({
      key,
      score: totals[key],
      pct: Math.round((totals[key] / 6) * 100),
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
        (score) => Number.isInteger(score) && score >= 0 && score <= 6,
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
  onCreatePoster,
}: {
  inviter: MatchProfile;
  mine: MatchProfile;
  onCreatePoster: () => void;
}) {
  const fit = (need: number[], expression: number[]) => {
    const needTotal = need.reduce((sum, score) => sum + score, 0) || 1;
    const expressionTotal =
      expression.reduce((sum, score) => sum + score, 0) || 1;
    const distance = need.reduce(
      (sum, score, i) =>
        sum + Math.abs(score / needTotal - expression[i] / expressionTotal),
      0,
    );
    return Math.round((1 - distance / 2) * 100);
  };
  const receiveFit = fit(mine.receive, inviter.give);
  const giveFit = fit(inviter.receive, mine.give);
  const overall = Math.round((receiveFit + giveFit) / 2);
  const mainKey = (scores: number[]) =>
    LOVE_KEYS.slice().sort(
      (a, b) => scores[LOVE_KEYS.indexOf(b)] - scores[LOVE_KEYS.indexOf(a)],
    )[0];
  const mineNeed = mainKey(mine.receive);
  const theirGive = mainKey(inviter.give);
  const theirNeed = mainKey(inviter.receive);
  const mineGive = mainKey(mine.give);
  const towardMe = RELATION_RESULT[`${mineNeed}-${theirGive}`];
  const towardThem = RELATION_RESULT[`${theirNeed}-${mineGive}`];
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
          <small>你期待什么 · 对方怎样给</small>
          <h3>{towardMe.title}</h3>
          <p>
            你更期待通过“{LOVE[mineNeed].name}”感受爱，对方则习惯用“
            {LOVE[theirGive].name}”表达。{towardMe.advice}
          </p>
          {towardMe.say && <blockquote>“{towardMe.say}”</blockquote>}
        </article>
        <article>
          <small>对方期待什么 · 你怎样给</small>
          <h3>{towardThem.title}</h3>
          <p>
            对方更期待通过“{LOVE[theirNeed].name}”感受爱，你则习惯用“
            {LOVE[mineGive].name}”表达。{towardThem.advice}
          </p>
          {towardThem.say && <blockquote>“{towardThem.say}”</blockquote>}
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
      <button className="primary match-poster-button" onClick={onCreatePoster}>
        生成默契度分享海报 <span>↗</span>
      </button>
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
  const maximum = Math.max(...ranked.map((item) => item.adjustedScore), 1);
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
  const chosenTotal = data.reduce((sum, item) => sum + item.score, 0);
  const total = chosenTotal || 1;
  const neutralCount = 15 - chosenTotal;
  const lowSignal = chosenTotal <= 7 || data[0].score <= 2;
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
      <h2>
        {lowSignal
          ? "偏好尚未集中"
          : leaders.length > 1
            ? "并列核心偏好"
            : title}
      </h2>
      <div
        className="primary-love"
        style={
          {
            "--accent":
              lowSignal || leaders.length > 1
                ? "#b95548"
                : LOVE[data[0].key].color,
          } as React.CSSProperties
        }
      >
        <div className="rank-mark">
          {lowSignal ? "?" : leaders.length > 1 ? "=" : "01"}
        </div>
        <div>
          <strong>
            {lowSignal
              ? "目前没有表现出特别明显的单一偏好"
              : leaders.map((item) => LOVE[item.key].name).join(" · ")}
          </strong>
          <p>
            {lowSignal
              ? "你感受到或表达爱，可能更依赖具体情境，现有选项也可能没有充分覆盖你真正重视的方式。"
              : leaders.length > 1
                ? `这 ${leaders.length} 项得分相同，共同构成你的核心偏好，不必从中强行选出第一名。`
                : LOVE[data[0].key][mode]}
          </p>
        </div>
      </div>
      <div className="pie-result">
        <div
          className="pie-chart"
          style={{
            background: chosenTotal ? `conic-gradient(${gradient})` : "#f0e5df",
          }}
        >
        </div>
        <div className="pie-legend">
          {data.map((item) => (
            <div key={item.key}>
              <i style={{ background: LOVE[item.key].color }} />
              <span>{LOVE[item.key].name}</span>
              <b>{item.score} 分</b>
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
  const personal = PERSONAL_RESULT[`${receiveMain}-${giveMain}`];
  const receiveTotal = receive.reduce((sum, item) => sum + item.score, 0);
  const giveTotal = give.reduce((sum, item) => sum + item.score, 0);
  const receiveLowSignal = receiveTotal <= 7 || receive[0].score <= 2;
  const giveLowSignal = giveTotal <= 7 || give[0].score <= 2;
  const receiveLeaders = receive.filter(
    (item) => item.score === receive[0].score,
  );
  const giveLeaders = give.filter((item) => item.score === give[0].score);
  const receiveSecond =
    receive[0].score - receive[1].score === 1 &&
    receive[1].score > receive[2].score
      ? receive[1]
      : null;
  const giveSecond =
    give[0].score - give[1].score === 1 && give[1].score > give[2].score
      ? give[1]
      : null;
  return (
    <section className="detailed-report">
      <div className="report-heading">
        <span>DETAILED REPORT</span>
        <h2>你的双向爱语报告</h2>
        <p>分数代表当下的相对偏好，不是能力高低，也不是固定不变的人格标签。</p>
      </div>
      {!receiveLowSignal &&
        !giveLowSignal &&
        !receiveLeaders.slice(1).length &&
        !giveLeaders.slice(1).length && (
          <div className="personal-summary">
            <small>你的个人测评结论</small>
            <h3>{personal.title}</h3>
            <p>{personal.body}</p>
          </div>
        )}
      {(receiveLowSignal || giveLowSignal) && (
        <div className="personal-summary low-signal-summary">
          <small>关于这次结果</small>
          <h3>你的偏好可能更依赖具体情境</h3>
          <p>
            你选择了较多“这两种都不太符合”，因此这次结果不强行用单一类型概括你。这不是漏答，也不是测试失败；它说明现有场景可能没有充分覆盖你真正看重的表达方式。
          </p>
        </div>
      )}
      <div className="report-grid">
        <article>
          <small>01 · 内在需要</small>
          <h3>
            {receiveLowSignal
              ? "暂未出现明显的单一偏好"
              : receiveLeaders.map((item) => LOVE[item.key].name).join(" · ")}
          </h3>
          {receiveLowSignal ? (
            <p>
              你在“期待怎样被爱”部分选择了 {15 - receiveTotal} 次
              C。你的需要可能更依赖具体情境，或者还有其他重要方式没有被这些题目覆盖。
            </p>
          ) : receiveLeaders.length > 1 ? (
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
          <h3>
            {giveLowSignal
              ? "暂未出现明显的单一偏好"
              : giveLeaders.map((item) => LOVE[item.key].name).join(" · ")}
          </h3>
          {giveLowSignal ? (
            <p>
              你在“习惯怎样去爱”部分选择了 {15 - giveTotal} 次
              C。你的表达方式可能随对象和场景变化，不适合被强行归入单一类型。
            </p>
          ) : giveLeaders.length > 1 ? (
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
        {!receiveLowSignal && (
          <div className="conflict-guide">
            <small>发生矛盾以后</small>
            <h3>{CONFLICT_GUIDE[receiveMain].need}</h3>
            <p>
              <b>更适合的回应：</b>“{CONFLICT_GUIDE[receiveMain].response}”
            </p>
            <p>
              <b>尽量避免：</b>
              {CONFLICT_GUIDE[receiveMain].avoid}
            </p>
            <blockquote>“{CONFLICT_GUIDE[receiveMain].request}”</blockquote>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const inviteShareReady = useMemo(
    () => new URLSearchParams(window.location.search).get("invite") === "ready",
    [],
  );
  const inviterProfile = useMemo(
    () =>
      decodeProfile(new URLSearchParams(window.location.search).get("match")),
    [],
  );
  const savedProgress = useMemo(() => loadSavedProgress(), []);
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(savedProgress?.index ?? 0);
  const [answers, setAnswers] = useState<Array<Answer | null>>(
    savedProgress?.answers ?? Array(questions.length).fill(null),
  );
  const [hasSavedProgress, setHasSavedProgress] = useState(
    Boolean(savedProgress),
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const attemptIdRef = useRef(savedProgress?.attemptId ?? "");
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
    if (phase !== "quiz" || !attemptIdRef.current) return;
    try {
      localStorage.setItem(
        PROGRESS_KEY,
        JSON.stringify({ answers, index, attemptId: attemptIdRef.current }),
      );
    } catch {
      // Private browsing or storage restrictions should not block the test.
    }
  }, [phase, answers, index]);
  useEffect(() => {
    if (phase !== "result" || completionTrackedRef.current) return;
    try {
      localStorage.removeItem(PROGRESS_KEY);
    } catch {
      // Ignore storage restrictions.
    }
    setHasSavedProgress(false);
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
  const choose = (key: Answer) => {
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
  const beginFreshQuiz = () => {
    const freshAnswers = Array<Answer | null>(questions.length).fill(null);
    setAnswers(freshAnswers);
    setIndex(0);
    attemptIdRef.current = crypto.randomUUID();
    completionTrackedRef.current = false;
    setHasSavedProgress(false);
    trackEvent("quiz_start", attemptIdRef.current);
    setPhase("quiz");
  };
  const startQuiz = () => {
    if (hasSavedProgress) {
      completionTrackedRef.current = false;
      setPhase("quiz");
      return;
    }
    beginFreshQuiz();
  };
  const restart = () => {
    setTieGroupIndex(0);
    setTieOpponentIndex(1);
    setTieChampion(null);
    setTieChoices({ receive: [], give: [] });
    setTieWinners({});
    setPosterOpen(false);
    setPosterUrl("");
    setShareHint("");
    beginFreshQuiz();
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
      const chosenTotal = data.reduce((sum, item) => sum + item.score, 0);
      const total = chosenTotal || 1;
      const lowSignal = chosenTotal <= 7 || data[0].score <= 2;
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
        lowSignal
          ? "偏好尚未集中"
          : leaders.map((item) => LOVE[item.key].name).join(" · "),
        110,
        y + 128,
        540,
        42,
      );
      ctx.fillStyle = "#79635c";
      ctx.font = "400 22px 'PingFang SC', sans-serif";
      wrapText(
        ctx,
        lowSignal
          ? "这次选择了较多 C，感受爱可能更依赖具体情境。"
          : leaders.length > 1
            ? "并列核心偏好：这些方式对我同样重要，不作单独排序。"
            : copy,
        110,
        y + 200,
        525,
        35,
      );
      ctx.font = "500 19px 'PingFang SC', sans-serif";
      ctx.fillText(
        lowSignal
          ? `明确选择 C · ${15 - chosenTotal} 次`
          : secondary
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
      ctx.fillText(`C ${15 - chosenTotal}次`, 830, y + 171);
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
        ctx.fillText(`${LOVE[item.key].short} ${item.score}分`, legendX[i], yy);
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
    ctx.fillText("30 道情境二选一 · 约 3 分钟 · 不收集个人信息", 300, 1266);
    ctx.font = "400 20px sans-serif";
    ctx.fillText("zhouying.cn/5lovelanguages", 300, 1307);
    ctx.fillStyle = "#b95548";
    ctx.font = "700 28px serif";
    ctx.fillText("LOVE FLOWS BOTH WAYS", 74, 1382);
    setPosterUrl(canvas.toDataURL("image/png"));
  };
  const createMatchPoster = async () => {
    if (!inviterProfile) return;
    trackEvent("poster_generate", attemptIdRef.current);
    setShareHint("");
    setPosterUrl("");
    setPosterOpen(true);
    await new Promise((resolve) => setTimeout(resolve, 40));
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const mine: MatchProfile = {
      receive: LOVE_KEYS.map(
        (key) => receive.find((item) => item.key === key)?.score ?? 0,
      ),
      give: LOVE_KEYS.map(
        (key) => give.find((item) => item.key === key)?.score ?? 0,
      ),
    };
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
    const receiveFit = fit(mine.receive, inviterProfile.give);
    const giveFit = fit(inviterProfile.receive, mine.give);
    const overall = Math.round((receiveFit + giveFit) / 2);
    const warmKey = LOVE_KEYS.slice().sort(
      (a, b) =>
        Math.min(
          mine.receive[LOVE_KEYS.indexOf(b)],
          inviterProfile.give[LOVE_KEYS.indexOf(b)],
        ) -
        Math.min(
          mine.receive[LOVE_KEYS.indexOf(a)],
          inviterProfile.give[LOVE_KEYS.indexOf(a)],
        ),
    )[0];
    const gapKey = LOVE_KEYS.slice().sort(
      (a, b) =>
        Math.abs(
          mine.receive[LOVE_KEYS.indexOf(b)] -
            inviterProfile.give[LOVE_KEYS.indexOf(b)],
        ) -
        Math.abs(
          mine.receive[LOVE_KEYS.indexOf(a)] -
            inviterProfile.give[LOVE_KEYS.indexOf(a)],
        ),
    )[0];
    const level =
      overall >= 80
        ? "很会接住彼此"
        : overall >= 60
          ? "有默契，也有探索空间"
          : "爱的翻译比爱的多少更重要";
    canvas.width = 1080;
    canvas.height = 1440;
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1440);
    gradient.addColorStop(0, "#fffaf4");
    gradient.addColorStop(1, "#efd9d2");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1440);
    ctx.fillStyle = "#b95548";
    ctx.beginPath();
    ctx.arc(930, 90, 270, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8f443c";
    ctx.font = "600 27px 'PingFang SC', sans-serif";
    ctx.fillText("爱的五种语言 · 双人报告", 70, 105);
    ctx.fillStyle = "#382824";
    ctx.font = "700 58px 'Songti SC', serif";
    ctx.fillText("我们的爱，有没有被彼此接住？", 70, 195);
    ctx.fillStyle = "#79635c";
    ctx.font = "400 24px 'PingFang SC', sans-serif";
    ctx.fillText("两个人的需要与表达，正在这里相遇", 72, 245);
    ctx.fillStyle = "rgba(255,255,255,.92)";
    roundRect(ctx, 64, 300, 952, 380, 34);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = "#b95548";
    ctx.font = "600 23px 'PingFang SC', sans-serif";
    ctx.fillText("双向爱语默契度", 540, 365);
    ctx.font = "700 150px Georgia,serif";
    ctx.fillText(`${overall}%`, 540, 520);
    ctx.fillStyle = "#382824";
    ctx.font = "700 38px 'Songti SC', serif";
    ctx.fillText(level, 540, 590);
    ctx.fillStyle = "#79635c";
    ctx.font = "500 20px 'PingFang SC', sans-serif";
    ctx.fillText(
      `对方表达 → 你的需要 ${receiveFit}% · 你的表达 → 对方需要 ${giveFit}%`,
      540,
      640,
    );
    ctx.textAlign = "left";
    const insightCard = (
      x: number,
      title: string,
      key: LoveKey,
      copy: string,
      color: string,
    ) => {
      ctx.fillStyle = "rgba(255,255,255,.88)";
      roundRect(ctx, x, 720, 456, 315, 28);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.font = "600 20px 'PingFang SC', sans-serif";
      ctx.fillText(title, x + 35, 775);
      ctx.fillStyle = "#382824";
      ctx.font = "700 38px 'Songti SC', serif";
      ctx.fillText(LOVE[key].name, x + 35, 840);
      ctx.fillStyle = "#79635c";
      ctx.font = "400 21px 'PingFang SC', sans-serif";
      wrapText(ctx, copy, x + 35, 900, 385, 34);
    };
    insightCard(
      64,
      "你们容易彼此接住",
      warmKey,
      "这是你们可以继续创造、反复确认的共同语言。",
      "#557f70",
    );
    insightCard(
      560,
      "最值得主动翻译",
      gapKey,
      "差异不代表不爱，只要更明确地说出怎样做会更容易被收到。",
      "#b95548",
    );
    ctx.fillStyle = "#4e7568";
    roundRect(ctx, 64, 1075, 952, 180, 28);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "700 28px 'Songti SC', serif";
    ctx.fillText("给我们的一个小练习", 105, 1125);
    ctx.fillStyle = "#e1ebe7";
    ctx.font = "400 21px 'PingFang SC', sans-serif";
    ctx.fillText(
      "各自说出最近一次感到被爱的瞬间，再为对方做一件能被收到的小事。",
      105,
      1175,
    );
    ctx.fillText("做完后问一句：这次，有被你收到吗？", 105, 1215);
    const qr = await QRCode.toDataURL("https://zhouying.cn/5lovelanguages", {
      width: 180,
      margin: 2,
      color: { dark: "#382824", light: "#fffaf4" },
    });
    const qrImage = new Image();
    qrImage.src = qr;
    await new Promise<void>((resolve) => {
      qrImage.onload = () => resolve();
    });
    ctx.drawImage(qrImage, 72, 1280, 110, 110);
    ctx.fillStyle = "#382824";
    ctx.font = "600 22px 'PingFang SC', sans-serif";
    ctx.fillText("扫码，和重要的人一起发现爱的语言", 210, 1332);
    ctx.fillStyle = "#79635c";
    ctx.font = "400 18px sans-serif";
    ctx.fillText("zhouying.cn/5lovelanguages", 210, 1370);
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
  const shareToWechatFriend = () => {
    setShareHint("请点击微信右上角“…”并选择“发送给朋友”。");
  };
  const showMomentsGuide = () => {
    setShareHint(
      "请长按上方海报保存到相册，再打开朋友圈选择这张图片发布。微信内也可点击右上角“…”分享到朋友圈。",
    );
  };
  const shareMatchInvite = () => {
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
    url.searchParams.set("invite", "ready");
    window.location.assign(url.toString());
  };
  const beginInvitedQuiz = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("invite");
    window.location.replace(url.toString());
  };

  if (inviteShareReady && inviterProfile)
    return (
      <main className="invite-share-page">
        <nav>
          <div className="brand">
            <LoveMark /> 爱的五种语言
          </div>
          <div className="nav-note">双向关系自测</div>
        </nav>
        <section className="invite-share-card">
          <div className="invite-share-icon">↗</div>
          <p>LOVE, TOGETHER</p>
          <h1>邀请链接已经准备好了</h1>
          <strong>请点击微信右上角“…”并选择“发送给朋友”</strong>
          <span>
            好友打开后完成同一组测试，就会生成你们的双向爱语默契度与相处指南。
          </span>
          <div className="invite-share-divider" />
          <small>如果你是收到邀请的人</small>
          <button className="primary" onClick={beginInvitedQuiz}>
            开始我的测试 <span>→</span>
          </button>
        </section>
      </main>
    );

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
              有些人需要一句明确的“我爱你”，有些人需要对方坐下来认真听自己说话；有人会为一份被惦记的小礼物心动，也有人在实际照顾或一个拥抱里感到安心。
            </p>
            {inviterProfile && (
              <div className="invite-arrived">
                <b>TA 已经完成测试</b>
                <span>
                  现在轮到你。完成后即可查看你们的双向默契度与相处指南。
                </span>
              </div>
            )}
            {hasSavedProgress && (
              <div className="resume-notice">
                <div>
                  <b>上次答到了第 {index + 1} 题</b>
                  <span>进度只保存在这台设备，不会上传逐题答案。</span>
                </div>
                <button type="button" onClick={beginFreshQuiz}>
                  重新开始
                </button>
              </div>
            )}
            <button className="primary" onClick={startQuiz}>
              {hasSavedProgress ? "继续上次测试" : "开始探索"}
            </button>
            <div className="meta">
              <span>30 道情境三选一</span>
              <i />
              <span>约 5 分钟</span>
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
              <div key={k} className={`orbit-slot slot-${i}`}>
                <div className={`orbit-tag tag-${i}`}>
                  <b>{LOVE[k].short}</b>
                  <span>{LOVE[k].name}</span>
                </div>
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
              ? "第一部分 · 你期待怎样被爱"
              : "第二部分 · 你习惯怎样去爱"}
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
            aria-label="请选择更符合你的一项，也可以选择两种都不符合"
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
            <button
              type="button"
              aria-pressed={answers[index] === "none"}
              className={`neutral-choice ${answers[index] === "none" ? "selected" : ""}`}
              onClick={() => choose("none")}
            >
              <small>C</small>
              <strong>
                {q.mode === "receive"
                  ? "这两种都不太能打动我。"
                  : "这两种都不是我常用的表达方式。"}
              </strong>
              <span>选择这一项 →</span>
            </button>
          </div>
          <p className="choice-note">
            {q.mode === "receive"
              ? "选择在真实生活里更容易打动你的那一个"
              : "回想最近一个月，选择你更经常、也更自然会做的那一个"}
          </p>
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
  const personalResult = PERSONAL_RESULT[`${receive[0].key}-${give[0].key}`];
  const resultLowSignal =
    receive.reduce((sum, item) => sum + item.score, 0) <= 7 ||
    give.reduce((sum, item) => sum + item.score, 0) <= 7 ||
    receive[0].score <= 2 ||
    give[0].score <= 2;
  const relationshipTitle = resultLowSignal
    ? "这次结果更像一张情境地图，而不是单一标签。"
    : hasTiedCore
      ? "你的核心偏好不止一种。"
      : personalResult.title;
  const relationshipCopy = resultLowSignal
    ? "你明确选择了较多“都不符合”。你感受和表达爱，可能更取决于对象、关系阶段与当下情境，也可能有测试尚未覆盖的重要方式。"
    : hasTiedCore
      ? `你在${receiveLeaders.length > 1 ? "接收爱" : "表达爱"}的方向上出现并列核心偏好。它们同样重要，不需要从中强行挑出一个代表你。`
      : personalResult.body;
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
          onCreatePoster={createMatchPoster}
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
              <div className="share-channels">
                <button onClick={shareToWechatFriend}>
                  <span className="channel-icon friend-icon" aria-hidden="true">
                    <svg viewBox="0 0 32 32">
                      <path d="M14 7C8.5 7 4 10.4 4 14.6c0 2.3 1.4 4.4 3.6 5.8l-.8 3 3.5-1.7c1.2.3 2.4.5 3.7.5 5.5 0 10-3.4 10-7.6S19.5 7 14 7Z" />
                      <path d="M19.3 13.2c4.8 0 8.7 3 8.7 6.8 0 2-1.1 3.8-3 5.1l.7 2.5-3-1.4c-1.1.3-2.2.4-3.4.4-4.8 0-8.7-3-8.7-6.7" />
                    </svg>
                  </span>
                  <span>微信好友</span>
                </button>
                <button onClick={showMomentsGuide}>
                  <span
                    className="channel-icon moments-icon"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="10.5" />
                      <path d="M16 5.5 20.2 16 16 26.5 11.8 16 16 5.5ZM5.5 16 16 11.8 26.5 16 16 20.2 5.5 16Z" />
                    </svg>
                  </span>
                  <span>朋友圈</span>
                </button>
              </div>
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
