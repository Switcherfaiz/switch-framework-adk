const { getDefaultADK } = require("./context");

/**
 * Agent definition. If an ADK was already created, the agent (and its tools)
 * are registered on it when constructed.
 */
class Agent {
  /**
   * @param {object} opts
   * @param {string} opts.name
   * @param {string} [opts.instructions]
   * @param {string} [opts.systemPrompt]
   * @param {string} [opts.model]
   * @param {string} [opts.url]
   * @param {object[]} [opts.tools]
   * @param {Agent[]} [opts.handoffs]
   * @param {string} [opts.id]
   */
  constructor(opts = {}) {
    if (!opts.name || typeof opts.name !== "string") {
      throw new Error("[Agent] name is required");
    }
    this.name = opts.name;
    this.id = opts.id || opts.name;
    this.instructions =
      opts.instructions ?? opts.systemPrompt ?? opts.system_prompt ?? "";
    this.model = opts.model;
    this.url = opts.url;
    this.tools = Array.isArray(opts.tools) ? opts.tools : [];
    this.handoffs = Array.isArray(opts.handoffs) ? opts.handoffs : [];

    const adk = getDefaultADK();
    if (adk && typeof adk.registerAgent === "function") {
      for (const t of this.tools) {
        if (t && t.name) adk.registerTool(t);
      }
      adk.registerAgent(this);
    }
  }

  toDefinition() {
    return {
      id: this.id,
      name: this.name,
      url: this.url,
      systemPrompt: this.instructions,
      model: this.model,
      tools: this.tools,
      handoffs: this.handoffs,
    };
  }
}

module.exports = { Agent };
