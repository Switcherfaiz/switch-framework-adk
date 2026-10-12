/** Never sent to the platform HTTP/SDK body. */
const RUNTIME_KEYS = new Set(["emitter", "onChunk", "memory", "payload"]);

/** Allowed on run({ … }) beside body — not forwarded inside the API JSON body. */
const RUN_HOST_KEYS = new Set(["url"]);

const RUN_TOP_KEYS = new Set(["body", ...RUNTIME_KEYS, ...RUN_HOST_KEYS]);

/**
 * @param {object} request — { url?, body, onChunk, … }
 */
function splitRunRequest(request = {}) {
  if (!request.body || typeof request.body !== "object") {
    throw new Error(
      '[AgentRegistry.run] Expected { url?, body: buildRunBody({ … }), onChunk, … }.'
    );
  }

  for (const key of Object.keys(request)) {
    if (!RUN_TOP_KEYS.has(key)) {
      throw new Error(
        `[AgentRegistry.run] Unknown key "${key}" — platform fields go inside "body".`
      );
    }
  }

  for (const key of [...RUNTIME_KEYS, ...RUN_HOST_KEYS]) {
    if (Object.prototype.hasOwnProperty.call(request.body, key)) {
      throw new Error(
        `[AgentRegistry.run] Move "${key}" out of "body" — it belongs on the run object next to body.`
      );
    }
  }

  const api = { ...request.body };
  const runtime = {};
  for (const key of RUNTIME_KEYS) {
    if (Object.prototype.hasOwnProperty.call(request, key)) {
      runtime[key] = request[key];
    }
  }

  const host = {};
  for (const key of RUN_HOST_KEYS) {
    if (Object.prototype.hasOwnProperty.call(request, key)) {
      host[key] = request[key];
    }
  }

  const meta = {
    explicit: new Set(Object.keys(api)),
    urlOnRun: Object.prototype.hasOwnProperty.call(request, "url"),
  };

  if (!meta.explicit.has("messages")) {
    throw new Error(
      '[AgentRegistry.run] body must include "messages". Use buildRunBody({ model, messages, stream, … }).'
    );
  }

  return { api, runtime, host, meta };
}

/**
 * If run included `url`, only that value is used (agent url ignored).
 * If run omitted `url`, use agent.url.
 */
function resolveRunUrl(host, agentDef, agentName, { urlOnRun = false } = {}) {
  if (urlOnRun) {
    const url = typeof host.url === "string" ? host.url.trim() : String(host.url ?? "").trim();
    if (!url) {
      throw new Error(
        `[AgentRegistry] run({ url }) was provided for "${agentName}" but url is empty — agent url is not used as fallback.`
      );
    }
    return url;
  }

  const url = typeof agentDef.url === "string" ? agentDef.url.trim() : "";
  if (!url) {
    throw new Error(
      `[AgentRegistry] Agent "${agentName}" has no url — set agent.url or pass run({ url, body, … }).`
    );
  }
  return url;
}

module.exports = {
  splitRunRequest,
  splitRunBody: splitRunRequest,
  RUNTIME_KEYS,
  RUN_HOST_KEYS,
  resolveRunUrl,
};
