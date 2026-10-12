/** Optional wrapper — most hosts call agentRegInstance.run(name, { body, onChunk }) directly. */
function initializeAgent({ name, sysPrompt, registry }) {
  async function run(request) {
    return registry.run(name, request);
  }

  return { name, sysPrompt, run };
}

module.exports = { initializeAgent };
