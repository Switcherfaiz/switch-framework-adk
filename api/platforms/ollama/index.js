const { createOllamaFetchChat } = require("./fetchChat");
const { createOllamaSdkChat } = require("./sdkChat");

/** @param {"default"|"server"|"mobile"} env */
function createOllamaPlatform({ fetchFn, config, env = "server" }) {
  const useSdk = env === "server";
  const impl = useSdk
    ? createOllamaSdkChat({ config })
    : createOllamaFetchChat({ fetchFn, config });

  return {
    id: "ollama",
    transport: useSdk ? "ollama-sdk" : "fetch",
    ...impl,
  };
}

module.exports = { createOllamaPlatform };
