import posthog, { type PostHog } from "posthog-js";

let initialized = false;

export function initPostHog(): PostHog | null {
  if (typeof window === "undefined") return null;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  if (initialized) return posthog;

  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

  posthog.init(key, {
    api_host: host,
    persistence: "cookie",
    disable_session_recording: true,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: true,
    loaded: (ph) => {
      if (process.env.NODE_ENV !== "production") ph.debug();
    },
  });

  initialized = true;
  return posthog;
}

export function getPostHog(): PostHog | null {
  if (typeof window === "undefined") return null;
  if (!initialized) return null;
  return posthog;
}
