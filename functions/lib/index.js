"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const https_1 = require("firebase-functions/v2/https");
let appInstance = null;
function getApp() {
    if (!appInstance) {
        const appModule = require("../server.cjs");
        appInstance = appModule.default || appModule.app || appModule;
    }
    return appInstance;
}
// Expondo a API completa publicamente com permissão allUsers
exports.api = (0, https_1.onRequest)({
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 300,
    minInstances: 0,
    cors: true,
    invoker: "public",
}, (req, res) => {
    return getApp()(req, res);
});
//# sourceMappingURL=index.js.map