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
const db_1 = require("../src/db");
const prisma_1 = require("./generated/prisma");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // Clear existing data
        yield db_1.db.contact.deleteMany();
        // Create a primary contact
        const primary = yield db_1.db.contact.create({
            data: {
                phoneNumber: "1234567890",
                email: "primary@example.com",
                linkPrecedence: prisma_1.LinkPrecedence.PRIMARY,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
        // Create a secondary contact linked to the primary
        yield db_1.db.contact.create({
            data: {
                phoneNumber: "9876543210",
                email: "secondary1@example.com",
                primaryId: primary.id,
                linkPrecedence: prisma_1.LinkPrecedence.SECONDARY,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
        yield db_1.db.contact.create({
            data: {
                phoneNumber: "1112223333",
                email: "secondary2@example.com",
                primaryId: primary.id,
                linkPrecedence: prisma_1.LinkPrecedence.SECONDARY,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
        console.log("Seeding complete");
    });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield db_1.db.$disconnect();
}));
