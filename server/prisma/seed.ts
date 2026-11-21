import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const users = [
  {
    name: "Anika",
    email: "anika@certiflow.demo",
    role: UserRole.TRAINING_CENTRE,
    centreName: "ABC Skills Training Centre",
  },
  {
    name: "Dev",
    email: "dev@certiflow.demo",
    role: UserRole.DISTRICT_OFFICER,
    district: "Hyderabad",
  },
  {
    name: "Meera",
    email: "meera@certiflow.demo",
    role: UserRole.DISTRICT_OFFICER,
    district: "Hyderabad",
  },
  {
    name: "Kabir",
    email: "kabir@certiflow.demo",
    role: UserRole.DISTRICT_OFFICER,
    district: "Hyderabad",
  },
  {
    name: "Neha",
    email: "neha@certiflow.demo",
    role: UserRole.QUALITY_OFFICER,
    district: "Hyderabad",
  },
  {
    name: "Farah",
    email: "farah@certiflow.demo",
    role: UserRole.STATE_OFFICER,
  },
];

async function main() {
  const passwordHash = await bcrypt.hash("Demo@123", 10);

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        district: user.district,
        centreName: user.centreName,
        passwordHash,
      },
      create: {
        ...user,
        passwordHash,
      },
    });
  }

  console.log("Successfully seeded 6 CertiFlow demo users.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
