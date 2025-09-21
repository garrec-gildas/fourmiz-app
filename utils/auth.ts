import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserSession {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'client' | 'fourmiz';
  lastLoginType: 'client' | 'fourmiz';
  isVerified: boolean;
  rating: number;
  totalOrders: number;
  avatar?: string;
  token: string;
  loginTimestamp: number;
}

export const saveUserSession = async (userSession: UserSession): Promise<void> => {
  try {
    await AsyncStorage.setItem('userSession', JSON.stringify(userSession));
    await AsyncStorage.setItem('lastLoginType', userSession.lastLoginType);
    await AsyncStorage.setItem('isLoggedIn', 'true');
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la session:', error);
    throw error;
  }
};

export const getUserSession = async (): Promise<UserSession | null> => {
  try {
    const userSession = await AsyncStorage.getItem('userSession');
    if (userSession) {
      return JSON.parse(userSession);
    }
    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération de la session:', error);
    return null;
  }
};

export const updateLastLoginType = async (loginType: 'client' | 'fourmiz'): Promise<void> => {
  try {
    await AsyncStorage.setItem('lastLoginType', loginType);
    
    // Mettre à jour la session utilisateur
    const userSession = await getUserSession();
    if (userSession) {
      userSession.lastLoginType = loginType;
      await AsyncStorage.setItem('userSession', JSON.stringify(userSession));
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du type de connexion:', error);
    throw error;
  }
};

export const getLastLoginType = async (): Promise<'client' | 'fourmiz' | null> => {
  try {
    const lastLoginType = await AsyncStorage.getItem('lastLoginType');
    return lastLoginType as 'client' | 'fourmiz' | null;
  } catch (error) {
    console.error('Erreur lors de la récupération du dernier type de connexion:', error);
    return null;
  }
};

export const isUserLoggedIn = async (): Promise<boolean> => {
  try {
    const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
    const userSession = await getUserSession();
    
    if (isLoggedIn === 'true' && userSession) {
      // Vérifier si la session n'a pas expiré (30 jours)
      const currentTime = Date.now();
      const sessionAge = currentTime - userSession.loginTimestamp;
      const maxSessionAge = 30 * 24 * 60 * 60 * 1000; // 30 jours
      
      if (sessionAge < maxSessionAge) {
        return true;
      } else {
        // Session expirée, nettoyer le stockage
        await logout();
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Erreur lors de la vérification de la connexion:', error);
    return false;
  }
};

export const logout = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove(['isLoggedIn', 'userSession', 'lastLoginType']);
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    throw error;
  }
};

export const refreshSession = async (): Promise<void> => {
  try {
    const userSession = await getUserSession();
    if (userSession) {
      userSession.loginTimestamp = Date.now();
      await AsyncStorage.setItem('userSession', JSON.stringify(userSession));
    }
  } catch (error) {
    console.error('Erreur lors du rafraîchissement de la session:', error);
    throw error;
  }
};
