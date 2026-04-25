"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { track } from "@/lib/posthog/events";

type Location = "top" | "bottom";

type SubmitErrorKind = "validation" | "rate_limit" | "network" | "other";

function classifyHttpStatus(status: number): SubmitErrorKind {
  if (status === 429) return "rate_limit";
  if (status >= 400 && status < 500) return "validation";
  return "other";
}

export function EmailSignupForm({
  id,
  location,
}: {
  id?: string;
  location: Location;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const focusedOnce = useRef(false);

  function onFocus() {
    if (focusedOnce.current) return;
    focusedOnce.current = true;
    track({ event: "landing_email_focused", props: { location } });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    let res: Response;
    try {
      res = await fetch("/api/invite-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch (err) {
      track({
        event: "landing_email_submitted",
        props: { location, status: "error", error_kind: "network" },
      });
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
      return;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      track({
        event: "landing_email_submitted",
        props: {
          location,
          status: "error",
          error_kind: classifyHttpStatus(res.status),
        },
      });
      setError(body.error ?? "제출 실패");
      setSubmitting(false);
      return;
    }
    track({
      event: "landing_email_submitted",
      props: { location, status: "ok" },
    });
    setDone(true);
    setSubmitting(false);
  }

  if (done) {
    return (
      <div
        id={id}
        className="rounded-xl border border-violet-400/40 bg-violet-500/10 px-5 py-4 text-center"
      >
        <p className="text-sm text-violet-200 font-medium">
          신청 완료. 검토 후 초대 코드를 이메일로 보내드릴게요.
        </p>
      </div>
    );
  }

  return (
    <form
      id={id}
      onSubmit={submit}
      className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto"
    >
      <input
        type="email"
        required
        value={email}
        onFocus={onFocus}
        onChange={(e) => {
          setEmail(e.target.value);
          if (error) setError(null);
        }}
        placeholder="you@example.com"
        className="flex-1 rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
      <button
        type="submit"
        disabled={submitting || !email.trim()}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-5 py-3 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 transition-colors"
      >
        {submitting && <Loader2 size={14} className="animate-spin" />}
        초대 신청
      </button>
      {error && (
        <p className="text-xs text-red-400 mt-1 sm:mt-0 sm:absolute sm:translate-y-12">
          {error}
        </p>
      )}
    </form>
  );
}
