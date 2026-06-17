import { z } from "zod";

export const companyIdSchema = z.string().uuid();
