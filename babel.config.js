module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            // A MÁGICA ACONTECE AQUI
            // Força qualquer import de 'three' a ir para a raiz do node_modules
            'three': './node_modules/three',
            'react': './node_modules/react',
            'react-native': './node_modules/react-native',
          },
        },
      ],
      // Se você usa reanimated, ele deve ser sempre o último plugin da lista
      'react-native-reanimated/plugin',
    ],
  };
};