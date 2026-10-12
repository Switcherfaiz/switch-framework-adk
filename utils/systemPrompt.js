/** ADK-only message roles — stripped or merged before the platform API sees messages. */
const ADK_ONLY_MESSAGE_ROLES = new Set(["system_append"]);

function getAgentSystemPrompt(agentDef = {}) {
  const raw =
    agentDef.systemPrompt ?? agentDef.sysPrompt ?? agentDef.system_prompt ?? "";
  const text = typeof raw === "string" ? raw.trim() : "";
  return text || null;
}

function messageContent(message) {
  if (typeof message?.content === "string") return message.content;
  return JSON.stringify(message?.content ?? "");
}

/**
 * - role "system" → replaces agent default system prompt
 * - role "system_append" → appended to the effective system text (never sent to API)
 * - output messages are only API-safe roles
 */
function normalizeMessagesForApi(messages, agentDef) {
  const appendParts = [];
  const rest = [];
  let userSystem = null;

  for (const message of messages) {
    if (!message || typeof message !== "object") continue;

    if (message.role === "system_append") {
      appendParts.push(messageContent(message));
      continue;
    }

    if (message.role === "system") {
      userSystem = messageContent(message);
      continue;
    }

    if (ADK_ONLY_MESSAGE_ROLES.has(message.role)) continue;

    rest.push(message);
  }

  let systemContent = userSystem ?? getAgentSystemPrompt(agentDef);

  if (appendParts.length) {
    const appendText = appendParts.join("\n\n");
    systemContent = systemContent ? `${systemContent}\n\n${appendText}` : appendText;
  }

  const out = [];
  if (systemContent) {
    out.push({ role: "system", content: systemContent });
  }

  return [...out, ...rest];
}

module.exports = {
  normalizeMessagesForApi,
  getAgentSystemPrompt,
  ADK_ONLY_MESSAGE_ROLES,
  applyAgentSystemPrompt: normalizeMessagesForApi,
};
