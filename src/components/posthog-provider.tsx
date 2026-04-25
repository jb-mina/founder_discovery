"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import posthog from "posthog-js";
import { initPostHog, getPostHog } from "@/lib/posthog/client";
import { useIdentify } from "@/lib/posthog/use-identify";

export function PostHogProvider({
  distinctId,
  children,
}: {
  distinctId: string | null;
  children: React.ReactNode;
}) {
  useEffect(() => {
    initPostHog();
  }, []);

  useIdentify(distinctId);

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      {children}
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
    </PHProvider>
  );
}

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const ph = getPostHog();
    if (!ph) return;
    const query = searchParams?.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    ph.capture("$pageview", {
      $current_url: typeof window !== "undefined" ? window.location.href : url,
      route: pathname,
    });
  }, [pathname, searchParams]);

  return null;
}
