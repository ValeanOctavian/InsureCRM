import Link from "next/link";
import {
  Shield,
  Users,
  FileText,
  Bell,
  RefreshCw,
  LayoutDashboard,
  Sparkles,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur-lg dark:border-zinc-800/80 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-50">
            <Shield className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            <span>InsureCRM</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* ─── Hero ─── */}
        <section className="relative overflow-hidden px-6 pb-32 pt-24">
          {/* Gradient background */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-100 via-transparent to-transparent dark:from-violet-950/40" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-100 via-transparent to-transparent dark:from-blue-950/30" />

          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-xs font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Insurance CRM
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl">
              Manage your insurance
              <br />
              brokerage with{" "}
              <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                AI assistance
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              Track policies, automate renewals, process documents with OCR,
              and let AI help you manage clients — all in one platform.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-zinc-800 hover:shadow-xl dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Start free trial
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-6 py-3.5 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Sign in
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 border-t border-zinc-200 pt-10 dark:border-zinc-800">
              {[
                { label: "Active Brokers", value: "500+" },
                { label: "Policies Tracked", value: "50K+" },
                { label: "Documents Processed", value: "10K+" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Features Grid ─── */}
        <section className="border-t border-zinc-200 bg-zinc-50/50 px-6 py-24 dark:border-zinc-800 dark:bg-zinc-950/50">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Everything you need to run your brokerage
              </h2>
              <p className="mt-4 text-lg text-zinc-500 dark:text-zinc-400">
                Tools designed specifically for Romanian insurance brokers.
              </p>
            </div>
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:border-violet-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-violet-800"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950">
                      <Icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <h3 className="mt-4 font-semibold text-zinc-900 dark:text-zinc-50">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── Demo Section ─── */}
        <section className="border-t border-zinc-200 px-6 py-24 dark:border-zinc-800">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Try the demo
            </div>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Ready to see it in action?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-500 dark:text-zinc-400">
              Jump right in with our pre-loaded demo account. See clients,
              policies, documents, and the full workflow in seconds.
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {/* Broker Demo */}
              <div className="rounded-xl border border-zinc-200 bg-white p-6 text-left dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mt-4 font-semibold text-zinc-900 dark:text-zinc-50">Broker Account</h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Full access to dashboard, clients, policies, documents, AI assistant, and more.
                </p>
                <div className="mt-4 space-y-2 rounded-lg bg-zinc-50 p-3 font-mono text-xs dark:bg-zinc-900">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Email</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">broker@insurecrm.com</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Password</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">Demo123!</span>
                  </div>
                </div>
                <Link
                  href="/login"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Open Broker Dashboard
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Client Portal Demo */}
              <div className="rounded-xl border border-zinc-200 bg-white p-6 text-left dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
                  <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="mt-4 font-semibold text-zinc-900 dark:text-zinc-50">Client Portal</h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Self-service portal to view policies, upload documents, and request renewals.
                </p>
                <div className="mt-4 space-y-2 rounded-lg bg-zinc-50 p-3 font-mono text-xs dark:bg-zinc-900">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Email</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">client@insurecrm.com</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Password</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">Demo123!</span>
                  </div>
                </div>
                <Link
                  href="/login"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  Open Client Portal
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <p className="mt-6 text-sm text-zinc-400">
              <CheckCircle2 className="mr-1 inline h-4 w-4 text-emerald-500" />
              Demo data includes 6 clients, 10 policies, vehicles, documents, tasks, and activity history.
            </p>
          </div>
        </section>

        {/* ─── Workflow Section ─── */}
        <section className="border-t border-zinc-200 bg-zinc-50/50 px-6 py-24 dark:border-zinc-800 dark:bg-zinc-950/50">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              From upload to renewal in minutes
            </h2>
            <p className="mt-4 text-lg text-zinc-500 dark:text-zinc-400">
              See how the platform handles the complete document-to-renewal workflow.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-3xl space-y-8">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex items-start gap-6">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-600 dark:bg-violet-950 dark:text-violet-400">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-violet-500" />
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{step.title}</h3>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8">
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Shield className="h-4 w-4" />
            InsureCRM
          </div>
          <p className="text-sm text-zinc-400">
            &copy; {new Date().getFullYear()} InsureCRM. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    title: "Client Management",
    description: "Full CRM with client profiles, contact info, document storage, and activity tracking. Manage your entire book of business.",
    icon: Users,
  },
  {
    title: "Policy Tracking",
    description: "Track RCA, CASCO, HOME, and more. Get automatic alerts when policies are expiring, with renewal workflow built in.",
    icon: Shield,
  },
  {
    title: "AI Document OCR",
    description: "Upload identity cards, registration papers, and policy documents. AI extracts the data and pre-fills your forms automatically.",
    icon: FileText,
  },
  {
    title: "Smart Dashboard",
    description: "At-a-glance view of your business: expiring policies, pending tasks, recent documents, and revenue insights.",
    icon: LayoutDashboard,
  },
  {
    title: "Renewal Automation",
    description: "Automated email reminders for policies expiring in 30, 14, 7, and 1 day. Clients can request renewals from their portal.",
    icon: Bell,
  },
  {
    title: "Client Portal",
    description: "Self-service portal where clients view policies, upload documents, request renewals, and update contact details.",
    icon: RefreshCw,
  },
];

const steps = [
  {
    title: "Upload a document",
    description: "Drag and drop a photo of the client's identity card, car registration, or policy document. The system checks image quality automatically.",
    icon: FileText,
  },
  {
    title: "AI extracts the data",
    description: "OCR technology reads the document and extracts key information — name, CNP, vehicle details, policy numbers — and populates the forms.",
    icon: Sparkles,
  },
  {
    title: "Review and confirm",
    description: "Review the extracted data, make any corrections, and confirm. The system creates or updates the client, vehicle, or policy record.",
    icon: CheckCircle2,
  },
  {
    title: "Create renewal request",
    description: "With the data ready, generate a renewal request. The client receives a notification and can access their portal to track progress.",
    icon: RefreshCw,
  },
  {
    title: "Client uploads missing documents",
    description: "The client logs into their portal, sees what's needed, and uploads any missing documents directly. No back-and-forth emails.",
    icon: Users,
  },
  {
    title: "Mark as renewed",
    description: "Once everything is in order, mark the policy as renewed with one click. The system creates the new policy and logs the activity.",
    icon: Bell,
  },
];
