import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

// Inicializa o admin usando permissões nativas de nuvem do Firebase
if (!admin.apps.length) {
  admin.initializeApp();
}

// Requerendo o servidor Express pré-empacotado da aplicação raiz (Vite)
// O firebase-tools fará upload da pasta dist/ junto se configurarmos no firebase.json
const app = require("../../dist/server.cjs").default || require("../../dist/server.cjs");

// Expondo a API completa
export const api = functions.https.onRequest(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 300,
    minInstances: 0,
    cors: false, // O cors já é tratado no server.cjs
  },
  app
);
