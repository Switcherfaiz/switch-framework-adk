/**
 * Smoke test against local Ollama.
 * Usage: npm run test:ollama
 */
const { createADK, Agent, Emitter, run } = require("../index");

const MODEL = process.env.OLLAMA_MODEL || "qwen3.5:2b";

async function main() {
  const adk = createADK({
    env: "server",
    platform: "ollama",
    config: { OLLAMA_MODEL: MODEL, OLLAMA_HOST: "http://127.0.0.1:11434" },
  });

  const agent = new Agent({
    name: "smoke",
    model: MODEL,
    url: "http://127.0.0.1:11434",
    instructions: "Reply with exactly one short sentence. No preamble.",
  });

  const stream = new Emitter();
  let chunks = 0;
  stream.listen((d) => {
    chunks += 1;
    process.stdout.write(d);
  });

  console.log(`[smoke] model=${MODEL} streaming…`);
  const text = await run(agent, "Say hello in one short sentence.", {
    adk,
    emitter: stream,
    maxTurns: 3,
    context: { sessionId: "smoke", files: {} },
    runConfig: {
      stream: true,
      // qwen3.5 thinking models — keep replies fast for smoke
      think: false,
    },
  });

  console.log("\n[smoke] full:", text.slice(0, 200) + (text.length > 200 ? "…" : ""));
  console.log("[smoke] chunks:", chunks);
  if (!text || !chunks) {
    throw new Error("empty response or no chunks");
  }
  console.log("[smoke] OK");
}

main().catch((err) => {
  console.error("[smoke] FAIL:", err.message);
  process.exit(1);
});
