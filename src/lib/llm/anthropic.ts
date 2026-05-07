import Anthropic from "@anthropic-ai/sdk";
import type { CallToolArgs, CallToolResult } from "./types";

const client = new Anthropic();

// Forced tool use against Anthropic's native API. Returns the tool_use block's
// `input` (already parsed by the SDK from the model's structured response —
// no JSON.parse on free text). Caller validates with zod.
export async function callAnthropic(args: CallToolArgs): Promise<CallToolResult> {
  try {
    const response = await client.messages.create({
      model: args.model,
      max_tokens: args.maxTokens,
      temperature: args.temperature,
      system: args.system,
      tools: [
        {
          name: args.tool.name,
          description: args.tool.description,
          input_schema: args.tool.inputSchema as Anthropic.Messages.Tool["input_schema"],
        },
      ],
      tool_choice: { type: "tool", name: args.tool.name },
      messages: [{ role: "user", content: args.userMessage }],
    });
    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return {
        ok: false,
        error: `anthropic: no tool_use block (stop_reason=${response.stop_reason})`,
        raw: response.content,
      };
    }
    return { ok: true, input: toolUse.input };
  } catch (err) {
    return {
      ok: false,
      error: `anthropic: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
