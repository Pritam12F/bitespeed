import { db } from "../src/db";
import { LinkPrecedence } from "../src/generated/prisma";

async function main() {
  // Clear existing data
  await db.contact.deleteMany();

  // Create a primary contact
  const primary = await db.contact.create({
    data: {
      phoneNumber: "1234567890",
      email: "primary@example.com",
      linkPrecedence: LinkPrecedence.PRIMARY,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Create a secondary contact linked to the primary
  await db.contact.create({
    data: {
      phoneNumber: "9876543210",
      email: "secondary1@example.com",
      primaryId: primary.id,
      linkPrecedence: LinkPrecedence.SECONDARY,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await db.contact.create({
    data: {
      phoneNumber: "1112223333",
      email: "secondary2@example.com",
      primaryId: primary.id,
      linkPrecedence: LinkPrecedence.SECONDARY,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log("Seeding complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
