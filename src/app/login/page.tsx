"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push(from);
    } else {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="패스워드 입력"
        className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-violet-500"
        autoFocus
      />
      {error && <p className="text-xs text-red-600">패스워드가 올바르지 않습니다.</p>}
      <button
        type="submit"
        disabled={loading || !password}
        className="w-full rounded-lg bg-violet-600 py-3 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 transition-colors"
      >
        {loading ? "확인 중..." : "입장하기"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="w-full max-w-sm space-y-6 px-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">My 0to1</h1>
          <p className="text-sm text-muted">나와 맞는 문제·고객·솔루션 핏을 찾는 0to1 비즈니스 운영체제</p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
