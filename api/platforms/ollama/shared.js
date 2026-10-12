function normalizeOllamaHost(url) {
  if (!url) return url;
  return String(url)
    .replace(/\/api\/chat\/?$/i, "")
    .replace(/\/api\/generate\/?$/i, "")
    .replace(/\/+$/, "");
}

/** NDJSON stream (Ollama HTTP) via fetch + TextDecoder. */
async function readNdjsonStream(response, onChunk, pickDelta) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const chunk = JSON.parse(trimmed);
      const delta = pickDelta(chunk);
      if (delta) {
        full += delta;
        onChunk?.(delta, chunk);
      }
    }
  }

  if (buffer.trim()) {
    const chunk = JSON.parse(buffer.trim());
    const delta = pickDelta(chunk);
    if (delta) {
      full += delta;
      onChunk?.(delta, chunk);
    }
  }

  return full;
}

module.exports = { normalizeOllamaHost, readNdjsonStream };
