"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { askAssistant } from "@/features/assistant/actions";
import type { AssistantResponse } from "@/features/assistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Loader2,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

interface QuickQuestion {
  id: string;
  label: string;
  question: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: AssistantResponse;
  error?: boolean;
}

interface AssistantChatProps {
  quickQuestions: QuickQuestion[];
  initialResponses: Record<string, AssistantResponse>;
}

export function AssistantChat({ quickQuestions, initialResponses }: AssistantChatProps) {
  const precomputedRef = useRef(initialResponses);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your AI assistant. I can help you with questions about your brokerage. Try one of the quick questions below or type your own.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [askedQuestionTexts, setAskedQuestionTexts] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    async (question: string) => {
      if (!question.trim() || loading) return;

      const trimmedQuestion = question.trim();
      const questionKey = trimmedQuestion.toLowerCase();
      const isCustomQuestion = !quickQuestions.some((q) => q.question.toLowerCase() === questionKey);

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmedQuestion,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setAskedQuestionTexts((prev) => new Set(prev).add(questionKey));

      // Check if we have a pre-computed response for this question
      const matchedQQ = quickQuestions.find((q) => q.question.toLowerCase() === questionKey);
      const precomputed = matchedQQ ? precomputedRef.current[matchedQQ.id] : undefined;

      if (precomputed && !isCustomQuestion) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: precomputed.summary,
            response: precomputed,
          },
        ]);
        return;
      }

      setLoading(true);

      try {
        const response = await askAssistant(trimmedQuestion);

        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.summary,
          response,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        const errorMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I ran into an error. Please try again.",
          error: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }

      setLoading(false);
    },
    [loading, quickQuestions]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSend(input);
    },
    [input, handleSend]
  );

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Chat Header */}
      <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900">
          <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-300" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">AI Assistant</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Rule-based answers · Real data</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-3">
              {/* User Message */}
              {msg.role === "user" && (
                <div className="flex items-start justify-end gap-3">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-zinc-900 px-4 py-2.5 text-sm text-white dark:bg-zinc-50 dark:text-zinc-900">
                    {msg.content}
                  </div>
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <User className="h-4 w-4 text-zinc-500" />
                  </div>
                </div>
              )}

              {/* Assistant Message */}
              {msg.role === "assistant" && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900">
                    <Bot className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                      {msg.content}
                    </p>

                    {/* Response Cards */}
                    {msg.response?.sections.map((section, i) => (
                      <div key={i} className="space-y-2">
                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          {section.title}
                        </p>

                        {/* List */}
                        {section.type === "list" && section.items && (
                          <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                            {section.items.map((item, j) => (
                              <div key={j} className="flex items-center justify-between px-3 py-2.5 text-sm">
                                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                                  {item.label}
                                </span>
                                <span className="text-xs text-zinc-500">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Stats */}
                        {section.type === "stats" && section.stats && (
                          <div className="grid grid-cols-2 gap-2">
                            {section.stats.map((stat, j) => (
                              <div
                                key={j}
                                className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                              >
                                <p className="text-xs text-zinc-500">{stat.label}</p>
                                <p
                                  className={cn(
                                    "mt-1 text-lg font-bold",
                                    stat.color === "green" && "text-green-600 dark:text-green-400",
                                    stat.color === "yellow" && "text-yellow-600 dark:text-yellow-400",
                                    stat.color === "red" && "text-red-600 dark:text-red-400",
                                    stat.color === "blue" && "text-blue-600 dark:text-blue-400",
                                    !stat.color && "text-zinc-900 dark:text-zinc-50"
                                  )}
                                >
                                  {stat.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Alerts */}
                        {section.type === "alert" && section.alerts && (
                          <div className="space-y-2">
                            {section.alerts.map((alert, j) => (
                              <div
                                key={j}
                                className={cn(
                                  "flex items-start gap-2 rounded-lg p-3 text-sm",
                                  alert.severity === "danger" && "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
                                  alert.severity === "warning" && "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
                                  alert.severity === "info" && "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                                )}
                              >
                                {alert.severity === "danger" && <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />}
                                {alert.severity === "warning" && <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />}
                                {alert.severity === "info" && <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />}
                                {alert.message}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Actions */}
                    {msg.response?.actions && msg.response.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {msg.response.actions.map((action, j) => (
                          <a
                            key={j}
                            href={action.href}
                            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {action.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900">
                <Bot className="h-4 w-4 text-violet-600 dark:text-violet-300" />
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Questions */}
      <div className="border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          Quick questions
        </p>
        <div className="flex flex-wrap gap-1.5">
          {quickQuestions.map((q) => {
            const wasAsked = askedQuestionTexts.has(q.question.toLowerCase());
            return (
              <button
                key={q.id}
                onClick={() => handleSend(q.question)}
                disabled={loading || wasAsked}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                  wasAsked
                    ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                    : "bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950 dark:text-violet-400 dark:hover:bg-violet-900"
                )}
              >
                {wasAsked ? <CheckCircle2 className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                {q.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your brokerage..."
          className="h-9 flex-1 text-sm"
          disabled={loading}
        />
        <Button type="submit" size="sm" disabled={!input.trim() || loading} className="h-9 px-3">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
