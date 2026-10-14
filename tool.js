const { getDefaultADK } = require("./context");

/**
 * Define a tool. If an ADK was already created, the tool is registered on it.
 *
 * @param {object} def
 * @param {string} def.name
 * @param {string} [def.description]
 * @param {object} [def.parameters]
 * @param {object} [def.schema]
 * @param {Function} [def.execute]
 * @param {Function} [def.executor]
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

  const toolDef = {
    name: def.name,
    description: def.description || "",
    parameters,
    schema,
    execute,
    executor: execute,
  };

  const adk = getDefaultADK();
  if (adk && typeof adk.registerTool === "function") {
    adk.registerTool(toolDef);
  }

  return toolDef;
}

/** Build platform `tools` array from tool definitions. */
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
        parameters:
          schema.parameters || t.parameters || { type: "object", properties: {} },
      },
    };
  });
}

module.exports = { tool, toolsToApiSchemas };
