module.exports = {
  output: {
    filename: "[name].js",
    module: true
  },
  target: "es2020",
  mode: "production",
  experiments: {
    outputModule: true,
  },
  externalsType: "module",
  externals: {
    "@minecraft/server": "@minecraft/server",
    "@minecraft/server-ui": "@minecraft/server-ui",
    "@minecraft/server-admin": "@minecraft/server-server-admin",
    "@minecraft/server-gametest": "@minecraft/server-gametest",
    "@minecraft/server-net": "@minecraft/server-net",
  },
};