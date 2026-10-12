const defaultConfig = require("./index");

/** Map host-friendly keys onto internal config used by platforms. */
function mergeConfig(overrides = {}) {
  const config = { ...defaultConfig, ...overrides };

  if (overrides.API_KEY != null && String(overrides.API_KEY).length > 0) {
    config.OPENROUTER_API_KEY = overrides.API_KEY;
  }
  if (overrides.OLLAMA_HOST != null) config.OLLAMA_HOST = overrides.OLLAMA_HOST;
  if (overrides.OLLAMA_MODEL != null) config.OLLAMA_MODEL = overrides.OLLAMA_MODEL;

  return config;
}

module.exports = { mergeConfig };
