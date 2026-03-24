import { AppraisalStatus, Prisma, Role } from "@prisma/client";

import {
  calculateAverage,
  clampScale,
  defaultSkillRows,
  ensureKraRows,
  getCurrentStageLabel,
  getSubmitLabelForRole,
  normalizeSectionAnswers,
  roundTo,
} from "@/lib/appraisal";
import { generatePerformanceAnalysis } from "@/lib/gemini";
import type {
  ActorSummary,
  AppraisalDetail,
  AppraisalListItem,
  AppraisalMutationPayload,
  AppraisalPermissions,
  DashboardData,
  DashboardFilters,
  MetricCardData,
  PageInfo,
  PaginatedCollection,
  SessionUserSummary,
  TeamProgressRow,
  TeamStatusItem,
  TeamSummary,
} from "@/lib/types";

import { prisma } from "@/lib/prisma";

const appraisalInclude = Prisma.validator<Prisma.AppraisalInclude>()({
  cycle: true,
  team: {
    include: {
      manager: true,
      members: true,
    },
  },
  employee: {
    include: {
      manager: true,
      team: true,
    },
  },
  manager: {
    include: {
      team: true,
    },
  },
  ceo: true,
  kras: {
    orderBy: {
      displayOrder: "asc",
    },
  },
  skillRatings: {
    orderBy: {
      displayOrder: "asc",
    },
  },
});

const appraisalListInclude = Prisma.validator<Prisma.AppraisalInclude>()({
  cycle: true,
  team: true,
  employee: true,
  manager: true,
});

const userInclude = Prisma.validator<Prisma.UserInclude>()({
  team: true,
  employee: {
    include: {
      team: true,
      manager: true,
    },
  },
});

type AppraisalRecord = Prisma.AppraisalGetPayload<{
  include: typeof appraisalInclude;
}>;

type AppraisalListRecord = Prisma.AppraisalGetPayload<{
  include: typeof appraisalListInclude;
}>;

type AuthUserRecord = Prisma.UserGetPayload<{
  include: typeof userInclude;
}>;

type DashboardQueryOptions = {
  query?: string;
  visiblePage?: number;
  pendingPage?: number;
  teamStatusPage?: number;
  topPerformersPage?: number;
};

const DASHBOARD_PAGE_SIZES = {
  visibleAppraisals: 8,
  pendingAppraisals: 6,
  teamMemberStatuses: 8,
  topPerformers: 5,
} as const;

export class UserContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserContextError";
  }
}

export function isUserContextError(error: unknown): error is UserContextError {
  return error instanceof UserContextError;
}

function toNumber(value: Prisma.Decimal | null) {
  return value ? Number(value) : null;
}

function serializeActor(employee: {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  designation: string;
  department: string;
  role: Role;
  teamId: string | null;
  team?: { name: string } | null;
  manager?: { fullName: string } | null;
}): ActorSummary {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    email: employee.email,
    designation: employee.designation,
    department: employee.department,
    role: employee.role,
    teamId: employee.teamId ?? null,
    teamName: employee.team?.name ?? null,
    managerName: employee.manager?.fullName ?? null,
  };
}

function serializeViewer(user: AuthUserRecord): SessionUserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    teamId: user.teamId ?? null,
    teamName: user.team?.name ?? user.employee?.team?.name ?? null,
    employeeId: user.employeeId ?? null,
  };
}

function serializeTeam(team: {
  id: string;
  name: string;
  manager?: { fullName: string } | null;
  members?: Array<{ id: string }>;
}): TeamSummary {
  return {
    id: team.id,
    name: team.name,
    managerName: team.manager?.fullName ?? null,
    memberCount: team.members?.length ?? 0,
  };
}

function serializeAppraisalListItem(appraisal: AppraisalListRecord): AppraisalListItem {
  return {
    id: appraisal.id,
    employeeId: appraisal.employeeId,
    employeeName: appraisal.employee.fullName,
    employeeCode: appraisal.employee.employeeCode,
    teamName: appraisal.team.name,
    managerName: appraisal.manager?.fullName ?? null,
    cycleId: appraisal.cycleId,
    cycleName: appraisal.cycle.name,
    appraisalType: appraisal.type,
    appraisalPeriod: appraisal.appraisalPeriod,
    status: appraisal.status,
    finalRating: toNumber(appraisal.finalRating),
    hikePercentage: toNumber(appraisal.hikePercentage),
    sentimentLabel: appraisal.sentimentLabel,
    updatedAt: appraisal.updatedAt.toISOString(),
  };
}

function serializeTeamStatusItem(appraisal: AppraisalListRecord): TeamStatusItem {
  return {
    employeeName: appraisal.employee.fullName,
    employeeCode: appraisal.employee.employeeCode,
    appraisalType: appraisal.type,
    appraisalPeriod: appraisal.appraisalPeriod,
    status: appraisal.status,
    updatedAt: appraisal.updatedAt.toISOString(),
  };
}

function parseQuestionAnswers(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) {
    return normalizeSectionAnswers(undefined);
  }

  return normalizeSectionAnswers(
    value.map((item) => ({
      question: typeof item === "object" && item && "question" in item ? String(item.question) : "",
      answer: typeof item === "object" && item && "answer" in item ? String(item.answer) : "",
    })),
  );
}

function parseStringArray(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item)).filter(Boolean);
}

function parseManagerReview(value: Prisma.JsonValue | null | undefined, managerOverallRating: number | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      overallRating: managerOverallRating,
      comments: "",
    };
  }

  return {
    overallRating:
      "overallRating" in value && value.overallRating !== null ? Number(value.overallRating) : managerOverallRating,
    comments:
      "comments" in value
        ? String(value.comments ?? "")
        : "recommendations" in value
          ? String(value.recommendations ?? "")
          : "",
  };
}

function parseCeoReview(value: Prisma.JsonValue | null | undefined, finalRating: number | null, hikePercentage: number | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      comments: "",
      finalRating,
      hikePercentage,
    };
  }

  return {
    comments: "comments" in value ? String(value.comments ?? "") : "",
    finalRating: "finalRating" in value && value.finalRating !== null ? Number(value.finalRating) : finalRating,
    hikePercentage:
      "hikePercentage" in value && value.hikePercentage !== null ? Number(value.hikePercentage) : hikePercentage,
  };
}

async function getUserOrThrow(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userInclude,
  });

  if (!user) {
    throw new UserContextError("User not found.");
  }

  return user;
}

function getEmployeeProfileOrThrow(user: AuthUserRecord) {
  if (!user.employee) {
    throw new UserContextError("This account is not linked to an employee profile.");
  }

  return user.employee;
}

function isAllowedToView(user: AuthUserRecord, appraisal: AppraisalRecord) {
  if (user.role === Role.CEO) {
    return true;
  }

  if (user.role === Role.MANAGER) {
    return Boolean(user.teamId) && appraisal.teamId === user.teamId;
  }

  return Boolean(user.employeeId) && appraisal.employeeId === user.employeeId;
}

function canSave(user: AuthUserRecord, appraisal: AppraisalRecord) {
  if (user.role === Role.EMPLOYEE) {
    return appraisal.employeeId === user.employeeId && appraisal.status === AppraisalStatus.DRAFT;
  }

  if (user.role === Role.MANAGER) {
    return (
      appraisal.managerId === user.employeeId &&
      (appraisal.status === AppraisalStatus.SUBMITTED || appraisal.status === AppraisalStatus.DRAFT)
    );
  }

  if (user.role === Role.CEO) {
    return appraisal.status === AppraisalStatus.MANAGER_REVIEW;
  }

  return false;
}

function canSubmit(user: AuthUserRecord, appraisal: AppraisalRecord) {
  if (user.role === Role.MANAGER) {
    return appraisal.managerId === user.employeeId && appraisal.status === AppraisalStatus.SUBMITTED;
  }
  return canSave(user, appraisal);
}

function buildPermissions(user: AuthUserRecord, appraisal: AppraisalRecord): AppraisalPermissions {
  const saveAllowed = canSave(user, appraisal);
  const submitAllowed = canSubmit(user, appraisal);

  return {
    canSave: saveAllowed,
    canSubmit: submitAllowed,
    canEditEmployeeSection: saveAllowed && user.role === Role.EMPLOYEE && appraisal.status === AppraisalStatus.DRAFT,
    canEditManagerSection: saveAllowed && user.role === Role.MANAGER && appraisal.status === AppraisalStatus.SUBMITTED,
    canEditCEOSection: saveAllowed && user.role === Role.CEO && appraisal.status === AppraisalStatus.MANAGER_REVIEW,
    canEditKRASection: saveAllowed && (user.role === Role.EMPLOYEE || user.role === Role.MANAGER),
    currentStageLabel: getCurrentStageLabel(appraisal.status),
    nextActionLabel: submitAllowed ? getSubmitLabelForRole(user.role) : null,
  };
}

function normalizePage(value?: number) {
  if (!value || !Number.isFinite(value) || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

function normalizeDashboardFilters(options?: DashboardQueryOptions): DashboardFilters {
  return {
    query: options?.query?.trim() ?? "",
    visiblePage: normalizePage(options?.visiblePage),
    pendingPage: normalizePage(options?.pendingPage),
    teamStatusPage: normalizePage(options?.teamStatusPage),
    topPerformersPage: normalizePage(options?.topPerformersPage),
  };
}

function createPageInfo(page: number, pageSize: number, totalItems: number): PageInfo {
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 1;
  const currentPage = Math.min(Math.max(1, page), totalPages);

  return {
    page: currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  };
}

function combineWhere(...conditions: Array<Prisma.AppraisalWhereInput | undefined>): Prisma.AppraisalWhereInput {
  const validConditions = conditions.filter(Boolean) as Prisma.AppraisalWhereInput[];

  if (!validConditions.length) {
    return {};
  }

  if (validConditions.length === 1) {
    return validConditions[0]!;
  }

  return {
    AND: validConditions,
  };
}

function buildAppraisalSearchWhere(query: string): Prisma.AppraisalWhereInput | undefined {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return undefined;
  }

  return {
    OR: [
      {
        employee: {
          is: {
            fullName: { contains: trimmedQuery, mode: "insensitive" },
          },
        },
      },
      {
        employee: {
          is: {
            employeeCode: { contains: trimmedQuery, mode: "insensitive" },
          },
        },
      },
      {
        team: {
          is: {
            name: { contains: trimmedQuery, mode: "insensitive" },
          },
        },
      },
      {
        cycle: {
          is: {
            name: { contains: trimmedQuery, mode: "insensitive" },
          },
        },
      },
      {
        manager: {
          is: {
            fullName: { contains: trimmedQuery, mode: "insensitive" },
          },
        },
      },
      {
        appraisalPeriod: {
          contains: trimmedQuery,
          mode: "insensitive",
        },
      },
    ],
  };
}

async function paginateAppraisalCollection<TItem>({
  where,
  page,
  pageSize,
  orderBy,
  serialize,
}: {
  where: Prisma.AppraisalWhereInput;
  page: number;
  pageSize: number;
  orderBy: Prisma.AppraisalOrderByWithRelationInput | Prisma.AppraisalOrderByWithRelationInput[];
  serialize: (appraisal: AppraisalListRecord) => TItem;
}): Promise<PaginatedCollection<TItem>> {
  const totalItems = await prisma.appraisal.count({ where });
  const pageInfo = createPageInfo(page, pageSize, totalItems);
  const records =
    totalItems > 0
      ? await prisma.appraisal.findMany({
          where,
          include: appraisalListInclude,
          orderBy,
          skip: (pageInfo.page - 1) * pageSize,
          take: pageSize,
        })
      : [];

  return {
    items: records.map((item) => serialize(item)),
    pageInfo,
  };
}

async function buildStatusCounts(where: Prisma.AppraisalWhereInput) {
  const groupedCounts = await prisma.appraisal.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });

  const counts = {
    total: 0,
    draft: 0,
    submitted: 0,
    managerReview: 0,
    completed: 0,
  };

  groupedCounts.forEach((item) => {
    counts.total += item._count._all;

    if (item.status === AppraisalStatus.DRAFT) {
      counts.draft = item._count._all;
    }

    if (item.status === AppraisalStatus.SUBMITTED) {
      counts.submitted = item._count._all;
    }

    if (item.status === AppraisalStatus.MANAGER_REVIEW) {
      counts.managerReview = item._count._all;
    }

    if (item.status === AppraisalStatus.COMPLETED) {
      counts.completed = item._count._all;
    }
  });

  return counts;
}

async function buildTeamSummary(where: Prisma.AppraisalWhereInput): Promise<TeamProgressRow[]> {
  const [grouped, completedGrouped] = await Promise.all([
    prisma.appraisal.groupBy({
      by: ["teamId"],
      where,
      _count: { _all: true },
      _avg: { finalRating: true },
    }),
    prisma.appraisal.groupBy({
      by: ["teamId"],
      where: combineWhere(where, { status: AppraisalStatus.COMPLETED }),
      _count: { _all: true },
    }),
  ]);

  if (!grouped.length) {
    return [];
  }

  const teams = await prisma.team.findMany({
    where: {
      id: {
        in: grouped.map((item) => item.teamId),
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const teamNames = new Map(teams.map((team) => [team.id, team.name]));
  const completedCounts = new Map(completedGrouped.map((item) => [item.teamId, item._count._all]));

  return grouped
    .map((item) => {
      const completedCount = completedCounts.get(item.teamId) ?? 0;

      return {
        teamName: teamNames.get(item.teamId) ?? "Unknown Team",
        totalAppraisals: item._count._all,
        completedCount,
        pendingCount: item._count._all - completedCount,
        averageFinalRating: calculateAverage([toNumber(item._avg.finalRating)]),
      };
    })
    .sort((left, right) => left.teamName.localeCompare(right.teamName));
}

function buildMetrics(
  user: AuthUserRecord,
  counts: Awaited<ReturnType<typeof buildStatusCounts>>,
  budgetImpact: DashboardData["budgetImpact"],
): MetricCardData[] {
  if (user.role === Role.EMPLOYEE) {
    return [
      {
        label: "My Appraisals",
        value: String(counts.total),
        detail: "Work and salary appraisals assigned to you.",
      },
      {
        label: "Draft",
        value: String(counts.draft),
        detail: "Appraisals still editable by you.",
      },
      {
        label: "Pending",
        value: String(counts.submitted),
        detail: "Submitted and awaiting manager review.",
      },
      {
        label: "Final",
        value: String(counts.completed),
        detail: "Appraisals finalized by the CEO.",
      },
    ];
  }

  if (user.role === Role.MANAGER) {
    return [
      {
        label: "Team Reviews",
        value: String(counts.total),
        detail: "Appraisals in your team portfolio.",
      },
      {
        label: "Pending Reviews",
        value: String(counts.submitted),
        detail: "Employee submissions awaiting your review.",
      },
      {
        label: "Reviewed",
        value: String(counts.managerReview),
        detail: "Manager-reviewed appraisals ready for the CEO.",
      },
      {
        label: "Completed",
        value: String(counts.completed),
        detail: "Finalized appraisals in your team.",
      },
    ];
  }

  return [
    {
      label: "Enterprise Appraisals",
      value: String(counts.total),
      detail: "All appraisals across teams and cycles.",
    },
    {
      label: "Pending Final",
      value: String(counts.managerReview),
      detail: "Manager-reviewed appraisals awaiting final decision.",
    },
    {
      label: "Completed",
      value: String(counts.completed),
      detail: "CEO finalized appraisals.",
    },
    {
      label: "Budget Impact",
      value: `${budgetImpact ? budgetImpact.totalHikePercentage.toFixed(1) : "0.0"}%`,
      detail: "Aggregate approved hike percentage.",
    },
  ];
}

export async function getDashboardData(userId: string, options?: DashboardQueryOptions): Promise<DashboardData> {
  const user = await getUserOrThrow(userId);
  const actor = serializeActor(getEmployeeProfileOrThrow(user));
  const filters = normalizeDashboardFilters(options);
  const searchWhere = buildAppraisalSearchWhere(filters.query);

  const scope: Prisma.AppraisalWhereInput =
    user.role === Role.CEO
      ? {}
      : user.role === Role.MANAGER
        ? { teamId: user.teamId ?? "__missing_team__" }
        : { employeeId: user.employeeId ?? "__missing_employee__" };

  const visibleWhere = combineWhere(scope, searchWhere);
  const pendingWhere = combineWhere(
    scope,
    searchWhere,
    user.role === Role.EMPLOYEE
      ? { status: { not: AppraisalStatus.COMPLETED } }
      : user.role === Role.MANAGER
        ? { status: { in: [AppraisalStatus.SUBMITTED, AppraisalStatus.DRAFT] } }
        : { status: AppraisalStatus.MANAGER_REVIEW },
  );
  const teamStatusWhere =
    user.role === Role.EMPLOYEE && user.teamId
      ? combineWhere(
          { teamId: user.teamId, employeeId: { not: user.employeeId ?? "__missing_employee__" } },
          searchWhere,
        )
      : { employeeId: "__no_results__" };
  const topPerformersWhere = combineWhere(scope, searchWhere, {
    status: AppraisalStatus.COMPLETED,
    finalRating: { not: null },
  });
  const budgetImpactWhere = combineWhere(scope, {
    type: "SALARY",
    status: AppraisalStatus.COMPLETED,
    hikePercentage: { not: null },
  });

  const [counts, visibleAppraisals, pendingAppraisals, teamMemberStatuses, topPerformers, teamSummary, budgetAggregate] =
    await Promise.all([
      buildStatusCounts(scope),
      paginateAppraisalCollection({
        where: visibleWhere,
        page: filters.visiblePage,
        pageSize: DASHBOARD_PAGE_SIZES.visibleAppraisals,
        orderBy: [{ updatedAt: "desc" }],
        serialize: serializeAppraisalListItem,
      }),
      paginateAppraisalCollection({
        where: pendingWhere,
        page: filters.pendingPage,
        pageSize: DASHBOARD_PAGE_SIZES.pendingAppraisals,
        orderBy: [{ updatedAt: "desc" }],
        serialize: serializeAppraisalListItem,
      }),
      paginateAppraisalCollection({
        where: teamStatusWhere,
        page: filters.teamStatusPage,
        pageSize: DASHBOARD_PAGE_SIZES.teamMemberStatuses,
        orderBy: [{ updatedAt: "desc" }],
        serialize: serializeTeamStatusItem,
      }),
      paginateAppraisalCollection({
        where: topPerformersWhere,
        page: filters.topPerformersPage,
        pageSize: DASHBOARD_PAGE_SIZES.topPerformers,
        orderBy: [{ finalRating: "desc" }, { updatedAt: "desc" }],
        serialize: serializeAppraisalListItem,
      }),
      buildTeamSummary(scope),
      prisma.appraisal.aggregate({
        where: budgetImpactWhere,
        _count: { _all: true },
        _sum: { hikePercentage: true },
        _avg: { hikePercentage: true },
      }),
    ]);

  const budgetImpact =
    budgetAggregate._count._all > 0
      ? {
          appraisalCount: budgetAggregate._count._all,
          totalHikePercentage: roundTo(toNumber(budgetAggregate._sum.hikePercentage) ?? 0),
          averageHikePercentage: roundTo(toNumber(budgetAggregate._avg.hikePercentage) ?? 0),
        }
      : null;

  return {
    viewer: serializeViewer(user),
    actor,
    filters,
    metrics: buildMetrics(user, counts, budgetImpact),
    visibleAppraisals,
    pendingAppraisals,
    teamMemberStatuses,
    teamSummary,
    topPerformers,
    budgetImpact,
  };
}

export async function getAppraisalDetail(userId: string, appraisalId: string): Promise<AppraisalDetail | null> {
  const user = await getUserOrThrow(userId);
  const appraisal = await prisma.appraisal.findUnique({
    where: { id: appraisalId },
    include: appraisalInclude,
  });

  if (!appraisal || !isAllowedToView(user, appraisal)) {
    return null;
  }

  return {
    id: appraisal.id,
    type: appraisal.type,
    appraisalPeriod: appraisal.appraisalPeriod,
    status: appraisal.status,
    cycle: {
      id: appraisal.cycle.id,
      name: appraisal.cycle.name,
      appraisalType: appraisal.cycle.appraisalType,
      periodLabel: appraisal.cycle.periodLabel,
      startDate: appraisal.cycle.startDate.toISOString(),
      endDate: appraisal.cycle.endDate.toISOString(),
      isActive: appraisal.cycle.isActive,
    },
    employee: serializeActor(appraisal.employee),
    manager: appraisal.manager ? serializeActor(appraisal.manager) : null,
    ceo: appraisal.ceo ? serializeActor(appraisal.ceo) : null,
    team: serializeTeam(appraisal.team),
    sectionOneAnswers: parseQuestionAnswers(appraisal.sectionOneAnswers),
    kras: ensureKraRows(
      appraisal.kras.map((item) => ({
        id: item.id,
        objective: item.objective,
        weightage: Number(item.weightage),
        appraiseeRating: toNumber(item.appraiseeRating),
        appraiserRating: toNumber(item.appraiserRating),
        comments: item.comments ?? "",
        displayOrder: item.displayOrder,
      })),
    ),
    skillRatings: defaultSkillRows(
      appraisal.skillRatings.map((item) => ({
        id: item.id,
        skillName: item.skillName,
        employeeRating: item.employeeRating,
        managerRating: item.managerRating,
        displayOrder: item.displayOrder,
      })),
    ),
    managerReview: parseManagerReview(appraisal.managerReview, toNumber(appraisal.managerOverallRating)),
    ceoReview: parseCeoReview(
      appraisal.ceoReview,
      toNumber(appraisal.finalRating),
      toNumber(appraisal.hikePercentage),
    ),
    finalRating: toNumber(appraisal.finalRating),
    hikePercentage: toNumber(appraisal.hikePercentage),
    aiSummary: appraisal.aiPerformanceSummary,
    sentimentLabel: appraisal.sentimentLabel,
    sentimentScore: toNumber(appraisal.sentimentScore),
    strengths: parseStringArray(appraisal.aiStrengths),
    weaknesses: parseStringArray(appraisal.aiWeaknesses),
    riskSignals: parseStringArray(appraisal.aiRiskSignals),
    permissions: buildPermissions(user, appraisal),
    employeeSubmittedAt: appraisal.employeeSubmittedAt?.toISOString() ?? null,
    managerSubmittedAt: appraisal.managerSubmittedAt?.toISOString() ?? null,
    ceoSubmittedAt: appraisal.ceoSubmittedAt?.toISOString() ?? null,
    updatedAt: appraisal.updatedAt.toISOString(),
  };
}

function validateRequiredForSubmit(role: Role, payload: AppraisalMutationPayload) {
  if (role === Role.EMPLOYEE) {
    if (
      !payload.sectionOneAnswers?.every((item) => item.answer.trim()) ||
      !payload.kras?.length ||
      !payload.skillRatings?.length
    ) {
      throw new Error("Employee submission requires all answers, KRAs, and skills.");
    }
  }

  if (role === Role.MANAGER) {
    if (!payload.managerReview?.comments?.trim() || payload.managerReview.overallRating === null) {
      throw new Error("Manager review requires comments and an overall rating.");
    }
  }

  if (role === Role.CEO) {
    if (payload.ceoReview?.finalRating === null || payload.ceoReview?.hikePercentage === null) {
      throw new Error("CEO decision requires a final rating and hike percentage.");
    }
  }
}

async function refreshAnalysis(appraisalId: string) {
  const appraisal = await prisma.appraisal.findUnique({
    where: { id: appraisalId },
    include: appraisalInclude,
  });

  if (!appraisal) {
    return;
  }

  const sectionText = parseQuestionAnswers(appraisal.sectionOneAnswers)
    .map((item) => `${item.question}: ${item.answer}`)
    .join(" ");
  const kraText = appraisal.kras
    .map(
      (item) =>
        `${item.objective}. Weight ${item.weightage}. Employee ${item.appraiseeRating ?? "n/a"}. Manager ${item.appraiserRating ?? "n/a"}. ${item.comments ?? ""}`,
    )
    .join(" ");
  const skillText = appraisal.skillRatings
    .map((item) => `${item.skillName}: employee ${item.employeeRating ?? "n/a"}, manager ${item.managerRating ?? "n/a"}`)
    .join(" ");
  const managerText = parseManagerReview(appraisal.managerReview, toNumber(appraisal.managerOverallRating)).comments;
  const ceoText = parseCeoReview(
    appraisal.ceoReview,
    toNumber(appraisal.finalRating),
    toNumber(appraisal.hikePercentage),
  ).comments;

  const analysis = await generatePerformanceAnalysis({
    employeeName: appraisal.employee.fullName,
    designation: appraisal.employee.designation,
    teamName: appraisal.team.name,
    appraisalType: appraisal.type,
    appraisalPeriod: appraisal.appraisalPeriod,
    fullText: [sectionText, kraText, skillText, managerText, ceoText].filter(Boolean).join(" "),
    managerOverallRating: toNumber(appraisal.managerOverallRating),
    finalRating: toNumber(appraisal.finalRating),
  });

  await prisma.appraisal.update({
    where: { id: appraisal.id },
    data: {
      aiPerformanceSummary: analysis.performanceSummary,
      sentimentLabel: analysis.sentimentLabel,
      sentimentScore: analysis.sentimentScore,
      aiStrengths: analysis.strengths,
      aiWeaknesses: analysis.weaknesses,
      aiRiskSignals: analysis.riskSignals,
      analyzedAt: new Date(),
    },
  });
}

export async function mutateAppraisal(userId: string, payload: AppraisalMutationPayload, mode: "save" | "submit") {
  const user = await getUserOrThrow(userId);
  const appraisal = await prisma.appraisal.findUnique({
    where: { id: payload.appraisalId },
    include: appraisalInclude,
  });

  if (!appraisal || !isAllowedToView(user, appraisal)) {
    throw new Error("Appraisal not found for this user.");
  }

  if (mode === "save" && !canSave(user, appraisal)) {
    throw new Error("This user cannot edit the current appraisal stage.");
  }

  if (mode === "submit" && !canSubmit(user, appraisal)) {
    throw new Error("This user cannot submit the current appraisal stage.");
  }

  if (mode === "submit") {
    validateRequiredForSubmit(user.role, payload);
  }

  await prisma.$transaction(async (tx) => {
    const data: Prisma.AppraisalUpdateInput = {};

    if (user.role === Role.EMPLOYEE) {
      data.sectionOneAnswers = normalizeSectionAnswers(payload.sectionOneAnswers) as Prisma.InputJsonValue;
      data.status = mode === "submit" ? AppraisalStatus.SUBMITTED : AppraisalStatus.DRAFT;
      data.employeeSubmittedAt = mode === "submit" ? new Date() : appraisal.employeeSubmittedAt;

      if (payload.kras) {
        await tx.kRA.deleteMany({ where: { appraisalId: appraisal.id } });
        await tx.kRA.createMany({
          data: ensureKraRows(payload.kras).map((item) => ({
            appraisalId: appraisal.id,
            objective: item.objective,
            weightage: item.weightage,
            appraiseeRating: item.appraiseeRating,
            appraiserRating: item.appraiserRating,
            comments: item.comments || null,
            displayOrder: item.displayOrder,
          })),
        });
      }

      if (payload.skillRatings) {
        await tx.skillRating.deleteMany({ where: { appraisalId: appraisal.id } });
        await tx.skillRating.createMany({
          data: defaultSkillRows(payload.skillRatings).map((item) => ({
            appraisalId: appraisal.id,
            skillName: item.skillName,
            employeeRating: item.employeeRating === null ? null : Math.round(item.employeeRating),
            managerRating: item.managerRating === null ? null : Math.round(item.managerRating),
            displayOrder: item.displayOrder,
          })),
        });
      }
    }

    if (user.role === Role.MANAGER) {
      const managerReview = {
        overallRating:
          payload.managerReview?.overallRating === null
            ? null
            : roundTo(clampScale(Number(payload.managerReview?.overallRating ?? 0), 0, 10)),
        comments: payload.managerReview?.comments?.trim() ?? "",
      };

      data.managerReview = managerReview as Prisma.InputJsonValue;
      data.managerOverallRating = managerReview.overallRating;
      data.status = mode === "submit" ? AppraisalStatus.MANAGER_REVIEW : appraisal.status;
      data.managerSubmittedAt = mode === "submit" ? new Date() : appraisal.managerSubmittedAt;

      if (payload.kras) {
        await tx.kRA.deleteMany({ where: { appraisalId: appraisal.id } });
        await tx.kRA.createMany({
          data: ensureKraRows(payload.kras).map((item) => ({
            appraisalId: appraisal.id,
            objective: item.objective,
            weightage: item.weightage,
            appraiseeRating: item.appraiseeRating,
            appraiserRating: item.appraiserRating,
            comments: item.comments || null,
            displayOrder: item.displayOrder,
          })),
        });
      }

      if (payload.skillRatings) {
        await tx.skillRating.deleteMany({ where: { appraisalId: appraisal.id } });
        await tx.skillRating.createMany({
          data: defaultSkillRows(payload.skillRatings).map((item) => ({
            appraisalId: appraisal.id,
            skillName: item.skillName,
            employeeRating: item.employeeRating === null ? null : Math.round(item.employeeRating),
            managerRating: item.managerRating === null ? null : Math.round(item.managerRating),
            displayOrder: item.displayOrder,
          })),
        });
      }
    }

    if (user.role === Role.CEO) {
      const finalRating =
        payload.ceoReview?.finalRating === null
          ? null
          : roundTo(clampScale(Number(payload.ceoReview?.finalRating ?? 0), 0, 10));
      const hikePercentage =
        payload.ceoReview?.hikePercentage === null
          ? null
          : roundTo(clampScale(Number(payload.ceoReview?.hikePercentage ?? 0), 0, 100));

      data.ceoReview = {
        comments: payload.ceoReview?.comments?.trim() ?? "",
        finalRating,
        hikePercentage,
      } as Prisma.InputJsonValue;
      data.finalRating = finalRating;
      data.hikePercentage = hikePercentage;
      data.status = mode === "submit" ? AppraisalStatus.COMPLETED : appraisal.status;
      data.ceoSubmittedAt = mode === "submit" ? new Date() : appraisal.ceoSubmittedAt;
    }

    await tx.appraisal.update({
      where: { id: appraisal.id },
      data,
    });
  });

  if (user.role !== Role.EMPLOYEE) {
    await refreshAnalysis(appraisal.id);
  }

  return getAppraisalDetail(userId, appraisal.id);
}
