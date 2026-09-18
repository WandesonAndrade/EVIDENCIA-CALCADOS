const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

// Requerendo o servidor Express pré-empacotado (copiado para a mesma pasta)
const appModule = require("../server.cjs");
const app = appModule.default || appModule;

// Expondo a API completa
exports.api = functions.https.onRequest(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 300,
    minInstances: 0,
    cors: false,
  },
  app
);