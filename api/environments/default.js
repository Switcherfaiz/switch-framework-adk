/** Browser / Node 18+ global fetch. */
function getFetch() {
  if (typeof fetch === "function") return fetch;
  throw new Error('[adk env "default"] global fetch is not available — use env "server".');
}

module.exports = { getFetch };
