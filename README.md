# switch-framework-adk

**Switch Framework ADK** — Agent Development Kit for building streaming agent apps on **Ollama** and **OpenRouter**.

> Part of **switch-framework**. Not affiliated with Google’s Agent Development Kit (`@google/adk`).

## Install

```bash
npm install switch-framework-adk
```

Peer runtime: **Node.js ≥ 18**. For Ollama locally, install and run [Ollama](https://ollama.com), then pull a model:

```bash
ollama pull qwen3.5:2b
```

For **thinking** models (e.g. `qwen3.5`), pass `runConfig: { think: false }` when you want fast, direct answers without a long internal reasoning stream.


## Quick start

```js
const { createADK, Agent, tool, Emitter, run } = require("switch-framework-adk");

const adk = createADK({
  env: "server",          // "server" | "default" (fetch) | "mobile" (stub)
  platform: "ollama",     // "ollama" | "openrouter"
  config: {
    OLLAMA_MODEL: "qwen3.5:2b",
    OLLAMA_HOST: "http://localhost:11434",
    // API_KEY: process.env.OPENROUTER_API_KEY, // when platform: "openrouter"
  },
});

const echo = tool({
  name: "echo",
  description: "Echo text",
  parameters: {
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
  },
  execute: async ({ text }, ctx) => ({
    echoed: text,
    sessionId: ctx?.context?.sessionId,
  }),
});

const chat = new Agent({
  name: "chat",
  model: "qwen3.5:2b",
  url: "http://localhost:11434",
  instructions: "You are a helpful assistant. Answer briefly.",
  tools: [echo],
});

const stream = new Emitter();
stream.listen((delta) => process.stdout.write(delta));

const text = await run(chat, "What is 2+2?", {
  onChunk: (delta) => {},           // optional if you use emitter
  emitter: stream,                  // optional dedicated stream channel
  maxTurns: 8,                      // reserved for tool/handoff loops
  context: {
    sessionId: "demo",
    files: {
      // Blob / Buffer / base64 attachments (resolved in later phases)
      // report: { id: "report", name: "a.pdf", mimeType: "application/pdf", data: buffer },
    },
  },
  runConfig: {
    stream: true,
    // url, temperature, …
  },
});

console.log("\n[done]", text);
```

You can also call `adk.run(agent, input, options)` — same API.

## Concepts

| Export | Role |
|--------|------|
| `createADK` | Wire **env** + **platform** + config once |
| `Agent` | name, instructions, model, tools, url |
| `tool` | name, description, parameters, `execute` |
| `Emitter` | One instance = one stream channel (create many) |
| `run` | `run(agent \| name, input, options)` — no `buildRunBody` required |
| `buildRunBody` | Low-level escape hatch for advanced callers |

### `input`

- **string** — single user message  
- **message[]** — full **conversation history** (and optional content parts)

```js
await run(agent, [
  { role: "user", content: "Hi" },
  { role: "assistant", content: "Hello!" },
  {
    role: "user",
    content: [
      { type: "input_text", text: "Use this file." },
      { type: "input_file", file: { id: "report" } },
    ],
  },
], {
  context: {
    files: {
      report: {
        id: "report",
        name: "report.pdf",
        mimeType: "application/pdf",
        data: pdfBuffer, // Blob | Buffer | base64
      },
    },
  },
  emitter: stream,
});
```

History lives in **`input`**. Binary attachments live in **`context.files`** (OpenAI-style context DI).

### Multiple Emitters & parallel runners

```js
const streamA = new Emitter();
const streamB = new Emitter();

await Promise.all([
  run(agentA, promptA, { emitter: streamA }),
  run(agentB, promptB, { emitter: streamB }),
]);
```

Fan-out one run to many Emitters inside `onChunk`, or merge tagged events into one listener.

### Agent object vs name

Prefer **`run(agentInstance, …)`**. Registered names work if you called `createAgentRegistry` first.

### Handoffs

**Manual today** — call `run` in sequence (or parallel). Declarative `Agent.handoffs` is planned.

## Environments & platforms

| `env` | Transport |
|-------|-----------|
| `server` | Ollama npm / OpenRouter SDK |
| `default` | Global `fetch` |
| `mobile` | Not implemented yet |

| `platform` | Backend |
|------------|---------|
| `ollama` | Local or remote Ollama |
| `openrouter` | OpenRouter API (`config.API_KEY`) |

## Examples in this repo

```bash
cd switch-framework-adk
npm install

# Smoke test against local Ollama
npm run test:ollama

# Dual-pane HTML UI (two inputs → two streamed response areas)
npm run example:dual
# open http://localhost:3847
```

Demo agents live in `examples/shared/agents.js` with sample tools in `examples/shared/tools.js`.

## Low-level API (optional)

```js
const { createADK, buildRunBody } = require("switch-framework-adk");

const adk = createADK({ env: "server", platform: "ollama" });
const registry = adk.createAgentRegistry({
  chat: {
    id: "chat",
    name: "chat",
    url: "http://localhost:11434",
    systemPrompt: "Be brief.",
  },
});

await registry.run("chat", {
  body: buildRunBody({
    model: "qwen3.5:2b",
    messages: [{ role: "user", content: "Hi" }],
    stream: true,
  }),
  onChunk: (d) => process.stdout.write(d),
});
```

## Publish (later)

```bash
npm login
npm publish
```

Package name on npm: **`switch-framework-adk`**.

## License

MIT © Switcherfaiz
