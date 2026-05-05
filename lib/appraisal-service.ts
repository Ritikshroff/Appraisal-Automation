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
  RoleValue,
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
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  view?: string;
};

const DASHBOARD_PAGE_SIZES = {
  visibleAppraisals: 8,
  pendingAppraisals: 6,
  teamMemberStatuses: 8,
  topPerformers: 5,
  employees: 10,
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

function toNumber(value: any) {
  if (value === null || value === undefined) return null;
  return Number(value);
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
  managerId: string | null;
  manager?: { fullName: string } | null;
  finalReviewerName?: string | null;
  doj?: Date | null;
  salary?: number | null;
  lastHike?: number | null;
  activeCycleName?: string | null;
  appraisalId?: string | null;
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
    managerId: employee.managerId ?? null,
    managerName: employee.manager?.fullName ?? null,
    finalReviewerName: employee.finalReviewerName ?? null,
    doj: employee.doj?.toISOString() ?? null,
    salary: employee.salary ?? null,
    lastHike: employee.lastHike ?? null,
    activeCycleName: employee.activeCycleName ?? null,
    appraisalId: employee.appraisalId ?? null,
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

function parseQuestionAnswers(value: any) {
  let data = value;
  if (typeof value === "string") {
    try {
      data = JSON.parse(value);
    } catch {
      data = null;
    }
  }

  if (!Array.isArray(data)) {
    return normalizeSectionAnswers(undefined);
  }

  return normalizeSectionAnswers(
    data.map((item: any) => ({
      question: typeof item === "object" && item && "question" in item ? String(item.question) : "",
      answer: typeof item === "object" && item && "answer" in item ? String(item.answer) : "",
    })),
  );
}

function parseStringArray(value: any) {
  let data = value;
  if (typeof value === "string") {
    try {
      data = JSON.parse(value);
    } catch {
      data = [];
    }
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item: any) => String(item)).filter(Boolean);
}

function parseManagerReview(value: any, managerOverallRating: number | null) {
  let data = value;
  if (typeof value === "string") {
    try {
      data = JSON.parse(value);
    } catch {
      data = null;
    }
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      overallRating: managerOverallRating,
      comments: "",
    };
  }

  return {
    overallRating:
      "overallRating" in data && data.overallRating !== null ? Number(data.overallRating) : managerOverallRating,
    comments:
      "comments" in data
        ? String(data.comments ?? "")
        : "recommendations" in data
          ? String(data.recommendations ?? "")
          : "",
  };
}

function parseCeoReview(value: any, finalRating: number | null, hikePercentage: number | null) {
  let data = value;
  if (typeof value === "string") {
    try {
      data = JSON.parse(value);
    } catch {
      data = null;
    }
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      comments: "",
      finalRating,
      hikePercentage,
    };
  }

  return {
    comments: "comments" in data ? String(data.comments ?? "") : "",
    finalRating: "finalRating" in data && data.finalRating !== null ? Number(data.finalRating) : finalRating,
    hikePercentage:
      "hikePercentage" in data && data.hikePercentage !== null ? Number(data.hikePercentage) : hikePercentage,
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
  if (user.role === Role.CEO || user.role === Role.HR) {
    return true;
  }

  // Can view own appraisal
  if (user.employeeId === appraisal.employeeId) {
    return true;
  }

  // Can view if they are the direct manager
  if (user.employeeId === appraisal.managerId) {
    return true;
  }

  // Can view if they are the manager of the team
  if (user.role === Role.MANAGER && user.teamId && appraisal.teamId === user.teamId) {
    return true;
  }

  return false;
}

function canSave(user: AuthUserRecord, appraisal: AppraisalRecord) {
  // Anyone can save their own appraisal if it's in DRAFT or SUBMITTED (resubmission allowed during window)
  if (user.employeeId === appraisal.employeeId && 
     (appraisal.status === AppraisalStatus.DRAFT || appraisal.status === AppraisalStatus.SUBMITTED)) {
    return true;
  }

  // Managers (including HR/CEO if they are the manager) can save their reports' appraisals
  if (user.employeeId === appraisal.managerId && 
     (appraisal.status === AppraisalStatus.SUBMITTED || appraisal.status === AppraisalStatus.DRAFT)) {
    return true;
  }

  // CEO specifically can save during final review
  if (user.role === Role.CEO && appraisal.status === AppraisalStatus.MANAGER_REVIEW) {
    return true;
  }

  return false;
}

function canSubmit(user: AuthUserRecord, appraisal: AppraisalRecord) {
  // Managers submitting their review
  if (user.employeeId === appraisal.managerId && appraisal.status === AppraisalStatus.SUBMITTED) {
    return true;
  }
  return canSave(user, appraisal);
}

function isInsideWindow(settings: { globalDeadlineStart: Date; globalDeadlineEnd: Date } | null) {
  if (!settings) return true;
  const now = new Date();
  return now >= settings.globalDeadlineStart && now <= settings.globalDeadlineEnd;
}

function buildPermissions(
  user: AuthUserRecord, 
  appraisal: AppraisalRecord, 
  settings: { globalDeadlineStart: Date; globalDeadlineEnd: Date } | null
): AppraisalPermissions {
  const windowOpen = isInsideWindow(settings);
  const saveAllowed = windowOpen && canSave(user, appraisal);
  const submitAllowed = windowOpen && canSubmit(user, appraisal);

  return {
    canSave: saveAllowed,
    canSubmit: submitAllowed,
    canEditEmployeeSection: saveAllowed && user.employeeId === appraisal.employeeId && (appraisal.status === AppraisalStatus.DRAFT || appraisal.status === AppraisalStatus.SUBMITTED),
    canEditManagerSection: saveAllowed && user.employeeId === appraisal.managerId && appraisal.status === AppraisalStatus.SUBMITTED,
    canEditCEOSection: saveAllowed && user.role === Role.CEO && appraisal.status === AppraisalStatus.MANAGER_REVIEW,
    canEditKRASection: saveAllowed && (user.employeeId === appraisal.employeeId || user.employeeId === appraisal.managerId),
    currentStageLabel: getCurrentStageLabel(appraisal.status),
    nextActionLabel: submitAllowed ? getSubmitLabelForRole(user.role as RoleValue) : null,
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
    sortBy: options?.sortBy,
    sortOrder: options?.sortOrder,
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
            fullName: { contains: trimmedQuery },
          },
        },
      },
      {
        employee: {
          is: {
            employeeCode: { contains: trimmedQuery },
          },
        },
      },
      {
        team: {
          is: {
            name: { contains: trimmedQuery },
          },
        },
      },
      {
        cycle: {
          is: {
            name: { contains: trimmedQuery },
          },
        },
      },
      {
        manager: {
          is: {
            fullName: { contains: trimmedQuery },
          },
        },
      },
      {
        appraisalPeriod: {
          contains: trimmedQuery,
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

async function paginateEmployeeCollection({
  where,
  page,
  pageSize,
  orderBy,
}: {
  where: Prisma.EmployeeWhereInput;
  page: number;
  pageSize: number;
  orderBy: Prisma.EmployeeOrderByWithRelationInput | Prisma.EmployeeOrderByWithRelationInput[];
}): Promise<PaginatedCollection<ActorSummary>> {
  const totalItems = await prisma.employee.count({ where });
  const pageInfo = createPageInfo(page, pageSize, totalItems);
  const ceo = await prisma.employee.findFirst({ where: { role: Role.CEO }, select: { fullName: true } });
  const records = totalItems > 0
    ? await prisma.employee.findMany({
        where,
        include: { 
          team: true, 
          manager: true,
          appraisals: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { cycle: true }
          }
        },
        orderBy,
        skip: (pageInfo.page - 1) * pageSize,
        take: pageSize,
      })
    : [];

  return {
    items: records.map((r) => serializeActor({ 
      ...r, 
      finalReviewerName: ceo?.fullName,
      activeCycleName: (r as any).appraisals?.[0]?.cycle?.name || "No Active Cycle",
      appraisalId: (r as any).appraisals?.[0]?.id || null
    })),
    pageInfo,
  };
}

function buildEmployeeSearchWhere(query: string): Prisma.EmployeeWhereInput | undefined {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return undefined;

  return {
    OR: [
      { fullName: { contains: trimmedQuery } },
      { employeeCode: { contains: trimmedQuery } },
      { email: { contains: trimmedQuery } },
      { department: { contains: trimmedQuery } },
    ],
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
    /*
    {
      label: "Budget Impact",
      value: `${budgetImpact ? budgetImpact.totalHikePercentage.toFixed(1) : "0.0"}%`,
      detail: "Aggregate approved hike percentage.",
    },
    */
  ];
}

export async function getDashboardData(userId: string, options?: DashboardQueryOptions): Promise<DashboardData> {
  const user = await getUserOrThrow(userId);
  const actor = serializeActor(getEmployeeProfileOrThrow(user));
  const filters = normalizeDashboardFilters(options);
  const searchWhere = buildAppraisalSearchWhere(filters.query);

  const view = options?.view || "dashboard";
  const scope: Prisma.AppraisalWhereInput =
    view === "my-appraisal"
      ? { employeeId: user.employeeId ?? "__missing_employee__" }
      : user.role === Role.CEO || user.role === Role.HR
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
  const budgetImpactWhere: Prisma.AppraisalWhereInput = combineWhere(scope, {
    type: "SALARY",
    status: AppraisalStatus.COMPLETED,
    hikePercentage: { not: null },
  });

  const employeeOrderBy: Prisma.EmployeeOrderByWithRelationInput = {};
  if (filters.sortBy === "name") {
    employeeOrderBy.fullName = filters.sortOrder || "asc";
  } else if (filters.sortBy === "department") {
    employeeOrderBy.department = filters.sortOrder || "asc";
  } else if (filters.sortBy === "employeeId") {
    employeeOrderBy.employeeCode = filters.sortOrder || "asc";
  } else {
    employeeOrderBy.fullName = "asc";
  }

  const [counts, visibleAppraisals, pendingAppraisals, teamMemberStatuses, hrRawData, topPerformers, teamSummary, budgetAggregate] =
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
      user.role === Role.HR
        ? Promise.all([
            paginateEmployeeCollection({
              where: buildEmployeeSearchWhere(filters.query) ?? {},
              page: filters.visiblePage,
              pageSize: DASHBOARD_PAGE_SIZES.employees,
              orderBy: employeeOrderBy,
            }),
            prisma.appraisalCycle.findMany({ where: { isActive: true } }),
            prisma.team.findMany({ include: { manager: true } }),
            prisma.systemSettings.findUnique({ where: { id: "GLOBAL" } }),
            prisma.employee.findMany({ select: { id: true, fullName: true }, orderBy: { fullName: 'asc' } }),
          ])
        : Promise.resolve(null),
      /*
      paginateAppraisalCollection({
        where: topPerformersWhere,
        page: filters.topPerformersPage,
        pageSize: DASHBOARD_PAGE_SIZES.topPerformers,
        orderBy: [{ finalRating: "desc" }, { updatedAt: "desc" }],
        serialize: serializeAppraisalListItem,
      }),
      */
      Promise.resolve({ items: [], pageInfo: createPageInfo(1, 1, 0) }),
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
    metrics: buildMetrics(user, counts, null),
    visibleAppraisals,
    pendingAppraisals,
    teamMemberStatuses,
    teamSummary: [],
    topPerformers: { items: [], pageInfo: createPageInfo(1, 1, 0) },
    budgetImpact: null,
    hrData: hrRawData
      ? {
          employees: hrRawData[0] as PaginatedCollection<ActorSummary>,
          activeCycles: (hrRawData[1] as any[]).map((c) => ({
            id: c.id,
            name: c.name,
            appraisalType: c.appraisalType,
            periodLabel: c.periodLabel,
            startDate: c.startDate.toISOString(),
            endDate: c.endDate.toISOString(),
            isActive: c.isActive,
          })),
          allTeams: hrRawData[2].map(serializeTeam),
          systemSettings: {
            globalDeadlineStart: (hrRawData[3]?.globalDeadlineStart ?? new Date()).toISOString(),
            globalDeadlineEnd: (hrRawData[3]?.globalDeadlineEnd ?? new Date()).toISOString(),
          },
          allEmployees: hrRawData[4] || [],
        }
      : null,
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

  const settings = await prisma.systemSettings.findUnique({ where: { id: "GLOBAL" } });
  const permissions = buildPermissions(user, appraisal, settings);

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
    permissions,
    employeeSubmittedAt: appraisal.employeeSubmittedAt?.toISOString() ?? null,
    managerSubmittedAt: appraisal.managerSubmittedAt?.toISOString() ?? null,
    ceoSubmittedAt: appraisal.ceoSubmittedAt?.toISOString() ?? null,
    deadlineAt: appraisal.deadlineAt?.toISOString() || null,
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
      aiStrengths: JSON.stringify(analysis.strengths),
      aiWeaknesses: JSON.stringify(analysis.weaknesses),
      aiRiskSignals: JSON.stringify(analysis.riskSignals),
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
      data.sectionOneAnswers = JSON.stringify(normalizeSectionAnswers(payload.sectionOneAnswers));
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

      data.managerReview = JSON.stringify(managerReview);
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

      data.ceoReview = JSON.stringify({
        comments: payload.ceoReview?.comments?.trim() ?? "",
        finalRating,
        hikePercentage,
      });
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

  /*
  if (user.role !== Role.EMPLOYEE) {
    await refreshAnalysis(appraisal.id);
  }
  */

  return getAppraisalDetail(userId, appraisal.id);
}

export async function updateCycleWindow(
  cycleId: string,
  startDate: string,
  endDate: string,
  user: SessionUserSummary
) {
  if (user.role !== "HR" && user.role !== "CEO") {
    throw new Error("Unauthorized");
  }

  return await prisma.appraisalCycle.update({
    where: { id: cycleId },
    data: {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
  });
}

export async function assignEmployeeToCycle(
  employeeId: string,
  cycleId: string,
  user: SessionUserSummary
) {
  if (user.role !== "HR" && user.role !== "CEO") {
    throw new Error("Unauthorized");
  }

  const cycle = await prisma.appraisalCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) throw new Error("Cycle not found");

  const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!emp) throw new Error("Employee not found");

  // Check if there is an existing appraisal for this cycle
  const existing = await prisma.appraisal.findFirst({
    where: { employeeId, cycleId }
  });

  if (existing) {
    return existing; // Already assigned
  }

  // Create new appraisal
  let targetTeamId = emp.teamId;
  if (!targetTeamId) {
    const firstTeam = await prisma.team.findFirst({ select: { id: true } });
    targetTeamId = firstTeam?.id || "SYSTEM_FALLBACK";
  }

  return await prisma.appraisal.create({
    data: {
      employeeId,
      teamId: targetTeamId,
      cycleId,
      managerId: emp.managerId,
      type: cycle.appraisalType,
      appraisalPeriod: cycle.periodLabel,
      status: "DRAFT",
    }
  });
}

export async function enrollAllEmployees(cycleId: string, user: SessionUserSummary) {
  if (user.role !== "HR" && user.role !== "CEO") {
    throw new Error("Unauthorized");
  }

  const cycle = await prisma.appraisalCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) throw new Error("Cycle not found");

  const employees = await prisma.employee.findMany({
    where: {
      role: { not: "CEO" },
    }
  });

  let count = 0;
  for (const emp of employees) {
    const existing = await prisma.appraisal.findFirst({
      where: { employeeId: emp.id, cycleId: cycleId }
    });
    
    if (!existing) {
      await prisma.appraisal.create({
        data: {
          employeeId: emp.id,
          teamId: emp.teamId || "SYSTEM", 
          cycleId: cycleId,
          managerId: emp.managerId,
          type: cycle.appraisalType,
          appraisalPeriod: cycle.periodLabel,
          status: "DRAFT",
        }
      });
      count++;
    }
  }

  return { count };
}
