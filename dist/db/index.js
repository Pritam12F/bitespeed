"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const prisma_1 = require("../generated/prisma");
exports.db = new prisma_1.PrismaClient();
