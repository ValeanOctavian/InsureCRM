"use server";

import { processQuestion } from "./engine";
import { getCurrentProfile } from "@/lib/auth/middleware";

export async function askAssistant(question: string) {
  const profile = await getCurrentProfile();
  return processQuestion(question, profile!.id);
}
