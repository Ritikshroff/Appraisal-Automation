const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const cycles = await prisma.appraisalCycle.findMany();
  console.log(JSON.stringify(cycles, null, 2));
}

main().finally(() => prisma.$disconnect());
