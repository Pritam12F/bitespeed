import { z } from "zod";

export const IdentifySchema = z.object({
  email: z.string().email({ message: "Invalid email" }).optional(),
  phoneNumber: z
    .string()
    .min(1, { message: "Phone number must be non empty" })
    .optional(),
});
