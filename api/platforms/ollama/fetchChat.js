const { normalizeOllamaHost, readNdjsonStream } = require("./shared");

function createOllamaFetchChat({ fetchFn, config }) {
  const modelDefault = config.OLLAMA_MODEL;
  const configHost = config.OLLAMA_HOST;

  async function generate({ fetchFn: fn = fetchFn, url, model, prompt, stream, onChunk }) {
    const m = model || modelDefault;
    const base = normalizeOllamaHost(url || configHost);
    const res = await fn(`${base}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: m, prompt, stream: Boolean(stream) }),
    });
    if (!res.ok) throw new Error(await res.text());

    if (!stream) {
      const data = await res.json();
      return data.response ?? "";
    }

    return readNdjsonStream(res, onChunk, (chunk) => chunk.response ?? "");
  }

  async function generateFetch(args) {
    return generate(args);
  }

  async function chat({
    fetchFn: fn = fetchFn,
    url,
    onChunk,
    model,
    messages,
    stream,
    tools,
    includeTools,
    ...rest
  }) {
    const m = model || modelDefault;
    const base = normalizeOllamaHost(url || configHost);
    const body = { model: m, messages, stream: Boolean(stream), ...rest };
    if (includeTools && Array.isArray(tools) && tools.length > 0) {
      body.tools = tools;
    }

    const res = await fn(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());

    if (!stream) {
      const data = await res.json();
      return data.message?.content ?? "";
    }

    return readNdjsonStream(
      res,
      onChunk,
      (chunk) => chunk.message?.content ?? ""
    );
  }

  return { chat, generate, generateFetch };
}

module.exports = { createOllamaFetchChat };
