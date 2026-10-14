/** Holds the active ADK instance for define-time registration. */
let defaultAdk = null;

function setDefaultADK(adk) {
  defaultAdk = adk || null;
}

function getDefaultADK() {
  return defaultAdk;
}

module.exports = { setDefaultADK, getDefaultADK };
