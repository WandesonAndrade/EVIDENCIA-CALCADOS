const { onRequest } = require("firebase-functions/v2/https");

let appInstance = null;
function getApp() {
  if (!appInstance) {
    const appModule = require("../server.cjs");
    appInstance = appModule.default || appModule;
  }
  return appInstance;
}

// Expondo a API completa de forma leve e rápida na inicialização
exports.api = onRequest(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 300,
    minInstances: 0,
    cors: false,
  },
  (req, res) => {
    return getApp()(req, res);
  }
);