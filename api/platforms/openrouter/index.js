const { createOpenRouterFetchChat } = require("./fetchChat");
const { createOpenRouterSdkChat } = require("./sdkChat");

/** @param {"default"|"server"|"mobile"} env */
function createOpenRouterPlatform({ fetchFn, config, env = "server" }) {
  const useSdk = env === "server";
  const impl = useSdk
    ? createOpenRouterSdkChat({ config })
    : createOpenRouterFetchChat({ fetchFn, config });

  return {
    id: "openrouter",
    transport: useSdk ? "openrouter-sdk" : "fetch",
    ...impl,
  };
}

module.exports = { createOpenRouterPlatform };
