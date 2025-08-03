const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ajout de support pour les fichiers .ts/.tsx
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx'];

// Configuration pour résoudre les modules avec alias
config.resolver.alias = {
  '@': __dirname,
  '@components': './components',
  '@hooks': './hooks',
  '@lib': './lib',
  '@constants': './constants',
  '@utils': './utils',
  '@types': './types',
};

// Custom resolver to handle web mocks (votre configuration existante)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (moduleName === 'react-native-maps') {
      return {
        filePath: path.resolve(__dirname, 'web-mocks/react-native-maps.js'),
        type: 'sourceFile',
      };
    }
    if (moduleName === 'react-native-maps-directions') {
      return {
        filePath: path.resolve(__dirname, 'web-mocks/react-native-maps-directions.js'),
        type: 'sourceFile',
      };
    }
    if (moduleName === 'react-native/Libraries/Utilities/codegenNativeCommands') {
      return {
        filePath: path.resolve(__dirname, 'web-mocks/codegenNativeCommands.js'),
        type: 'sourceFile',
      };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;