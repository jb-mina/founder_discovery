"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import type { ModelPreset, PersonaKey, Vendor } from "@/lib/llm";

export function PersonaConfigEditor({
  persona,
  title,
  subtitle,
  currentVendor,
  currentModel,
  presets,
}: {
  persona: PersonaKey;
  title: string;
  subtitle: string;
  currentVendor: Vendor;
  currentModel: string;
  presets: ModelPreset[];
}) {
  // Encode vendor/model as a single dropdown value to keep the form simple —
  // the preset list determines all valid pairs, so we never get an invalid
  // combination from the UI.
  const initialKey = `${currentVendor}::${currentModel}`;
  const [selected, setSelected] = useState(initialKey);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = selected !== initialKey;

  async function save() {
    setError(null);
    setSaving(true);
    const [vendor, model] = selected.split("::");
    const res = await fetch("/api/reality-check/persona-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona, vendor, model }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "저장 실패");
      return;
    }
    setSavedAt(Date.now());
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-tertiary mt-0.5">{subtitle}</p>
        </div>
        {savedAt && !dirty && (
          <span className="inline-flex items-center gap-1 text-[11px] text-green-700">
            <Check size={12} />
            저장됨
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 min-w-[14rem] text-sm rounded-lg border border-border bg-canvas px-3 py-2"
        >
          {presets.map((p) => {
            const key = `${p.vendor}::${p.model}`;
            return (
              <option key={key} value={key}>
                {p.label}
              </option>
            );
          })}
        </select>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="text-sm rounded-lg border border-violet-300 bg-violet-50 hover:bg-violet-100 px-3 py-2 text-violet-700 disabled:opacity-40 disabled:bg-canvas disabled:border-border disabled:text-tertiary"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : "저장"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
