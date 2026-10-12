/** Node server — CommonJS node-fetch (no ESM import). */
function getFetch() {
  return require("node-fetch");
}

module.exports = { getFetch };
