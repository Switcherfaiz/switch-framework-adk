const { splitRunRequest, resolveRunUrl } = require("../utils");
const { normalizeMessagesForApi } = require("../utils/systemPrompt");

class AgentRegistry {
  #agents = {};
  #platform = null;
  #fetchFn = null;

  constructor(agentsMap = {}, { platform, fetchFn } = {}) {
    this.#agents = { ...agentsMap };
    this.#platform = platform;
    this.#fetchFn = fetchFn;
  }

  static registerAgents(agentsMap, ctx) {
    return new AgentRegistry(agentsMap, ctx);
  }

  setPlatform(platform, fetchFn) {
    this.#platform = platform;
    if (fetchFn) this.#fetchFn = fetchFn;
    return this;
  }

  registerAgent(name, agentDef) {
    this.#agents[name] = agentDef;
    return this;
  }

  list() {
    return Object.keys(this.#agents);
  }

  getAgent(name) {
    const agent = this.#agents[name];
    if (!agent) throw new Error(`[AgentRegistry] Agent "${name}" is not registered.`);
    return agent;
  }

  /**
   * @param {object} request — { url?, body, onChunk, … }
   * `url` on request, when present, is the only url used — agent.url is ignored.
   */
  async run(agentName, request = {}) {
    if (!this.#platform) {
      throw new Error("[AgentRegistry] No platform configured — create via createADK().");
    }

    const agent = this.getAgent(agentName);
    const { api, runtime: rt, host, meta } = splitRunRequest(request);
    const url = resolveRunUrl(host, agent, agentName, { urlOnRun: meta.urlOnRun });

    api.messages = normalizeMessagesForApi(api.messages, agent);

    const stream = api.stream === true;
    const onChunk = stream ? rt.onChunk : undefined;
    const platformName = agent.platform || api.platform || this.#platform.id;
    const includeTools = meta.explicit.has("tools");

    if (platformName === "ollama" && agent.useGenerate && meta.explicit.has("prompt")) {
      const runGenerate = agent.useGenerateFetch
        ? this.#platform.generateFetch
        : this.#platform.generate;
      return runGenerate({
        fetchFn: this.#fetchFn,
        url,
        model: api.model,
        prompt: api.prompt,
        stream,
        onChunk,
      });
    }

    const { tools, prompt, platform: _platform, url: _urlInBody, ...apiRest } = api;

    return this.#platform.chat({
      fetchFn: this.#fetchFn,
      url,
      ...apiRest,
      tools,
      includeTools,
      stream,
      onChunk,
    });
  }
}

module.exports = { AgentRegistry };
