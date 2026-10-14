# switch-framework-adk

**Switch Framework ADK** is an Agent Development Kit for building streaming multi-agent applications.

It gives you a small, clear API — `createADK`, `Agent`, `tool`, `Emitter`, `run` — so you can define agents and tools, stream model output, and run one or many agents on **Ollama** or **OpenRouter**.

> Not affiliated with Google’s Agent Development Kit (`@google/adk`).

---

## Table of contents

1. [Why this exists](#why-this-exists)
2. [Install](#install)
3. [Importing the package](#importing-the-package)
4. [Goals](#goals)
5. [Supported platforms](#supported-platforms)
6. [Environments](#environments)
7. [Smoke tests](#smoke-tests)
8. [Quick start](#quick-start)
9. [Definition registers agents and tools](#definition-registers-agents-and-tools)
10. [API reference](#api-reference)
11. [Usage scenarios](#usage-scenarios)
12. [License](#license)

---

## Why this exists

Building agent apps usually means mixing provider SDKs, stream parsing, system prompts, tools, and multi-agent flow by hand. Switch Framework ADK exists to:

- One API for **local** (Ollama) and **cloud** (OpenRouter) models
- Stream tokens with a simple **callback** or **Emitter**
- Define **agents** and **tools** in one place — defining them also **registers** them
- Support **conversation history**, parallel runners, and router / handoff patterns
- Stay small enough to drop into a Node backend without a heavy framework

---

## Install

```bash
git clone https://github.com/Switcherfaiz/switch-framework-adk.git
cd switch-framework-adk
npm install
```

Or from npm (when published):

```bash
npm install switch-framework-adk
```

Requires **Node.js ≥ 18**.

---

## Importing the package

### CommonJS

```js
const { createADK, Agent, tool, Emitter, run } = require("switch-framework-adk");
```

### ES modules

```js
import { createADK, Agent, tool, Emitter, run } from "switch-framework-adk";
```

Both styles export the same API.

---

## Goals

| Goal | How the ADK helps |
|------|-------------------|
| Simple DX | `createADK` → `tool` / `Agent` → `run` |
| Streaming first | `onChunk` and/or `Emitter` |
| Multi-provider | `platform: "ollama"` or `"openrouter"` |
| Multi-environment | `env: "server"` (SDK) or `"default"` (fetch) |
| Multi-agent | Parallel `run`, router + `handoffs`, pipelines |
| No secret ceremony | Define agent/tool once; registration is automatic |

---

## Supported platforms

| `platform` | Backend | Typical config |
|------------|---------|----------------|
| `"ollama"` | Local or remote Ollama | `OLLAMA_HOST`, `OLLAMA_MODEL` |
| `"openrouter"` | OpenRouter API | `API_KEY` |

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

For thinking models (e.g. `qwen3.5`), pass `runConfig: { think: false }` when you want a direct answer without a long reasoning stream.

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
  model: "openai/gpt-4o-mini",
  instructions: "Answer briefly.",
});
```

---

## Environments

| `env` | Transport | Best for |
|-------|-----------|----------|
| `"server"` | Official Node SDKs (`ollama`, `@openrouter/sdk`) | Backend Node apps |
| `"default"` | Global `fetch` | Lightweight Node, or fetch-only setups |

```js
// SDK transport
createADK({ env: "server", platform: "ollama", config: { /* … */ } });

// Fetch transport
createADK({ env: "default", platform: "ollama", config: { /* … */ } });

createADK({ env: "default", platform: "openrouter", config: { API_KEY: "…" } });
```

Keep API keys and ADK on the **server**. Browser UIs should call your HTTP API and consume the stream.

---

## Smoke tests

Run these from the **switch-framework-adk** directory after `npm install`.

### Ollama — server env (SDK)

```bash
ollama serve
ollama pull qwen3.5:2b
npm run test:ollama
```

### Ollama — default env (fetch)

```bash
ollama serve
ollama pull qwen3.5:2b
npm run test:ollama:fetch
```

### OpenRouter — server env (SDK)

```bash
# Windows PowerShell
$env:OPENROUTER_API_KEY="sk-or-..."
# optional: $env:OPENROUTER_MODEL="openai/gpt-4o-mini"
npm run test:openrouter
```

```bash
# macOS / Linux
export OPENROUTER_API_KEY=sk-or-...
npm run test:openrouter
```

### OpenRouter — default env (fetch)

```bash
$env:OPENROUTER_API_KEY="sk-or-..."   # PowerShell
# export OPENROUTER_API_KEY=sk-or-... # bash
npm run test:openrouter:fetch
```

Smoke scripts live under `examples/`:

| Script | Command |
|--------|---------|
| `examples/ollama-smoke.js` | `npm run test:ollama` |
| `examples/ollama-fetch-smoke.js` | `npm run test:ollama:fetch` |
| `examples/openrouter-smoke.js` | `npm run test:openrouter` |
| `examples/openrouter-fetch-smoke.js` | `npm run test:openrouter:fetch` |

---

## Quick start

```js
const { createADK, Agent, tool, Emitter, run } = require("switch-framework-adk");

createADK({
  env: "server",
  platform: "ollama",
  config: {
    OLLAMA_MODEL: "qwen3.5:2b",
    OLLAMA_HOST: "http://localhost:11434",
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
  execute: async ({ text }) => ({ echoed: text }),
});

const chat = new Agent({
  name: "chat",
  model: "qwen3.5:2b",
  url: "http://localhost:11434",
  instructions: "You are a helpful assistant. Answer briefly.",
  tools: [echo],
});

const stream = new Emitter();
stream.listen((delta) => console.log(delta));

const text = await run(chat, "What is 2+2?", {
  emitter: stream,
  runConfig: { stream: true, think: false },
});

console.log("full reply:", text);
```

ESM version of the same flow:

```js
import { createADK, Agent, Emitter, run } from "switch-framework-adk";

createADK({
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
  instructions: "Answer briefly.",
});

await run(chat, "Hi", {
  onChunk: (delta) => console.log(delta),
  runConfig: { stream: true, think: false },
});
```

---

## Definition registers agents and tools

Call **`createADK` first**, then define tools and agents.

- `tool({ ... })` → creates the tool **and** registers it on the active ADK  
- `new Agent({ ... })` → creates the agent **and** registers it (and its tools)  
- You do **not** need a separate `createToolRegistry` / `createAgentRegistry` for normal use  

Order:

```text
createADK(...)  →  tool(...)  →  new Agent({ tools: [...] })  →  run(agent, input, options)
```

---

## API reference

### Exports

| Export | Kind | Description |
|--------|------|-------------|
| `createADK` | function | Create ADK instance (env + platform + config) |
| `Agent` | class | Agent definition (auto-registers) |
| `tool` | function | Tool definition (auto-registers) |
| `Emitter` | class | Stream channel (`listen` / `emit`) |
| `run` | function | Run an agent with input + options |
| `getDefaultADK` | function | Last `createADK()` instance |
| `buildRunBody` | function | Low-level body builder (advanced) |

`adk.run(agent, input, options)` is the same as top-level `run` when that ADK is active.

---

### `createADK(options)`

| Param | Type | Description |
|-------|------|-------------|
| `env` | `"server"` \| `"default"` | Transport |
| `platform` | `"ollama"` \| `"openrouter"` | Provider |
| `config` | `object` | Provider settings |

**Useful `config` keys**

| Key | Platforms | Description |
|-----|-----------|-------------|
| `OLLAMA_HOST` | ollama | Base URL (default `http://localhost:11434`) |
| `OLLAMA_MODEL` | ollama | Default model |
| `API_KEY` | openrouter | OpenRouter API key |

**Instance methods**

| Method | Description |
|--------|-------------|
| `adk.run(agent, input, options)` | Run with this instance |
| `adk.registerTool(toolDef)` | Manual tool register (optional) |
| `adk.registerAgent(agent)` | Manual agent register (optional) |

---

### `tool(def)`

| Key | Required | Description |
|-----|----------|-------------|
| `name` | yes | Tool name |
| `description` | no | Shown to the model |
| `parameters` | no | JSON Schema for arguments |
| `schema` | no | Full schema override |
| `execute` | yes* | `async (args, ctx) => result` |
| `executor` | yes* | Alias for `execute` |

\* One of `execute` or `executor` is required.

```js
const weather = tool({
  name: "weather",
  description: "Demo weather",
  parameters: {
    type: "object",
    properties: { city: { type: "string" } },
    required: ["city"],
  },
  execute: async ({ city }, ctx) => {
    console.log(ctx?.context?.sessionId);
    return { weather: `Sunny in ${city}` };
  },
});
```

---

### `new Agent(opts)`

| Key | Required | Description |
|-----|----------|-------------|
| `name` | yes | Agent id |
| `instructions` | no | System prompt (`systemPrompt` also accepted) |
| `model` | no | Model id |
| `url` | no | Host override |
| `tools` | no | Array of tools |
| `handoffs` | no | Array of other `Agent`s |
| `id` | no | Defaults to `name` |

---

### `run(agent, input, options)`

**`input`**

| Form | Meaning |
|------|---------|
| `string` | Single user message |
| `Message[]` | Full conversation history |

```js
await run(chat, "Hi");

await run(chat, [
  { role: "user", content: "Hi" },
  { role: "assistant", content: "Hello!" },
  { role: "user", content: "What did I just say?" },
]);
```

Content parts + files:

```js
await run(chat, [
  {
    role: "user",
    content: [
      { type: "input_text", text: "Summarize this." },
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
        data: pdfBuffer,
      },
    },
  },
  onChunk: (d) => console.log(d),
});
```

**`options`**

| Key | Description |
|-----|-------------|
| `onChunk` | `(delta, raw?) => void` |
| `emitter` | `Emitter` — also receives text deltas |
| `context` | App bag for tools; use `context.files` for blobs |
| `maxTurns` | Cap for tool / handoff loops (default `10`) |
| `runConfig` | Platform request options |
| `adk` | Explicit ADK instance (optional) |

**`runConfig`**

| Key | Description |
|-----|-------------|
| `stream` | Default `true` if `onChunk` or `emitter` is set |
| `url` | Host override for this run |
| `model` | Model override for this run |
| `think` | Set `false` on thinking models for faster direct answers |
| `temperature` | Passed through when supported |
| `tools` | Optional tools override for this run |

---

### `Emitter`

| Method | Description |
|--------|-------------|
| `listen(fn)` | Subscribe; returns unsubscribe function |
| `emit(chunk)` | Send a chunk to all listeners |

One instance = one stream channel. Create many for parallel runners.

---

## Usage scenarios

### 1. First streamed request

```js
createADK({ env: "server", platform: "ollama", config: { OLLAMA_MODEL: "qwen3.5:2b" } });

const agent = new Agent({
  name: "chat",
  model: "qwen3.5:2b",
  url: "http://localhost:11434",
  instructions: "Be brief.",
});

await run(agent, "Hello", {
  onChunk: (delta) => console.log(delta),
  runConfig: { stream: true, think: false },
});
```

### 2. Emitter fan-out

```js
const ui = new Emitter();
const log = new Emitter();

ui.listen((d) => console.log("ui:", d));
log.listen((d) => console.log("log:", d));

await run(agent, "Hi", {
  onChunk: (delta) => {
    ui.emit(delta);
    log.emit(delta);
  },
  runConfig: { stream: true, think: false },
});
```

### 3. Parallel runners

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

console.log("A:", textA);
console.log("B:", textB);
```

### 4. OpenRouter backend

```js
createADK({
  env: "server",
  platform: "openrouter",
  config: { API_KEY: process.env.OPENROUTER_API_KEY },
});

const agent = new Agent({
  name: "cloud-chat",
  model: "openai/gpt-4o-mini",
  instructions: "Answer briefly.",
});

const text = await run(agent, "Hello from OpenRouter", {
  onChunk: (d) => console.log(d),
  runConfig: { stream: true },
});

console.log("done:", text);
```

### 5. Router agent + handoffs

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
Reply with exactly one word: math OR history
based on the user question.`,
  handoffs: [mathAgent, historyAgent],
});

const question = "What is 17 times 23?";

const choice = (await run(router, question, {
  runConfig: { stream: false, think: false },
}))
  .trim()
  .toLowerCase();

console.log("router chose:", choice);

const next =
  router.handoffs.find((a) => a.name === choice) || router.handoffs[0];

const answer = await run(next, question, {
  onChunk: (d) => console.log(d),
  runConfig: { stream: true, think: false },
});

console.log(next.name, "→", answer);
```

Automatic transfer inside a single `run()` is not enabled yet. Declare specialists on `handoffs`, then run the chosen agent yourself (as above).

### 6. Fixed pipeline

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

### 7. HTTP streaming backend (sketch)

```js
// POST body: { query: "..." }
res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });

await run(agent, body.query, {
  onChunk: (delta) => res.write(delta),
  runConfig: { stream: true, think: false },
});

res.end();
```

Frontend: `fetch` → `res.body.getReader()` → `TextDecoder`.

---

## Outro

Switch Framework ADK is meant to stay small: define agents and tools, pick a platform and environment, stream with `Emitter` or `onChunk`, and grow into routers and parallel runners when you need them.

Clone the repo, run a smoke test for your platform, then build your backend around `createADK` + `run`.

Contributions and issues: [github.com/Switcherfaiz/switch-framework-adk](https://github.com/Switcherfaiz/switch-framework-adk)

---

## License

MIT © Switcherfaiz
