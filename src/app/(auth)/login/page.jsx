'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

  function switchMode(nextMode) {
    if (loading) return;

    setMode(nextMode);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
    setAgreed(false);
    setShowPass(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (loading) return;

    setError('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    try {
      if (!cleanEmail || !password) {
        throw new Error('Please enter your email and password.');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters.');
      }

      if (mode === 'register') {
        if (!cleanName) {
          throw new Error('Please enter your full name.');
        }

        if (!agreed) {
          throw new Error('Please agree to the terms first.');
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            password,
          }),
        });

        let data = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }

        if (!res.ok) {
          throw new Error(data.error || 'Registration failed. Try again.');
        }
      }

      const result = await signIn('credentials', {
        email: cleanEmail,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error('Invalid email or password.');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--page-bg)] px-4 py-6 sm:flex sm:items-center sm:justify-center">
      <div className="mx-auto w-full max-w-[420px]">
        <Link href="/" className="mb-5 flex items-center gap-2 text-xl font-bold text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white">
            W
          </span>
          <span>
            WhatThe<span className="text-orange-500">Txxk</span>
          </span>
        </Link>

        <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-6 shadow-lift sm:p-8">
          <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`h-11 rounded-xl text-[15px] font-medium transition ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Sign in
            </button>

            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`h-11 rounded-xl text-[15px] font-medium transition ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Create account
            </button>
          </div>

          <h1 className="text-[26px] font-semibold tracking-tight text-slate-950">
            {mode === 'login' ? 'Welcome back.' : 'Nice to meet you.'}
          </h1>

          <p className="mt-1 text-[15px] text-slate-500">
            {mode === 'login'
              ? 'Pick up where the team left off.'
              : 'Start shipping in under 60 seconds.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  Full name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-[16px] outline-none transition focus:border-orange-400"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                Work email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@team.co"
                className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-[16px] outline-none transition focus:border-orange-400"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[13px] font-medium text-slate-700">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setError('Password reset is not set up yet.')}
                    className="text-[12px] text-slate-500"
                  >
                    Forgot?
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-2xl border border-slate-200 px-4 pr-16 text-[16px] outline-none transition focus:border-orange-400"
                />

                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[12px] font-medium text-slate-500"
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <label className="flex cursor-pointer items-start gap-2 text-[13px] text-slate-600">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  I agree to the terms and promise to keep it cheeky.
                </span>
              </label>
            )}

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-2xl bg-orange-500 text-[16px] font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
            >
              {loading
                ? 'One moment…'
                : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
            </button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[12px] text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-[16px] font-medium text-slate-900"
            >
              <span className="font-bold text-blue-500">G</span>
              Continue with Google
            </button>
          </form>
        </section>

        <div className="mt-5 text-center text-[13px] text-slate-500">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="font-medium text-slate-900 underline"
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already on board?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="font-medium text-slate-900 underline"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}