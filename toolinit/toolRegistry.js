class ToolRegistry {
  #tools = {};

  constructor(toolsMap = {}) {
    this.#tools = { ...toolsMap };
  }

  static registerTools(toolsMap) {
    return new ToolRegistry(toolsMap);
  }

  registerTool(id, toolDef) {
    this.#tools[id] = toolDef;
    return this;
  }

  list() {
    return Object.keys(this.#tools);
  }

  hasTool(id) {
    return Boolean(this.#tools[id]);
  }

  getTool(id) {
    const tool = this.#tools[id];
    if (!tool) throw new Error(`[ToolRegistry] Tool "${id}" is not registered.`);
    return tool;
  }

  getSchemas(ids) {
    const idList = Array.isArray(ids) && ids.length ? ids : this.list();
    return idList.map((id) => {
      const tool = this.getTool(id);
      return {
        id,
        schema: tool.schema,
        description: tool.description,
      };
    });
  }

  async runTool(id, params) {
    const tool = this.getTool(id);
    if (typeof tool.executor !== "function") {
      throw new Error(`[ToolRegistry] Tool "${id}" has no executor().`);
    }
    return await tool.executor(params);
  }
}

module.exports = { ToolRegistry };
