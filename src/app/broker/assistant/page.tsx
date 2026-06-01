import { processQuestion } from "@/features/assistant/engine";
import type { AssistantResponse } from "@/features/assistant/engine";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { getCurrentProfile } from "@/lib/auth/middleware";

export const metadata = {
  title: "AI Assistant",
};

export default async function AssistantPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-zinc-500">Unable to load profile. Please try again.</p>
      </div>
    );
  }

  const brokerId = profile.id;

  const quickQuestions = [
    {
      id: "expiring-next-week",
      label: "Policies expiring next week",
      question: "What policies expire next week?",
    },
    {
      id: "clients-to-call",
      label: "Clients to call today",
      question: "Which clients should I call today?",
    },
    {
      id: "rca-no-casco",
      label: "RCA without CASCO",
      question: "Which clients have RCA but no CASCO?",
    },
    {
      id: "unclear-documents",
      label: "Unclear documents",
      question: "Which clients uploaded unclear documents?",
    },
    {
      id: "pending-renewals",
      label: "Pending renewals",
      question: "Which renewal requests are pending?",
    },
    {
      id: "monthly-revenue",
      label: "Estimated revenue",
      question: "How much estimated revenue can I recover this month?",
    },
  ];

  const initialResponses: Record<string, AssistantResponse> = {};
  await Promise.all(
    quickQuestions.map(async (q) => {
      initialResponses[q.id] = await processQuestion(q.question, brokerId);
    })
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">AI Assistant</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Ask questions about your portfolio, clients, policies, and more.
        </p>
      </div>

      <AssistantChat
        quickQuestions={quickQuestions}
        initialResponses={initialResponses}
      />
    </div>
  );
}
