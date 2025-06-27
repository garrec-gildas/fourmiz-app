const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Custom resolver to handle web mocks
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Only apply web mocks when building for web
  if (platform === 'web') {
    // Handle react-native-maps
    if (moduleName === 'react-native-maps') {
      return {
        filePath: path.resolve(__dirname, 'web-mocks/react-native-maps.js'),
        type: 'sourceFile',
      };
    }
    
    // Handle react-native-maps-directions
    if (moduleName === 'react-native-maps-directions') {
      return {
        filePath: path.resolve(__dirname, 'web-mocks/react-native-maps-directions.js'),
        type: 'sourceFile',
      };
    }
    
    // Handle the native codegenNativeCommands module
    if (moduleName === 'react-native/Libraries/Utilities/codegenNativeCommands') {
      return {
        filePath: path.resolve(__dirname, 'web-mocks/codegenNativeCommands.js'),
        type: 'sourceFile',
      };
    }
  }
  
  // Fall back to the default resolver for all other cases
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;