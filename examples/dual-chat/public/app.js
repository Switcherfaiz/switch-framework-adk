const history = { a: [], b: [] };
const busy = { a: false, b: false };

const els = {
  meta: document.getElementById("meta"),
  toolsA: document.getElementById("tools-a"),
  toolsB: document.getElementById("tools-b"),
  outA: document.getElementById("out-a"),
  outB: document.getElementById("out-b"),
  inputA: document.getElementById("input-a"),
  inputB: document.getElementById("input-b"),
  formA: document.getElementById("form-a"),
  formB: document.getElementById("form-b"),
  runBoth: document.getElementById("run-both"),
  clear: document.getElementById("clear"),
};

function outEl(agent) {
  return agent === "b" ? els.outB : els.outA;
}

function inputEl(agent) {
  return agent === "b" ? els.inputB : els.inputA;
}

function appendBubble(agent, role, text) {
  const root = outEl(agent);
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = role;
  const body = document.createElement("div");
  body.className = "body";
  body.textContent = text;
  div.appendChild(label);
  div.appendChild(body);
  root.appendChild(div);
  root.scrollTop = root.scrollHeight;
  return body;
}

async function loadMeta() {
  try {
    const res = await fetch("/api/meta");
    const data = await res.json();
    els.meta.textContent = `Ollama · ${data.model}`;
    els.toolsA.textContent = (data.agents.a.tools || []).join(", ") || "no tools";
    els.toolsB.textContent = (data.agents.b.tools || []).join(", ") || "no tools";
  } catch {
    els.meta.textContent = "Meta unavailable — is the demo server running?";
  }
}

async function runLane(agent, prompt) {
  if (!prompt || busy[agent]) return;
  busy[agent] = true;
  inputEl(agent).disabled = true;

  appendBubble(agent, "user", prompt);
  const assistantBody = appendBubble(agent, "assistant", "");

  try {
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent,
        input: prompt,
        history: history[agent],
        sessionId: `ui-${agent}`,
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    let eventName = "message";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() || "";

      for (const line of parts) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
          continue;
        }
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw) continue;
        let data;
        try {
          data = JSON.parse(raw);
        } catch {
          continue;
        }

        if (eventName === "chunk" && data.delta) {
          full += data.delta;
          assistantBody.textContent = full;
          outEl(agent).scrollTop = outEl(agent).scrollHeight;
        } else if (eventName === "done") {
          full = data.text || full;
          assistantBody.textContent = full;
          history[agent].push({ role: "user", content: prompt });
          history[agent].push({ role: "assistant", content: full });
        } else if (eventName === "error") {
          assistantBody.parentElement.classList.add("error");
          assistantBody.textContent = data.message || "Error";
        }
      }
    }
  } catch (err) {
    assistantBody.parentElement.classList.add("error");
    assistantBody.textContent = err.message || String(err);
  } finally {
    busy[agent] = false;
    inputEl(agent).disabled = false;
    inputEl(agent).focus();
  }
}

els.formA.addEventListener("submit", (e) => {
  e.preventDefault();
  const v = els.inputA.value.trim();
  els.inputA.value = "";
  runLane("a", v);
});

els.formB.addEventListener("submit", (e) => {
  e.preventDefault();
  const v = els.inputB.value.trim();
  els.inputB.value = "";
  runLane("b", v);
});

els.runBoth.addEventListener("click", () => {
  const a = els.inputA.value.trim() || "Say hello in one short sentence.";
  const b = els.inputB.value.trim() || "Give one analytical tip in one short sentence.";
  els.inputA.value = "";
  els.inputB.value = "";
  Promise.all([runLane("a", a), runLane("b", b)]);
});

els.clear.addEventListener("click", () => {
  history.a = [];
  history.b = [];
  els.outA.innerHTML = "";
  els.outB.innerHTML = "";
});

loadMeta();
