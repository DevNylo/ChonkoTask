const { getDefaultConfig } = require('expo/metro-config');
const path = require('path'); // Importante para achar o caminho certo

const config = getDefaultConfig(__dirname);

// 1. Configuração dos Assets 3D (Mantive o que você já tinha)
config.resolver.assetExts.push('glb', 'gltf');

// 2. A CORREÇÃO DO CONFLITO (Single Source of Truth)
// Isso diz pro compilador: "Sempre que alguém pedir 'three', 
// pegue da pasta principal em node_modules/three"
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'three': path.resolve(__dirname, 'node_modules/three'),
};

module.exports = config;