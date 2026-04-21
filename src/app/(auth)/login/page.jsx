'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarStack, StatusPill, Checkbox, Icon, Logo } from '@/components/ui';

const MIRA = { id: 'u1', name: 'Mira Osei',      hue: 22,  initials: 'MO' };
const DAO  = { id: 'u2', name: 'Dao Nguyen',     hue: 200, initials: 'DN' };
const INES = { id: 'u3', name: 'Ines Koskinen',  hue: 318, initials: 'IK' };
const TALIA = { id: 'u5', name: 'Talia Brooks',  hue: 260, initials: 'TB' };

function Field({ label, type = 'text', placeholder, value, onChange, rightSlot, helper }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[12px] font-medium text-slate-700">{label}</label>
        {helper}
      </div>
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-3 pr-10 text-[13.5px] focus:outline-none focus:border-orange-400 transition-colors"
          required
        />
        {rightSlot}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'register') {
      if (!agreed) { setError('Please agree to the terms first.'); setLoading(false); return; }
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Registration failed. Try again.');
        setLoading(false);
        return;
      }
    }

    const result = await signIn('credentials', { email, password, redirect: false });
    if (result?.error) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  function switchMode(m) {
    setMode(m);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
  }

  const eyeBtn = (
    <button
      type="button"
      onClick={() => setShowPass((s) => !s)}
      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-700"
    >
      {showPass ? <Icon.EyeOff className="w-4 h-4" /> : <Icon.Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <Link href="/" className="absolute top-6 left-6">
          <Logo />
        </Link>

        <div className="w-full max-w-[400px]">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-lift p-8">
            <div className="flex items-center p-1 rounded-xl bg-slate-100 mb-6">
              {['login', 'register'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-1.5 rounded-lg text-[13px] font-medium transition-all
                    ${mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {m === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            <h1 className="text-[22px] font-semibold tracking-tight">
              {mode === 'login' ? 'Welcome back.' : 'Nice to meet you.'}
            </h1>
            <p className="text-[13px] text-slate-500 mt-1">
              {mode === 'login' ? 'Pick up where the team left off.' : 'Start shipping in under 60 seconds.'}
            </p>

            <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
              {mode === 'register' && (
                <Field label="Full name" placeholder="Ada Lovelace" value={name} onChange={setName} />
              )}
              <Field label="Work email" type="email" placeholder="you@team.co" value={email} onChange={setEmail} />
              <Field
                label="Password"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={setPassword}
                rightSlot={eyeBtn}
                helper={
                  mode === 'login' ? (
                    <a href="#" className="text-[11px] text-slate-500 link-u hover:text-slate-900">Forgot?</a>
                  ) : null
                }
              />

              {mode === 'register' && (
                <label className="flex items-start gap-2 text-[12px] text-slate-600 mt-2 cursor-pointer">
                  <Checkbox checked={agreed} onChange={setAgreed} />
                  <span>I agree to the <a href="#" className="link-u text-slate-900">terms</a> and promise to keep it cheeky.</span>
                </label>
              )}

              {error && (
                <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors mt-4 disabled:opacity-60"
              >
                {loading ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>

              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[11px] text-slate-400 font-mono">or</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <button
                type="button"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[13.5px] font-medium flex items-center justify-center gap-2.5"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4">
                  <path fill="#4285F4" d="M22 12.3c0-.8-.1-1.4-.2-2H12v3.8h5.7c-.1 1-.8 2.5-2.3 3.5l3.6 2.8c2.1-2 3.3-4.8 3.3-8.1Z"/>
                  <path fill="#34A853" d="m7.6 14.3-.8.6-2.9 2.3A10 10 0 0 0 12 22c2.7 0 5-.9 6.6-2.4l-3.6-2.8c-1 .7-2.2 1.1-3.6 1.1A6.3 6.3 0 0 1 7.6 14.3Z"/>
                  <path fill="#FBBC05" d="M3.9 8.4a9.9 9.9 0 0 0 0 7.1l3.7-2.9a6 6 0 0 1 0-3.8Z"/>
                  <path fill="#EA4335" d="M12 5.6c1.9 0 3.2.8 4 1.5l3-2.9A10 10 0 0 0 12 2a10 10 0 0 0-8.1 4.2l3.7 2.9A6 6 0 0 1 12 5.6Z"/>
                </svg>
                Continue with Google
              </button>
            </form>
          </div>

          <div className="mt-5 text-center text-[12px] text-slate-500">
            {mode === 'login' ? (
              <>No account?{' '}
                <button type="button" onClick={() => switchMode('register')} className="text-slate-900 link-u">Create one</button>
              </>
            ) : (
              <>Already on board?{' '}
                <button type="button" onClick={() => switchMode('login')} className="text-slate-900 link-u">Sign in</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-slate-100 border-l border-slate-200">
        <div className="absolute inset-0 grain opacity-50" />
        <div className="relative max-w-md p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1 text-[11px] text-slate-600 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Real teams, real Fridays
          </div>
          <blockquote className="mt-6 text-[26px] leading-[1.2] font-semibold tracking-tight text-slate-900">
            &ldquo;We replaced three standups, a Notion doc, and a Trello board. Our Tuesdays got <span className="text-orange-600">quiet</span>.&rdquo;
          </blockquote>
          <div className="mt-6 flex items-center gap-3">
            <Avatar user={INES} size={38} />
            <div>
              <div className="text-[14px] font-medium">Ines Koskinen</div>
              <div className="text-[12px] text-slate-500 font-mono">Head of Design · Prairie CRM</div>
            </div>
          </div>

          <div className="mt-10 rounded-2xl bg-white border border-slate-200 p-4 shadow-lift rotate-[-1.5deg]">
            <div className="flex items-center gap-2 mb-2">
              <StatusPill status="IN_PROGRESS" size="sm" />
              <span className="ml-auto font-mono text-[10px] text-slate-400">T-137</span>
            </div>
            <div className="text-[13px] font-medium text-slate-800">Dashboard hi-fi mock</div>
            <div className="mt-3 flex items-center justify-between">
              <AvatarStack users={[MIRA, INES]} size={20} />
              <span className="font-mono text-[11px] text-slate-500">Due Apr 24</span>
            </div>
          </div>
          <div className="mt-[-24px] ml-16 rounded-2xl bg-white border border-slate-200 p-4 shadow-lift rotate-[1.8deg]">
            <div className="flex items-center gap-2 mb-2">
              <StatusPill status="PENDING_REVIEW" size="sm" />
              <span className="ml-auto font-mono text-[10px] text-slate-400">T-142</span>
            </div>
            <div className="text-[13px] font-medium text-slate-800">Websocket refactor</div>
            <div className="mt-3 flex items-center justify-between">
              <AvatarStack users={[DAO, TALIA]} size={20} />
              <span className="font-mono text-[11px] text-slate-500">Needs Mira</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
