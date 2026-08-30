let cachedApp = null;

module.exports = async (req, res) => {
  if (!cachedApp) {
    const serverModule = require("../dist/server.cjs");
    cachedApp = await serverModule.createExpressServer(true);
  }
  return cachedApp(req, res);
};
