const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  const { transformer, resolver } = config;

  // 1. CONFIGURAÇÃO DO SVG TRANSFORMER
  // Isso permite importar .svg como componente: <Icon />
  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve("react-native-svg-transformer"),
  };

  // 2. CONFIGURAÇÃO DE RESOLVER (EXTENSÕES)
  
  // A. Remove 'svg' da lista de assets (para não ser tratado como arquivo estático)
  config.resolver.assetExts = resolver.assetExts.filter((ext) => ext !== "svg");

  // B. Adiciona 'svg' na lista de código fonte (source)
  config.resolver.sourceExts = [...resolver.sourceExts, "svg"];

  // C. Adiciona suporte aos arquivos 3D (Mantendo o que você já tinha)
  config.resolver.assetExts.push('glb', 'gltf');

  // 3. A CORREÇÃO DO CONFLITO THREE.JS (Mantendo o que você já tinha)
  // Garante uma única instância do Three.js para evitar crash de contexto
  config.resolver.extraNodeModules = {
    ...resolver.extraNodeModules,
    'three': path.resolve(__dirname, 'node_modules/three'),
  };

  return config;
})();