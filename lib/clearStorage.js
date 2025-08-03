import AsyncStorage from '@react-native-async-storage/async-storage';

async function clearAuthStorage() {
  try {
    await AsyncStorage.multiRemove(['savedEmail', 'savedPassword', 'isLoggedIn', 'userSession', 'lastLoginType']);
    console.log('Stockage d\'authentification nettoyé avec succès');
  } catch (error) {
    console.error('Erreur lors du nettoyage de AsyncStorage:', error);
  }
}

clearAuthStorage();