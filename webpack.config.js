const createExpoWebpackConfigAsync = require("@expo/webpack-config");

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    "lucide-react-native": "lucide-react",
  };

  config.resolve.extensions = [
    ...new Set([...(config.resolve.extensions || []), ".wasm"]),
  ];

  config.module.rules.push({
    test: /\.wasm$/,
    type: "asset/resource",
  });

  config.experiments = {
    ...(config.experiments || {}),
    asyncWebAssembly: true,
    syncWebAssembly: true,
  };

  return config;
};
