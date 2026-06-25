#!/usr/bin/env tsx
/**
 * run-agent.ts
 *
 * Standalone runner for the Summer Camp research agent.
 *
 * Usage:
 *   npx tsx scripts/run-agent.ts              # research current year
 *   npx tsx scripts/run-agent.ts --year 2027  # research a specific year
 *
 * Required environment variables (copy .env.example → .env and fill in):
 *   ANTHROPIC_API_KEY
 *   TAVILY_API_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { TOOL_DEFINITIONS, handleToolCall } from "../docs/agent-tools.js";

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });

const REQUIRED_ENV = [
  "ANTHROPIC_API_KEY",
  "TAVILY_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌  Missing required environment variable: ${key}`);
    console.error(`    Copy .env.example to .env and fill in all values.`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 16000;          // per turn — agent may use many turns
const MAX_TURNS = 120;             // safety cap on agentic loop iterations

// Parse --year flag or default to current year
const yearArg = process.argv.indexOf("--year");
const YEAR = yearArg !== -1 ? parseInt(process.argv[yearArg + 1], 10) : new Date().getFullYear();

if (isNaN(YEAR) || YEAR < 2020 || YEAR > 2100) {
  console.error(`❌  Invalid year: ${process.argv[yearArg + 1]}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Load and prepare the master prompt
// ---------------------------------------------------------------------------

const PROMPT_PATH = path.resolve(
  import.meta.dirname,
  "../docs/prompts/Summer Camp Project master prompt.md"
);

if (!fs.existsSync(PROMPT_PATH)) {
  console.error(`❌  Master prompt not found at: ${PROMPT_PATH}`);
  process.exit(1);
}

const rawPrompt = fs.readFileSync(PROMPT_PATH, "utf-8");
const systemPrompt = rawPrompt.replaceAll("{{YEAR}}", String(YEAR));

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

function timestamp(): string {
  return new Date().toISOString();
}

function log(level: "INFO" | "TOOL" | "WARN" | "ERROR", msg: string): void {
  const prefix = {
    INFO:  "ℹ️ ",
    TOOL:  "🔧",
    WARN:  "⚠️ ",
    ERROR: "❌",
  }[level];
  console.log(`[${timestamp()}] ${prefix}  ${msg}`);
}

// ---------------------------------------------------------------------------
// Agentic loop
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  log("INFO", `Starting Summer Camp research agent for year ${YEAR}`);
  log("INFO", `Model: ${MODEL}  |  Max turns: ${MAX_TURNS}`);
  log("INFO", "─".repeat(60));

  // Conversation history — grows as the agent works through its passes
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Research all summer camps for ${YEAR} near Princeton, NJ following your instructions. When research is complete, persist all results to the database.`,
    },
  ];

  let turn = 0;

  while (turn < MAX_TURNS) {
    turn++;
    log("INFO", `Turn ${turn}/${MAX_TURNS} — calling ${MODEL}...`);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      tools: TOOL_DEFINITIONS as Anthropic.Tool[],
      messages,
    });

    log("INFO", `  stop_reason: ${response.stop_reason}  |  content blocks: ${response.content.length}`);

    // Add assistant response to history
    messages.push({ role: "assistant", content: response.content });

    // ── Agent finished ──────────────────────────────────────────────────────
    if (response.stop_reason === "end_turn") {
      log("INFO", "─".repeat(60));
      log("INFO", "Agent completed successfully.");

      // Print any final text output
      for (const block of response.content) {
        if (block.type === "text" && block.text.trim()) {
          console.log("\n── Agent summary ──────────────────────────────────────");
          console.log(block.text.trim());
          console.log("───────────────────────────────────────────────────────\n");
        }
      }
      break;
    }

    // ── Handle tool calls ───────────────────────────────────────────────────
    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        log("TOOL", `  ${block.name}(${JSON.stringify(block.input).slice(0, 120)}...)`);

        let result: unknown;
        let isError = false;

        try {
          result = await handleToolCall(block.name, block.input as Record<string, unknown>);
          log("TOOL", `  ✓ ${block.name} succeeded`);
        } catch (err) {
          isError = true;
          result = { error: String(err) };
          log("ERROR", `  ${block.name} failed: ${String(err)}`);
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
          is_error: isError,
        });
      }

      // Feed tool results back so the agent can continue
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // ── Unexpected stop reason ──────────────────────────────────────────────
    log("WARN", `Unexpected stop_reason: ${response.stop_reason} — stopping loop.`);
    break;
  }

  if (turn >= MAX_TURNS) {
    log("WARN", `Reached MAX_TURNS (${MAX_TURNS}) — agent may not have finished. Check Supabase for partial results.`);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

run().catch((err) => {
  console.error(`\n❌  Fatal error: ${String(err)}`);
  process.exit(1);
});
