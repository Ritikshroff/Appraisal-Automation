import type { AppraisalStatus, AppraisalType, Role, SentimentLabel } from "@prisma/client";

export type RoleValue = `${Role}`;
export type AppraisalTypeValue = `${AppraisalType}`;
export type AppraisalStatusValue = `${AppraisalStatus}`;
export type SentimentLabelValue = `${SentimentLabel}`;

export type NavigationView = "dashboard" | "my-appraisal" | "team-reviews" | "ceo-panel";

export type MetricCardData = {
  label: string;
  value: string;
  detail: string;
};

export type QuestionAnswer = {
  question: string;
  answer: string;
};

export type KRAFormRow = {
  id?: string;
  objective: string;
  weightage: number;
  appraiseeRating: number | null;
  appraiserRating: number | null;
  comments: string;
  displayOrder: number;
};

export type SkillFormRow = {
  id?: string;
  skillName: string;
  employeeRating: number | null;
  managerRating: number | null;
  displayOrder: number;
};

export type SessionUserSummary = {
  id: string;
  name: string;
  email: string;
  role: RoleValue;
  teamId: string | null;
  teamName: string | null;
  employeeId: string | null;
};

export type ActorSummary = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  designation: string;
  department: string;
  role: RoleValue;
  teamId: string | null;
  teamName: string | null;
  managerName: string | null;
};

export type TeamSummary = {
  id: string;
  name: string;
  managerName: string | null;
  memberCount: number;
};

export type CycleSummary = {
  id: string;
  name: string;
  appraisalType: AppraisalTypeValue;
  periodLabel: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type AppraisalListItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  teamName: string;
  managerName: string | null;
  cycleId: string;
  cycleName: string;
  appraisalType: AppraisalTypeValue;
  appraisalPeriod: string;
  status: AppraisalStatusValue;
  finalRating: number | null;
  hikePercentage: number | null;
  sentimentLabel: SentimentLabelValue | null;
  updatedAt: string;
};

export type TeamStatusItem = {
  employeeName: string;
  employeeCode: string;
  appraisalType: AppraisalTypeValue;
  appraisalPeriod: string;
  status: AppraisalStatusValue;
  updatedAt: string;
};

export type TeamProgressRow = {
  teamName: string;
  totalAppraisals: number;
  completedCount: number;
  pendingCount: number;
  averageFinalRating: number | null;
};

export type BudgetImpact = {
  appraisalCount: number;
  totalHikePercentage: number;
  averageHikePercentage: number;
};

export type PageInfo = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type PaginatedCollection<T> = {
  items: T[];
  pageInfo: PageInfo;
};

export type DashboardFilters = {
  query: string;
  visiblePage: number;
  pendingPage: number;
  teamStatusPage: number;
  topPerformersPage: number;
};

export type DashboardData = {
  viewer: SessionUserSummary;
  actor: ActorSummary;
  metrics: MetricCardData[];
  filters: DashboardFilters;
  visibleAppraisals: PaginatedCollection<AppraisalListItem>;
  pendingAppraisals: PaginatedCollection<AppraisalListItem>;
  teamMemberStatuses: PaginatedCollection<TeamStatusItem>;
  teamSummary: TeamProgressRow[];
  topPerformers: PaginatedCollection<AppraisalListItem>;
  budgetImpact: BudgetImpact | null;
};

export type AppraisalPermissions = {
  canSave: boolean;
  canSubmit: boolean;
  canEditEmployeeSection: boolean;
  canEditManagerSection: boolean;
  canEditCEOSection: boolean;
  currentStageLabel: string;
  nextActionLabel: string | null;
};

export type AppraisalDetail = {
  id: string;
  type: AppraisalTypeValue;
  appraisalPeriod: string;
  status: AppraisalStatusValue;
  cycle: CycleSummary;
  employee: ActorSummary;
  manager: ActorSummary | null;
  ceo: ActorSummary | null;
  team: TeamSummary;
  sectionOneAnswers: QuestionAnswer[];
  kras: KRAFormRow[];
  skillRatings: SkillFormRow[];
  managerReview: {
    overallRating: number | null;
    comments: string;
  };
  ceoReview: {
    comments: string;
    finalRating: number | null;
    hikePercentage: number | null;
  };
  finalRating: number | null;
  hikePercentage: number | null;
  aiSummary: string | null;
  sentimentLabel: SentimentLabelValue | null;
  sentimentScore: number | null;
  strengths: string[];
  weaknesses: string[];
  riskSignals: string[];
  permissions: AppraisalPermissions;
  employeeSubmittedAt: string | null;
  managerSubmittedAt: string | null;
  ceoSubmittedAt: string | null;
  updatedAt: string;
};

export type TeamOption = {
  id: string;
  name: string;
};

export type SignUpState = {
  error: string | null;
};

export type PerformanceAnalysis = {
  performanceSummary: string;
  sentimentLabel: SentimentLabelValue;
  sentimentScore: number;
  strengths: string[];
  weaknesses: string[];
  riskSignals: string[];
  source: "openai" | "fallback";
};

export type EditorState = {
  sectionOneAnswers: QuestionAnswer[];
  kras: KRAFormRow[];
  skillRatings: SkillFormRow[];
  managerReview: {
    overallRating: number | null;
    comments: string;
  };
  ceoReview: {
    comments: string;
    finalRating: number | null;
    hikePercentage: number | null;
  };
};

export type AppraisalMutationPayload = {
  appraisalId: string;
  sectionOneAnswers?: QuestionAnswer[];
  kras?: KRAFormRow[];
  skillRatings?: SkillFormRow[];
  managerReview?: {
    overallRating: number | null;
    comments: string;
  };
  ceoReview?: {
    comments: string;
    finalRating: number | null;
    hikePercentage: number | null;
  };
};
