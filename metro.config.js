const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// OPTIMISATIONS ONEDRIVE - FORCER POLLING AU LIEU DES ÉVÉNEMENTS FILESYSTEM
config.resolver.useWatchman = false;

// Configuration spéciale pour OneDrive
config.watcher = {
  additionalExts: ['tsx', 'ts', 'jsx', 'js', 'json'],
  healthCheck: {
    enabled: true,
    filePrefix: '.watchmanconfig',
  },
  // Forcer le polling mode pour OneDrive
  watchman: false,
};

// Fast Refresh explicite
config.transformer.enableBabelRCLookup = false;

// Optimisations de performance pour le refresh
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Configuration du watcher avec polling OneDrive
config.watchFolders = [
  path.resolve(__dirname, 'node_modules'),
  __dirname,
];

// CORRECTION : Exclusions OneDrive et cache - FLAGS UNIFORMISÉS
config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/react-native\/.*/,
  // Exclusions spécifiques OneDrive - tous sans flags pour éviter le conflit
  /.*\.tmp$/,
  /.*~$/,
  /\$RECYCLE\.BIN/,
  /OneDrive.*\.lock$/,
  /\.OneDrive$/,
  /desktop\.ini$/,
  /thumbs\.db$/,  // Flag 'i' supprimé pour éviter le conflit
];

// Support TypeScript
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx'];

// Vos alias existants
config.resolver.alias = {
  '@': __dirname,
  '@components': './components',
  '@hooks': './hooks',
  '@lib': './lib',
  '@constants': './constants',
  '@utils': './utils',
  '@types': './types',
};

config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Vos web mocks existants
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

// Configuration serveur pour OneDrive
config.server = {
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Headers CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      // Optimisations OneDrive - éviter le cache agressif
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      return middleware(req, res, next);
    };
  },
};

module.exports = config;