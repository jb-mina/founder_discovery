"use client";

import { useEffect } from "react";
import { track } from "@/lib/posthog/events";

const SCROLL_MILESTONES = [25, 50, 75, 100] as const;

type Section =
  | "hero"
  | "traps"
  | "cycle"
  | "agents"
  | "moat"
  | "final_cta";

const KNOWN_SECTIONS: ReadonlySet<Section> = new Set<Section>([
  "hero",
  "traps",
  "cycle",
  "agents",
  "moat",
  "final_cta",
]);

function isSection(value: string): value is Section {
  return KNOWN_SECTIONS.has(value as Section);
}

export function LandingTracker() {
  useEffect(() => {
    const seenSections = new Set<Section>();
    const seenDepths = new Set<number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const attr = entry.target.getAttribute("data-track-section");
          if (!attr || !isSection(attr)) continue;
          if (seenSections.has(attr)) continue;
          seenSections.add(attr);
          track({ event: "landing_section_viewed", props: { section: attr } });
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.5 },
    );

    const sections = document.querySelectorAll("[data-track-section]");
    sections.forEach((el) => observer.observe(el));

    let scrollTicking = false;
    const onScroll = () => {
      if (scrollTicking) return;
      scrollTicking = true;
      window.requestAnimationFrame(() => {
        const docHeight = document.documentElement.scrollHeight;
        const viewport = window.innerHeight;
        const scrolled = window.scrollY + viewport;
        const denom = Math.max(docHeight, viewport);
        const pct = (scrolled / denom) * 100;
        for (const milestone of SCROLL_MILESTONES) {
          if (pct >= milestone && !seenDepths.has(milestone)) {
            seenDepths.add(milestone);
            track({
              event: "landing_scroll_depth",
              props: { depth: milestone },
            });
          }
        }
        scrollTicking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const headerCta = document.querySelector('[data-track-cta="header"]');
    const onHeaderClick = () => {
      track({ event: "landing_header_cta_clicked", props: {} });
    };
    headerCta?.addEventListener("click", onHeaderClick);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      headerCta?.removeEventListener("click", onHeaderClick);
    };
  }, []);

  return null;
}
