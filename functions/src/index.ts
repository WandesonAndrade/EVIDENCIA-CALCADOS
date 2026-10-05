import { onRequest } from "firebase-functions/v2/https";

let appInstance: any = null;
function getApp() {
  if (!appInstance) {
    const appModule = require("../server.cjs");
    appInstance = appModule.default || appModule.app || appModule;
  }
  return appInstance;
}

// Expondo a API completa publicamente com permissão allUsers
export const api = onRequest(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 300,
    minInstances: 0,
    cors: true,
    invoker: "public",
  },
  (req: any, res: any) => {
    return getApp()(req, res);
  }
);
