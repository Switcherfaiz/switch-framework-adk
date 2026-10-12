/**
 * One instance = one stream. listen() callbacks only receive emits from this instance.
 */
class Emitter {
  #listeners = [];

  listen(callback) {
    if (typeof callback !== "function") {
      throw new Error("[Emitter] listen() requires a function.");
    }
    this.#listeners.push(callback);
    return () => {
      this.#listeners = this.#listeners.filter((fn) => fn !== callback);
    };
  }

  emit(chunk) {
    for (const fn of this.#listeners) fn(chunk);
  }
}

module.exports = { Emitter };
