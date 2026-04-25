"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// Code shape produced by the invite generator (10 chars from a restricted
// alphabet). If the input matches this shape we send it as `code`; otherwise
// we treat it as a password — the same field handles both.
const CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) setValue(code.toUpperCase());
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const trimmed = value.trim();
    const looksLikeCode = CODE_PATTERN.test(trimmed.toUpperCase());
    const body = looksLikeCode
      ? { code: trimmed.toUpperCase() }
      : { password: trimmed };
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      router.push(from);
    } else {
      setError("패스워드 또는 초대 코드가 올바르지 않습니다");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError(null);
        }}
        placeholder="패스워드 또는 초대 코드"
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
        autoFocus
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !value.trim()}
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
        <p className="text-center text-xs text-muted">
          초대 코드가 없다면{" "}
          <Link href="/" className="text-violet-600 hover:text-violet-500">
            랜딩 페이지에서 신청
          </Link>
          하세요
        </p>
      </div>
    </div>
  );
}
