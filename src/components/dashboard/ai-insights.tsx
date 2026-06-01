"use client";

import { Sparkles, TrendingUp, Users, Bell } from "lucide-react";
import type { ReactNode } from "react";

interface InsightCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  color: string;
}

function InsightCard({ icon, title, description, color }: InsightCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {title}
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
    </div>
  );
}

export function AiInsights() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-6 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                AI Insights
              </h3>
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Smart recommendations and alerts for your brokerage
            </p>
          </div>
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-400">
            Coming Soon
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <InsightCard
            icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
            title="Client Retention Analysis"
            description="Identify clients at risk of churning based on policy renewal history."
            color="bg-blue-100 dark:bg-blue-950"
          />
          <InsightCard
            icon={<Users className="h-5 w-5 text-emerald-600" />}
            title="Cross-sell Opportunities"
            description="Clients with RCA policies who may need CASCO or HOME coverage."
            color="bg-emerald-100 dark:bg-emerald-950"
          />
          <InsightCard
            icon={<Bell className="h-5 w-5 text-amber-600" />}
            title="Expiry Predictions"
            description="Policies predicted to expire within the next 60 days based on patterns."
            color="bg-amber-100 dark:bg-amber-950"
          />
          <InsightCard
            icon={<Sparkles className="h-5 w-5 text-violet-600" />}
            title="Document Summary"
            description="Ask AI to summarize a client's policy documents or extract key dates."
            color="bg-violet-100 dark:bg-violet-950"
          />
        </div>
      </div>
    </div>
  );
}
