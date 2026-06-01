import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  policyId: z.string().uuid().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["todo", "in_progress", "done", "cancelled"]).default("todo"),
  dueDate: z.string().optional().nullable(),
});

export const taskUpdateSchema = taskSchema.partial();

export type TaskInput = z.infer<typeof taskSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
