const { RUNTIME_KEYS, RUN_HOST_KEYS } = require("./runBody");

/**
 * API-only object for run({ url?, body, onChunk, … }).
 */
function buildRunBody(api = {}) {
  const body = {};
  for (const key of Object.keys(api)) {
    if (RUNTIME_KEYS.has(key) || RUN_HOST_KEYS.has(key)) {
      throw new Error(
        `[buildRunBody] Move "${key}" out of body — use run({ ${key}, body, … }).`
      );
    }
    body[key] = api[key];
  }
  return body;
}

module.exports = { buildRunBody };
