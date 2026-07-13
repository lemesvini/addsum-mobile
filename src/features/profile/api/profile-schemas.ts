import { z } from "zod";
import { requiredStringValidation } from "@/common/utils/zod";

export const profileEditSchema = z.object({
  fullName: requiredStringValidation({ min: 3, max: 100 }),
  avatarUrl: z.string().optional(),
  pix: z.string().trim().max(140, "Chave Pix muito longa").optional(),
});

export type ProfileEditSchema = z.infer<typeof profileEditSchema>;
