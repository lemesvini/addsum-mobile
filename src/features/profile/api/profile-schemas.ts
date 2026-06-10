import { z } from "zod";
import { requiredStringValidation } from "@/common/utils/zod";

export const profileEditSchema = z.object({
  fullName: requiredStringValidation({ min: 3, max: 100 }),
  avatarUrl: z.string().optional(),
});

export type ProfileEditSchema = z.infer<typeof profileEditSchema>;
