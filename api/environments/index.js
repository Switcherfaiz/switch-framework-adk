const { getFetch: defaultFetch } = require("./default");
const { getFetch: nodeFetch } = require("./nodejsServer");
const { getFetch: mobileFetch } = require("./expomobile");

/** @param {"default"|"server"|"mobile"} env */
function resolveEnvironment(env) {
  switch (env) {
    case "server":
      return nodeFetch();
    case "mobile":
      return mobileFetch();
    case "default":
    default:
      return defaultFetch();
  }
}

module.exports = { resolveEnvironment };
