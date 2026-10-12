/** Minimal per-turn state bag — grow as needed. */
class SharedState {
  constructor(params = {}) {
    this.userMessage = params.userMessage ?? "";
    this.pairs = params.pairs ?? [];
    this.onChunk = params.onChunk ?? null;
    this.memory = params.memory ?? [];
  }
}

module.exports = { SharedState };
