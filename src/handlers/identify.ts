import { Request, Response } from "express";
import { IdentifySchema } from "../zod";
import { db } from "../db";

export const identifyHandler = async (req: Request, res: Response) => {
  const { data, success } = IdentifySchema.safeParse(req.body);

  if (!success) {
    res.status(400).json({
      message: "Invalid inputs",
    });

    return;
  }

  if (!data.email && data.phoneNumber) {
    res.status(401).json({
      message: "No inputs provided",
    });
  }

  try {
    const contactInDb = await db.contact.findFirst({
      where: {
        OR: [
          {
            phoneNumber: data.phoneNumber,
          },
          {
            email: data.email,
          },
        ],
      },
    });

    if (!contactInDb) {
      const newContact = await db.contact.create({
        data: {
          phoneNumber: data.phoneNumber,
          email: data.email,
          linkPrecedence: "PRIMARY",
        },
      });

      const contact = {
        primaryContactId: newContact.id,
        emails: [newContact.email],
        phoneNumbers: [newContact.phoneNumber],
        secondaryContactIds: [],
      };

      res.json({ contact });

      return;
    } else {
      const allContacts = await db.contact.findMany();

      const emailExists = allContacts.filter((x) => x.email === data.email);
      const phoneExists = allContacts.filter(
        (x) => x.phoneNumber === data.phoneNumber
      );

      if (!emailExists.length) {
        await db.contact.create({
          data: {
            phoneNumber: data.phoneNumber,
            email: data.email,
            linkPrecedence: "SECONDARY",
            primaryId:
              contactInDb.linkPrecedence === "PRIMARY"
                ? contactInDb.id
                : contactInDb.primaryId,
          },
        });
      }

      if (!phoneExists.length) {
        await db.contact.create({
          data: {
            phoneNumber: data.phoneNumber,
            email: data.email,
            linkPrecedence: "SECONDARY",
            primaryId:
              contactInDb.linkPrecedence === "PRIMARY"
                ? contactInDb.id
                : contactInDb.primaryId,
          },
        });
      }
    }
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({
      message: "Internal server error",
    });
    return;
  }
};
