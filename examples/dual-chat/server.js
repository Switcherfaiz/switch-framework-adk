/**
 * Dual parallel runners demo — two SSE streams + simple HTML UI.
 * npm run example:dual  →  http://localhost:3847
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { createADK, Emitter, run } = require("../../index");
const { assistantA, assistantB, MODEL } = require("../shared/agents");
const { echo, weather, wordCount } = require("../shared/tools");

const PORT = Number(process.env.PORT) || 3847;
const PUBLIC = path.join(__dirname, "public");

const adk = createADK({
  env: "server",
  platform: "ollama",
  config: { OLLAMA_MODEL: MODEL },
});

adk.createToolRegistry({
  echo,
  weather,
  word_count: wordCount,
});

const agents = {
  a: assistantA,
  b: assistantB,
};

function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  return "application/octet-stream";
}

async function handleRun(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    return sendJson(res, 400, { error: "Invalid JSON body" });
  }

  const lane = body.agent === "b" ? "b" : "a";
  const agent = agents[lane];
  const prompt = typeof body.input === "string" ? body.input.trim() : "";
  if (!prompt) return sendJson(res, 400, { error: "input is required" });

  const history = Array.isArray(body.history) ? body.history : [];
  const input = [
    ...history,
    { role: "user", content: prompt },
  ];

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  const writeEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const emitter = new Emitter();
  emitter.listen((delta) => {
    writeEvent("chunk", { agent: lane, delta });
  });

  writeEvent("start", { agent: lane, model: MODEL, name: agent.name });

  try {
    const full = await run(agent, input, {
      adk,
      emitter,
      maxTurns: 6,
      context: {
        sessionId: body.sessionId || `dual-${lane}`,
        files: body.files || {},
      },
      runConfig: { stream: true, think: false },
    });
    writeEvent("done", { agent: lane, text: full });
  } catch (err) {
    writeEvent("error", { agent: lane, message: err.message || String(err) });
  }
  res.end();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/meta") {
    return sendJson(res, 200, {
      model: MODEL,
      agents: {
        a: { name: assistantA.name, tools: assistantA.tools.map((t) => t.name) },
        b: { name: assistantB.name, tools: assistantB.tools.map((t) => t.name) },
      },
    });
  }

  if (req.method === "POST" && url.pathname === "/api/run") {
    return handleRun(req, res);
  }

  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, "");
  const abs = path.join(PUBLIC, filePath);

  if (!abs.startsWith(PUBLIC)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(abs, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": contentType(abs) });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Switch Framework ADK dual-chat → http://localhost:${PORT}`);
  console.log(`Model: ${MODEL} (Ollama)`);
  console.log(`Agents: ${assistantA.name} | ${assistantB.name}`);
});
