const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

// Requerendo o servidor Express pré-empacotado da aplicação raiz (Vite)
const appModule = require("../../dist/server.cjs");
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