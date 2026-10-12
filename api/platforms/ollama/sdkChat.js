const { normalizeOllamaHost } = require("./shared");

function createOllamaSdkChat({ config }) {
  const modelDefault = config.OLLAMA_MODEL;
  const configHost = config.OLLAMA_HOST;

  function clientForUrl(url) {
    const pkg = require("ollama");
    const host = normalizeOllamaHost(url || configHost);
    const hostDefault = "http://localhost:11434";
    if (host && host !== hostDefault) {
      return new pkg.Ollama({ host });
    }
    return pkg.default;
  }

  async function generate({ url, model, prompt, stream, onChunk }) {
    const m = model || modelDefault;
    const api = clientForUrl(url);

    if (!stream) {
      const res = await api.generate({ model: m, prompt, stream: false });
      return res.response ?? "";
    }

    let full = "";
    const gen = await api.generate({ model: m, prompt, stream: true });
    for await (const chunk of gen) {
      const delta = chunk.response ?? "";
      if (delta) {
        full += delta;
        onChunk?.(delta, chunk);
      }
    }
    return full;
  }

  async function generateFetch({ fetchFn, url, model, prompt, stream, onChunk }) {
    const { createOllamaFetchChat } = require("./fetchChat");
    const fetchImpl = createOllamaFetchChat({ fetchFn, config });
    return fetchImpl.generate({ fetchFn, url, model, prompt, stream, onChunk });
  }

  async function chat({
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
    const api = clientForUrl(url);
    const request = { model: m, messages, stream: Boolean(stream), ...rest };
    if (includeTools && Array.isArray(tools) && tools.length > 0) {
      request.tools = tools;
    }

    if (!stream) {
      const res = await api.chat({ ...request, stream: false });
      return res.message?.content ?? "";
    }

    let full = "";
    const gen = await api.chat({ ...request, stream: true });
    for await (const chunk of gen) {
      const delta = chunk.message?.content ?? "";
      if (delta) {
        full += delta;
        onChunk?.(delta, chunk);
      }
    }
    return full;
  }

  return { chat, generate, generateFetch };
}

module.exports = { createOllamaSdkChat };
