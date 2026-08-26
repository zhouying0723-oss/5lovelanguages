import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_RANKINGS,
  CORE_PAIRS,
  calculateBestRankings,
  chooseNextPair,
  createAnswer,
  getNextCoreQuestion,
  getNextTestStep,
  getPairStatus,
  scoreRanking,
  type Answer,
  type Choice,
  type Dimension,
  type Language,
  type Question,
} from "../app/adaptive-test.ts";

const question = (
  id: string,
  dimension: Dimension,
  order: number,
  a: Language,
  b: Language,
  isFollowUp = false,
): Question => ({
  id,
  dimension,
  storyOrder: order,
  optionALanguage: a,
  optionBLanguage: b,
  content: id,
  optionAText: a,
  optionBText: b,
  isFollowUp,
});

const answer = (
  id: string,
  dimension: Dimension,
  a: Language,
  b: Language,
  choice: Choice,
) => createAnswer(question(id, dimension, 1, a, b), choice);

const receiveCore = [
  question("R01", "receive", 1, "W", "Q"),
  question("R02", "receive", 2, "G", "A"),
  question("R03", "receive", 3, "T", "W"),
  question("R04", "receive", 4, "Q", "A"),
  question("R05", "receive", 5, "G", "T"),
  question("R06", "receive", 6, "Q", "G"),
  question("R07", "receive", 7, "A", "W"),
  question("R08", "receive", 8, "T", "Q"),
  question("R09", "receive", 9, "A", "T"),
  question("R10", "receive", 10, "W", "G"),
];
const giveCore = receiveCore.map((item, index) => ({
  ...item,
  id: `G${String(index + 1).padStart(2, "0")}`,
  dimension: "give" as const,
}));

test("generates all 120 complete rankings", () => {
  assert.equal(ALL_RANKINGS.length, 120);
  assert.equal(new Set(ALL_RANKINGS.map((item) => item.join(""))).size, 120);
});

test("core questions use the required ten pair mappings per dimension", () => {
  assert.deepEqual(CORE_PAIRS.receive, receiveCore.map((item) => [item.optionALanguage, item.optionBLanguage]));
  assert.deepEqual(CORE_PAIRS.give, [
    ["Q", "W"], ["A", "G"], ["W", "T"], ["A", "Q"], ["T", "G"],
    ["G", "Q"], ["W", "A"], ["Q", "T"], ["T", "A"], ["G", "W"],
  ]);
});

test("first question is R01", () => {
  const step = getNextTestStep([], [...receiveCore, ...giveCore], []);
  assert.equal(step.type, "question");
  if (step.type === "question") assert.equal(step.question.id, "R01");
});

test("choosing A records W before Q", () => {
  const result = createAnswer(receiveCore[0], "A");
  assert.equal(result.selectedLanguage, "W");
  assert.equal(result.rejectedLanguage, "Q");
  assert.equal(getPairStatus("W", "Q", calculateBestRankings([result]).bestRankings), "x_before_y");
});

test("choosing C creates no ordering evidence", () => {
  const result = createAnswer(receiveCore[0], "C");
  assert.equal(result.selectedLanguage, null);
  assert.equal(result.rejectedLanguage, null);
  assert.equal(scoreRanking(["W", "Q", "G", "A", "T"], [result]), 0);
  assert.equal(calculateBestRankings([result]).bestRankings.length, 120);
});

test("receive and give answers are isolated", () => {
  const giveAnswer = answer("G01", "give", "Q", "W", "A");
  const step = getNextTestStep([giveAnswer], [...receiveCore, ...giveCore], []);
  assert.equal(step.type, "question");
  if (step.type === "question") assert.equal(step.question.id, "R01");
});

test("transitively determined pairs are skipped", () => {
  const answers = [
    answer("one", "receive", "W", "Q", "A"),
    answer("two", "receive", "Q", "G", "A"),
  ];
  const rankings = calculateBestRankings(answers).bestRankings;
  const questions = [
    question("done", "receive", 1, "W", "Q"),
    question("inferred", "receive", 2, "W", "G"),
    question("next", "receive", 3, "A", "T"),
  ];
  const next = getNextCoreQuestion(questions, answers, rankings);
  assert.equal(next?.id, "next");
});

test("unresolved core questions retain story order", () => {
  const next = getNextCoreQuestion(
    [question("later", "receive", 9, "A", "T"), question("earlier", "receive", 2, "W", "G")],
    [],
    ALL_RANKINGS,
  );
  assert.equal(next?.id, "earlier");
});

test("cyclic evidence always retains best rankings", () => {
  const cyclic = [
    answer("1", "receive", "W", "Q", "A"),
    answer("2", "receive", "Q", "G", "A"),
    answer("3", "receive", "G", "W", "A"),
  ];
  assert.ok(calculateBestRankings(cyclic).bestRankings.length > 0);
});

test("follow-up selection chooses the most divisive pair", () => {
  const rankings: Language[][] = [
    ["W", "Q", "G", "A", "T"],
    ["Q", "W", "G", "A", "T"],
  ];
  assert.deepEqual(chooseNextPair(rankings, []), ["W", "Q"]);
});

test("same input always produces the same next pair", () => {
  assert.deepEqual(chooseNextPair(ALL_RANKINGS, []), chooseNextPair(ALL_RANKINGS, []));
});

test("13 answers stop the current dimension and partial rankings remain valid", () => {
  const receiveAnswers: Answer[] = Array.from({ length: 13 }, (_, index) =>
    answer(`RF-${index}`, "receive", "W", "Q", "C"),
  );
  const step = getNextTestStep(receiveAnswers, [...receiveCore, ...giveCore], []);
  assert.equal(step.type, "question");
  if (step.type === "question") assert.equal(step.dimension, "give");
});

test("C never contributes a language score", () => {
  const neutral = answer("neutral", "receive", "W", "Q", "C");
  for (const ranking of ALL_RANKINGS) assert.equal(scoreRanking(ranking, [neutral]), 0);
});
