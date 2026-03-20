import { AppraisalStatus, Role, SentimentLabel } from "@prisma/client";

import type {
  AppraisalDetail,
  AppraisalMutationPayload,
  AppraisalStatusValue,
  EditorState,
  KRAFormRow,
  PerformanceAnalysis,
  QuestionAnswer,
  RoleValue,
  SkillFormRow,
} from "@/lib/types";

export const SECTION_ONE_QUESTIONS = [
  "Describe your key achievements for this appraisal period.",
  "What measurable business impact did you create?",
  "Which responsibilities or initiatives did you own directly?",
  "How did you collaborate with your team or cross-functional stakeholders?",
  "Which challenges or blockers did you solve?",
  "What skills or capabilities did you improve?",
  "What support or focus areas do you need next cycle?",
];

export const DEFAULT_SKILLS = [
  "Technical Knowledge",
  "Communication",
  "Problem Solving",
  "Ownership",
  "Stakeholder Management",
];

export function roundTo(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

export function clampScale(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeSentimentScore(value: number) {
  return roundTo(clampScale(value, 0, 1));
}

export function getSentimentLabel(score: number) {
  if (score >= 0.78) {
    return SentimentLabel.POSITIVE;
  }

  if (score >= 0.58) {
    return SentimentLabel.NEUTRAL;
  }

  if (score >= 0.36) {
    return SentimentLabel.MIXED;
  }

  return SentimentLabel.CONCERNING;
}

export function getStatusBadgeLabel(status: AppraisalStatusValue) {
  switch (status) {
    case AppraisalStatus.DRAFT:
      return "Draft";
    case AppraisalStatus.SUBMITTED:
      return "Pending";
    case AppraisalStatus.MANAGER_REVIEW:
      return "Reviewed";
    case AppraisalStatus.COMPLETED:
      return "Completed";
    default:
      return status;
  }
}

export function getCurrentStageLabel(status: AppraisalStatusValue) {
  switch (status) {
    case AppraisalStatus.DRAFT:
      return "Employee Draft";
    case AppraisalStatus.SUBMITTED:
      return "Awaiting Manager Review";
    case AppraisalStatus.MANAGER_REVIEW:
      return "Awaiting CEO Decision";
    case AppraisalStatus.COMPLETED:
      return "Final Decision Completed";
    default:
      return status;
  }
}

export function getSubmitLabelForRole(role: RoleValue) {
  switch (role) {
    case Role.EMPLOYEE:
      return "Submit Appraisal";
    case Role.MANAGER:
      return "Submit Review";
    case Role.CEO:
      return "Finalize Appraisal";
    default:
      return null;
  }
}

export function getDefaultViewForRole(role: RoleValue) {
  switch (role) {
    case Role.EMPLOYEE:
      return "my-appraisal";
    case Role.MANAGER:
      return "team-reviews";
    case Role.CEO:
      return "ceo-panel";
    default:
      return "dashboard";
  }
}

export function normalizeSectionAnswers(input: QuestionAnswer[] | undefined) {
  return SECTION_ONE_QUESTIONS.map((question, index) => ({
    question,
    answer: input?.[index]?.answer?.trim() ?? "",
  }));
}

export function defaultSkillRows(existing?: SkillFormRow[]) {
  const mappedDefaults = DEFAULT_SKILLS.map((skillName, index) => ({
    id: existing?.find((item) => item.skillName === skillName)?.id,
    skillName,
    employeeRating: existing?.find((item) => item.skillName === skillName)?.employeeRating ?? null,
    managerRating: existing?.find((item) => item.skillName === skillName)?.managerRating ?? null,
    displayOrder: index,
  }));

  const customRows =
    existing
      ?.filter((item) => !DEFAULT_SKILLS.includes(item.skillName))
      .map((item, index) => ({
        ...item,
        displayOrder: mappedDefaults.length + index,
      })) ?? [];

  return [...mappedDefaults, ...customRows];
}

export function ensureKraRows(rows?: KRAFormRow[]) {
  if (rows?.length) {
    return rows.map((row, index) => ({
      ...row,
      objective: row.objective.trim(),
      weightage: roundTo(clampScale(Number(row.weightage), 0, 100)),
      appraiseeRating:
        row.appraiseeRating === null || Number.isNaN(Number(row.appraiseeRating))
          ? null
          : roundTo(clampScale(Number(row.appraiseeRating), 0, 10)),
      appraiserRating:
        row.appraiserRating === null || Number.isNaN(Number(row.appraiserRating))
          ? null
          : roundTo(clampScale(Number(row.appraiserRating), 0, 10)),
      comments: row.comments?.trim() ?? "",
      displayOrder: index,
    }));
  }

  return [
    {
      objective: "",
      weightage: 0,
      appraiseeRating: null,
      appraiserRating: null,
      comments: "",
      displayOrder: 0,
    },
  ];
}

export function calculateAverage(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => typeof value === "number");

  if (!filtered.length) {
    return null;
  }

  return roundTo(filtered.reduce((sum, value) => sum + value, 0) / filtered.length);
}

type FallbackAnalysisInput = {
  employeeName: string;
  designation: string;
  teamName: string;
  appraisalType: string;
  appraisalPeriod: string;
  fullText: string;
  managerOverallRating: number | null;
  finalRating: number | null;
};

function buildStrengths(text: string, rating: number | null) {
  const strengths = [];

  if (/(ownership|owned|led|lead|leadership)/i.test(text)) {
    strengths.push("Ownership and leadership");
  }
  if (/(collaborat|stakeholder|cross-functional)/i.test(text)) {
    strengths.push("Cross-functional collaboration");
  }
  if (/(delivery|execute|execution|reliability|quality)/i.test(text)) {
    strengths.push("Reliable execution");
  }
  if (rating !== null && rating >= 8) {
    strengths.push("Strong overall performance");
  }

  return strengths.length ? strengths.slice(0, 3) : ["Consistent contribution"];
}

function buildWeaknesses(text: string, rating: number | null) {
  const weaknesses = [];

  if (/(support|need help|guidance|improve)/i.test(text)) {
    weaknesses.push("Needs targeted development support");
  }
  if (/(delay|blocker|risk|slow)/i.test(text)) {
    weaknesses.push("Execution speed or dependency risks");
  }
  if (rating !== null && rating < 7) {
    weaknesses.push("Performance consistency needs improvement");
  }

  return weaknesses.length ? weaknesses.slice(0, 3) : ["No material weaknesses highlighted"];
}

function buildRiskSignals(text: string, rating: number | null) {
  const risks = [];

  if (/(burnout|overloaded|bandwidth)/i.test(text)) {
    risks.push("Bandwidth risk");
  }
  if (/(dependency|handoff|coordination)/i.test(text)) {
    risks.push("Dependency management risk");
  }
  if (rating !== null && rating < 6.5) {
    risks.push("Low rating warrants leadership follow-up");
  }

  return risks.length ? risks.slice(0, 3) : ["No major risk signal identified"];
}

export function buildFallbackAnalysis(input: FallbackAnalysisInput): PerformanceAnalysis {
  let sentimentScore = 0.58;

  if (input.finalRating !== null) {
    sentimentScore += (input.finalRating - 7) * 0.08;
  } else if (input.managerOverallRating !== null) {
    sentimentScore += (input.managerOverallRating - 7) * 0.07;
  }

  if (/(excellent|strong|high-impact|outstanding|reliable)/i.test(input.fullText)) {
    sentimentScore += 0.12;
  }

  if (/(concern|delay|risk|inconsistent|support needed)/i.test(input.fullText)) {
    sentimentScore -= 0.14;
  }

  const normalizedScore = normalizeSentimentScore(sentimentScore);
  const sentimentLabel = getSentimentLabel(normalizedScore);
  const strengths = buildStrengths(input.fullText, input.finalRating ?? input.managerOverallRating);
  const weaknesses = buildWeaknesses(input.fullText, input.finalRating ?? input.managerOverallRating);
  const riskSignals = buildRiskSignals(input.fullText, input.finalRating ?? input.managerOverallRating);

  return {
    performanceSummary: `${input.employeeName} completed the ${input.appraisalPeriod} ${input.appraisalType.toLowerCase()} appraisal as ${input.designation} in ${input.teamName}. The narrative shows a balanced view of delivery, ownership, and development needs across the review chain.`,
    sentimentLabel,
    sentimentScore: normalizedScore,
    strengths,
    weaknesses,
    riskSignals,
    source: "fallback",
  };
}

export function buildEditorState(detail: AppraisalDetail | null): EditorState {
  return {
    sectionOneAnswers: detail?.sectionOneAnswers ?? [],
    kras: detail?.kras ?? [],
    skillRatings: detail?.skillRatings ?? [],
    managerReview: detail?.managerReview ?? {
      overallRating: null,
      comments: "",
    },
    ceoReview: detail?.ceoReview ?? {
      comments: "",
      finalRating: null,
      hikePercentage: null,
    },
  };
}

export function buildMutationPayload(appraisalId: string, editor: EditorState): AppraisalMutationPayload {
  return {
    appraisalId,
    sectionOneAnswers: editor.sectionOneAnswers,
    kras: editor.kras.map((item, index) => ({
      ...item,
      displayOrder: index,
    })),
    skillRatings: editor.skillRatings.map((item, index) => ({
      ...item,
      displayOrder: index,
    })),
    managerReview: editor.managerReview,
    ceoReview: editor.ceoReview,
  };
}
