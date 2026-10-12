# switch-framework-adk

**Switch Framework ADK** — Agent Development Kit for streaming agent apps on **Ollama** and **OpenRouter**.

Part of **switch-framework**. Not affiliated with Google’s `@google/adk`.

## Install

```bash
npm install switch-framework-adk
```

Requires **Node.js ≥ 18**.

```js
const { createADK, Agent, tool, Emitter, run } = require("switch-framework-adk");
```

---

## Platforms

Pick the platform when you create the ADK. That chooses how requests are sent.

| `platform` | What it talks to | Typical `env` |
|------------|------------------|---------------|
| `"ollama"` | Local / remote Ollama | `"server"` (ollama npm) or `"default"` (fetch) |
| `"openrouter"` | [OpenRouter](https://openrouter.ai) | `"server"` (SDK) or `"default"` (fetch) |

### Ollama

```js
const adk = createADK({
  env: "server",
  platform: "ollama",
  config: {
    OLLAMA_MODEL: "qwen3.5:2b",
    OLLAMA_HOST: "http://localhost:11434",
  },
});
```

For thinking models (e.g. `qwen3.5`), add `think: false` in `runConfig` if you want a direct answer without a long reasoning stream.

### OpenRouter

```js
const adk = createADK({
  env: "server",
  platform: "openrouter",
  config: {
    API_KEY: process.env.OPENROUTER_API_KEY,
  },
});

const chat = new Agent({
  name: "chat",
  model: "openai/gpt-4o-mini", // any OpenRouter model id
  instructions: "Answer briefly.",
});

const text = await run(chat, "Hello!", {
  onChunk: (delta) => console.log(delta),
  runConfig: { stream: true },
});

console.log("done:", text);
```

Same `Agent` / `run` / `Emitter` API for both platforms — only `createADK({ platform, config })` and `Agent.model` change.

---

## Quick start (first request)

```js
const { createADK, Agent, Emitter, run } = require("switch-framework-adk");

const adk = createADK({
  env: "server",
  platform: "ollama",
  config: {
    OLLAMA_MODEL: "qwen3.5:2b",
    OLLAMA_HOST: "http://localhost:11434",
  },
});

const chat = new Agent({
  name: "chat",
  model: "qwen3.5:2b",
  url: "http://localhost:11434",
  instructions: "You are a helpful assistant. Answer briefly.",
});

const stream = new Emitter();
stream.listen((delta) => console.log(delta));

const text = await run(chat, "What is 2+2?", {
  emitter: stream,
  runConfig: { stream: true, think: false },
});

console.log("full reply:", text);
```

You can also use `adk.run(chat, input, options)` — same thing.

---

## `Agent` fields

| Key | Required | Description |
|-----|----------|-------------|
| `name` | yes | Agent id used in logs / registry |
| `instructions` | no | System prompt (`systemPrompt` also accepted) |
| `model` | no | Model id (falls back to ADK config default) |
| `url` | no | Host override (Ollama base URL, or OpenRouter server URL) |
| `tools` | no | Array of tools from `tool({ ... })` |
| `handoffs` | no | Array of other `Agent` instances this agent may hand work to |
| `id` | no | Defaults to `name` |

```js
const agent = new Agent({
  name: "chat",
  instructions: "Be brief.",
  model: "qwen3.5:2b",
  url: "http://localhost:11434",
  tools: [echo],
  handoffs: [mathAgent, historyAgent],
});
```

---

## `tool({ ... })` fields

| Key | Required | Description |
|-----|----------|-------------|
| `name` | yes | Tool name sent to the model |
| `description` | no | What the tool does (model reads this) |
| `parameters` | no | JSON Schema for arguments (`type`, `properties`, `required`) |
| `schema` | no | Full schema override (`{ name, description, parameters }`) |
| `execute` | yes* | `async (args, ctx) => result` — runs when the tool is called |
| `executor` | yes* | Alias for `execute` |

\* One of `execute` or `executor` is required.

```js
const echo = tool({
  name: "echo",
  description: "Echo text back",
  parameters: {
    type: "object",
    properties: {
      text: { type: "string", description: "Text to echo" },
    },
    required: ["text"],
  },
  execute: async ({ text }, ctx) => {
    console.log("session:", ctx?.context?.sessionId);
    return { echoed: text };
  },
});
```

`ctx.context` is the same object you pass as `options.context` on `run` (including `files`).

---

## `run(agent, input, options)` 

### `input`

Like OpenAI-style agent input:

- **string** → one user message  
- **array of messages** → full conversation history

```js
// string
await run(chat, "Hi");

// history (OpenAI-like messages)
await run(chat, [
  { role: "user", content: "Hi" },
  { role: "assistant", content: "Hello!" },
  { role: "user", content: "What did I just say?" },
]);
```

Content can also be parts (text / file / image refs). File **bytes** go in `context.files`; parts reference them by `id`:

```js
await run(chat, [
  {
    role: "user",
    content: [
      { type: "input_text", text: "Summarize this PDF." },
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
        data: pdfBuffer, // Blob | Buffer | base64 string
      },
    },
  },
  onChunk: (delta) => console.log(delta),
});
```

### `options` keys

| Key | Description |
|-----|-------------|
| `onChunk` | `(delta, raw?) => void` — called for each streamed text piece |
| `emitter` | `Emitter` instance — ADK also `emit`s each text delta here |
| `context` | App bag for tools / hooks. Use `context.files` for blobs. Not dumped raw to the model API. |
| `maxTurns` | Safety cap for future tool / handoff loops (default `10`) |
| `runConfig` | Platform request knobs (see below) |
| `adk` | ADK instance (only needed for top-level `run` if you did not just call `createADK`) |

### `runConfig` keys (common)

| Key | Description |
|-----|-------------|
| `stream` | `true` / `false`. Defaults to `true` if `onChunk` or `emitter` is set |
| `url` | Override host for this run only |
| `model` | Override model for this run only |
| `think` | Ollama thinking models: `false` to skip long reasoning |
| `temperature` | Passed through when the platform supports it |
| `tools` | Optional tools array override for this run |

Other allowed platform fields can be added under `runConfig` over time.

---

## Emitter (streaming)

One `Emitter` = one stream channel. Create as many as you need.

```js
const stream = new Emitter();

stream.listen((delta) => {
  console.log(delta);
});

await run(chat, "Tell me a short joke.", {
  emitter: stream,
  runConfig: { stream: true, think: false },
});
```

Or use `onChunk` only:

```js
await run(chat, "Hi", {
  onChunk: (delta) => console.log(delta),
  runConfig: { stream: true, think: false },
});
```

Fan-out one run to several emitters:

```js
const ui = new Emitter();
const log = new Emitter();

ui.listen((d) => console.log("ui:", d));
log.listen((d) => console.log("log:", d));

await run(chat, "Hi", {
  onChunk: (delta) => {
    ui.emit(delta);
    log.emit(delta);
  },
  runConfig: { stream: true, think: false },
});
```

---

## Parallel runs (multi-runner)

Run two agents at once; each can have its own Emitter:

```js
const streamA = new Emitter();
const streamB = new Emitter();

streamA.listen((d) => console.log("[A]", d));
streamB.listen((d) => console.log("[B]", d));

const [textA, textB] = await Promise.all([
  run(agentA, "Say hello briefly.", {
    emitter: streamA,
    runConfig: { stream: true, think: false },
  }),
  run(agentB, "Give one short tip.", {
    emitter: streamB,
    runConfig: { stream: true, think: false },
  }),
]);

console.log("A done:", textA);
console.log("B done:", textB);
```

---

## Router agent + handoffs

Define specialist agents, then a **router** that lists them in `handoffs`.

```js
const mathAgent = new Agent({
  name: "math",
  model: "qwen3.5:2b",
  url: "http://localhost:11434",
  instructions: "You solve math. Show short steps.",
});

const historyAgent = new Agent({
  name: "history",
  model: "qwen3.5:2b",
  url: "http://localhost:11434",
  instructions: "You answer history questions briefly.",
});

const router = new Agent({
  name: "router",
  model: "qwen3.5:2b",
  url: "http://localhost:11434",
  instructions: `You are a triage router.
Reply with exactly one word: math OR history OR chat
based on the user question.`,
  handoffs: [mathAgent, historyAgent],
});
```

**How to run today**

Automatic transfer inside one `run()` call is not enabled yet. You still **start with the router**, then **`run` the chosen specialist** yourself (using the router’s `handoffs` list):

```js
const question = "What is 17 times 23?";

const choice = (await run(router, question, {
  runConfig: { stream: false, think: false },
}))
  .trim()
  .toLowerCase();

console.log("router chose:", choice);

const next =
  router.handoffs.find((a) => a.name === choice) ||
  router.handoffs[0];

const stream = new Emitter();
stream.listen((d) => console.log(d));

const answer = await run(next, question, {
  emitter: stream,
  runConfig: { stream: true, think: false },
});

console.log("specialist:", next.name, "→", answer);
```

You can also skip the router and call a specialist directly:

```js
await run(mathAgent, "What is 12 * 8?", {
  onChunk: (d) => console.log(d),
  runConfig: { stream: true, think: false },
});
```

Or chain agents in a fixed order (pipeline):

```js
const draft = await run(researcher, topic, {
  runConfig: { stream: false, think: false },
});

const final = await run(writer, [
  { role: "user", content: `Rewrite clearly:\n${draft}` },
], {
  onChunk: (d) => console.log(d),
  runConfig: { stream: true, think: false },
});
```

`Agent.handoffs` is the place to declare the graph; your app (or a future ADK runner loop) decides when to switch.

---

## `createADK` options

| Key | Description |
|-----|-------------|
| `env` | `"server"` (Node SDKs) or `"default"` (global `fetch`) |
| `platform` | `"ollama"` or `"openrouter"` |
| `config` | Platform settings (`OLLAMA_HOST`, `OLLAMA_MODEL`, `API_KEY`, …) |

---

## Local smoke test (package)

```bash
cd switch-framework-adk
npm install
npm run test:ollama
```

## Dual-chat HTML demo (outside this package)

From the parent repo (`OllamaChatTest`):

```bash
node examples/dual-chat/server.js
```

Open http://localhost:3847 — two inputs, two streamed panes, parallel “Run both”.

---

## License

MIT © Switcherfaiz
