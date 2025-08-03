export default ({ config }) => ({
  ...config,
  name: "Fourmiz",
  slug: "fourmiz-app",
  version: "1.0.0",
  sdkVersion: "53.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "fourmiz",
  userInterfaceStyle: "automatic",
  
  // ===================================
  // CONFIGURATION NOTIFICATIONS
  // ===================================
  notification: {
    icon: "./assets/images/icon.png", // Utilise l'icône principale
    color: "#FF4444",
    androidMode: "default",
    androidCollapsedTitle: "Fourmiz - Nouveau message",
    iosDisplayInForeground: true,
  },
  
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.garrec.fourmizapp",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription:
        "Cette app utilise votre position pour vous géolocaliser.",
      NSPhotoLibraryUsageDescription:
        "Cette application a besoin d'accéder à vos photos pour télécharger vos documents d'identité.",
      // Permissions notifications iOS
      NSUserNotificationsUsageDescription:
        "Cette application envoie des notifications pour vous informer des nouveaux messages et des mises à jour de vos commandes.",
    },
  },
  
  android: {
    package: "com.garrec.fourmizapp",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#FF4444",
    },
    permissions: [
      "ACCESS_COARSE_LOCATION", 
      "ACCESS_FINE_LOCATION",
      "WRITE_EXTERNAL_STORAGE",
      "READ_EXTERNAL_STORAGE",
      // Permissions notifications Android
      "NOTIFICATIONS",
      "WAKE_LOCK",
      "VIBRATE",
      "RECEIVE_BOOT_COMPLETED",
    ],
    // Configuration spécifique Android pour notifications
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON, // Optionnel pour Firebase
  },
  
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/images/favicon.png",
  },
  
  plugins: [
    "expo-router",
    "expo-font",
    "expo-web-browser",
    "expo-location",
    [
      "expo-image-picker",
      {
        photosPermission: "L'application accède à vos photos pour vous permettre de sélectionner vos documents."
      }
    ],
    // ===================================
    // PLUGIN NOTIFICATIONS
    // ===================================
    [
      "expo-notifications",
      {
        icon: "./assets/images/icon.png", // Utilise l'icône principale
        color: "#ffffff",
        defaultChannel: "default",
        mode: "production", // ou "development"
        // Configuration Android
        android: {
          color: "#FF4444",
          sound: "default",
          priority: "high",
          vibrationPattern: [0, 250, 250, 250],
        },
        // Configuration iOS
        ios: {
          sound: "default",
          displayInForeground: true,
          categoryId: "fourmiz_notifications",
        }
      }
    ]
    // RETIRÉ: expo-device n'est pas un plugin de configuration
  ],
  
  experiments: {
    typedRoutes: true,
  },
  
  extra: {
    router: {},
    eas: {
      projectId: "48ca31f0-38b5-41fd-b30d-824d55c14471",
    },
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_STRIPE_KEY: process.env.EXPO_PUBLIC_STRIPE_KEY,
    EXPO_PUBLIC_GOOGLE_MAPS_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
    
    // ===================================
    // CONFIGURATION NOTIFICATIONS
    // ===================================
    EXPO_PUBLIC_NOTIFICATIONS_ENABLED: process.env.EXPO_PUBLIC_NOTIFICATIONS_ENABLED || "true",
    EXPO_PUBLIC_PUSH_SERVER_URL: process.env.EXPO_PUBLIC_PUSH_SERVER_URL, // Optionnel: serveur push personnalisé
  },
  
  // ===================================
  // CONFIGURATION BUILD (optionnel)
  // ===================================
  build: {
    development: {
      developmentClient: true,
      distribution: "internal"
    },
    preview: {
      distribution: "internal",
      android: {
        buildType: "apk"
      }
    },
    production: {
      // Configuration production
    }
  },
  
  // ===================================
  // HOOKS (optionnel)
  // ===================================
  hooks: {
    postPublish: [
      // Hooks post-publication si nécessaire
    ]
  }
});