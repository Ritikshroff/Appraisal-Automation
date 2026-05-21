import "dotenv/config";

import { hash } from "bcryptjs";
import {
  AppraisalStatus,
  AppraisalType,
  PrismaClient,
  Role,
  SentimentLabel,
} from "@prisma/client";

const prisma = new PrismaClient({ log: ["error", "warn"] });

const defaultPassword = "Cybermedia@123";

const sectionQuestions = [
  "Has the past year been good/bad/satisfactory or otherwise for you, and why?",
  "What do you consider to be your most important achievements of the past year?",
  "What elements of your job do you find most difficult?",
  "What elements of your job interest you the most, and least?",
  "What action could be taken to improve your performance in your current position by you, and your boss?",
  "What sort of training/experiences would benefit you in the next year? Not just job-skills - also your natural strengths and personal passions you'd like to develop - you and your work can benefit from these.",
  "Mention if you have any grievances/problem/are of dissatisfaction which affect your performance.",
];

const skillTemplates = [
  "Technical Knowledge",
  "Communication",
  "Problem Solving",
  "Ownership",
  "Stakeholder Management",
];

function buildSectionAnswers(employeeName: string, focus: string) {
  return sectionQuestions.map((question, index) => ({
    question,
    answer: `${employeeName} response ${index + 1}: ${focus}`,
  }));
}

function buildKras(objectives: string[], managerComplete = false) {
  return objectives.map((objective, index) => ({
    objective,
    weightage: 100 / objectives.length,
    appraiseeRating: 7.2 + index * 0.5,
    appraiserRating: managerComplete ? 7.4 + index * 0.4 : null,
    comments: managerComplete ? `Manager comments for ${objective}.` : null,
    displayOrder: index,
  }));
}

function buildSkills(managerComplete = false) {
  return skillTemplates.map((skillName, index) => ({
    skillName,
    employeeRating: Math.min(10, 7 + index),
    managerRating: managerComplete ? Math.min(10, 7 + Math.min(index, 2)) : null,
    displayOrder: index,
  }));
}

async function createUserForEmployee({
  email,
  fullName,
  role,
  employeeId,
  teamId,
  passwordHash,
}: {
  email: string;
  fullName: string;
  role: Role;
  employeeId: string;
  teamId: string | null;
  passwordHash: string;
}) {
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      name: fullName,
      role,
      employeeId,
      teamId,
    },
  });
}

async function createAppraisal({
  employeeId,
  teamId,
  cycleId,
  managerId,
  ceoId,
  type,
  appraisalPeriod,
  status,
  employeeName,
  sectionFocus,
  kraObjectives,
  managerOverallRating,
  finalRating,
  hikePercentage,
  managerComment,
  ceoComment,
  summary,
  sentimentLabel,
  sentimentScore,
  strengths,
  weaknesses,
  risks,
}: {
  employeeId: string;
  teamId: string;
  cycleId: string;
  managerId: string;
  ceoId: string;
  type: AppraisalType;
  appraisalPeriod: string;
  status: AppraisalStatus;
  employeeName: string;
  sectionFocus: string;
  kraObjectives: string[];
  managerOverallRating?: string;
  finalRating?: string;
  hikePercentage?: string;
  managerComment?: string;
  ceoComment?: string;
  summary?: string;
  sentimentLabel?: SentimentLabel;
  sentimentScore?: string;
  strengths?: string[];
  weaknesses?: string[];
  risks?: string[];
}) {
  const managerComplete =
    status === AppraisalStatus.MANAGER_REVIEW || status === AppraisalStatus.COMPLETED;

  return prisma.appraisal.create({
    data: {
      employeeId,
      teamId,
      cycleId,
      managerId,
      ceoId,
      type,
      appraisalPeriod,
      status,
      sectionOneAnswers: JSON.stringify(buildSectionAnswers(employeeName, sectionFocus)),
      managerReview: managerComplete
        ? JSON.stringify({
          comments:
            managerComment ?? `${employeeName} is delivering steadily and is ready for the next level of scope.`,
          overallRating: managerOverallRating ?? "7.80",
        })
        : null,
      ceoReview:
        status === AppraisalStatus.COMPLETED
          ? JSON.stringify({
            comments: ceoComment ?? `${employeeName} is approved for the final cycle outcome.`,
            finalRating,
            hikePercentage,
          })
          : null,
      managerOverallRating: managerOverallRating ? parseFloat(managerOverallRating) : null,
      finalRating: finalRating ? parseFloat(finalRating) : null,
      hikePercentage: hikePercentage ? parseFloat(hikePercentage) : null,
      aiPerformanceSummary: summary ?? null,
      sentimentLabel: sentimentLabel ?? null,
      sentimentScore: sentimentScore ? parseFloat(sentimentScore) : null,
      aiStrengths: strengths ? JSON.stringify(strengths) : null,
      aiWeaknesses: weaknesses ? JSON.stringify(weaknesses) : null,
      aiRiskSignals: risks ? JSON.stringify(risks) : null,
      employeeSubmittedAt: status === AppraisalStatus.DRAFT ? null : new Date("2026-04-12T09:00:00.000Z"),
      managerSubmittedAt: managerComplete ? new Date("2026-04-16T10:00:00.000Z") : null,
      ceoSubmittedAt: status === AppraisalStatus.COMPLETED ? new Date("2026-04-22T12:00:00.000Z") : null,
      analyzedAt: managerComplete ? new Date("2026-04-22T12:10:00.000Z") : null,
      kras: {
        create: buildKras(kraObjectives, managerComplete),
      },
      skillRatings: {
        create: buildSkills(managerComplete),
      },
    },
  });
}

async function main() {
  await prisma.skillRating.deleteMany();
  await prisma.kRA.deleteMany();
  await prisma.appraisal.deleteMany();
  await prisma.user.deleteMany();
  await prisma.appraisalCycle.deleteMany();
  await prisma.team.deleteMany();
  await prisma.employee.deleteMany();

  const passwordHash = await hash(defaultPassword, 10);

  const ceo = await prisma.employee.create({
    data: {
      employeeCode: "CEO-0001",
      fullName: "Meera Kapoor",
      email: "meera.kapoor@cmrsl.example",
      department: "Executive",
      designation: "Chief Executive Officer",
      role: Role.CEO,
    },
  });

  const hr = await prisma.employee.create({
    data: {
      employeeCode: "HR-0001",
      fullName: "Sanjay Mishra",
      email: "sanjay.mishra@cmrsl.example",
      department: "Human Resources",
      designation: "HR Director",
      role: Role.HR,
    },
  });

  const techManager = await prisma.employee.create({
    data: {
      employeeCode: "MGR-1001",
      fullName: "Anita Rao",
      email: "anita.rao@cmrsl.example",
      department: "Tech",
      designation: "Engineering Manager",
      role: Role.MANAGER,
    },
  });

  const mediaManager = await prisma.employee.create({
    data: {
      employeeCode: "MGR-1002",
      fullName: "Vikram Singh",
      email: "vikram.singh@cmrsl.example",
      department: "Media",
      designation: "Media Manager",
      role: Role.MANAGER,
    },
  });

  const marketingManager = await prisma.employee.create({
    data: {
      employeeCode: "MGR-1003",
      fullName: "Arjun Desai",
      email: "arjun.desai@cmrsl.example",
      department: "Marketing",
      designation: "Marketing Manager",
      role: Role.MANAGER,
    },
  });

  const techTeam = await prisma.team.create({
    data: {
      name: "Tech",
      managerId: techManager.id,
    },
  });

  const mediaTeam = await prisma.team.create({
    data: {
      name: "Media",
      managerId: mediaManager.id,
    },
  });

  const marketingTeam = await prisma.team.create({
    data: {
      name: "Marketing",
      managerId: marketingManager.id,
    },
  });

  await prisma.employee.update({
    where: { id: techManager.id },
    data: { teamId: techTeam.id },
  });

  await prisma.employee.update({
    where: { id: mediaManager.id },
    data: { teamId: mediaTeam.id },
  });

  await prisma.employee.update({
    where: { id: marketingManager.id },
    data: { teamId: marketingTeam.id },
  });

  const rahul = await prisma.employee.create({
    data: {
      employeeCode: "EMP-2001",
      fullName: "Rahul Sharma",
      email: "rahul.sharma@cmrsl.example",
      department: "Tech",
      designation: "Senior Software Engineer",
      role: Role.EMPLOYEE,
      teamId: techTeam.id,
      managerId: techManager.id,
    },
  });

  const priya = await prisma.employee.create({
    data: {
      employeeCode: "EMP-2002",
      fullName: "Priya Nair",
      email: "priya.nair@cmrsl.example",
      department: "Tech",
      designation: "Frontend Engineer",
      role: Role.EMPLOYEE,
      teamId: techTeam.id,
      managerId: techManager.id,
    },
  });

  const sneha = await prisma.employee.create({
    data: {
      employeeCode: "EMP-2003",
      fullName: "Sneha Patel",
      email: "sneha.patel@cmrsl.example",
      department: "Media",
      designation: "Content Strategist",
      role: Role.EMPLOYEE,
      teamId: mediaTeam.id,
      managerId: mediaManager.id,
    },
  });

  const aisha = await prisma.employee.create({
    data: {
      employeeCode: "EMP-2004",
      fullName: "Aisha Khan",
      email: "aisha.khan@cmrsl.example",
      department: "Media",
      designation: "Business Analyst",
      role: Role.EMPLOYEE,
      teamId: mediaTeam.id,
      managerId: mediaManager.id,
    },
  });

  const karan = await prisma.employee.create({
    data: {
      employeeCode: "EMP-2005",
      fullName: "Karan Mehta",
      email: "karan.mehta@cmrsl.example",
      department: "Marketing",
      designation: "Performance Marketer",
      role: Role.EMPLOYEE,
      teamId: marketingTeam.id,
      managerId: marketingManager.id,
    },
  });

  const nidhi = await prisma.employee.create({
    data: {
      employeeCode: "EMP-2006",
      fullName: "Nidhi Verma",
      email: "nidhi.verma@cmrsl.example",
      department: "Marketing",
      designation: "Brand Executive",
      role: Role.EMPLOYEE,
      teamId: marketingTeam.id,
      managerId: marketingManager.id,
    },
  });

  const neha = await prisma.employee.create({
    data: {
      employeeCode: "EMP-2007",
      fullName: "Neha Bansal",
      email: "neha.bansal@cmrsl.example",
      department: "Tech",
      designation: "Senior Backend Engineer",
      role: Role.EMPLOYEE,
      teamId: techTeam.id,
      managerId: techManager.id,
    },
  });

  const saurabh = await prisma.employee.create({
    data: {
      employeeCode: "EMP-2008",
      fullName: "Saurabh Jain",
      email: "saurabh.jain@cmrsl.example",
      department: "Tech",
      designation: "DevOps Engineer",
      role: Role.EMPLOYEE,
      teamId: techTeam.id,
      managerId: techManager.id,
    },
  });

  const kavya = await prisma.employee.create({
    data: {
      employeeCode: "EMP-2009",
      fullName: "Kavya Iyer",
      email: "kavya.iyer@cmrsl.example",
      department: "Tech",
      designation: "QA Lead",
      role: Role.EMPLOYEE,
      teamId: techTeam.id,
      managerId: techManager.id,
    },
  });

  const rohan = await prisma.employee.create({
    data: {
      employeeCode: "EMP-2010",
      fullName: "Rohan Malhotra",
      email: "rohan.malhotra@cmrsl.example",
      department: "Media",
      designation: "Video Producer",
      role: Role.EMPLOYEE,
      teamId: mediaTeam.id,
      managerId: mediaManager.id,
    },
  });

  const ishita = await prisma.employee.create({
    data: {
      employeeCode: "EMP-2011",
      fullName: "Ishita Roy",
      email: "ishita.roy@cmrsl.example",
      department: "Media",
      designation: "Editorial Analyst",
      role: Role.EMPLOYEE,
      teamId: mediaTeam.id,
      managerId: mediaManager.id,
    },
  });

  const dev = await prisma.employee.create({
    data: {
      employeeCode: "EMP-2012",
      fullName: "Dev Joshi",
      email: "dev.joshi@cmrsl.example",
      department: "Media",
      designation: "Audience Growth Executive",
      role: Role.EMPLOYEE,
      teamId: mediaTeam.id,
      managerId: mediaManager.id,
    },
  });

  const pooja = await prisma.employee.create({
    data: {
      employeeCode: "EMP-2013",
      fullName: "Pooja Sethi",
      email: "pooja.sethi@cmrsl.example",
      department: "Marketing",
      designation: "SEO Specialist",
      role: Role.EMPLOYEE,
      teamId: marketingTeam.id,
      managerId: marketingManager.id,
    },
  });

  const aditya = await prisma.employee.create({
    data: {
      employeeCode: "EMP-2014",
      fullName: "Aditya Kulkarni",
      email: "aditya.kulkarni@cmrsl.example",
      department: "Marketing",
      designation: "Growth Analyst",
      role: Role.EMPLOYEE,
      teamId: marketingTeam.id,
      managerId: marketingManager.id,
    },
  });

  const tanvi = await prisma.employee.create({
    data: {
      employeeCode: "EMP-2015",
      fullName: "Tanvi Gupta",
      email: "tanvi.gupta@cmrsl.example",
      department: "Marketing",
      designation: "Campaign Manager",
      role: Role.EMPLOYEE,
      teamId: marketingTeam.id,
      managerId: marketingManager.id,
    },
  });

  await Promise.all([
    createUserForEmployee({
      email: ceo.email,
      fullName: ceo.fullName,
      role: ceo.role,
      employeeId: ceo.id,
      teamId: null,
      passwordHash,
    }),
    createUserForEmployee({
      email: hr.email,
      fullName: hr.fullName,
      role: hr.role,
      employeeId: hr.id,
      teamId: null,
      passwordHash,
    }),
    createUserForEmployee({
      email: techManager.email,
      fullName: techManager.fullName,
      role: techManager.role,
      employeeId: techManager.id,
      teamId: techTeam.id,
      passwordHash,
    }),
    createUserForEmployee({
      email: mediaManager.email,
      fullName: mediaManager.fullName,
      role: mediaManager.role,
      employeeId: mediaManager.id,
      teamId: mediaTeam.id,
      passwordHash,
    }),
    createUserForEmployee({
      email: marketingManager.email,
      fullName: marketingManager.fullName,
      role: marketingManager.role,
      employeeId: marketingManager.id,
      teamId: marketingTeam.id,
      passwordHash,
    }),
    createUserForEmployee({
      email: rahul.email,
      fullName: rahul.fullName,
      role: rahul.role,
      employeeId: rahul.id,
      teamId: techTeam.id,
      passwordHash,
    }),
    createUserForEmployee({
      email: priya.email,
      fullName: priya.fullName,
      role: priya.role,
      employeeId: priya.id,
      teamId: techTeam.id,
      passwordHash,
    }),
    createUserForEmployee({
      email: sneha.email,
      fullName: sneha.fullName,
      role: sneha.role,
      employeeId: sneha.id,
      teamId: mediaTeam.id,
      passwordHash,
    }),
    createUserForEmployee({
      email: aisha.email,
      fullName: aisha.fullName,
      role: aisha.role,
      employeeId: aisha.id,
      teamId: mediaTeam.id,
      passwordHash,
    }),
    createUserForEmployee({
      email: karan.email,
      fullName: karan.fullName,
      role: karan.role,
      employeeId: karan.id,
      teamId: marketingTeam.id,
      passwordHash,
    }),
    createUserForEmployee({
      email: nidhi.email,
      fullName: nidhi.fullName,
      role: nidhi.role,
      employeeId: nidhi.id,
      teamId: marketingTeam.id,
      passwordHash,
    }),
    createUserForEmployee({
      email: neha.email,
      fullName: neha.fullName,
      role: neha.role,
      employeeId: neha.id,
      teamId: techTeam.id,
      passwordHash,
    }),
    createUserForEmployee({
      email: saurabh.email,
      fullName: saurabh.fullName,
      role: saurabh.role,
      employeeId: saurabh.id,
      teamId: techTeam.id,
      passwordHash,
    }),
    createUserForEmployee({
      email: kavya.email,
      fullName: kavya.fullName,
      role: kavya.role,
      employeeId: kavya.id,
      teamId: techTeam.id,
      passwordHash,
    }),
    createUserForEmployee({
      email: rohan.email,
      fullName: rohan.fullName,
      role: rohan.role,
      employeeId: rohan.id,
      teamId: mediaTeam.id,
      passwordHash,
    }),
    createUserForEmployee({
      email: ishita.email,
      fullName: ishita.fullName,
      role: ishita.role,
      employeeId: ishita.id,
      teamId: mediaTeam.id,
      passwordHash,
    }),
    createUserForEmployee({
      email: dev.email,
      fullName: dev.fullName,
      role: dev.role,
      employeeId: dev.id,
      teamId: mediaTeam.id,
      passwordHash,
    }),
    createUserForEmployee({
      email: pooja.email,
      fullName: pooja.fullName,
      role: pooja.role,
      employeeId: pooja.id,
      teamId: marketingTeam.id,
      passwordHash,
    }),
    createUserForEmployee({
      email: aditya.email,
      fullName: aditya.fullName,
      role: aditya.role,
      employeeId: aditya.id,
      teamId: marketingTeam.id,
      passwordHash,
    }),
    createUserForEmployee({
      email: tanvi.email,
      fullName: tanvi.fullName,
      role: tanvi.role,
      employeeId: tanvi.id,
      teamId: marketingTeam.id,
      passwordHash,
    }),
  ]);

  const aprilCycle = await prisma.appraisalCycle.create({
    data: {
      name: "April 2026 Work Appraisal",
      appraisalType: AppraisalType.WORK,
      periodLabel: "April",
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2026-04-30T23:59:59.000Z"),
      isActive: true,
    },
  });

  const octoberCycle = await prisma.appraisalCycle.create({
    data: {
      name: "October 2026 Salary Appraisal",
      appraisalType: AppraisalType.SALARY,
      periodLabel: "October",
      startDate: new Date("2026-10-01T00:00:00.000Z"),
      endDate: new Date("2026-10-31T23:59:59.000Z"),
      isActive: true,
    },
  });

  await Promise.all([
    createAppraisal({
      employeeId: rahul.id,
      teamId: techTeam.id,
      cycleId: aprilCycle.id,
      managerId: techManager.id,
      ceoId: ceo.id,
      type: AppraisalType.WORK,
      appraisalPeriod: "April",
      status: AppraisalStatus.SUBMITTED,
      employeeName: rahul.fullName,
      sectionFocus: "Delivered platform upgrades and stabilized backend APIs.",
      kraObjectives: ["Platform reliability", "API performance", "Mentoring"],
    }),
    createAppraisal({
      employeeId: priya.id,
      teamId: techTeam.id,
      cycleId: aprilCycle.id,
      managerId: techManager.id,
      ceoId: ceo.id,
      type: AppraisalType.WORK,
      appraisalPeriod: "April",
      status: AppraisalStatus.MANAGER_REVIEW,
      employeeName: priya.fullName,
      sectionFocus: "Led frontend delivery and improved UX consistency.",
      kraObjectives: ["Frontend delivery", "Design quality", "Release support"],
      managerOverallRating: "8.10",
      managerComment: "Strong execution and consistent collaboration across design and product.",
      summary: "Priya delivered strong frontend execution with good collaboration and increasing ownership.",
      sentimentLabel: SentimentLabel.POSITIVE,
      sentimentScore: "0.84",
      strengths: ["Frontend delivery", "Collaboration", "Ownership"],
      weaknesses: ["Broaden architecture depth"],
      risks: ["No major risk signal identified"],
    }),
    createAppraisal({
      employeeId: rahul.id,
      teamId: techTeam.id,
      cycleId: octoberCycle.id,
      managerId: techManager.id,
      ceoId: ceo.id,
      type: AppraisalType.SALARY,
      appraisalPeriod: "October",
      status: AppraisalStatus.DRAFT,
      employeeName: rahul.fullName,
      sectionFocus: "Preparing compensation case with impact documentation.",
      kraObjectives: ["Compensation case", "Quarterly impact summary", "Architecture contribution"],
    }),
    createAppraisal({
      employeeId: priya.id,
      teamId: techTeam.id,
      cycleId: octoberCycle.id,
      managerId: techManager.id,
      ceoId: ceo.id,
      type: AppraisalType.SALARY,
      appraisalPeriod: "October",
      status: AppraisalStatus.COMPLETED,
      employeeName: priya.fullName,
      sectionFocus: "Built clear case for promotion-level delivery and impact.",
      kraObjectives: ["Promotion readiness", "Product impact", "Team enablement"],
      managerOverallRating: "8.60",
      finalRating: "8.80",
      hikePercentage: "16.50",
      managerComment: "High performer with clear growth trajectory and consistent delivery quality.",
      ceoComment: "Approved for strong performance and sustained product impact.",
      summary: "Priya consistently delivered high-quality frontend outcomes and earned a strong salary outcome.",
      sentimentLabel: SentimentLabel.POSITIVE,
      sentimentScore: "0.89",
      strengths: ["High-impact execution", "Product quality", "Growth trajectory"],
      weaknesses: ["Needs broader org-level influence"],
      risks: ["No major risk signal identified"],
    }),
    createAppraisal({
      employeeId: sneha.id,
      teamId: mediaTeam.id,
      cycleId: aprilCycle.id,
      managerId: mediaManager.id,
      ceoId: ceo.id,
      type: AppraisalType.WORK,
      appraisalPeriod: "April",
      status: AppraisalStatus.COMPLETED,
      employeeName: sneha.fullName,
      sectionFocus: "Scaled editorial processes and improved content planning.",
      kraObjectives: ["Editorial planning", "Quality consistency", "Cross-team coordination"],
      managerOverallRating: "8.20",
      finalRating: "8.40",
      hikePercentage: "12.00",
      managerComment: "Reliable content leader with strong ownership and planning discipline.",
      ceoComment: "Completed with a positive final assessment.",
      summary: "Sneha brought stability and structure to media planning with reliable execution.",
      sentimentLabel: SentimentLabel.POSITIVE,
      sentimentScore: "0.83",
      strengths: ["Editorial ownership", "Planning discipline", "Reliable execution"],
      weaknesses: ["Needs more experimentation"],
      risks: ["No major risk signal identified"],
    }),
    createAppraisal({
      employeeId: aisha.id,
      teamId: mediaTeam.id,
      cycleId: aprilCycle.id,
      managerId: mediaManager.id,
      ceoId: ceo.id,
      type: AppraisalType.WORK,
      appraisalPeriod: "April",
      status: AppraisalStatus.SUBMITTED,
      employeeName: aisha.fullName,
      sectionFocus: "Improved reporting quality and insight storytelling.",
      kraObjectives: ["Reporting quality", "Insight generation", "Stakeholder communication"],
    }),
    createAppraisal({
      employeeId: sneha.id,
      teamId: mediaTeam.id,
      cycleId: octoberCycle.id,
      managerId: mediaManager.id,
      ceoId: ceo.id,
      type: AppraisalType.SALARY,
      appraisalPeriod: "October",
      status: AppraisalStatus.MANAGER_REVIEW,
      employeeName: sneha.fullName,
      sectionFocus: "Built a strong salary-cycle case around editorial leadership.",
      kraObjectives: ["Leadership impact", "Editorial quality", "Process maturity"],
      managerOverallRating: "8.10",
      managerComment: "Consistent delivery and growing leadership across the media function.",
      summary: "Sneha’s salary appraisal shows strong leadership momentum and dependable performance.",
      sentimentLabel: SentimentLabel.POSITIVE,
      sentimentScore: "0.81",
      strengths: ["Leadership growth", "Execution consistency", "Process ownership"],
      weaknesses: ["Needs more strategic experimentation"],
      risks: ["No major risk signal identified"],
    }),
    createAppraisal({
      employeeId: aisha.id,
      teamId: mediaTeam.id,
      cycleId: octoberCycle.id,
      managerId: mediaManager.id,
      ceoId: ceo.id,
      type: AppraisalType.SALARY,
      appraisalPeriod: "October",
      status: AppraisalStatus.DRAFT,
      employeeName: aisha.fullName,
      sectionFocus: "Drafting a salary-cycle case around reporting quality and insight generation.",
      kraObjectives: ["Strengthen compensation case", "Document insight impact", "Show process improvement"],
    }),
    createAppraisal({
      employeeId: karan.id,
      teamId: marketingTeam.id,
      cycleId: aprilCycle.id,
      managerId: marketingManager.id,
      ceoId: ceo.id,
      type: AppraisalType.WORK,
      appraisalPeriod: "April",
      status: AppraisalStatus.SUBMITTED,
      employeeName: karan.fullName,
      sectionFocus: "Improved campaign efficiency and channel insights.",
      kraObjectives: ["Campaign performance", "Insight quality", "Experiment velocity"],
    }),
    createAppraisal({
      employeeId: nidhi.id,
      teamId: marketingTeam.id,
      cycleId: aprilCycle.id,
      managerId: marketingManager.id,
      ceoId: ceo.id,
      type: AppraisalType.WORK,
      appraisalPeriod: "April",
      status: AppraisalStatus.COMPLETED,
      employeeName: nidhi.fullName,
      sectionFocus: "Built stronger brand coordination and launch support.",
      kraObjectives: ["Brand execution", "Launch support", "Stakeholder alignment"],
      managerOverallRating: "7.90",
      finalRating: "8.00",
      hikePercentage: "10.50",
      managerComment: "Strong brand execution with dependable stakeholder coordination.",
      ceoComment: "Approved with a solid final rating and measured hike.",
      summary: "Nidhi supported brand execution well and earned a steady final outcome.",
      sentimentLabel: SentimentLabel.NEUTRAL,
      sentimentScore: "0.72",
      strengths: ["Brand delivery", "Coordination", "Consistency"],
      weaknesses: ["Needs more measurable innovation"],
      risks: ["No major risk signal identified"],
    }),
    createAppraisal({
      employeeId: karan.id,
      teamId: marketingTeam.id,
      cycleId: octoberCycle.id,
      managerId: marketingManager.id,
      ceoId: ceo.id,
      type: AppraisalType.SALARY,
      appraisalPeriod: "October",
      status: AppraisalStatus.MANAGER_REVIEW,
      employeeName: karan.fullName,
      sectionFocus: "Positioned salary review around campaign performance and experimentation.",
      kraObjectives: ["Performance marketing impact", "Acquisition growth", "Experimentation maturity"],
      managerOverallRating: "7.70",
      managerComment: "Solid results with room to improve consistency in strategic planning.",
      summary: "Karan’s performance is solid, with clear delivery and some development areas to address.",
      sentimentLabel: SentimentLabel.MIXED,
      sentimentScore: "0.55",
      strengths: ["Campaign execution", "Experimentation", "Channel insight"],
      weaknesses: ["Planning consistency"],
      risks: ["Dependency management risk"],
    }),
    createAppraisal({
      employeeId: nidhi.id,
      teamId: marketingTeam.id,
      cycleId: octoberCycle.id,
      managerId: marketingManager.id,
      ceoId: ceo.id,
      type: AppraisalType.SALARY,
      appraisalPeriod: "October",
      status: AppraisalStatus.DRAFT,
      employeeName: nidhi.fullName,
      sectionFocus: "Preparing salary review around brand launches and stakeholder support.",
      kraObjectives: ["Launch readiness", "Brand delivery", "Cross-team coordination"],
    }),
    createAppraisal({
      employeeId: neha.id,
      teamId: techTeam.id,
      cycleId: aprilCycle.id,
      managerId: techManager.id,
      ceoId: ceo.id,
      type: AppraisalType.WORK,
      appraisalPeriod: "April",
      status: AppraisalStatus.COMPLETED,
      employeeName: neha.fullName,
      sectionFocus: "Improved backend stability and reduced production support load.",
      kraObjectives: ["Service reliability", "Incident reduction", "API quality"],
      managerOverallRating: "8.30",
      finalRating: "8.50",
      hikePercentage: "13.00",
      managerComment: "Strong backend ownership with reliable delivery under pressure.",
      ceoComment: "Approved with a strong performance outcome.",
      summary: "Neha improved stability and backend quality with dependable execution.",
      sentimentLabel: SentimentLabel.POSITIVE,
      sentimentScore: "0.86",
      strengths: ["Backend ownership", "Reliability", "Execution quality"],
      weaknesses: ["Needs broader stakeholder visibility"],
      risks: ["No major risk signal identified"],
    }),
    createAppraisal({
      employeeId: neha.id,
      teamId: techTeam.id,
      cycleId: octoberCycle.id,
      managerId: techManager.id,
      ceoId: ceo.id,
      type: AppraisalType.SALARY,
      appraisalPeriod: "October",
      status: AppraisalStatus.DRAFT,
      employeeName: neha.fullName,
      sectionFocus: "Preparing compensation case around reliability ownership and delivery consistency.",
      kraObjectives: ["Reliability ownership", "Delivery consistency", "Platform quality"],
    }),
    createAppraisal({
      employeeId: saurabh.id,
      teamId: techTeam.id,
      cycleId: aprilCycle.id,
      managerId: techManager.id,
      ceoId: ceo.id,
      type: AppraisalType.WORK,
      appraisalPeriod: "April",
      status: AppraisalStatus.SUBMITTED,
      employeeName: saurabh.fullName,
      sectionFocus: "Improved infrastructure automation and reduced deployment friction.",
      kraObjectives: ["Infrastructure automation", "Deployment reliability", "Monitoring coverage"],
    }),
    createAppraisal({
      employeeId: saurabh.id,
      teamId: techTeam.id,
      cycleId: octoberCycle.id,
      managerId: techManager.id,
      ceoId: ceo.id,
      type: AppraisalType.SALARY,
      appraisalPeriod: "October",
      status: AppraisalStatus.MANAGER_REVIEW,
      employeeName: saurabh.fullName,
      sectionFocus: "Built salary review case around platform automation and operational maturity.",
      kraObjectives: ["Operational maturity", "Automation impact", "Reliability support"],
      managerOverallRating: "7.90",
      managerComment: "Strong operational ownership with clear improvement in automation depth.",
      summary: "Saurabh improved operational maturity and automation consistency across the platform.",
      sentimentLabel: SentimentLabel.POSITIVE,
      sentimentScore: "0.8",
      strengths: ["Automation depth", "Operational ownership", "Reliability support"],
      weaknesses: ["Needs stronger business storytelling"],
      risks: ["No major risk signal identified"],
    }),
    createAppraisal({
      employeeId: kavya.id,
      teamId: techTeam.id,
      cycleId: aprilCycle.id,
      managerId: techManager.id,
      ceoId: ceo.id,
      type: AppraisalType.WORK,
      appraisalPeriod: "April",
      status: AppraisalStatus.DRAFT,
      employeeName: kavya.fullName,
      sectionFocus: "Drafting QA process improvements and release coverage metrics.",
      kraObjectives: ["Release quality", "Coverage depth", "Regression control"],
    }),
    createAppraisal({
      employeeId: kavya.id,
      teamId: techTeam.id,
      cycleId: octoberCycle.id,
      managerId: techManager.id,
      ceoId: ceo.id,
      type: AppraisalType.SALARY,
      appraisalPeriod: "October",
      status: AppraisalStatus.SUBMITTED,
      employeeName: kavya.fullName,
      sectionFocus: "Submitted salary review around QA coverage, release confidence, and process rigor.",
      kraObjectives: ["QA leadership", "Release confidence", "Process rigor"],
    }),
    createAppraisal({
      employeeId: rohan.id,
      teamId: mediaTeam.id,
      cycleId: aprilCycle.id,
      managerId: mediaManager.id,
      ceoId: ceo.id,
      type: AppraisalType.WORK,
      appraisalPeriod: "April",
      status: AppraisalStatus.MANAGER_REVIEW,
      employeeName: rohan.fullName,
      sectionFocus: "Expanded production throughput and strengthened cross-team delivery quality.",
      kraObjectives: ["Production throughput", "Delivery quality", "Stakeholder responsiveness"],
      managerOverallRating: "8.00",
      managerComment: "Strong delivery pace with improving collaboration quality.",
      summary: "Rohan improved throughput and delivery responsiveness with steady creative execution.",
      sentimentLabel: SentimentLabel.POSITIVE,
      sentimentScore: "0.78",
      strengths: ["Delivery pace", "Responsiveness", "Creative execution"],
      weaknesses: ["Needs stronger planning rigor"],
      risks: ["Minor coordination risk during peak launches"],
    }),
    createAppraisal({
      employeeId: rohan.id,
      teamId: mediaTeam.id,
      cycleId: octoberCycle.id,
      managerId: mediaManager.id,
      ceoId: ceo.id,
      type: AppraisalType.SALARY,
      appraisalPeriod: "October",
      status: AppraisalStatus.COMPLETED,
      employeeName: rohan.fullName,
      sectionFocus: "Built a strong salary review case around production scale and delivery consistency.",
      kraObjectives: ["Production impact", "Delivery consistency", "Cross-team support"],
      managerOverallRating: "8.10",
      finalRating: "8.20",
      hikePercentage: "11.50",
      managerComment: "Consistent output with improving quality and delivery ownership.",
      ceoComment: "Approved with a balanced salary outcome.",
      summary: "Rohan delivered consistent production impact and earned a positive salary decision.",
      sentimentLabel: SentimentLabel.POSITIVE,
      sentimentScore: "0.82",
      strengths: ["Production consistency", "Ownership", "Responsiveness"],
      weaknesses: ["Needs stronger pre-production planning"],
      risks: ["No major risk signal identified"],
    }),
    createAppraisal({
      employeeId: ishita.id,
      teamId: mediaTeam.id,
      cycleId: aprilCycle.id,
      managerId: mediaManager.id,
      ceoId: ceo.id,
      type: AppraisalType.WORK,
      appraisalPeriod: "April",
      status: AppraisalStatus.DRAFT,
      employeeName: ishita.fullName,
      sectionFocus: "Drafting editorial analytics impact and insight quality improvements.",
      kraObjectives: ["Insight quality", "Editorial reporting", "Decision support"],
    }),
    createAppraisal({
      employeeId: ishita.id,
      teamId: mediaTeam.id,
      cycleId: octoberCycle.id,
      managerId: mediaManager.id,
      ceoId: ceo.id,
      type: AppraisalType.SALARY,
      appraisalPeriod: "October",
      status: AppraisalStatus.SUBMITTED,
      employeeName: ishita.fullName,
      sectionFocus: "Submitted salary review around reporting accuracy and editorial insight quality.",
      kraObjectives: ["Insight accuracy", "Reporting clarity", "Decision support"],
    }),
    createAppraisal({
      employeeId: dev.id,
      teamId: mediaTeam.id,
      cycleId: aprilCycle.id,
      managerId: mediaManager.id,
      ceoId: ceo.id,
      type: AppraisalType.WORK,
      appraisalPeriod: "April",
      status: AppraisalStatus.SUBMITTED,
      employeeName: dev.fullName,
      sectionFocus: "Improved audience growth experiments and distribution analytics.",
      kraObjectives: ["Audience growth", "Experiment velocity", "Channel reporting"],
    }),
    createAppraisal({
      employeeId: dev.id,
      teamId: mediaTeam.id,
      cycleId: octoberCycle.id,
      managerId: mediaManager.id,
      ceoId: ceo.id,
      type: AppraisalType.SALARY,
      appraisalPeriod: "October",
      status: AppraisalStatus.DRAFT,
      employeeName: dev.fullName,
      sectionFocus: "Drafting salary review around distribution growth and audience insights.",
      kraObjectives: ["Growth case", "Experiment outcomes", "Audience insight"],
    }),
    createAppraisal({
      employeeId: pooja.id,
      teamId: marketingTeam.id,
      cycleId: aprilCycle.id,
      managerId: marketingManager.id,
      ceoId: ceo.id,
      type: AppraisalType.WORK,
      appraisalPeriod: "April",
      status: AppraisalStatus.COMPLETED,
      employeeName: pooja.fullName,
      sectionFocus: "Improved organic acquisition and search visibility for priority campaigns.",
      kraObjectives: ["Organic growth", "Search visibility", "Content optimization"],
      managerOverallRating: "8.00",
      finalRating: "8.10",
      hikePercentage: "11.00",
      managerComment: "Strong SEO discipline with reliable execution across launch windows.",
      ceoComment: "Approved with a positive final outcome.",
      summary: "Pooja improved search performance and delivered measurable acquisition gains.",
      sentimentLabel: SentimentLabel.POSITIVE,
      sentimentScore: "0.8",
      strengths: ["SEO execution", "Acquisition impact", "Consistency"],
      weaknesses: ["Needs broader channel experimentation"],
      risks: ["No major risk signal identified"],
    }),
    createAppraisal({
      employeeId: pooja.id,
      teamId: marketingTeam.id,
      cycleId: octoberCycle.id,
      managerId: marketingManager.id,
      ceoId: ceo.id,
      type: AppraisalType.SALARY,
      appraisalPeriod: "October",
      status: AppraisalStatus.MANAGER_REVIEW,
      employeeName: pooja.fullName,
      sectionFocus: "Built salary review case around sustained search performance and acquisition efficiency.",
      kraObjectives: ["Search efficiency", "Acquisition impact", "Optimization discipline"],
      managerOverallRating: "8.00",
      managerComment: "Strong search performance with disciplined execution and clear impact.",
      summary: "Pooja has strong optimization discipline and sustained organic growth impact.",
      sentimentLabel: SentimentLabel.POSITIVE,
      sentimentScore: "0.79",
      strengths: ["Optimization discipline", "Organic growth", "Reliable execution"],
      weaknesses: ["Needs stronger cross-channel influence"],
      risks: ["No major risk signal identified"],
    }),
    createAppraisal({
      employeeId: aditya.id,
      teamId: marketingTeam.id,
      cycleId: aprilCycle.id,
      managerId: marketingManager.id,
      ceoId: ceo.id,
      type: AppraisalType.WORK,
      appraisalPeriod: "April",
      status: AppraisalStatus.SUBMITTED,
      employeeName: aditya.fullName,
      sectionFocus: "Improved campaign measurement and growth analytics for acquisition programs.",
      kraObjectives: ["Measurement quality", "Growth analytics", "Decision support"],
    }),
    createAppraisal({
      employeeId: aditya.id,
      teamId: marketingTeam.id,
      cycleId: octoberCycle.id,
      managerId: marketingManager.id,
      ceoId: ceo.id,
      type: AppraisalType.SALARY,
      appraisalPeriod: "October",
      status: AppraisalStatus.DRAFT,
      employeeName: aditya.fullName,
      sectionFocus: "Drafting salary review around analytics depth and growth reporting improvements.",
      kraObjectives: ["Analytics depth", "Reporting quality", "Growth insight"],
    }),
    createAppraisal({
      employeeId: tanvi.id,
      teamId: marketingTeam.id,
      cycleId: aprilCycle.id,
      managerId: marketingManager.id,
      ceoId: ceo.id,
      type: AppraisalType.WORK,
      appraisalPeriod: "April",
      status: AppraisalStatus.MANAGER_REVIEW,
      employeeName: tanvi.fullName,
      sectionFocus: "Improved campaign orchestration and launch coordination across functions.",
      kraObjectives: ["Campaign orchestration", "Launch readiness", "Cross-team coordination"],
      managerOverallRating: "7.80",
      managerComment: "Solid campaign coordination with good communication and execution stability.",
      summary: "Tanvi coordinated campaign launches well and improved execution discipline.",
      sentimentLabel: SentimentLabel.NEUTRAL,
      sentimentScore: "0.69",
      strengths: ["Launch coordination", "Communication", "Execution stability"],
      weaknesses: ["Needs sharper prioritization"],
      risks: ["Moderate launch dependency risk"],
    }),
    createAppraisal({
      employeeId: tanvi.id,
      teamId: marketingTeam.id,
      cycleId: octoberCycle.id,
      managerId: marketingManager.id,
      ceoId: ceo.id,
      type: AppraisalType.SALARY,
      appraisalPeriod: "October",
      status: AppraisalStatus.SUBMITTED,
      employeeName: tanvi.fullName,
      sectionFocus: "Submitted salary review around campaign coordination and delivery governance.",
      kraObjectives: ["Delivery governance", "Launch coordination", "Stakeholder confidence"],
    }),
  ]);

  console.log("Database seeded.");
  console.log(`Demo password for all seeded users: ${defaultPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
