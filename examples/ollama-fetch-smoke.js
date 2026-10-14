/**
 * Smoke test — Ollama via fetch transport (env: "default").
 *
 *   ollama serve
 *   ollama pull qwen3.5:2b
 *   npm run test:ollama:fetch
 */
const { createADK, Agent, Emitter, run } = require("../index");

const MODEL = process.env.OLLAMA_MODEL || "qwen3.5:2b";
const HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";

async function main() {
  createADK({
    env: "default",
    platform: "ollama",
    config: { OLLAMA_MODEL: MODEL, OLLAMA_HOST: HOST },
  });

  const agent = new Agent({
    name: "smoke-fetch",
    model: MODEL,
    url: HOST,
    instructions: "Reply with exactly one short sentence.",
  });

  const stream = new Emitter();
  let chunks = 0;
  stream.listen((d) => {
    chunks += 1;
    console.log(d);
  });

  console.log(`[smoke:ollama-fetch] model=${MODEL}`);
  const text = await run(agent, "Say hello in one short sentence.", {
    emitter: stream,
    runConfig: { stream: true, think: false },
  });

  console.log("\n[smoke:ollama-fetch] full:", text.slice(0, 200));
  console.log("[smoke:ollama-fetch] chunks:", chunks);
  if (!text || !chunks) throw new Error("empty response or no chunks");
  console.log("[smoke:ollama-fetch] OK");
}

main().catch((err) => {
  console.error("[smoke:ollama-fetch] FAIL:", err.message);
  process.exit(1);
});
