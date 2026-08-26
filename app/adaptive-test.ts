export type Language = "W" | "Q" | "G" | "A" | "T";
export type Dimension = "receive" | "give";
export type Choice = "A" | "B" | "C";

export interface Question {
  id: string;
  dimension: Dimension;
  storyOrder: number;
  optionALanguage: Language;
  optionBLanguage: Language;
  content: string;
  optionAText: string;
  optionBText: string;
  isFollowUp?: boolean;
}

export interface Answer {
  questionId: string;
  dimension: Dimension;
  optionALanguage: Language;
  optionBLanguage: Language;
  choice: Choice;
  selectedLanguage: Language | null;
  rejectedLanguage: Language | null;
}

export interface LanguageResult {
  language: Language;
  averageRank: number;
  minRank: number;
  maxRank: number;
}

export interface RankingResult {
  bestScore: number;
  bestRankings: Language[][];
  languages: LanguageResult[];
  possiblePrimaryLanguages: Language[];
  isComplete: boolean;
}

export const LANGUAGES: Language[] = ["W", "Q", "G", "A", "T"];
export const CORE_PAIRS: Record<Dimension, Array<[Language, Language]>> = {
  receive: [
    ["W", "Q"], ["G", "A"], ["T", "W"], ["Q", "A"], ["G", "T"],
    ["Q", "G"], ["A", "W"], ["T", "Q"], ["A", "T"], ["W", "G"],
  ],
  give: [
    ["Q", "W"], ["A", "G"], ["W", "T"], ["A", "Q"], ["T", "G"],
    ["G", "Q"], ["W", "A"], ["Q", "T"], ["T", "A"], ["G", "W"],
  ],
};
const languageOrder = Object.fromEntries(
  LANGUAGES.map((language, index) => [language, index]),
) as Record<Language, number>;

function permutations(items: Language[]): Language[][] {
  if (items.length <= 1) return [items.slice()];
  return items.flatMap((item, index) =>
    permutations(items.filter((_, itemIndex) => itemIndex !== index)).map(
      (rest) => [item, ...rest],
    ),
  );
}

export const ALL_RANKINGS = permutations(LANGUAGES);

export function createAnswer(question: Question, choice: Choice): Answer {
  const selectedLanguage =
    choice === "A"
      ? question.optionALanguage
      : choice === "B"
        ? question.optionBLanguage
        : null;
  const rejectedLanguage =
    choice === "A"
      ? question.optionBLanguage
      : choice === "B"
        ? question.optionALanguage
        : null;
  return {
    questionId: question.id,
    dimension: question.dimension,
    optionALanguage: question.optionALanguage,
    optionBLanguage: question.optionBLanguage,
    choice,
    selectedLanguage,
    rejectedLanguage,
  };
}

export function scoreRanking(ranking: Language[], answers: Answer[]): number {
  const positions = Object.fromEntries(
    ranking.map((language, index) => [language, index]),
  ) as Record<Language, number>;
  return answers.reduce((score, answer) => {
    if (!answer.selectedLanguage || !answer.rejectedLanguage) return score;
    return (
      score +
      (positions[answer.selectedLanguage] < positions[answer.rejectedLanguage]
        ? 1
        : 0)
    );
  }, 0);
}

export function calculateBestRankings(answers: Answer[]): {
  bestScore: number;
  bestRankings: Language[][];
} {
  const scores = ALL_RANKINGS.map((ranking) => scoreRanking(ranking, answers));
  const bestScore = Math.max(...scores);
  return {
    bestScore,
    bestRankings: ALL_RANKINGS.filter((_, index) => scores[index] === bestScore),
  };
}

export function getPairStatus(
  x: Language,
  y: Language,
  bestRankings: Language[][],
): "x_before_y" | "y_before_x" | "unresolved" {
  if (!bestRankings.length) return "unresolved";
  const xBeforeY = bestRankings.filter(
    (ranking) => ranking.indexOf(x) < ranking.indexOf(y),
  ).length;
  if (xBeforeY === bestRankings.length) return "x_before_y";
  if (xBeforeY === 0) return "y_before_x";
  return "unresolved";
}

export function getNextCoreQuestion(
  questions: Question[],
  answers: Answer[],
  bestRankings: Language[][],
): Question | null {
  const answeredIds = new Set(answers.map((answer) => answer.questionId));
  return (
    questions
      .filter((question) => !question.isFollowUp && !answeredIds.has(question.id))
      .sort((a, b) => a.storyOrder - b.storyOrder)
      .find(
        (question) =>
          getPairStatus(
            question.optionALanguage,
            question.optionBLanguage,
            bestRankings,
          ) === "unresolved",
      ) ?? null
  );
}

export function normalizePair(x: Language, y: Language): string {
  return [x, y]
    .sort((a, b) => languageOrder[a] - languageOrder[b])
    .join("-");
}

export function chooseNextPair(
  bestRankings: Language[][],
  answers: Answer[],
  excludedPairs: Set<string> = new Set(),
): [Language, Language] | null {
  const candidates: Array<{
    pair: [Language, Language];
    entropy: number;
    topRelevance: number;
    askedCount: number;
  }> = [];
  for (let i = 0; i < LANGUAGES.length; i += 1) {
    for (let j = i + 1; j < LANGUAGES.length; j += 1) {
      const x = LANGUAGES[i];
      const y = LANGUAGES[j];
      if (excludedPairs.has(normalizePair(x, y))) continue;
      if (getPairStatus(x, y, bestRankings) !== "unresolved") continue;
      const xBeforeY = bestRankings.filter(
        (ranking) => ranking.indexOf(x) < ranking.indexOf(y),
      ).length;
      const p = xBeforeY / bestRankings.length;
      const entropy =
        p === 0 || p === 1
          ? 0
          : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
      const pairKey = normalizePair(x, y);
      const askedCount = answers.filter(
        (answer) =>
          normalizePair(answer.optionALanguage, answer.optionBLanguage) === pairKey,
      ).length;
      const topRelevance =
        bestRankings.filter(
          (ranking) => ranking.indexOf(x) <= 1 || ranking.indexOf(y) <= 1,
        ).length / bestRankings.length;
      candidates.push({
        pair: [x, y],
        entropy,
        topRelevance,
        askedCount,
      });
    }
  }
  candidates.sort(
    (a, b) =>
      b.entropy - a.entropy ||
      b.topRelevance - a.topRelevance ||
      a.askedCount - b.askedCount ||
      languageOrder[a.pair[0]] - languageOrder[b.pair[0]] ||
      languageOrder[a.pair[1]] - languageOrder[b.pair[1]],
  );
  return candidates[0]?.pair ?? null;
}

export function calculateResult(answers: Answer[]): RankingResult {
  const { bestScore, bestRankings } = calculateBestRankings(answers);
  const languages = LANGUAGES.map((language) => {
    const ranks = bestRankings.map((ranking) => ranking.indexOf(language) + 1);
    return {
      language,
      averageRank: ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length,
      minRank: Math.min(...ranks),
      maxRank: Math.max(...ranks),
    };
  }).sort(
    (a, b) =>
      a.averageRank - b.averageRank ||
      languageOrder[a.language] - languageOrder[b.language],
  );
  return {
    bestScore,
    bestRankings,
    languages,
    possiblePrimaryLanguages: LANGUAGES.filter((language) =>
      bestRankings.some((ranking) => ranking[0] === language),
    ),
    isComplete: bestRankings.length === 1,
  };
}

export function reachedPairNeutralLimit(
  pair: [Language, Language],
  answers: Answer[],
): boolean {
  const key = normalizePair(...pair);
  return (
    answers.filter(
      (answer) =>
        answer.choice === "C" &&
        normalizePair(answer.optionALanguage, answer.optionBLanguage) === key,
    ).length >= 2
  );
}

export function getUnusedFollowUpQuestion(
  bank: Question[],
  dimension: Dimension,
  pair: [Language, Language],
  answers: Answer[],
): Question | null {
  const answeredIds = new Set(answers.map((answer) => answer.questionId));
  const key = normalizePair(...pair);
  return (
    bank.find(
      (question) =>
        question.dimension === dimension &&
        question.isFollowUp &&
        !answeredIds.has(question.id) &&
        normalizePair(question.optionALanguage, question.optionBLanguage) === key,
    ) ?? null
  );
}

export type TestStep =
  | { type: "question"; dimension: Dimension; question: Question }
  | { type: "result"; receive: RankingResult; give: RankingResult };

export function getNextTestStep(
  answers: Answer[],
  coreQuestions: Question[],
  followUpQuestions: Question[],
): TestStep {
  for (const dimension of ["receive", "give"] as Dimension[]) {
    const dimensionAnswers = answers.filter(
      (answer) => answer.dimension === dimension,
    );
    const result = calculateResult(dimensionAnswers);
    if (result.isComplete || dimensionAnswers.length >= 13) continue;
    const coreQuestion = getNextCoreQuestion(
      coreQuestions.filter((question) => question.dimension === dimension),
      dimensionAnswers,
      result.bestRankings,
    );
    if (coreQuestion)
      return { type: "question", dimension, question: coreQuestion };

    const excludedPairs = new Set<string>();
    while (true) {
      const pair = chooseNextPair(
        result.bestRankings,
        dimensionAnswers,
        excludedPairs,
      );
      if (!pair) break;
      if (reachedPairNeutralLimit(pair, dimensionAnswers)) {
        excludedPairs.add(normalizePair(...pair));
        continue;
      }
      const question = getUnusedFollowUpQuestion(
        followUpQuestions,
        dimension,
        pair,
        dimensionAnswers,
      );
      if (question) return { type: "question", dimension, question };
      excludedPairs.add(normalizePair(...pair));
    }
  }
  return {
    type: "result",
    receive: calculateResult(
      answers.filter((answer) => answer.dimension === "receive"),
    ),
    give: calculateResult(
      answers.filter((answer) => answer.dimension === "give"),
    ),
  };
}
