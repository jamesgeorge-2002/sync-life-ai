import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-provider";
import {
  Sparkles, Bot, Calendar, ListTodo, StickyNote, Wallet, Heart, Target,
  Zap, Shield, Check, ArrowRight, Star, MessageCircle,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  component: Landing,
});

const features = [
  { icon: Bot, title: "AI Assistant", desc: "ChatGPT-style copilot that plans your week, drafts emails and answers from your documents." },
  { icon: Calendar, title: "Smart Calendar", desc: "Auto time-blocking and conflict-aware scheduling that respects your energy." },
  { icon: ListTodo, title: "Adaptive Tasks", desc: "Kanban, subtasks and AI prioritization so the important always beats the urgent." },
  { icon: StickyNote, title: "Notes + RAG", desc: "Rich notes with semantic search across every doc, meeting and idea." },
  { icon: Wallet, title: "Finance Copilot", desc: "Track spend, predict cashflow and get AI budget suggestions in real time." },
  { icon: Heart, title: "Health & Mood", desc: "Sleep, workouts, meals and mood synced with wellness insights." },
  { icon: Target, title: "Goals & Habits", desc: "Break big goals into daily habits with streaks and an AI coach." },
  { icon: Shield, title: "Private by design", desc: "Your data is encrypted end-to-end. Your AI, your rules." },
];

const tiers = [
  { name: "Free", price: "₹0", tag: "Get started", features: ["Core tasks & notes", "50 AI messages / month", "Basic calendar", "Community access"], cta: "Start free" },
  { name: "Pro", price: "₹999", tag: "Most popular", highlight: true, features: ["Unlimited AI messages", "RAG on your documents", "Auto-scheduling & time blocks", "All modules unlocked", "Priority support"], cta: "Start 14-day trial" },
  { name: "Teams", price: "₹2499", tag: "Per member", features: ["Everything in Pro", "Shared knowledge base", "Team analytics", "Admin controls", "SSO & audit logs"], cta: "Talk to sales" },
];

const testimonials = [
  { name: "Priya M.", role: "Product Manager", quote: "LIFE-SYNC replaced 6 apps. My weeks feel calm for the first time in years." },
  { name: "Daniel L.", role: "Founder", quote: "The AI actually knows my docs. Weekly reviews used to take 2 hours — now 15 minutes." },
  { name: "Aisha R.", role: "PhD student", quote: "The study hub and RAG search are unreal. Flashcards from my papers in one click." },
];

const faqs = [
  { q: "How does LIFE-SYNC use AI?", a: "It combines LLMs, retrieval-augmented generation over your documents, and predictive analytics to plan, summarize and coach — always with your data in context." },
  { q: "Is my data private?", a: "Yes. Data is encrypted at rest and in transit, and we never train foundation models on your personal content." },
  { q: "Can I import from Notion / Google Calendar / Todoist?", a: "One-click importers exist for the major tools. Your workspace becomes the source of truth." },
  { q: "Do you offer a free plan?", a: "Yes — the Free plan includes core productivity plus 50 AI messages every month, forever." },
  { q: "Can I cancel anytime?", a: "Absolutely. No lock-in, and you can export your entire workspace at any time." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-base font-bold tracking-tight">LIFE-SYNC AI</span>
          </Link>
          <div className="hidden items-center gap-7 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">Features</a>
            <a href="#demo" className="text-sm text-muted-foreground hover:text-foreground">AI Demo</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground">Contact</a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/auth/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth/register"><Button size="sm" className="rounded-full bg-gradient-primary hover:opacity-90">Get started</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-20 text-center sm:px-6 sm:pt-28">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs backdrop-blur-xl">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            New — Gemini-powered AI Coach is live
          </div>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            Your entire life,{" "}
            <span className="gradient-text">intelligently in sync.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            LIFE-SYNC AI is the private, AI-native workspace for tasks, calendar, notes, health, finance and study —
            powered by LLMs, retrieval-augmented generation and predictive analytics.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth/register">
              <Button size="lg" className="rounded-full bg-gradient-primary shadow-elegant hover:opacity-90">
                Start Managing Your Life with AI <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/app">
              <Button size="lg" variant="outline" className="rounded-full">See live demo</Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Free forever plan · No credit card required</p>

          {/* Dashboard preview */}
          <div className="mx-auto mt-16 max-w-6xl">
            <div className="glass rounded-3xl p-3 shadow-glow">
              <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-4">
                  {[
                    { l: "Productivity", v: "86", d: "+12%" },
                    { l: "Focus hours", v: "5.6h", d: "+0.8h" },
                    { l: "Habits streak", v: "27d", d: "🔥" },
                    { l: "Mood", v: "8.2", d: "great" },
                  ].map((s) => (
                    <div key={s.l} className="rounded-xl border border-border/50 bg-background/50 p-4 text-left">
                      <p className="text-xs text-muted-foreground">{s.l}</p>
                      <p className="mt-1 text-2xl font-bold">{s.v}</p>
                      <p className="text-xs text-emerald-500">{s.d}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="md:col-span-2 rounded-xl border border-border/50 bg-background/50 p-4 text-left">
                    <p className="text-sm font-semibold">Weekly focus</p>
                    <div className="mt-4 flex h-32 items-end gap-2">
                      {[42, 65, 58, 90, 78, 45, 55].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t-lg bg-gradient-primary" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/50 p-4 text-left">
                    <p className="text-sm font-semibold">AI recommendation</p>
                    <p className="mt-2 text-xs text-muted-foreground">Block Thursday 8–12 for deep work. Your last 3 Thursdays hit 91 productivity.</p>
                    <Button size="sm" variant="secondary" className="mt-3 rounded-full">Apply</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-primary">Everything, one workspace</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Built to run your entire life</h2>
          <p className="mt-4 text-muted-foreground">Twenty modules, one intelligent system. Every feature knows about the others.</p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="glass rounded-2xl p-6 transition hover:-translate-y-1 hover:shadow-elegant">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Demo */}
      <section id="demo" className="border-y border-border/40 bg-gradient-hero">
        <div className="mx-auto max-w-7xl grid gap-10 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold text-primary">Ask anything</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">An AI that actually knows you.</h2>
            <p className="mt-4 text-muted-foreground">
              Ask about your week, your budget, your notes, your health. LIFE-SYNC pulls the context together and answers
              — with charts, plans, or emails ready to send.
            </p>
            <ul className="mt-6 space-y-3">
              {["RAG search across your PDFs and notes", "Voice chat and speech-to-text", "Auto schedule and time blocking", "Personalized weekly insights"].map((i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {i}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass rounded-3xl p-4 shadow-glow">
            <div className="rounded-2xl bg-card p-5">
              <div className="mb-3 flex items-center gap-2 border-b border-border/40 pb-3">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-primary-foreground"><Bot className="h-4 w-4" /></div>
                <p className="text-sm font-semibold">LIFE-SYNC Assistant</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-end"><div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-primary-foreground">Plan a focused week — 4h deep work + gym Mon/Wed/Fri.</div></div>
                <div><div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2">Here's your optimized week. I moved 2 low-priority meetings, blocked 8–12 for focus and scheduled gym at 6pm. Apply to calendar?</div></div>
                <div className="flex justify-end"><div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-primary-foreground">Yes — and summarize my spec doc.</div></div>
                <div><div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2">✅ Calendar updated. Summary of product-spec-v3.pdf: 5 key milestones, 3 open risks, ready-to-ship in 6 weeks.</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-primary">Pricing</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Simple, fair, cancel anytime</h2>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={
                "glass relative rounded-3xl p-8 " +
                (t.highlight ? "shadow-glow ring-2 ring-primary" : "")
              }
            >
              {t.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {t.tag}
                </div>
              )}
              <p className="text-sm text-muted-foreground">{t.name}</p>
              <p className="mt-2 text-4xl font-bold">{t.price}<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              <ul className="mt-6 space-y-3 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{f}</li>
                ))}
              </ul>
              <Link to="/auth/register" className="mt-8 block">
                <Button className={"w-full rounded-full " + (t.highlight ? "bg-gradient-primary" : "")} variant={t.highlight ? "default" : "outline"}>
                  {t.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-border/40 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-primary">Loved by makers</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">People building calmer, faster lives</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="glass rounded-2xl p-6">
                <div className="flex text-primary">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
                <p className="mt-4 text-sm">"{t.quote}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">{t.name[0]}</div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold text-primary">FAQ</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Questions, answered</h2>
        </div>
        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`i-${i}`} className="border-border/60">
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section id="contact" className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <div className="glass overflow-hidden rounded-3xl bg-gradient-hero p-12 text-center shadow-glow">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground">
            <Zap className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">Start managing your life with AI</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Join 50,000+ people who traded chaos for clarity.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/auth/register"><Button size="lg" className="rounded-full bg-gradient-primary">Create free account</Button></Link>
            <a href="mailto:hello@lifesync.ai"><Button size="lg" variant="outline" className="rounded-full"><MessageCircle className="mr-2 h-4 w-4" />Talk to us</Button></a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></div>
              <span className="font-bold">LIFE-SYNC AI</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">The intelligent workspace for your entire life.</p>
          </div>
          {[
            { h: "Product", i: ["Features", "Pricing", "Changelog", "Roadmap"] },
            { h: "Company", i: ["About", "Blog", "Careers", "Contact"] },
            { h: "Legal", i: ["Privacy", "Terms", "Security", "DPA"] },
          ].map((c) => (
            <div key={c.h}>
              <p className="text-sm font-semibold">{c.h}</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {c.i.map((x) => <li key={x}><a href="#" className="hover:text-foreground">{x}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">© 2026 LIFE-SYNC AI · Made with intent.</div>
      </footer>
    </div>
  );
}
