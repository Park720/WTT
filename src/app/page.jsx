import Link from 'next/link';
import { Avatar, AvatarStack, StatusPill, PriorityDot, Icon, Logo } from '@/components/ui';

const DEMO = {
  u1: { id: 'u1', name: 'Mira Osei',        hue: 22,  initials: 'MO' },
  u2: { id: 'u2', name: 'Dao Nguyen',       hue: 200, initials: 'DN' },
  u3: { id: 'u3', name: 'Ines Koskinen',    hue: 318, initials: 'IK' },
  u4: { id: 'u4', name: 'Ravi Subramanian', hue: 150, initials: 'RS' },
  u5: { id: 'u5', name: 'Talia Brooks',     hue: 260, initials: 'TB' },
};

const HERO_USERS = [DEMO.u1, DEMO.u2, DEMO.u3, DEMO.u4, DEMO.u5];

const KANBAN_PREVIEW = [
  { key: 'TODO', items: [
    { title: 'Kickoff notes',       priority: 'LOW',    user: DEMO.u4 },
    { title: 'Audit competitors',   priority: 'MEDIUM', user: DEMO.u1 },
  ]},
  { key: 'IN_PROGRESS', items: [
    { title: 'Dashboard hi-fi mock', priority: 'HIGH',   user: DEMO.u1, live: true },
    { title: 'Data table variants',  priority: 'MEDIUM', user: DEMO.u3 },
  ]},
  { key: 'PENDING_REVIEW', items: [
    { title: 'Websocket refactor',   priority: 'HIGH',   user: DEMO.u2 },
  ]},
  { key: 'DONE', items: [
    { title: 'IA v2',               priority: 'MEDIUM', user: DEMO.u1 },
    { title: 'Alert sound bug',     priority: 'MEDIUM', user: DEMO.u5 },
  ]},
];

const FEATURES = [
  { tone: 'brand',   title: 'Parent/child tasks',       desc: 'Nest subtasks as deep as your ambition. Progress rolls up automatically — no manual math.',                         icon: 'Kanban'   },
  { tone: 'sky',     title: 'Review queue, not standups', desc: 'Members request review. Managers approve. Nobody dials into a call about a checkbox.',                             icon: 'Check'    },
  { tone: 'amber',   title: 'Dependency locks',          desc: '🔒 Blocked tasks stay hidden until upstream work ships. The next thing to do is never ambiguous.',                  icon: 'Lock'     },
  { tone: 'emerald', title: 'Pomodoro, built-in',        desc: 'A 25-minute timer pinned to a real task. Logged hours flow back into the plan. No context switching.',             icon: 'Timer'    },
  { tone: 'violet',  title: 'Role-aware views',          desc: 'Managers see the orchestra. Members see their part. Same source of truth, two mental models.',                      icon: 'Boss'     },
  { tone: 'slate',   title: 'One-click export',          desc: 'PDF, Markdown, iCal, CSV. For the auditors, the skeptics, and the one stakeholder who loves spreadsheets.',        icon: 'Download' },
];

const TONE_ICON = {
  brand:   'bg-orange-50 text-orange-600',
  sky:     'bg-sky-50 text-sky-600',
  amber:   'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet:  'bg-violet-50 text-violet-600',
  slate:   'bg-slate-100 text-slate-600',
};

function HeroKanbanPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-br from-orange-100/60 via-white to-slate-100 rounded-[28px] blur-sm" />
      <div className="relative rounded-3xl bg-white border border-slate-200 shadow-lift-lg p-4">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-1 pb-3 border-b border-slate-100">
          <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 text-[11px] font-mono text-slate-400">orbital.wtt/planner</span>
          <span className="ml-auto text-[11px] text-slate-400">Week of Apr 20</span>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-3">
          {KANBAN_PREVIEW.map((col) => (
            <div key={col.key} className="min-w-0">
              <div className="flex items-center gap-2 mb-2 px-1">
                <StatusPill status={col.key} size="sm" />
                <span className="ml-auto font-mono text-[10px] text-slate-400">{col.items.length}</span>
              </div>
              <div className="space-y-2">
                {col.items.map((card, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-xl bg-white border border-slate-200 text-[12px] leading-snug${card.live ? ' live-pulse border-orange-300' : ''}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <PriorityDot priority={card.priority} />
                      {card.live && <span className="font-mono text-[9px] text-orange-600 ml-auto">LIVE</span>}
                    </div>
                    <div className="text-slate-800 font-medium">{card.title}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <Avatar user={card.user} size={18} />
                      <span className="font-mono text-[10px] text-slate-400">T-{i + 1}</span>
                    </div>
                  </div>
                ))}
                {col.items.length === 0 && (
                  <div className="h-16 rounded-xl border border-dashed border-slate-200" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3 text-[11px] text-slate-500">
          <AvatarStack users={[DEMO.u1, DEMO.u2, DEMO.u3, DEMO.u4]} size={18} />
          <span>5 live on Orbital</span>
          <span className="ml-auto font-mono tabular-nums">64% · 27/42</span>
        </div>
      </div>

      {/* Floating pomodoro pill preview */}
      <div className="absolute -bottom-5 -right-3 rotate-[-3deg]">
        <div className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-full bg-slate-900 text-white shadow-lift-lg">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-500">
            <Icon.Timer className="w-3.5 h-3.5" />
          </span>
          <span className="font-mono text-[13px] tabular-nums">18:42</span>
          <span className="text-[10px] text-slate-300">Dashboard hi-fi mock</span>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ tone, title, desc, icon }) {
  const IconCmp = Icon[icon];
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 hover-lift">
      <div className={`w-10 h-10 rounded-xl inline-flex items-center justify-center ${TONE_ICON[tone]}`}>
        <IconCmp className="w-5 h-5" />
      </div>
      <div className="mt-4 text-[15px] font-semibold text-slate-900">{title}</div>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">{desc}</p>
    </div>
  );
}

function WorkflowDiagram() {
  const steps = [
    { role: 'Member',  user: DEMO.u2, name: 'Dao N.',  status: 'IN_PROGRESS',    title: 'Websocket refactor' },
    { role: 'Member',  user: DEMO.u2, name: 'Dao N.',  status: 'PENDING_REVIEW', title: 'Websocket refactor' },
    { role: 'Manager', user: DEMO.u1, name: 'Mira O.', status: 'DONE',           title: 'Websocket refactor' },
  ];

  return (
    <div className="rounded-3xl bg-slate-50 border border-slate-200 p-6">
      <div className="grid grid-cols-3 gap-3 items-stretch">
        {steps.map((s, i) => (
          <div key={i} className="relative">
            <div className="rounded-2xl bg-white border border-slate-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Avatar user={s.user} size={20} />
                <div className="leading-none">
                  <div className="text-[11px] text-slate-500">{s.role}</div>
                  <div className="text-[11px] font-medium text-slate-800 font-mono">{s.name}</div>
                </div>
              </div>
              <div className="text-[13px] font-medium text-slate-800 mb-2">{s.title}</div>
              <StatusPill status={s.status} size="sm" />
            </div>
            {i < 2 && (
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-slate-300 z-10">
                <Icon.Arrow className="w-5 h-5" />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 p-3 rounded-xl bg-white border border-slate-200 text-[12.5px] text-slate-600 flex items-start gap-2">
        <Icon.Lock className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
        <span>When approved, <b>Migration runbook</b> unlocks — no email, no message, no meeting.</span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="max-w-7xl mx-auto px-8 h-16 flex items-center">
        <Logo />
        <nav className="hidden md:flex items-center gap-7 ml-10 text-[13.5px] text-slate-600">
          <a className="link-u hover:text-slate-900" href="#features">Features</a>
          <a className="link-u hover:text-slate-900" href="#workflow">Workflow</a>
          <a className="link-u hover:text-slate-900" href="#pricing">Pricing</a>
          <a className="link-u hover:text-slate-900" href="#changelog">Changelog</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/login" className="px-3 py-1.5 text-[13px] text-slate-700 hover:text-slate-900">
            Log in
          </Link>
          <Link href="/dashboard" className="px-3.5 py-1.5 text-[13px] rounded-lg bg-slate-900 text-white hover:bg-slate-800">
            Open app
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grain opacity-60 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-8 pt-10 pb-20 grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1 text-[11.5px] text-slate-600 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              v3.2 — Pomodoro + dependency graph
            </div>
            <h1 className="mt-5 text-[56px] leading-[1.04] tracking-tight font-semibold text-slate-900">
              Stop planning.
              <br />
              <span className="relative inline-block">
                Start doing.
                <svg className="absolute -bottom-1.5 left-0 w-full" height="10" viewBox="0 0 320 10" preserveAspectRatio="none">
                  <path d="M2 7 Q 80 1 160 5 T 318 4" stroke="#f97316" strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-6 text-[17px] leading-relaxed text-slate-600 max-w-[540px]">
              WhatTheTxxk is the wry, no-nonsense project tracker for teams who've had enough of meetings about meetings.
              Plan less. Ship more. Laugh a little.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 shadow-lift"
              >
                Get started free <Icon.Arrow className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 hover:border-slate-300"
              >
                <Icon.Play className="w-3.5 h-3.5" /> Watch demo — 90s
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-5 text-[12px] text-slate-500">
              <div className="flex items-center gap-2">
                <AvatarStack users={HERO_USERS} size={22} />
                <span>4,812 teams shipping this week</span>
              </div>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="font-mono tabular-nums">★★★★★ 4.89</span>
            </div>
          </div>

          <HeroKanbanPreview />
        </div>
      </section>

      {/* Feature grid */}
      <section id="features" className="max-w-7xl mx-auto px-8 pb-24">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-orange-600">Why bother</div>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">Built for the week, not the quarter.</h2>
          </div>
          <a className="text-[13px] text-slate-500 link-u hover:text-slate-900" href="#">See all features →</a>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => <FeatureCard key={i} {...f} />)}
        </div>
      </section>

      {/* Workflow band */}
      <section id="workflow" className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-8 py-16 grid lg:grid-cols-[1fr_1.1fr] gap-10 items-center">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-orange-600">Workflow</div>
            <h2 className="mt-2 text-3xl font-semibold">From &ldquo;I think I&rsquo;m done&rdquo; to actually done.</h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Members mark work as <b>Pending Review</b>. Managers glance, approve, move on.
              No standups. No status Slack. The paper trail writes itself.
            </p>
            <ul className="mt-6 space-y-3 rt-none">
              {[
                ['Member completes subtask', 'Clicks "Request review"'],
                ['Task enters Pending Review', 'Surfaces in manager inbox'],
                ['Manager approves', 'Task → Done, unlocks dependents'],
              ].map(([a, b], i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 w-6 h-6 rounded-full bg-orange-500 text-white font-mono text-[11px] inline-flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-[14px] font-medium text-slate-900">{a}</div>
                    <div className="text-[13px] text-slate-500">{b}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <WorkflowDiagram />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-8 py-20 text-center">
        <h2 className="text-4xl font-semibold">Your team already knows what to do.</h2>
        <p className="mt-3 text-slate-600">WhatTheTxxk just gets out of the way.</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
        >
          Start free — no card <Icon.Arrow className="w-4 h-4" />
        </Link>
      </section>

      <footer className="border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-8 py-10 flex flex-wrap items-center gap-6 text-[12px] text-slate-500">
          <Logo size={14} />
          <span>© 2026 WhatTheTxxk, Inc.</span>
          <span className="ml-auto flex items-center gap-5">
            <a href="#" className="hover:text-slate-900">Privacy</a>
            <a href="#" className="hover:text-slate-900">Terms</a>
            <a href="#" className="hover:text-slate-900">Security</a>
            <a href="#" className="hover:text-slate-900">Status</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
