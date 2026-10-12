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

/** Last createADK() instance — used by top-level run(). */
let defaultAdk = null;

/**
 * Create a Switch Framework ADK instance (env + platform + registries).
 *
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

    createAgentRegistry(agentsMap) {
      instance._agentRegistry = AgentRegistry.registerAgents(agentsMap, {
        platform: platformApi,
        fetchFn,
      });
      return instance._agentRegistry;
    },

    createToolRegistry(toolsMap) {
      instance._toolRegistry = ToolRegistry.registerTools(toolsMap);
      return instance._toolRegistry;
    },

    /**
     * Ergonomic run: adk.run(agent, input, { onChunk, emitter, context, maxTurns, runConfig })
     */
    run(agentOrName, input, options = {}) {
      return runWithAdk(instance, agentOrName, input, options);
    },
  };

  defaultAdk = instance;
  return instance;
}

/**
 * Top-level run — uses the last createADK() instance (or options.adk).
 */
function run(agentOrName, input, options = {}) {
  const adk = options.adk || defaultAdk;
  if (!adk) {
    throw new Error(
      "[switch-framework-adk] Call createADK() before run(), or pass options.adk"
    );
  }
  const { adk: _drop, ...rest } = options;
  return runWithAdk(adk, agentOrName, input, rest);
}

function getDefaultADK() {
  return defaultAdk;
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
