"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentifySchema = void 0;
const zod_1 = require("zod");
exports.IdentifySchema = zod_1.z.object({
    email: zod_1.z.string().email({ message: "Invalid email" }).optional(),
    phoneNumber: zod_1.z
        .string()
        .min(1, { message: "Phone number must be non empty" })
        .optional(),
});
