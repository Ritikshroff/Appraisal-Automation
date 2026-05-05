const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const cycles = [
    {
      name: "April 2026 Salary Appraisal",
      appraisalType: "SALARY",
      periodLabel: "FY 2025-26",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-04-30"),
      isActive: true,
    },
    {
      name: "April 2026 Work Appraisal",
      appraisalType: "WORK",
      periodLabel: "Q1 2026",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-04-30"),
      isActive: true,
    },
    {
      name: "October 2026 Salary Appraisal",
      appraisalType: "SALARY",
      periodLabel: "FY 2026-27",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-31"),
      isActive: true,
    },
    {
      name: "October 2026 Work Appraisal",
      appraisalType: "WORK",
      periodLabel: "Q3 2026",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-31"),
      isActive: true,
    },
  ];

  for (const cycle of cycles) {
    const existing = await prisma.appraisalCycle.findFirst({
      where: { name: cycle.name }
    });
    if (!existing) {
      await prisma.appraisalCycle.create({ data: cycle });
      console.log(`Created: ${cycle.name}`);
    } else {
      console.log(`Exists: ${cycle.name}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
