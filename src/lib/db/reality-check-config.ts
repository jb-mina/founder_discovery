import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PERSONA_MODELS,
  MODEL_PRESETS,
  type PersonaKey,
  type Vendor,
} from "@/lib/llm";

const PERSONA_KEYS: PersonaKey[] = ["investor", "friend", "socratic", "moderator"];

export type PersonaConfig = {
  persona: PersonaKey;
  vendor: Vendor;
  model: string;
};

function isPersona(value: string): value is PersonaKey {
  return (PERSONA_KEYS as string[]).includes(value);
}

function isVendor(value: string): value is Vendor {
  return value === "anthropic" || value === "openrouter";
}

// Validates that a chosen vendor/model pair exists in MODEL_PRESETS so we
// don't accept arbitrary strings the router may not handle. UI restricts
// choices, but defense in depth at the API layer.
export function isAllowedVendorModel(vendor: string, model: string): boolean {
  if (!isVendor(vendor)) return false;
  return MODEL_PRESETS.some((p) => p.vendor === vendor && p.model === model);
}

// Read one persona's config; falls back to DEFAULT_PERSONA_MODELS when no
// row exists yet (fresh deploy without seed) or when the stored value is
// somehow corrupt — defensive so RC never fails on config load.
export async function getPersonaConfig(persona: PersonaKey): Promise<PersonaConfig> {
  const row = await prisma.realityCheckPersonaConfig.findUnique({
    where: { persona },
  });
  if (row && isVendor(row.vendor) && isAllowedVendorModel(row.vendor, row.model)) {
    return { persona, vendor: row.vendor, model: row.model };
  }
  return { persona, ...DEFAULT_PERSONA_MODELS[persona] };
}

// Read all 4 configs at once — used by settings UI and by the RC run path
// to avoid N round trips.
export async function getAllPersonaConfigs(): Promise<PersonaConfig[]> {
  const rows = await prisma.realityCheckPersonaConfig.findMany();
  const byPersona = new Map(rows.map((r) => [r.persona, r]));
  return PERSONA_KEYS.map((persona) => {
    const row = byPersona.get(persona);
    if (row && isVendor(row.vendor) && isAllowedVendorModel(row.vendor, row.model)) {
      return { persona, vendor: row.vendor, model: row.model };
    }
    return { persona, ...DEFAULT_PERSONA_MODELS[persona] };
  });
}

export async function setPersonaConfig(
  persona: PersonaKey,
  vendor: Vendor,
  model: string,
): Promise<PersonaConfig> {
  if (!isAllowedVendorModel(vendor, model)) {
    throw new Error(`vendor/model not in MODEL_PRESETS: ${vendor}/${model}`);
  }
  await prisma.realityCheckPersonaConfig.upsert({
    where: { persona },
    update: { vendor, model },
    create: { persona, vendor, model },
  });
  return { persona, vendor, model };
}

export { isPersona };
