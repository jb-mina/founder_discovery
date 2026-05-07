import type { CallToolArgs, CallToolResult } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type OpenRouterToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type OpenRouterChoice = {
  message: {
    role: "assistant";
    content: string | null;
    tool_calls?: OpenRouterToolCall[];
  };
  finish_reason: string;
};

type OpenRouterResponse = {
  id?: string;
  choices?: OpenRouterChoice[];
  error?: { message?: string; code?: string | number };
};

// Forced function call against OpenAI-compatible chat completions on
// OpenRouter. The model emits `tool_calls[0].function.arguments` as a JSON
// string — we parse and return as the tool input object. Caller validates
// with zod.
export async function callOpenRouter(args: CallToolArgs): Promise<CallToolResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "openrouter: OPENROUTER_API_KEY not set" };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (process.env.OPENROUTER_HTTP_REFERER) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_HTTP_REFERER;
  }
  if (process.env.OPENROUTER_X_TITLE) {
    headers["X-Title"] = process.env.OPENROUTER_X_TITLE;
  }

  const body = {
    model: args.model,
    temperature: args.temperature,
    max_tokens: args.maxTokens,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.userMessage },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: args.tool.name,
          description: args.tool.description,
          parameters: args.tool.inputSchema,
        },
      },
    ],
    tool_choice: { type: "function", function: { name: args.tool.name } },
  };

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    return {
      ok: false,
      error: `openrouter: fetch failed — ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return {
      ok: false,
      error: `openrouter: HTTP ${response.status} — ${text.slice(0, 400)}`,
    };
  }

  let data: OpenRouterResponse;
  try {
    data = (await response.json()) as OpenRouterResponse;
  } catch (err) {
    return {
      ok: false,
      error: `openrouter: response not JSON — ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (data.error) {
    return {
      ok: false,
      error: `openrouter: ${data.error.message ?? "unknown error"} (code=${data.error.code ?? "?"})`,
      raw: data,
    };
  }

  const choice = data.choices?.[0];
  const toolCall = choice?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.function.name !== args.tool.name) {
    return {
      ok: false,
      error: `openrouter: no tool_call for '${args.tool.name}' (finish_reason=${choice?.finish_reason ?? "?"})`,
      raw: data,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(toolCall.function.arguments);
  } catch (err) {
    return {
      ok: false,
      error: `openrouter: tool arguments not valid JSON — ${err instanceof Error ? err.message : String(err)}`,
      raw: toolCall.function.arguments.slice(0, 600),
    };
  }

  return { ok: true, input: parsed };
}
