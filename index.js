const { mergeConfig } = require("./config/mergeConfig");
const { resolveEnvironment } = require("./api/environments");
const { resolvePlatform } = require("./api/platforms");
const { AgentRegistry } = require("./agentinit");
const { ToolRegistry } = require("./toolinit");
const { Emitter } = require("./emitter");
const { buildRunBody } = require("./utils");
const { Agent } = require("./Agent");
const { tool, toolsToApiSchemas } = require("./tool");
const { runWithAdk } = require("./run");
const { setDefaultADK, getDefaultADK } = require("./context");

/**
 * @param {object} options
 * @param {"default"|"server"|"mobile"} [options.env]
 * @param {"ollama"|"openrouter"} [options.platform]
 * @param {object} [options.config]
 */
function createADK({ env = "server", platform = "ollama", config: configOverrides = {} } = {}) {
  const config = mergeConfig(configOverrides);
  const fetchFn = resolveEnvironment(env);
  const platformApi = resolvePlatform(platform, { fetchFn, config, env });

  const instance = {
    env,
    platform,
    config,
    fetch: fetchFn,
    platformApi,
    _agentRegistry: null,
    _toolRegistry: null,

    ensureAgentRegistry() {
      if (!instance._agentRegistry) {
        instance._agentRegistry = AgentRegistry.registerAgents(
          {},
          { platform: platformApi, fetchFn }
        );
      }
      return instance._agentRegistry;
    },

    ensureToolRegistry() {
      if (!instance._toolRegistry) {
        instance._toolRegistry = ToolRegistry.registerTools({});
      }
      return instance._toolRegistry;
    },

    /** Register a tool by name (also done automatically by tool()). */
    registerTool(toolDef) {
      if (!toolDef || !toolDef.name) return instance;
      instance.ensureToolRegistry().registerTool(toolDef.name, toolDef);
      return instance;
    },

    /** Register an Agent instance (also done automatically by new Agent()). */
    registerAgent(agentOrDef) {
      const def =
        agentOrDef && typeof agentOrDef.toDefinition === "function"
          ? agentOrDef.toDefinition()
          : agentOrDef;
      if (!def || !def.name) return instance;
      instance.ensureAgentRegistry().registerAgent(def.name, def);
      return instance;
    },

    createAgentRegistry(agentsMap) {
      instance._agentRegistry = AgentRegistry.registerAgents(agentsMap || {}, {
        platform: platformApi,
        fetchFn,
      });
      return instance._agentRegistry;
    },

    createToolRegistry(toolsMap) {
      instance._toolRegistry = ToolRegistry.registerTools(toolsMap || {});
      return instance._toolRegistry;
    },

    run(agentOrName, input, options = {}) {
      return runWithAdk(instance, agentOrName, input, options);
    },
  };

  instance.ensureAgentRegistry();
  instance.ensureToolRegistry();
  setDefaultADK(instance);
  return instance;
}

function run(agentOrName, input, options = {}) {
  const adk = options.adk || getDefaultADK();
  if (!adk) {
    throw new Error(
      "[switch-framework-adk] Call createADK() before run(), or pass options.adk"
    );
  }
  const { adk: _drop, ...rest } = options;
  return runWithAdk(adk, agentOrName, input, rest);
}

module.exports = {
  createADK,
  Agent,
  tool,
  Emitter,
  run,
  getDefaultADK,
  AgentRegistry,
  ToolRegistry,
  buildRunBody,
  toolsToApiSchemas,
};
