import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const names = ["Court A", "Court B", "Court C", "Court D", "Court E", "Court F"];

  // create if not exists
  for (const name of names) {
    const existing = await prisma.court.findFirst({ where: { name } });
    if (!existing) {
      await prisma.court.create({ data: { name, isActive: true } });
    }
  }
}

main()
  .then(() => console.log("Seeded courts ✅"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
