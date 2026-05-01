import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  Tool,
  ToolUseBlock,
  ContentBlockParam,
} from "@anthropic-ai/sdk/resources/messages";

import { runDemo } from "@/lib/demo";
import { makeSseStream, SSE_HEADERS, type SseEvent } from "@/lib/sse";
import { TOOL_DEFINITIONS, runTool } from "@/lib/tools";
import type { AskRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1500;
const MAX_TOOL_LOOPS = 6;

const SYSTEM_PROMPT = `You are Flux, a chat-first lens on the European power mix and emissions.

Tools you have:
- get_generation_mix(country, year) — TWh by fuel for a country in a year (EMBER yearly).
- get_emissions(sector, year) — verified EU ETS emissions for a sector + EUA price.
- get_policy_summary(topic) — short factual brief on EU energy/climate policies.
- make_chart(spec) — render a chart the UI will draw (line, stacked-area, bar).

How to answer:
1. Decide what data you need, then call the right tool(s). For trends or comparisons, gather multiple years/countries first.
2. After you have data, call make_chart once to render a chart that helps the user see the answer.
3. Then write a tight 2-4 paragraph plain-English answer. Cite numbers from the tool results (round sensibly). Do not invent numbers.
4. Acknowledge data gaps if the user asks about a year or country that isn't in the dataset.
5. Use plain English, no jargon dumps. Light markdown is fine for emphasis or short lists.`;

function buildTools(): Tool[] {
  const tools: Tool[] = TOOL_DEFINITIONS.map((t, i) => {
    const last = i === TOOL_DEFINITIONS.length - 1;
    const tool = {
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    } as Tool;
    if (last) {
      (tool as Tool & { cache_control?: unknown }).cache_control = { type: "ephemeral" };
    }
    return tool;
  });
  return tools;
}

async function runLive(question: string, send: (event: SseEvent) => void): Promise<void> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  send({ type: "meta", mode: "live", model: MODEL });

  const messages: MessageParam[] = [{ role: "user", content: question }];
  const tools = buildTools();

  for (let loop = 0; loop < MAX_TOOL_LOOPS; loop += 1) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools,
      messages,
    });

    stream.on("text", (delta) => {
      if (delta) send({ type: "text", delta });
    });

    const finalMessage = await stream.finalMessage();
    messages.push({ role: "assistant", content: finalMessage.content });

    if (finalMessage.stop_reason !== "tool_use") {
      break;
    }

    const toolUseBlocks = finalMessage.content.filter(
      (b): b is ToolUseBlock => b.type === "tool_use",
    );
    if (toolUseBlocks.length === 0) break;

    const toolResultBlocks: ContentBlockParam[] = [];
    for (const block of toolUseBlocks) {
      send({ type: "tool_use", name: block.name, input: block.input });
      const result = runTool(block.name, block.input);
      if (result.chart) send({ type: "chart", spec: result.chart });
      if (result.citation) send({ type: "citation", ...result.citation });
      toolResultBlocks.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result.content,
      });
    }
    messages.push({ role: "user", content: toolResultBlocks });
  }

  send({ type: "done" });
}

export async function POST(req: Request) {
  let body: AskRequest;
  try {
    body = (await req.json()) as AskRequest;
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const question = (body.question ?? "").trim();
  if (!question) {
    return new Response(JSON.stringify({ error: "question is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = makeSseStream(async (send) => {
    if (!process.env.ANTHROPIC_API_KEY) {
      await runDemo(question, send);
      return;
    }
    try {
      await runLive(question, send);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      send({ type: "error", message: `live mode failed: ${message}. Falling back to demo.` });
      await runDemo(question, send);
    }
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

export async function GET() {
  return new Response(
    JSON.stringify({
      ok: true,
      model: MODEL,
      mode_default: process.env.ANTHROPIC_API_KEY ? "live" : "demo",
      tools: TOOL_DEFINITIONS.map((t) => t.name),
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}
