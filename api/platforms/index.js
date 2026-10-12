const { createOllamaPlatform } = require("./ollama");
const { createOpenRouterPlatform } = require("./openrouter");

/** @param {"ollama"|"openrouter"} platformName */
function resolvePlatform(platformName, { fetchFn, config, env = "server" }) {
  switch (platformName) {
    case "openrouter":
      return createOpenRouterPlatform({ fetchFn, config, env });
    case "ollama":
    default:
      return createOllamaPlatform({ fetchFn, config, env });
  }
}

module.exports = { resolvePlatform };
