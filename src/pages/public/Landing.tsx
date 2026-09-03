import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  FileBarChart,
  LayoutDashboard,
  ListChecks,
  Lock,
  Menu,
  MonitorPlay,
  Sparkles,
  TerminalSquare,
  Video,
} from "lucide-react";

import { Logo, LogoMark } from "@/components/layout/Logo";
import { CircularSeal, VerdictStamp } from "@/components/shared/Stamp";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, roleHome } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI Mock Interviews",
    description:
      "Practice with an adaptive AI interviewer that asks role-specific questions, follows up on your answers, and adjusts difficulty as you go.",
  },
  {
    icon: Video,
    title: "Live Video Interviews",
    description:
      "A professional interview room with camera, microphone, screen sharing, live transcription, and synchronized interviewer tools.",
  },
  {
    icon: ListChecks,
    title: "MCQ Assessments",
    description:
      "Timed multiple-choice tests across 15+ categories with navigation, mark-for-review, server-side scoring, and instant explanations.",
  },
  {
    icon: TerminalSquare,
    title: "Technical Assessments",
    description:
      "Technical and coding question rounds built from your question bank or generated on demand for any role and difficulty.",
  },
  {
    icon: BrainCircuit,
    title: "AI Interview Analysis",
    description:
      "Every answer scored for relevance, technical accuracy, communication, clarity, and structure — with concrete recommendations.",
  },
  {
    icon: FileBarChart,
    title: "Candidate Reports",
    description:
      "Shareable, printable reports with per-question analysis, transcripts, interviewer notes, and an overall recommendation.",
  },
  {
    icon: LayoutDashboard,
    title: "Interviewer Dashboard",
    description:
      "Schedule interviews, invite candidates, manage question banks, take notes, score answers, and track every pipeline in one place.",
  },
  {
    icon: Lock,
    title: "Secure Platform",
    description:
      "Row-level security on every table, server-side scoring, audited admin actions, and explicit consent before any recording.",
  },
];

const PIPELINE = [
  ["Consent & device check", "Nothing records until the candidate says so."],
  ["Adaptive questioning", "The AI interviewer reacts to every answer."],
  ["Live transcription", "Spoken answers become searchable text."],
  ["Per-answer analysis", "Six observable signals, scored 0–100."],
  ["Optional video signals", "Separately consented. Frames never leave the browser."],
  ["Report & recommendation", "A verdict your whole committee can read."],
] as const;

const TESTIMONIALS = [
  {
    quote:
      "Testify replaced three tools for us. Candidates get a fair, consistent process and my team finally scores against the same rubric.",
    name: "Placeholder — Head of Talent",
    org: "Series B SaaS company",
  },
  {
    quote:
      "The mock interviews felt uncannily real. I practiced five nights in a row and walked into my on-site knowing exactly what to fix.",
    name: "Placeholder — Frontend Engineer",
    org: "Hired via Testify practice",
  },
  {
    quote:
      "Transcripts plus per-question AI analysis cut our debrief time in half. The reports are what we forward to hiring committees.",
    name: "Placeholder — Engineering Manager",
    org: "Enterprise retail group",
  },
];

const FAQS = [
  {
    q: "How do AI mock interviews work?",
    a: "You pick a role, experience level, interview type, and difficulty. Testify's AI interviewer generates questions one at a time, listens to your answer (typed or spoken with live transcription), analyzes it, and adapts the next question — including follow-ups that reference what you said.",
  },
  {
    q: "Is my camera or microphone ever accessed without asking?",
    a: "Never. Devices are only requested after you explicitly start an interview and give consent on a clear consent screen. Video-signal analysis is a separate, optional consent, and frames are processed in your browser — only aggregate signals are stored.",
  },
  {
    q: "What does the AI actually analyze?",
    a: "Observable communication signals: answer relevance, technical accuracy, clarity, structure, speaking pace, and filler words. The confidence indicator is a composite of these signals — it is not a psychological assessment, and Testify never infers protected characteristics.",
  },
  {
    q: "Can interviewers use their own questions?",
    a: "Yes. Interviewers manage a full question bank and MCQ bank — create, edit, duplicate, and filter by category, type, and difficulty — or let the AI generate a question set for a role and refine it.",
  },
  {
    q: "How is candidate data protected?",
    a: "Supabase Auth with row-level security means candidates only see their own data and interviewers only see interviews they run. Recordings and resumes live in private storage buckets with per-user policies, and admin actions are audit-logged.",
  },
  {
    q: "Do candidates see their results?",
    a: "Yes — candidates get a full results dashboard with scores, strengths, improvement areas, and progress charts. Private interviewer notes stay private unless explicitly shared.",
  },
];

const MARQUEE_ITEMS = [
  "Software Engineer", "Frontend", "Backend", "Full Stack", "Data Analyst", "Data Scientist",
  "DevOps", "QA", "Product Manager", "UI/UX", "HR", "Sales", "Marketing",
];

/** Hand-typeset interview score sheet — the product, shown as a document. */
function ScoreSheetMock() {
  const rows: Array<[string, number]> = [
    ["Relevance", 92],
    ["Technical accuracy", 88],
    ["Communication", 84],
    ["Clarity", 74],
    ["Structure", 69],
    ["Confidence indicator", 81],
  ];
  return (
    <div aria-hidden="true" className="relative mx-auto max-w-2xl">
      <div className="rounded-lg border-2 border-foreground bg-card p-6 shadow-press-lg sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b-2 border-foreground pb-4">
          <div>
            <p className="eyebrow text-muted-foreground">Interview record · No. 0047</p>
            <p className="mt-1 font-display text-2xl font-bold">Aisha K. — Frontend Developer</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Technical round · 32 min · transcribed</p>
          </div>
          <LogoMark className="h-9 w-9 shrink-0" />
        </div>

        <div className="mt-4 grid gap-x-10 gap-y-2.5 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-3">
              <span className="text-sm font-semibold">{label}</span>
              <span className="mx-1 flex-1 border-b border-dotted border-foreground/40" />
              <span className="score-mono text-sm font-bold">{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-foreground/20 pt-4">
          <p className="eyebrow text-muted-foreground">From the transcript</p>
          <p className="mt-1.5 font-display text-[15px] italic leading-relaxed text-foreground/90">
            “…for expensive derived state I'd start with useMemo, but if the computation needs data we
            already join on the server, I'd move it there and cache the response instead.”
          </p>
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="eyebrow text-muted-foreground">Overall</p>
            <p className="score-mono text-5xl font-bold leading-none">87</p>
          </div>
          <VerdictStamp verdict="strong_hire" animate={false} className="mb-1 mr-1" />
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { session, role } = useAuth();
  const authedHome = session ? roleHome(role) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b-2 border-foreground bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="Testify home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Landing navigation">
            {[
              ["#features", "Features"],
              ["#how-it-works", "How it works"],
              ["#faq", "FAQ"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="eyebrow text-muted-foreground transition-colors hover:text-primary">
                {label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-2.5 md:flex">
            {authedHome ? (
              <Button asChild variant="gradient">
                <Link to={authedHome}>
                  Open dashboard <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild variant="gradient">
                  <Link to="/register">Get started</Link>
                </Button>
              </>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild><a href="#features">Features</a></DropdownMenuItem>
              <DropdownMenuItem asChild><a href="#how-it-works">How it works</a></DropdownMenuItem>
              <DropdownMenuItem asChild><a href="#faq">FAQ</a></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/login">Sign in</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/register">Get started</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Hero */}
      <section className="texture-paper relative overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8">
          <CircularSeal
            size={150}
            className="absolute right-[4%] top-10 hidden -rotate-12 text-primary/70 lg:block"
          />

          <div className="max-w-4xl">
            <p className="animate-fade-in-up flex items-center gap-3">
              <span className="h-[2px] w-10 bg-foreground" aria-hidden="true" />
              <span className="eyebrow text-primary">Smarter Interviews. Better Decisions.</span>
            </p>
            <h1 className="animate-fade-in-up animation-delay-100 mt-6 font-display text-[2.9rem] font-black leading-[0.98] tracking-tight sm:text-7xl lg:text-[5.5rem]">
              AI-Powered
              <br />
              <span className="italic text-primary">Interviews</span> &amp;{" "}
              <span className="relative inline-block">
                Assessments
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 h-[6px] w-full bg-accent/80 sm:-bottom-2 sm:h-2"
                />
              </span>
            </h1>
            <p className="animate-fade-in-up animation-delay-200 mt-7 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Conduct smarter interviews, evaluate candidates consistently, and help candidates improve
              with AI-powered interview analysis.
            </p>
            <div className="animate-fade-in-up animation-delay-300 mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/register?role=candidate">
                  Start Practicing <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/register?role=interviewer">
                  <MonitorPlay aria-hidden="true" /> Conduct an Interview
                </Link>
              </Button>
            </div>
          </div>

          <div className="animate-fade-in-up animation-delay-500 mt-16">
            <ScoreSheetMock />
          </div>

          <dl className="animate-fade-in-up animation-delay-700 mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {[
              ["14+", "Job roles covered"],
              ["16", "Assessment categories"],
              ["6", "Signals per answer"],
              ["100%", "Consent-first recording"],
            ].map(([value, label]) => (
              <div key={label} className="rule-top pt-3">
                <dt className="eyebrow text-muted-foreground">{label}</dt>
                <dd className="score-mono mt-1 text-4xl font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Role marquee */}
        <div className="overflow-hidden border-y-2 border-foreground bg-foreground py-2.5 text-background">
          <div className="flex w-max animate-marquee gap-0" aria-hidden="true">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center">
                {MARQUEE_ITEMS.map((item) => (
                  <span key={`${copy}-${item}`} className="eyebrow flex items-center px-5">
                    {item}
                    <span className="ml-10 inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features — the ledger grid */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow text-accent">The platform</p>
          <h2 className="mt-3 font-display text-4xl font-black tracking-tight sm:text-5xl">
            Everything the interview loop needs
          </h2>
          <p className="mt-4 text-muted-foreground">
            One place for candidates to practice, interviewers to evaluate, and teams to decide.
          </p>
        </div>
        <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <div key={feature.title} className="rule-top group pt-4">
              <div className="flex items-center justify-between">
                <span className="score-mono text-sm font-bold text-muted-foreground transition-colors group-hover:text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <feature.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <h3 className="mt-3 font-display text-xl font-bold leading-tight">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y-2 border-foreground bg-card">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr,1.4fr]">
            <div>
              <p className="eyebrow text-accent">The pipeline</p>
              <h2 className="mt-3 font-display text-4xl font-black tracking-tight sm:text-5xl">
                From hello to hiring signal
              </h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                Every interview runs through the same transparent pipeline — consent first, analysis last.
              </p>
              <CircularSeal size={120} className="mt-10 hidden rotate-6 text-accent/70 lg:inline-block" spinning={false} />
            </div>
            <ol className="divide-y divide-foreground/15">
              {PIPELINE.map(([title, caption], i) => (
                <li key={title} className="group flex items-baseline gap-5 py-5">
                  <span className="score-mono text-lg font-bold text-primary">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <p className="font-display text-xl font-bold">{title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{caption}</p>
                  </div>
                  <ArrowUpRight
                    className="ml-auto h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Testimonials — pull quotes */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <p className="eyebrow text-accent">Testimonials</p>
        <h2 className="mt-3 font-display text-4xl font-black tracking-tight sm:text-5xl">
          Teams and candidates, <span className="italic text-primary">aligned</span>
        </h2>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <figure key={t.name} className={cn("rule-top pt-5", i === 1 && "md:translate-y-8")}>
              <span aria-hidden="true" className="font-display text-6xl font-black leading-none text-accent">
                “
              </span>
              <blockquote className="mt-2 font-display text-lg font-medium leading-snug">
                {t.quote}
              </blockquote>
              <figcaption className="mt-5">
                <p className="text-sm font-bold">{t.name}</p>
                <p className="eyebrow mt-1 text-muted-foreground">{t.org}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="rule-top pt-5">
          <p className="eyebrow text-accent">FAQ</p>
          <h2 className="mt-3 font-display text-4xl font-black tracking-tight">Frequently asked questions</h2>
        </div>
        <Accordion type="single" collapsible className="mt-8">
          {FAQS.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-foreground/15">
              <AccordionTrigger className="gap-4 text-left font-display text-lg font-bold hover:text-primary hover:no-underline">
                <span className="flex items-baseline gap-4">
                  <span className="score-mono text-xs font-medium text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {faq.q}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pl-9 text-[15px] leading-relaxed text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA — inked band */}
      <section className="border-t-2 border-foreground bg-foreground text-background">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-10 px-4 py-20 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              Ready for <span className="italic text-accent">smarter</span> interviews?
            </h2>
            <p className="mt-4 max-w-xl text-background/70">
              Join Testify free — practice as a candidate or run your first structured interview in minutes.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="shadow-none hover:translate-x-0 hover:translate-y-0 hover:opacity-90 active:opacity-80">
                <Link to="/register?role=candidate">Start Practicing</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-background/40 bg-transparent text-background hover:border-background hover:bg-background/10"
              >
                <Link to="/register?role=interviewer">Conduct an Interview</Link>
              </Button>
            </div>
          </div>
          <CircularSeal size={170} className="shrink-0 -rotate-6 text-background/85" />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground pb-10 text-background">
        <div className="mx-auto max-w-7xl border-t border-background/20 px-4 pt-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-[1.4fr,1fr,1fr,1fr]">
            <div>
              <Logo onDark />
              <p className="mt-3 max-w-xs text-sm text-background/60">
                Smarter Interviews. Better Decisions.
              </p>
            </div>
            <nav aria-label="Product links">
              <h3 className="eyebrow text-background/50">Product</h3>
              <ul className="mt-3 space-y-2 text-sm font-medium text-background/75">
                <li><a href="#features" className="hover:text-accent">Features</a></li>
                <li><Link to="/register?role=candidate" className="hover:text-accent">Practice interviews</Link></li>
                <li><Link to="/register?role=interviewer" className="hover:text-accent">For interviewers</Link></li>
              </ul>
            </nav>
            <nav aria-label="Company links">
              <h3 className="eyebrow text-background/50">Company</h3>
              <ul className="mt-3 space-y-2 text-sm font-medium text-background/75">
                <li><a href="#how-it-works" className="hover:text-accent">About</a></li>
                <li><a href="mailto:hello@testify.example" className="hover:text-accent">Contact</a></li>
              </ul>
            </nav>
            <nav aria-label="Legal links">
              <h3 className="eyebrow text-background/50">Legal</h3>
              <ul className="mt-3 space-y-2 text-sm font-medium text-background/75">
                <li><Link to="/privacy" className="hover:text-accent">Privacy</Link></li>
                <li><Link to="/terms" className="hover:text-accent">Terms</Link></li>
                <li><Link to="/security" className="hover:text-accent">Security</Link></li>
                <li><Link to="/ai-disclosure" className="hover:text-accent">AI Disclosure</Link></li>
              </ul>
            </nav>
          </div>
          <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-background/20 pt-6 text-xs text-background/50 sm:flex-row sm:items-center">
            <p>© {new Date().getFullYear()} Testify. All rights reserved.</p>
            <p className="eyebrow">Built for fair, consistent hiring</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
