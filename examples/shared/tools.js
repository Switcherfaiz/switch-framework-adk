const { tool } = require("../../index");

const echo = tool({
  name: "echo",
  description: "Echoes the input string back (demo tool).",
  parameters: {
    type: "object",
    properties: {
      text: { type: "string", description: "Text to echo" },
    },
    required: ["text"],
  },
  execute: async ({ text }, ctx) => ({
    echoed: text,
    sessionId: ctx?.context?.sessionId ?? null,
  }),
});

const weather = tool({
  name: "weather",
  description: "Gets a demo weather string for a city.",
  parameters: {
    type: "object",
    properties: {
      city: { type: "string", description: "City name" },
    },
    required: ["city"],
  },
  execute: async ({ city }) => ({
    city,
    weather: `Weather in ${city} is sunny (demo)`,
  }),
});

const wordCount = tool({
  name: "word_count",
  description: "Counts words in a string.",
  parameters: {
    type: "object",
    properties: {
      text: { type: "string" },
    },
    required: ["text"],
  },
  execute: async ({ text }) => ({
    words: String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length,
  }),
});

module.exports = { echo, weather, wordCount };
