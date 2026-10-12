/** Runtime defaults — override via createADK({ config }). */
module.exports = {
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || "qwen3.5:2b",
  OLLAMA_HOST: process.env.OLLAMA_HOST || "http://localhost:11434",
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
  OPENROUTER_ENDPOINT: "https://openrouter.ai/api/v1/chat/completions",
};
