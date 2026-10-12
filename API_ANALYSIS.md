# switch-framework-adk — design notes

Full prior analysis lived in the parent monorepo experiment. Summary for this package:

- **Name:** `switch-framework-adk` (Switch Framework Agent Development Kit). Not Google `@google/adk`.
- **Public API:** `createADK`, `Agent`, `tool`, `Emitter`, `run` — no `buildRunBody` required for normal use.
- **`input`:** string or message history; file/image parts reference ids.
- **`context.files`:** blob bag (`Blob` / `Buffer` / base64).
- **Streams:** many `Emitter`s; parallel `run()` + `Promise.all`.
- **Handoffs:** manual sequencing for now; `Agent.handoffs` reserved.
- Prefer **`onChunk` / `emitter`** over `for await` as the primary DX.
