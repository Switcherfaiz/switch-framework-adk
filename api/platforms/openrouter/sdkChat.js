const { normalizeOpenRouterServerUrl } = require("./fetchChat");

function readAssistantText(result) {
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  return "";
}

function createOpenRouterSdkChat({ config }) {
  const apiKey = config.OPENROUTER_API_KEY || config.API_KEY || "";

  async function getClient(url) {
    const { OpenRouter } = await import("@openrouter/sdk");
    const serverURL = normalizeOpenRouterServerUrl(url);
    return new OpenRouter({
      apiKey,
      ...(serverURL ? { serverURL } : {}),
    });
  }

  async function chat({
    url,
    onChunk,
    model,
    messages,
    tools,
    stream,
    includeTools,
    ...rest
  }) {
    const client = await getClient(url);
    const chatRequest = {
      model: model || "openrouter/auto",
      messages,
      stream: Boolean(stream),
      ...rest,
    };
    if (includeTools && Array.isArray(tools) && tools.length > 0) {
      chatRequest.tools = tools;
    }

    const serverURL = normalizeOpenRouterServerUrl(url);
    const sendOpts = serverURL ? { serverURL } : undefined;
    const result = await client.chat.send({ chatRequest }, sendOpts);

    if (!stream) {
      return readAssistantText(result);
    }

    let full = "";
    for await (const event of result) {
      const delta = event?.choices?.[0]?.delta?.content;
      if (delta) {
        full += delta;
        onChunk?.(delta, event);
      }
    }
    return full;
  }

  return { chat };
}

module.exports = { createOpenRouterSdkChat };
