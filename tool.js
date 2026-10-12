/**
 * Define a tool for agents. `execute` receives (args, runContext).
 *
 * @param {object} def
 * @param {string} def.name
 * @param {string} [def.description]
 * @param {object} [def.parameters] — JSON Schema object for arguments
 * @param {object} [def.schema] — full schema override
 * @param {Function} [def.execute]
 * @param {Function} [def.executor] — alias for execute
 */
function tool(def = {}) {
  if (!def.name || typeof def.name !== "string") {
    throw new Error("[tool] name is required");
  }
  const execute = def.execute || def.executor;
  if (typeof execute !== "function") {
    throw new Error(`[tool] "${def.name}" requires execute(args, ctx)`);
  }

  const parameters = def.parameters || { type: "object", properties: {} };
  const schema = def.schema || {
    name: def.name,
    description: def.description || "",
    parameters,
  };

  return {
    name: def.name,
    description: def.description || "",
    parameters,
    schema,
    execute,
    executor: execute,
  };
}

/** Convert tool defs to OpenAI/Ollama-style tools array for the API body. */
function toolsToApiSchemas(tools = []) {
  return tools.map((t) => {
    const schema = t.schema || {
      name: t.name,
      description: t.description || "",
      parameters: t.parameters || { type: "object", properties: {} },
    };
    return {
      type: "function",
      function: {
        name: schema.name || t.name,
        description: schema.description || t.description || "",
        parameters: schema.parameters || t.parameters || { type: "object", properties: {} },
      },
    };
  });
}

module.exports = { tool, toolsToApiSchemas };
