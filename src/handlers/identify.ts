import { Request, Response } from "express";
import { IdentifySchema } from "../zod";
import { db } from "../db";

/**
 * Handler for the identify endpoint that manages contact consolidation
 * This endpoint handles three main scenarios:
 * 1. Creating a new contact if no matching contact exists
 * 2. Linking a new contact to an existing primary contact
 * 3. Consolidating two primary contacts if they share email/phone
 */
export const identifyHandler = async (req: Request, res: Response) => {
  // Validate request body against schema
  const { data, success } = IdentifySchema.safeParse(req.body);

  if (!success) {
    res.status(400).json({ message: "Invalid inputs" });
    return;
  }

  const { email, phoneNumber } = data;

  // Ensure at least one identifier is provided
  if (!email && !phoneNumber) {
    res.status(400).json({ message: "No inputs provided" });
    return;
  }

  try {
    // Find all contacts that match either email or phone number
    const matchingContacts = await db.contact.findMany({
      where: {
        OR: [{ email: email }, { phoneNumber: phoneNumber }],
      },
    });

    // Case 1: No matching contacts found - create new primary contact
    if (matchingContacts.length === 0) {
      console.log("No matching contacts found, creating new contact");
      const newContact = await db.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "PRIMARY",
        },
      });
      // Return simple response for new contact
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

    // Find the primary contact - either directly or through linked contact
    const primaryContact =
      matchingContacts.find((c) => c.linkPrecedence === "PRIMARY") ??
      (await db.contact.findUnique({
        where: { id: matchingContacts[0].primaryId! },
      }));

    // Check if exact match exists (same email and phone)
    let alreadyExists;

    if (!email && phoneNumber) {
      alreadyExists = matchingContacts.find(
        (c) => c.phoneNumber === phoneNumber
      );
    } else if (!phoneNumber && email) {
      alreadyExists = matchingContacts.find((c) => c.email === email);
    } else {
      alreadyExists = matchingContacts.find(
        (c) => c.email === email && c.phoneNumber === phoneNumber
      );
    }

    // Case 2: No exact match - create secondary contact or consolidate primaries
    if (!alreadyExists) {
      console.log("Creating secondary contact");

      // Check if email and phone exist in different primary contacts
      const emailExists = await db.contact.findFirst({
        where: {
          email,
        },
      });

      const phoneExists = await db.contact.findFirst({
        where: {
          phoneNumber,
        },
      });

      // Case 3: Consolidate two primary contacts if they share identifiers
      if (
        emailExists?.linkPrecedence === "PRIMARY" &&
        phoneExists?.linkPrecedence === "PRIMARY" &&
        emailExists.id !== phoneExists.id
      ) {
        // Make the older contact primary and newer one secondary
        if (emailExists.createdAt <= phoneExists.createdAt) {
          await db.contact.update({
            where: { id: phoneExists.id },
            data: {
              linkPrecedence: "SECONDARY",
              primaryId: emailExists.id,
            },
          });

          await db.contact.updateMany({
            where: {
              primaryId: phoneExists.id,
            },
            data: {
              primaryId: emailExists.id,
            },
          });
        } else {
          await db.contact.update({
            where: { id: emailExists.id },
            data: {
              linkPrecedence: "SECONDARY",
              primaryId: phoneExists.id,
            },
          });

          await db.contact.updateMany({
            where: {
              primaryId: emailExists.id,
            },
            data: {
              primaryId: phoneExists.id,
            },
          });
        }

        // Return consolidated contact information
        res.json({
          contact: {
            primaryContactId: primaryContact!.id,
            emails: new Set([
              primaryContact!.email,
              ...Array.from(
                new Set(
                  matchingContacts
                    .filter((c) => c.linkPrecedence === "SECONDARY")
                    .map((c) => c.email)
                )
              ).filter((x) => x != null),
            ]),
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

      // Create new secondary contact linked to primary
      const secondary = await db.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "SECONDARY",
          primaryId: primaryContact!.id,
        },
      });
      matchingContacts.push(secondary);

      // Return updated contact information including new secondary
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

    // Case 4: Exact match exists - return all linked contacts
    const allLinkedContacts = await db.contact.findMany({
      where: {
        primaryId: primaryContact!.id,
      },
    });

    // Collect unique emails and phone numbers from all linked contacts
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

    // Return consolidated contact information
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
    res.status(500).json({ message: "Internal server error" });
  }
};
