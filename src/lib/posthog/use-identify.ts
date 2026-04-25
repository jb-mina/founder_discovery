"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { getPostHog } from "./client";

export function useIdentify(distinctId: string | null): void {
  useEffect(() => {
    if (!distinctId) return;
    const ph = getPostHog();
    if (!ph) return;
    if (posthog.get_distinct_id() === distinctId) return;
    ph.identify(distinctId);
  }, [distinctId]);
}
