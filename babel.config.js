module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
            '@components': './components',
            '@hooks': './hooks',
            '@lib': './lib',
            '@constants': './constants',
            '@utils': './utils',
            '@types': './types'
          }
        }
      ],
      'react-native-reanimated/plugin' // 👈 doit être le dernier plugin
    ]
  };
};
