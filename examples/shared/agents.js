const { Agent } = require("../../index");
const { echo, weather, wordCount } = require("./tools");

const MODEL = process.env.OLLAMA_MODEL || "qwen3.5:2b";
const HOST = process.env.OLLAMA_HOST || "http://localhost:11434";

/** Left pane — concise helpful assistant */
const assistantA = new Agent({
  name: "assistant-a",
  model: MODEL,
  url: HOST,
  instructions:
    "You are Assistant A (Switch Framework demo). Answer briefly in 1–3 short sentences. Be friendly.",
  tools: [echo, wordCount],
});

/** Right pane — slightly more analytical tone */
const assistantB = new Agent({
  name: "assistant-b",
  model: MODEL,
  url: HOST,
  instructions:
    "You are Assistant B (Switch Framework demo). Answer briefly, with a slightly analytical tone. 1–3 short sentences.",
  tools: [weather, wordCount],
});

module.exports = { assistantA, assistantB, MODEL, HOST };
