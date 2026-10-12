function buildMessages({ sysPrompt, memory = [], payload }) {
  const userContent =
    typeof payload === "string" ? payload : JSON.stringify(payload);
  const messages = [];
  if (sysPrompt) messages.push({ role: "system", content: sysPrompt });
  messages.push(...memory);
  messages.push({ role: "user", content: userContent });
  return messages;
}

module.exports = { buildMessages };
