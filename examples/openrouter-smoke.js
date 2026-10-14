/**
 * Smoke test — OpenRouter (server env).
 *
 *   set OPENROUTER_API_KEY=sk-or-...
 *   npm run test:openrouter
 */
const { createADK, Agent, Emitter, run } = require("../index");

const MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("Set OPENROUTER_API_KEY before running this smoke test");
  }

  createADK({
    env: "server",
    platform: "openrouter",
    config: { API_KEY: process.env.OPENROUTER_API_KEY },
  });

  const agent = new Agent({
    name: "smoke-openrouter",
    model: MODEL,
    instructions: "Reply with exactly one short sentence.",
  });

  const stream = new Emitter();
  let chunks = 0;
  stream.listen((d) => {
    chunks += 1;
    console.log(d);
  });

  console.log(`[smoke:openrouter] model=${MODEL}`);
  const text = await run(agent, "Say hello in one short sentence.", {
    emitter: stream,
    runConfig: { stream: true },
  });

  console.log("\n[smoke:openrouter] full:", text.slice(0, 200));
  console.log("[smoke:openrouter] chunks:", chunks);
  if (!text) throw new Error("empty response");
  console.log("[smoke:openrouter] OK");
}

main().catch((err) => {
  console.error("[smoke:openrouter] FAIL:", err.message);
  process.exit(1);
});
