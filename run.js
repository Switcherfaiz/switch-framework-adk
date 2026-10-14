const { Agent } = require("./Agent");
const { buildRunBody } = require("./utils");
const { toolsToApiSchemas } = require("./tool");

/** Normalize input (string or message list) into chat messages. */
function normalizeInputToMessages(input) {
  if (typeof input === "string") {
    return [{ role: "user", content: input }];
  }
  if (!Array.isArray(input)) {
    throw new Error("[run] input must be a string or an array of messages");
  }
  return input.map((msg) => {
    if (!msg || typeof msg !== "object") {
      throw new Error("[run] each message must be an object");
    }
    return {
      ...msg,
      content: flattenContent(msg.content),
    };
  });
}

function flattenContent(content) {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content);

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (!part || typeof part !== "object") return "";
      if (part.type === "input_text" || part.type === "text") return part.text || "";
      if (part.type === "input_file") {
        const id = part.file?.id || part.file?.name || "file";
        return `[attached file: ${id}]`;
      }
      if (part.type === "input_image") {
        const id = part.image?.id || part.file?.id || "image";
        return `[attached image: ${id}]`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function resolveAgent(adk, agentOrName) {
  if (agentOrName instanceof Agent) {
    return agentOrName;
  }
  if (agentOrName && typeof agentOrName === "object" && agentOrName.name) {
    return agentOrName instanceof Agent ? agentOrName : new Agent(agentOrName);
  }
  if (typeof agentOrName === "string") {
    const reg = adk._agentRegistry;
    if (!reg) {
      throw new Error(
        `[run] agent name "${agentOrName}" needs a registry — pass an Agent instance or call createAgentRegistry first`
      );
    }
    const def = reg.getAgent(agentOrName);
    return new Agent({
      name: def.name || agentOrName,
      id: def.id || agentOrName,
      instructions: def.systemPrompt || def.instructions || "",
      model: def.model,
      url: def.url,
      tools: def.tools || [],
    });
  }
  throw new Error("[run] first argument must be an Agent instance, plain agent def, or registered name");
}

/**
 * Ergonomic run — maps Agent + input + options → platform chat.
 *
 * @param {object} adk — createADK() instance
 * @param {Agent|string|object} agentOrName
 * @param {string|object[]} input — utterance or conversation history
 * @param {object} [options]
 * @param {object} [options.context] — DI bag; use context.files for blobs
 * @param {number|null} [options.maxTurns]
 * @param {Function} [options.onChunk]
 * @param {import("./emitter").Emitter} [options.emitter]
 * @param {object} [options.runConfig]
 */
async function runWithAdk(adk, agentOrName, input, options = {}) {
  if (!adk || !adk.platformApi) {
    throw new Error("[run] invalid adk instance — call createADK() first");
  }

  const agent = resolveAgent(adk, agentOrName);
  const {
    context = {},
    maxTurns = 10,
    onChunk,
    emitter,
    runConfig = {},
  } = options;

  void maxTurns;
  void context;

  const messages = normalizeInputToMessages(input);
  const model = runConfig.model || agent.model || adk.config.OLLAMA_MODEL;
  const stream =
    runConfig.stream !== undefined
      ? Boolean(runConfig.stream)
      : Boolean(onChunk || emitter);

  const emitDelta = (delta, raw) => {
    if (delta == null || delta === "") return;
    onChunk?.(delta, raw);
    emitter?.emit(delta);
  };

  const { url, stream: _s, model: _m, tools: runConfigTools, ...restConfig } = runConfig;

  const agentTools = agent.tools || [];
  for (const t of agentTools) {
    if (t && t.name && typeof adk.registerTool === "function") {
      adk.registerTool(t);
    }
  }
  const apiTools =
    runConfigTools ||
    (agentTools.length ? toolsToApiSchemas(agentTools) : undefined);

  const bodyFields = {
    model,
    messages,
    stream,
    ...restConfig,
  };
  if (apiTools && apiTools.length) {
    bodyFields.tools = apiTools;
  }

  const def = agent.toDefinition();
  if (!def.url && !url) {
    def.url = adk.config.OLLAMA_HOST || "http://localhost:11434";
  }

  if (typeof adk.registerAgent === "function") {
    adk.registerAgent(agent);
  } else if (!adk._agentRegistry) {
    adk.createAgentRegistry({ [agent.name]: def });
  } else {
    adk._agentRegistry.registerAgent(agent.name, def);
  }

  const request = {
    body: buildRunBody(bodyFields),
    onChunk: stream ? emitDelta : undefined,
  };
  if (url !== undefined) request.url = url;
  else if (def.url) request.url = def.url;

  return adk._agentRegistry.run(agent.name, request);
}

module.exports = {
  runWithAdk,
  normalizeInputToMessages,
  flattenContent,
};
