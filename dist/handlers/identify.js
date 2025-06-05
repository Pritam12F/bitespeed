"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.identifyHandler = void 0;
const zod_1 = require("../zod");
const db_1 = require("../db");
const identifyHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { data, success } = zod_1.IdentifySchema.safeParse(req.body);
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
        const matchingContacts = yield db_1.db.contact.findMany({
            where: {
                OR: [{ email: email }, { phoneNumber: phoneNumber }],
            },
        });
        if (matchingContacts.length === 0) {
            const newContact = yield db_1.db.contact.create({
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
        const primaryContact = (_a = matchingContacts.find((c) => c.linkPrecedence === "PRIMARY")) !== null && _a !== void 0 ? _a : (yield db_1.db.contact.findUnique({
            where: { id: matchingContacts[0].primaryId },
        }));
        const alreadyExists = matchingContacts.find((c) => c.email === email && c.phoneNumber === phoneNumber);
        if (!alreadyExists) {
            // Create a secondary contact only if exact match doesn't exist
            const secondary = yield db_1.db.contact.create({
                data: {
                    email,
                    phoneNumber,
                    linkPrecedence: "SECONDARY",
                    primaryId: primaryContact.id,
                },
            });
            matchingContacts.push(secondary);
            res.json({
                contact: {
                    primaryContactId: primaryContact.id,
                    emails: [
                        primaryContact.email,
                        ...Array.from(new Set(matchingContacts
                            .filter((c) => c.linkPrecedence === "SECONDARY")
                            .map((c) => c.email))).filter((x) => x != null),
                        ,
                    ],
                    phoneNumbers: [
                        primaryContact.phoneNumber,
                        ...Array.from(new Set(matchingContacts
                            .filter((c) => c.linkPrecedence === "SECONDARY")
                            .map((c) => c.phoneNumber))),
                    ].filter((x) => x != null),
                    secondaryContactIds: matchingContacts
                        .filter((c) => c.linkPrecedence === "SECONDARY")
                        .map((c) => c.id),
                },
            });
            return;
        }
        const allLinkedContacts = yield db_1.db.contact.findMany({
            where: {
                primaryId: primaryContact.id,
            },
        });
        const uniqueEmails = [
            primaryContact === null || primaryContact === void 0 ? void 0 : primaryContact.email,
            ...Array.from(new Set(allLinkedContacts
                .filter((x) => x.linkPrecedence === "SECONDARY")
                .map((c) => c.email))).filter((x) => x != null),
        ];
        const uniquePhones = [
            primaryContact === null || primaryContact === void 0 ? void 0 : primaryContact.phoneNumber,
            ...Array.from(new Set(allLinkedContacts
                .filter((x) => x.linkPrecedence === "SECONDARY")
                .map((c) => c.phoneNumber))).filter((x) => x != null),
        ];
        const secondaryIds = allLinkedContacts
            .filter((c) => c.linkPrecedence === "SECONDARY")
            .map((c) => c.id);
        res.json({
            contact: {
                primaryContactId: primaryContact.id,
                emails: uniqueEmails,
                phoneNumbers: uniquePhones,
                secondaryContactIds: secondaryIds,
            },
        });
    }
    catch (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.identifyHandler = identifyHandler;
