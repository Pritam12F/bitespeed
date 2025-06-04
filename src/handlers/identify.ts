import { Request, Response } from "express";
import { IdentifySchema } from "../zod";
import { db } from "../db";

export const identifyHandler = async (req: Request, res: Response) => {
  const { data, success } = IdentifySchema.safeParse(req.body);

  if (!success) {
    res.status(400).json({ message: "Invalid inputs" });
    return;
  }

  const { email, phoneNumber } = data;

  if (!email && !phoneNumber) {
    res.status(400).json({ message: "No inputs provided" });

    return;
  }

  try {
    const matchingContacts = await db.contact.findMany({
      where: {
        OR: [{ email: email }, { phoneNumber: phoneNumber }],
      },
    });

    if (matchingContacts.length === 0) {
      const newContact = await db.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "PRIMARY",
        },
      });

      res.json({
        contact: {
          primaryContactId: newContact.id,
          emails: [newContact.email],
          phoneNumbers: [newContact.phoneNumber],
          secondaryContactIds: [],
        },
      });

      return;
    }

    // Find the earliest created PRIMARY contact among the matching ones
    const primaryContact =
      matchingContacts.find((c) => c.linkPrecedence === "PRIMARY") ??
      (await db.contact.findUnique({
        where: { id: matchingContacts[0].primaryId! },
      }));

    const alreadyExists = matchingContacts.find(
      (c) => c.email === email && c.phoneNumber === phoneNumber
    );

    if (!alreadyExists) {
      // Create a secondary contact only if exact match doesn't exist
      const secondary = await db.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "SECONDARY",
          primaryId: primaryContact!.id,
        },
      });
      matchingContacts.push(secondary);

      res.json({
        contact: {
          primaryContactId: primaryContact!.id,
          emails: [
            primaryContact!.email,
            ...Array.from(
              new Set(
                matchingContacts
                  .filter((c) => c.linkPrecedence === "SECONDARY")
                  .map((c) => c.email)
              )
            ).filter((x) => x != null),
            ,
          ],
          phoneNumbers: [
            primaryContact!.phoneNumber,
            ...Array.from(
              new Set(
                matchingContacts
                  .filter((c) => c.linkPrecedence === "SECONDARY")
                  .map((c) => c.phoneNumber)
              )
            ),
          ].filter((x) => x != null),
          secondaryContactIds: matchingContacts
            .filter((c) => c.linkPrecedence === "SECONDARY")
            .map((c) => c.id),
        },
      });

      return;
    }

    const emailContact = await db.contact.findMany({
      where: {
        email: email,
      },
    });

    const phoneContact = await db.contact.findMany({
      where: {
        phoneNumber: phoneNumber,
      },
    });
    //TODO: Implement logic to check if email and phone are from two different primary contacts

    if (emailContact.length > 0 && phoneContact.length > 0) {
    }

    const allLinkedContacts = await db.contact.findMany({
      where: {
        primaryId: primaryContact!.id,
      },
    });

    const uniqueEmails = [
      primaryContact?.email,
      ...Array.from(
        new Set(
          allLinkedContacts
            .filter((x) => x.linkPrecedence === "SECONDARY")
            .map((c) => c.email)
        )
      ).filter((x) => x != null),
    ];

    const uniquePhones = [
      primaryContact?.phoneNumber,
      ...Array.from(
        new Set(
          allLinkedContacts
            .filter((x) => x.linkPrecedence === "SECONDARY")
            .map((c) => c.phoneNumber)
        )
      ).filter((x) => x != null),
    ];

    const secondaryIds = allLinkedContacts
      .filter((c) => c.linkPrecedence === "SECONDARY")
      .map((c) => c.id);

    res.json({
      contact: {
        primaryContactId: primaryContact!.id,
        emails: uniqueEmails,
        phoneNumbers: uniquePhones,
        secondaryContactIds: secondaryIds,
      },
    });
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
