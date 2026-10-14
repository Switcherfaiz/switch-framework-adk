/**
 * Smoke test — Ollama (server env / SDK transport).
 *
 *   ollama serve
 *   ollama pull qwen3.5:2b
 *   npm run test:ollama
 */
const { createADK, Agent, tool, Emitter, run } = require("../index");

const MODEL = process.env.OLLAMA_MODEL || "qwen3.5:2b";
const HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";

async function main() {
  createADK({
    env: "server",
    platform: "ollama",
    config: { OLLAMA_MODEL: MODEL, OLLAMA_HOST: HOST },
  });

  const ping = tool({
    name: "ping",
    description: "Returns pong",
    parameters: { type: "object", properties: {} },
    execute: async () => ({ ok: true }),
  });

  const agent = new Agent({
    name: "smoke",
    model: MODEL,
    url: HOST,
    instructions: "Reply with exactly one short sentence. No preamble.",
    tools: [ping],
  });

  const stream = new Emitter();
  let chunks = 0;
  stream.listen((d) => {
    chunks += 1;
    console.log(d);
  });

  console.log(`[smoke:ollama] model=${MODEL}`);
  const text = await run(agent, "Say hello in one short sentence.", {
    emitter: stream,
    context: { sessionId: "smoke" },
    runConfig: { stream: true, think: false },
  });

  console.log("\n[smoke:ollama] full:", text.slice(0, 200));
  console.log("[smoke:ollama] chunks:", chunks);
  if (!text || !chunks) throw new Error("empty response or no chunks");
  console.log("[smoke:ollama] OK");
}

main().catch((err) => {
  console.error("[smoke:ollama] FAIL:", err.message);
  process.exit(1);
});
