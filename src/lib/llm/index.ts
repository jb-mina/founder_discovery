import { z } from "zod";
import { callAnthropic } from "./anthropic";
import { callOpenRouter } from "./openrouter";
import {
  ULTIMATE_FALLBACK,
  type CallToolArgs,
  type CallToolResult,
  type ToolSpec,
  type Vendor,
} from "./types";

export * from "./types";

function dispatch(args: CallToolArgs): Promise<CallToolResult> {
  return args.vendor === "anthropic" ? callAnthropic(args) : callOpenRouter(args);
}

export type CallPersonaArgs<T> = {
  personaName: string; // for log scoping
  vendor: Vendor;
  model: string;
  system: string;
  userMessage: string;
  temperature: number;
  maxTokens: number;
  tool: ToolSpec;
  schema: z.ZodSchema<T>;
};

// Run a persona tool call with a single fallback to Anthropic Sonnet on
// failure. Two-step chain only: keep latency bounded for the user-facing
// 5-8s panel review action. zod runs against tool input as defense in depth.
//
// On both attempts failing, throws so the caller (route.ts) returns 502.
export async function callPersona<T>(args: CallPersonaArgs<T>): Promise<T> {
  const tryOne = async (vendor: Vendor, model: string): Promise<T> => {
    const result = await dispatch({
      vendor,
      model,
      system: args.system,
      userMessage: args.userMessage,
      temperature: args.temperature,
      maxTokens: args.maxTokens,
      tool: args.tool,
    });
    if (!result.ok) {
      throw new Error(`[${vendor}/${model}] ${result.error}`);
    }
    const parsed = args.schema.safeParse(result.input);
    if (!parsed.success) {
      console.error(
        `[reality-check] ${args.personaName} (${vendor}/${model}) zod failed. issues:`,
        JSON.stringify(parsed.error.issues),
        "input:",
        JSON.stringify(result.input).slice(0, 600),
      );
      throw parsed.error;
    }
    // Visibility — warn (not fail) when an array slot came back empty due
    // to model self-compliance limits. The schema tolerates this; we keep
    // a log so trends are observable.
    const data = parsed.data as Record<string, unknown>;
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length === 0) {
        console.warn(
          `[reality-check] ${args.personaName} (${vendor}/${model}) returned empty array '${key}'`,
        );
      }
    }
    return parsed.data;
  };

  try {
    return await tryOne(args.vendor, args.model);
  } catch (firstErr) {
    console.error(
      `[reality-check] ${args.personaName} attempt 1 failed (${args.vendor}/${args.model}):`,
      firstErr instanceof Error ? firstErr.message : String(firstErr),
    );

    // Skip the fallback when the user already chose the ultimate fallback —
    // the same call would just repeat. Prefer to surface the original error.
    const sameAsUltimate =
      args.vendor === ULTIMATE_FALLBACK.vendor && args.model === ULTIMATE_FALLBACK.model;
    if (sameAsUltimate) {
      throw firstErr;
    }

    try {
      return await tryOne(ULTIMATE_FALLBACK.vendor, ULTIMATE_FALLBACK.model);
    } catch (secondErr) {
      console.error(
        `[reality-check] ${args.personaName} attempt 2 failed (${ULTIMATE_FALLBACK.vendor}/${ULTIMATE_FALLBACK.model}):`,
        secondErr instanceof Error ? secondErr.message : String(secondErr),
      );
      throw new Error(
        `Reality Check ${args.personaName} failed twice. last: ${
          secondErr instanceof Error ? secondErr.message : String(secondErr)
        }. first: ${firstErr instanceof Error ? firstErr.message : String(firstErr)}`,
      );
    }
  }
}
