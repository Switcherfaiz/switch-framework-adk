function normalizeOpenRouterServerUrl(url) {
  if (!url) return undefined;
  return String(url)
    .replace(/\/chat\/completions\/?$/i, "")
    .replace(/\/+$/, "");
}

async function streamOpenRouterFetch(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const dataStr = trimmed.replace(/^data:\s*/, "");
      if (dataStr === "[DONE]") continue;
      try {
        const json = JSON.parse(dataStr);
        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onChunk?.(delta, json);
        }
      } catch {
        /* partial line */
      }
    }
  }

  return full;
}

function createOpenRouterFetchChat({ fetchFn, config }) {
  const defaultEndpoint = config.OPENROUTER_ENDPOINT;
  const apiKey = config.OPENROUTER_API_KEY || config.API_KEY || "";

  async function chat({
    fetchFn: fn = fetchFn,
    url,
    onChunk,
    model,
    messages,
    tools,
    stream,
    includeTools,
    ...rest
  }) {
    const resolvedUrl = url || defaultEndpoint;
    const body = {
      model: model || "openrouter/auto",
      messages,
      stream: Boolean(stream),
      ...rest,
    };
    if (includeTools && Array.isArray(tools) && tools.length > 0) {
      body.tools = tools;
    }

    const res = await fn(resolvedUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`[openrouter] ${res.status}: ${await res.text()}`);
    }

    if (!stream) {
      const data = await res.json();
      return data?.choices?.[0]?.message?.content ?? "";
    }

    return streamOpenRouterFetch(res, onChunk);
  }

  return { chat };
}

module.exports = {
  createOpenRouterFetchChat,
  streamOpenRouterFetch,
  normalizeOpenRouterServerUrl,
};
